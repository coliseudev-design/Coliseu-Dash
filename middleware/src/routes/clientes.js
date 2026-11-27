'use strict';

const express = require('express');
const router = express.Router();
const db = require('../db/postgres');
const { getPeriodRange, toSafeSqlString } = require('../utils/period');
const { getCache, setCache } = require('../config/cache');
const cfopUtil = require('../utils/cfop');

function buildClientesCacheKey(endpoint, req) {
    const tenantId = req.tenant?.id || 'anon';
    const nfFlag = cfopUtil.isOnlyNfSalesActive() ? `nf1:${cfopUtil.getActiveCfopsKey()}` : 'nf0';
    const q = req.query || {};
    const queryStr = Object.keys(q).sort().map(k => `${k}=${q[k] ?? ''}`).join('&');
    return `clientes:${endpoint}:${tenantId}:${nfFlag}:${queryStr}`;
}

// GET /api/clientes/lista?search=&limit=&offset=&tempo_inativo=&ordenacao=&vendedor_id=&cidade=&depto_id=
router.get('/lista', async (req, res, next) => {
    try {
        const cacheKey = buildClientesCacheKey('lista', req);
        const cached = getCache(cacheKey);
        if (cached) return res.json(cached);

        const tenantId = req.tenant.id;
        const search = req.query.search || '';
        const limit = Math.min(parseInt(req.query.limit, 10) || 50, 1000);
        const offset = parseInt(req.query.offset, 10) || 0;
        const tempoInativo = req.query.tempo_inativo || 'Qualquer Inatividade';
        const ordenacao = req.query.ordenacao || 'Mais inativos primeiro (Alerta)';
        const vendedorId = req.query.vendedor_id;
        const cidade = req.query.cidade;
        const deptoId = req.query.depto_id;

        const fastSalesClause = cfopUtil.isOnlyNfSalesActive()
            ? cfopUtil.getSalesFilterClause('v')
            : `AND COALESCE(v.processo, 1) != 9
               AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO', 'PROCESSADO')
               AND v.status NOT ILIKE '%TRANSF%'
               AND (v.especie IS NULL OR v.especie NOT ILIKE '%TRANSF%')
               AND (v.natureza_operacao IS NULL OR (v.natureza_operacao NOT ILIKE '%TRANSF%' AND v.natureza_operacao NOT ILIKE '%SIMPLES REMESSA%'))
               AND (v.cfop IS NULL OR v.cfop NOT IN (${cfopUtil.TRANSFER_CFOPS.join(', ')}))`;

        let binds = [tenantId];
        let bIdx = 2;

        let statsWhere = ['v.tenant_id = $1'];
        if (deptoId && deptoId !== 'todas' && deptoId !== 'all') {
            statsWhere.push(`v.depto_id = $${bIdx}`);
            binds.push(parseInt(deptoId, 10));
            bIdx++;
        }
        if (vendedorId && vendedorId !== 'todas' && vendedorId !== 'all' && vendedorId !== 'TODOS') {
            statsWhere.push(`v.vendedor_id_firebird = $${bIdx}`);
            binds.push(vendedorId);
            bIdx++;
        }

        const filterClause = statsWhere.length > 1 ? 'AND ' + statsWhere.slice(1).join(' AND ') : '';

        // Subquery/CTE de estatísticas agregadas de vendas
        const statsQuery = `
            SELECT 
                v.cliente_id_firebird,
                COUNT(v.id_firebird) as qtd_pedidos,
                MAX(COALESCE(v.data_hora_proc, v.data_vencimento, v.data_venda)) as ultimo_pedido,
                SUM(v.valor_total - COALESCE(v.valor_desconto, 0)) as total_gasto,
                MAX(v.vendedor_id_firebird) FILTER (WHERE v.vendedor_id_firebird IS NOT NULL) as last_vendedor_id
            FROM dash_vendas v
            WHERE v.tenant_id = $1 ${fastSalesClause} ${filterClause}
            GROUP BY v.cliente_id_firebird
        `;

        // Agora construímos a query principal dos clientes
        let mainWhere = [
            'c.tenant_id = $1',
            'c.ativo = true',
            `(c.tipo IS NULL OR UPPER(TRIM(c.tipo)) NOT IN ('FORNECEDOR', 'FORNECEDORES', 'FORNEC', '2'))`,
            's.qtd_pedidos > 0'
        ];

        if (search) {
            mainWhere.push(`(c.nome ILIKE $${bIdx} OR c.documento ILIKE $${bIdx} OR c.telefone ILIKE $${bIdx} OR CAST(c.id_firebird AS TEXT) ILIKE $${bIdx})`);
            binds.push(`%${search}%`);
            bIdx++;
        }
        if (cidade && cidade !== 'todas' && cidade !== 'all' && cidade !== 'TODOS') {
            mainWhere.push(`UPPER(TRIM(c.cidade)) = UPPER(TRIM($${bIdx}))`);
            binds.push(cidade);
            bIdx++;
        }

        // Filtro de tempo inativo
        let havingClauses = [];
        if (tempoInativo === 'Ativos (Comprou no mês)') {
            havingClauses.push('dias_inativo <= 30');
        } else if (tempoInativo === 'Inativo > 30 dias') {
            havingClauses.push('dias_inativo > 30');
        } else if (tempoInativo === 'Inativo > 60 dias') {
            havingClauses.push('dias_inativo > 60');
        } else if (tempoInativo === 'Inativo > 90 dias') {
            havingClauses.push('dias_inativo > 90');
        } else if (tempoInativo === 'Sem compras / Churn') {
            havingClauses.push('(ultimo_pedido IS NULL OR dias_inativo > 180)');
        }

        let whereHaving = '';
        if (havingClauses.length > 0) {
            whereHaving = ` WHERE ${havingClauses.join(' AND ')}`;
        }

        // Ordenação
        let orderBy = ' ORDER BY dias_inativo DESC, total_gasto DESC';
        if (ordenacao === 'Mais ativos primeiro') {
            orderBy = ' ORDER BY dias_inativo ASC, total_gasto DESC';
        } else if (ordenacao === 'Maior faturamento') {
            orderBy = ' ORDER BY total_gasto DESC';
        } else if (ordenacao === 'Menor faturamento') {
            orderBy = ' ORDER BY total_gasto ASC';
        } else if (ordenacao === 'Ordem alfabética') {
            orderBy = ' ORDER BY nome ASC';
        }

        const limitIdx = bIdx++;
        const offsetIdx = bIdx++;
        const finalQuery = `
            WITH sales_stats AS MATERIALIZED (${statsQuery}),
            filtered_clients AS (
                SELECT 
                    c.id_firebird AS id, TRIM(c.nome) as nome, TRIM(c.documento) as documento, TRIM(c.cidade) as cidade, TRIM(c.estado) as estado,
                    TRIM(c.telefone) as telefone, TRIM(c.email) as email,
                    COALESCE(s.qtd_pedidos, 0) as qtd_pedidos,
                    s.ultimo_pedido,
                    COALESCE(s.total_gasto, 0) as total_gasto,
                    COALESCE(TRIM(vend.nome), 'Sem Vendedor') as vendedor_resp,
                    COALESCE(EXTRACT(DAY FROM (NOW() - s.ultimo_pedido)), 999) as dias_inativo
                FROM dash_clientes c
                JOIN sales_stats s ON s.cliente_id_firebird = c.id_firebird
                LEFT JOIN dash_vendedores vend ON vend.id_firebird = s.last_vendedor_id AND vend.tenant_id = c.tenant_id
                WHERE ${mainWhere.join(' AND ')}
            )
            SELECT *, COUNT(*) OVER() AS full_count
            FROM filtered_clients
            ${whereHaving}
            ${orderBy}
            LIMIT $${limitIdx} OFFSET $${offsetIdx}
        `;
        
        const finalParams = [...binds, limit, offset];
        const { rows } = await db.query(finalQuery, finalParams);
        const total = rows.length > 0 ? parseInt(rows[0].full_count || 0, 10) : 0;

        const payload = {
            data: rows.map(r => ({
                id: r.id,
                nome: r.nome,
                documento: r.documento,
                cidade: r.cidade,
                estado: r.estado,
                telefone: r.telefone || '',
                email: r.email || '',
                vendedor_resp: r.vendedor_resp,
                qtd_pedidos: parseInt(r.qtd_pedidos, 10),
                ultimo_pedido: r.ultimo_pedido,
                total_gasto: parseFloat(r.total_gasto || 0),
                dias_inativo: parseInt(r.dias_inativo || 0, 10)
            })),
            total,
            limit,
            offset
        };
        setCache(cacheKey, payload, 120);
        res.json(payload);
    } catch (err) {
        next(err);
    }
});

// GET /api/clientes/analytics-full
router.get('/analytics-full', async (req, res, next) => {
    try {
        const cacheKey = buildClientesCacheKey('analytics-full', req);
        const cached = getCache(cacheKey);
        if (cached) return res.json(cached);

        const tenantId = req.tenant.id;
        const period = req.query.period || 'thisMonth';
        const { start_date, end_date } = req.query;
        const deptoId = req.query.depto_id;
        const vendedorId = req.query.vendedor_id;
        const cidade = req.query.cidade;

        const store = db.dbContext.getStore();
        const tzOffset = store ? store.tzOffset : -180;
        const anchorDate = new Date(Date.now() + (tzOffset * 60 * 1000));
        const { start, end } = getPeriodRange(period, start_date, end_date, anchorDate);

        // Período anterior (respeitando mês-calendário completo quando aplicável)
        const { prevStartObj: prevStart, prevEndObj: prevEnd } = require('../utils/period').getPreviousPeriodRange(start, end);

        const salesFilter = cfopUtil.getSalesFilterClause('v');
        const fastSalesClause = cfopUtil.isOnlyNfSalesActive()
            ? salesFilter
            : `AND COALESCE(v.processo, 1) != 9
               AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO', 'PROCESSADO')
               AND v.status NOT ILIKE '%TRANSF%'
               AND (v.especie IS NULL OR v.especie NOT ILIKE '%TRANSF%')
               AND (v.natureza_operacao IS NULL OR (v.natureza_operacao NOT ILIKE '%TRANSF%' AND v.natureza_operacao NOT ILIKE '%SIMPLES REMESSA%'))
               AND (v.cfop IS NULL OR v.cfop NOT IN (${cfopUtil.TRANSFER_CFOPS.join(', ')}))`;

        const needsCidadeJoin = Boolean(cidade && cidade !== 'todas' && cidade !== 'all' && cidade !== 'TODOS');

        // Filtros dinâmicos
        let salesWhere = ['v.tenant_id = $1'];
        let salesParams = [tenantId];
        let pIdx = 2;

        if (deptoId && deptoId !== 'todas' && deptoId !== 'all') {
            salesWhere.push(`v.depto_id = $${pIdx}`);
            salesParams.push(parseInt(deptoId, 10));
            pIdx++;
        }
        if (vendedorId && vendedorId !== 'todas' && vendedorId !== 'all' && vendedorId !== 'TODOS') {
            salesWhere.push(`v.vendedor_id_firebird = $${pIdx}`);
            salesParams.push(vendedorId);
            pIdx++;
        }
        if (needsCidadeJoin) {
            salesWhere.push(`UPPER(TRIM(c.cidade)) = UPPER(TRIM($${pIdx}))`);
            salesParams.push(cidade);
            pIdx++;
        }

        const salesJoins = ' LEFT JOIN dash_clientes c ON c.id_firebird = v.cliente_id_firebird AND c.tenant_id = v.tenant_id';
        const optionalCidadeJoin = needsCidadeJoin ? salesJoins : '';
        const filterClause = salesWhere.length > 1 ? 'AND ' + salesWhere.slice(1).join(' AND ') : '';

        // 1. Total Clientes com movimentação comercial
        let totalClientsQuery = `
            SELECT COUNT(DISTINCT v.cliente_id_firebird) AS total
            FROM dash_vendas v
            ${optionalCidadeJoin}
            WHERE v.tenant_id = $1
              ${fastSalesClause}
              ${filterClause}
        `;
        const totalClientsPromise = db.query(totalClientsQuery, salesParams);

        // 2. Mês Atual
        const currentSalesParams = [...salesParams];
        const startIdx = pIdx++;
        const endIdx = pIdx++;
        currentSalesParams.push(start, end);

        const currentActivePromise = db.query(`
            SELECT COUNT(DISTINCT v.cliente_id_firebird) AS total
            FROM dash_vendas v
            ${optionalCidadeJoin}
            WHERE v.tenant_id = $1 AND COALESCE(v.data_hora_proc, v.data_vencimento, v.data_venda) >= $${startIdx} AND COALESCE(v.data_hora_proc, v.data_vencimento, v.data_venda) <= $${endIdx}
              ${salesFilter}
              ${filterClause}
        `, currentSalesParams);

        // 3. Mês Anterior
        const prevSalesParams = [...salesParams, toSafeSqlString(prevStart), toSafeSqlString(prevEnd)];
        const prevActivePromise = db.query(`
            SELECT COUNT(DISTINCT v.cliente_id_firebird) AS total
            FROM dash_vendas v
            ${optionalCidadeJoin}
            WHERE v.tenant_id = $1 AND COALESCE(v.data_hora_proc, v.data_vencimento, v.data_venda) >= $${startIdx} AND COALESCE(v.data_hora_proc, v.data_vencimento, v.data_venda) <= $${endIdx}
              ${salesFilter}
              ${filterClause}
        `, prevSalesParams);

        // 4. Novos Clientes
        let newClientsQuery = `
            SELECT COUNT(*) AS total FROM dash_clientes c 
            WHERE c.tenant_id = $1 AND c.ativo = true 
              AND c.data_cadastro >= $2 AND c.data_cadastro <= $3
              AND (c.tipo IS NULL OR UPPER(TRIM(c.tipo)) NOT IN ('FORNECEDOR', 'FORNECEDORES', 'FORNEC'))
              AND EXISTS (SELECT 1 FROM dash_vendas vx WHERE vx.cliente_id_firebird = c.id_firebird AND vx.tenant_id = c.tenant_id)
        `;
        let newClientsParams = [tenantId, start, end];
        if (needsCidadeJoin) {
            newClientsQuery += ` AND UPPER(TRIM(c.cidade)) = UPPER(TRIM($4))`;
            newClientsParams.push(cidade);
        }
        const newClientsPromise = db.query(newClientsQuery, newClientsParams);

        // 5. Clientes com Maior Recorrência (Top 10)
        const topRecurrentPromise = db.query(`
            SELECT 
                c.id_firebird as id, 
                TRIM(c.nome) as nome,
                TRIM(c.telefone) as telefone,
                TRIM(c.documento) as documento,
                TRIM(c.cidade) as cidade,
                TRIM(c.estado) as estado,
                COUNT(DISTINCT v.id_firebird) as qtd_pedidos,
                SUM(v.valor_total - COALESCE(v.valor_desconto, 0)) as total_gasto,
                MAX(COALESCE(v.data_hora_proc, v.data_vencimento, v.data_venda)) as ultimo_pedido
            FROM dash_vendas v
            JOIN dash_clientes c ON c.id_firebird = v.cliente_id_firebird AND c.tenant_id = v.tenant_id
            WHERE v.tenant_id = $1 AND COALESCE(v.data_hora_proc, v.data_vencimento, v.data_venda) >= $${startIdx} AND COALESCE(v.data_hora_proc, v.data_vencimento, v.data_venda) <= $${endIdx}
              ${salesFilter}
              ${filterClause}
            GROUP BY c.id_firebird, c.nome, c.telefone, c.documento, c.cidade, c.estado
            ORDER BY qtd_pedidos DESC, total_gasto DESC
            LIMIT 10
        `, currentSalesParams);

        // 6. Clientes com Menos Recorrência (Top 10) — pré-agrega por cliente_id_firebird com HAVING MAX < startIdx
        const topChurnPromise = db.query(`
            WITH churn_agg AS (
                SELECT 
                    v.cliente_id_firebird,
                    COUNT(v.id_firebird) as qtd_pedidos,
                    SUM(v.valor_total - COALESCE(v.valor_desconto, 0)) as total_gasto,
                    MAX(COALESCE(v.data_hora_proc, v.data_vencimento, v.data_venda)) as ultimo_pedido
                FROM dash_vendas v
                ${optionalCidadeJoin}
                WHERE v.tenant_id = $1
                  AND COALESCE(v.data_hora_proc, v.data_vencimento, v.data_venda) <= $${endIdx}
                  ${fastSalesClause}
                  ${filterClause}
                GROUP BY v.cliente_id_firebird
                HAVING MAX(COALESCE(v.data_hora_proc, v.data_vencimento, v.data_venda)) < $${startIdx}
            )
            SELECT 
                c.id_firebird as id, 
                TRIM(c.nome) as nome,
                TRIM(c.telefone) as telefone,
                TRIM(c.documento) as documento,
                TRIM(c.cidade) as cidade,
                TRIM(c.estado) as estado,
                ca.qtd_pedidos,
                ca.total_gasto,
                ca.ultimo_pedido,
                COALESCE(EXTRACT(DAY FROM (NOW() - ca.ultimo_pedido)), 999) as dias_inativo
            FROM churn_agg ca
            JOIN dash_clientes c ON c.id_firebird = ca.cliente_id_firebird AND c.tenant_id = $1
            WHERE c.ativo = true
            ORDER BY ca.ultimo_pedido ASC
            LIMIT 10
        `, currentSalesParams);

        // 7. Vendedores e Cidades disponíveis na carteira
        const sellersListPromise = db.query(`
            SELECT DISTINCT vd.id_firebird as id, TRIM(vd.nome) as nome
            FROM dash_vendedores vd
            WHERE vd.tenant_id = $1 AND vd.nome IS NOT NULL AND TRIM(vd.nome) != ''
              AND EXISTS (SELECT 1 FROM dash_vendas vx WHERE vx.tenant_id = vd.tenant_id AND vx.vendedor_id_firebird = vd.id_firebird)
            ORDER BY 2 ASC
        `, [tenantId]);

        const citiesListPromise = db.query(`
            SELECT DISTINCT TRIM(c.cidade) as cidade
            FROM dash_clientes c
            WHERE c.tenant_id = $1 AND c.ativo = true AND c.cidade IS NOT NULL AND TRIM(c.cidade) != ''
            ORDER BY 1 ASC
        `, [tenantId]);

        const [
            totalClientsRes,
            currentActiveRes,
            prevActiveRes,
            newClientsRes,
            topRecurrentRes,
            topChurnRes,
            sellersListRes,
            citiesListRes
        ] = await Promise.all([
            totalClientsPromise,
            currentActivePromise,
            prevActivePromise,
            newClientsPromise,
            topRecurrentPromise,
            topChurnPromise,
            sellersListPromise,
            citiesListPromise
        ]);

        const total_clientes = parseInt(totalClientsRes.rows[0]?.total || 0, 10);
        const mes_atual = parseInt(currentActiveRes.rows[0]?.total || 0, 10);
        const mes_anterior = parseInt(prevActiveRes.rows[0]?.total || 0, 10);
        const novos_clientes = parseInt(newClientsRes.rows[0]?.total || 0, 10);

        const payload = {
            kpis: {
                total_clientes,
                mes_atual,
                mes_anterior,
                novos_clientes,
                sem_vendas_atual: Math.max(0, total_clientes - mes_atual),
                sem_vendas_anterior: Math.max(0, total_clientes - mes_anterior),
            },
            available_sellers: sellersListRes.rows.map(r => ({ id: String(r.id), nome: r.nome })),
            available_cities: citiesListRes.rows.map(r => r.cidade),
            recorrentes: topRecurrentRes.rows.map((r, i) => ({
                rank: i + 1,
                id: r.id,
                name: r.nome,
                telefone: r.telefone || '',
                documento: r.documento || '',
                cidade: r.cidade || '',
                estado: r.estado || '',
                pedidos: parseInt(r.qtd_pedidos, 10),
                ultimo_pedido: r.ultimo_pedido,
                total_gasto: parseFloat(r.total_gasto || 0)
            })),
            churn: topChurnRes.rows.map((r, i) => ({
                rank: i + 1,
                id: r.id,
                name: r.nome,
                telefone: r.telefone || '',
                documento: r.documento || '',
                cidade: r.cidade || '',
                estado: r.estado || '',
                pedidos: parseInt(r.qtd_pedidos, 10),
                total_gasto: parseFloat(r.total_gasto || 0),
                ultimo_pedido: r.ultimo_pedido,
                dias_inativo: parseInt(r.dias_inativo || 0, 10)
            }))
        };
        setCache(cacheKey, payload, 120);
        res.json(payload);
    } catch (err) {
        next(err);
    }
});

// GET /api/clientes/kpis
router.get('/kpis', async (req, res, next) => {
    try {
        const period = req.query.period || '30d';
        const tenantId = req.tenant.id;
        const { start_date, end_date } = req.query;
        
        const store = db.dbContext.getStore();
        const tzOffset = store ? store.tzOffset : -180;
        const anchorDate = new Date(Date.now() + (tzOffset * 60 * 1000));
        const { start, end } = getPeriodRange(period, start_date, end_date, anchorDate);

        const salesFilter = cfopUtil.getSalesFilterClause('v');

        const totalP = await db.query(
            `SELECT COUNT(*) AS total FROM dash_clientes c
             WHERE c.tenant_id = $1 AND c.ativo = true
               AND (c.tipo IS NULL OR UPPER(TRIM(c.tipo)) NOT IN ('FORNECEDOR', 'FORNECEDORES', 'FORNEC'))
               AND EXISTS (SELECT 1 FROM dash_vendas vx WHERE vx.cliente_id_firebird = c.id_firebird AND vx.tenant_id = c.tenant_id)
               AND EXISTS (SELECT 1 FROM dash_financeiro fx WHERE fx.cliente_id_firebird = c.id_firebird AND fx.tenant_id = c.tenant_id)`,
            [tenantId]
        );

        const ativosP = await db.query(`
            SELECT COUNT(DISTINCT v.cliente_id_firebird) AS total
            FROM dash_vendas v
            WHERE v.tenant_id = $1 
              AND COALESCE(v.data_hora_proc, v.data_vencimento, v.data_venda) >= $2 AND COALESCE(v.data_hora_proc, v.data_vencimento, v.data_venda) <= $3
              ${salesFilter}
        `, [tenantId, start, end]);

        const topP = await db.query(`
            SELECT c.nome, SUM(v.valor_total - COALESCE(v.valor_desconto, 0)) AS total
            FROM dash_vendas v
            JOIN dash_clientes c ON c.id_firebird = v.cliente_id_firebird AND c.tenant_id = v.tenant_id
            WHERE v.tenant_id = $1
              AND COALESCE(v.data_hora_proc, v.data_vencimento, v.data_venda) >= $2 AND COALESCE(v.data_hora_proc, v.data_vencimento, v.data_venda) <= $3
              ${salesFilter}
            GROUP BY c.id_firebird, c.nome
            ORDER BY total DESC LIMIT 1
        `, [tenantId, start, end]);

        const ticketP = await db.query(`
            SELECT COALESCE(AVG(totais.total), 0) AS ticket
            FROM (
                SELECT v.cliente_id_firebird, SUM(v.valor_total - COALESCE(v.valor_desconto, 0)) AS total
                FROM dash_vendas v
                WHERE v.tenant_id = $1
                  AND COALESCE(v.data_hora_proc, v.data_vencimento, v.data_venda) >= $2 AND COALESCE(v.data_hora_proc, v.data_vencimento, v.data_venda) <= $3
                  ${salesFilter}
                GROUP BY v.cliente_id_firebird
            ) totais
        `, [tenantId, start, end]);

        res.json({
            period: { start, end, label: period },
            kpis: {
                total_clientes: parseInt(totalP.rows[0]?.total || 0, 10),
                clientes_ativos: parseInt(ativosP.rows[0]?.total || 0, 10),
                top_cliente: topP.rows[0]?.nome || '—',
                top_cliente_valor: parseFloat(topP.rows[0]?.total || 0),
                ticket_medio_por_cliente: parseFloat(ticketP.rows[0]?.ticket || 0)
            }
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
