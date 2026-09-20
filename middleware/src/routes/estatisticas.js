'use strict';

const express = require('express');
const router = express.Router();
const db = require('../db/postgres');
const { getPeriodRange } = require('../utils/period');
const { getCache, setCache } = require('../config/cache');
const { buildDeptoFilter, buildVendedorFilter } = require('./filiais');
const cfopUtil = require('../utils/cfop');

// GET /api/estatisticas/overview
router.get('/overview', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const period = req.query.period || 'last30';
        const { start_date, end_date } = req.query;
        const deptoId = req.query.depto_id;
        const vendedorId = req.query.vendedor_id;

        const cacheKey = `overview:${tenantId}:${period}:${start_date || 'null'}:${end_date || 'null'}:${deptoId || 'todas'}:${vendedorId || 'todas'}`;
        const cached = getCache(cacheKey);
        if (cached) return res.json(cached);

        const store = db.dbContext.getStore();
        const tzOffset = store ? store.tzOffset : -180;
        const anchorDate = new Date(Date.now() + (tzOffset * 60 * 1000));
        const anchorDateFin = new Date(anchorDate);

        const { start, end } = getPeriodRange(period, start_date, end_date, anchorDate);
        const finRange = getPeriodRange(period, start_date, end_date, anchorDateFin);

        // "Hoje" = dia da âncora (último dia com venda registrada)
        const startHoje = new Date(anchorDate);
        startHoje.setUTCHours(0, 0, 0, 0);
        const startHojeStr = require('../utils/period').toSafeSqlString(startHoje);
        const endHoje = new Date(anchorDate);
        endHoje.setUTCHours(23, 59, 59, 999);
        const endHojeStr = require('../utils/period').toSafeSqlString(endHoje);

        // Filtro de departamento — injetado condicionalmente
        const df = buildDeptoFilter(deptoId, 4, 'v');
        const dfFin = buildDeptoFilter(deptoId, 4, 'f');

        // Filtro de vendedor
        const vf = buildVendedorFilter(vendedorId, 4 + df.params.length, 'v', req.user?.allowedSellers);


        const salesFilter = cfopUtil.getSalesFilterClause('v');
        const cfopFilter = cfopUtil.getCfopFilterClause('v');

        const procStatusFilter = cfopUtil.getStatusFilterClause('v');

        // Queries de devoluções parametrizadas por período
        const getDevQuery = (startStr, endStr) => {
            const needsJoin = (vendedorId && vendedorId !== 'todas' && vendedorId !== 'all' && vendedorId !== 'TODOS') || (req.user?.allowedSellers !== null && req.user?.allowedSellers !== undefined);
            // Sistema Coliseu unificado: sem branches VET
            let sql = `SELECT COALESCE(SUM(d.valor),0) AS total FROM dash_devolucoes d LEFT JOIN dash_vendas v2 ON v2.id_firebird = d.venda_id_firebird AND v2.tenant_id = d.tenant_id WHERE d.tenant_id = $1 AND d.data_devolucao >= $2 AND d.data_devolucao <= $3 ${df.clause.replace(/v\./g, 'v2.')}`;
            let params = [tenantId, startStr, endStr, ...df.params];
            let nextIdx = 4 + df.params.length;
            if (needsJoin) {
                const vfDev = buildVendedorFilter(vendedorId, nextIdx, 'v2', req.user?.allowedSellers);
                sql += vfDev.clause;
                params.push(...vfDev.params);
            }
            return { sql, params };
        };

        const devHoje = getDevQuery(startHojeStr, endHojeStr);
        const devMes = getDevQuery(start, end);

        // Calcular período anterior de mesmo tamanho
        const startDateObj = new Date(start);
        const endDateObj = new Date(end);
        const diffTime = Math.abs(endDateObj.getTime() - startDateObj.getTime());
        const prevEndObj = new Date(startDateObj.getTime() - 1);
        const prevStartObj = new Date(prevEndObj.getTime() - diffTime);
        const prevStart = require('../utils/period').toSafeSqlString(prevStartObj);
        const prevEnd = require('../utils/period').toSafeSqlString(prevEndObj);
        const devAnterior = getDevQuery(prevStart, prevEnd);

        // ORDEM BIVETSEED: exatamente 12 resultados
        // 1.vHoje 2.vMes 3.vAnterior 4.pAbertos 5.pProc 6.pCanc
        // 7.fReceber 8.fRecebido 9.fPagar 10.fPago 11.topMarcasVendas 12.topCatsVendas
        const [
            vHoje, dHoje,
            vMes, dMes,
            vAnterior, dAnterior,
            pAbertos, pProc, pCanc,
            fReceber, fRecebido, fPagar, fPago,
            topMarcasVendas, topCatsVendas
        ] = await Promise.all([
            // 1. Vendas do dia âncora
            db.query(`
                SELECT 
                    (SELECT COALESCE(SUM(v.valor_total - COALESCE(v.valor_desconto, 0)), 0) FROM dash_vendas v WHERE v.tenant_id = $1 AND COALESCE(v.data_hora_proc, v.data_vencimento, v.data_venda) >= $2 AND COALESCE(v.data_hora_proc, v.data_vencimento, v.data_venda) <= $3 ${salesFilter} ${df.clause} ${vf.clause}) AS total,
                    (SELECT COUNT(*) FROM dash_vendas v WHERE v.tenant_id = $1 AND COALESCE(v.data_hora_proc, v.data_vencimento, v.data_venda) >= $2 AND COALESCE(v.data_hora_proc, v.data_vencimento, v.data_venda) <= $3 ${salesFilter} ${df.clause} ${vf.clause}) AS qtd,
                    (SELECT COALESCE(SUM(vi.quantidade * (CASE WHEN v.valor_total < 0 THEN -1 ELSE 1 END)), 0) FROM dash_vendas_itens vi JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id WHERE v.tenant_id = $1 AND COALESCE(v.data_hora_proc, v.data_vencimento, v.data_venda) >= $2 AND COALESCE(v.data_hora_proc, v.data_vencimento, v.data_venda) <= $3 ${salesFilter} ${df.clause} ${vf.clause}) AS qtd_itens
            `, [tenantId, startHojeStr, endHojeStr, ...df.params, ...vf.params]),
            db.query(devHoje.sql, devHoje.params),
            // 2. Vendas do período selecionado
            db.query(`
                SELECT 
                    (SELECT COALESCE(SUM(v.valor_total - COALESCE(v.valor_desconto, 0)), 0) FROM dash_vendas v WHERE v.tenant_id = $1 AND COALESCE(v.data_hora_proc, v.data_vencimento, v.data_venda) >= $2 AND COALESCE(v.data_hora_proc, v.data_vencimento, v.data_venda) <= $3 ${salesFilter} ${df.clause} ${vf.clause}) AS total,
                    (SELECT COUNT(*) FROM dash_vendas v WHERE v.tenant_id = $1 AND COALESCE(v.data_hora_proc, v.data_vencimento, v.data_venda) >= $2 AND COALESCE(v.data_hora_proc, v.data_vencimento, v.data_venda) <= $3 ${salesFilter} ${df.clause} ${vf.clause}) AS qtd,
                    (SELECT COALESCE(SUM(vi.quantidade * (CASE WHEN v.valor_total < 0 THEN -1 ELSE 1 END)), 0) FROM dash_vendas_itens vi JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id WHERE v.tenant_id = $1 AND COALESCE(v.data_hora_proc, v.data_vencimento, v.data_venda) >= $2 AND COALESCE(v.data_hora_proc, v.data_vencimento, v.data_venda) <= $3 ${salesFilter} ${df.clause} ${vf.clause}) AS qtd_itens
            `, [tenantId, start, end, ...df.params, ...vf.params]),
            db.query(devMes.sql, devMes.params),
            // 3. Período anterior de mesmo tamanho
            db.query(`
                SELECT 
                    (SELECT COALESCE(SUM(v.valor_total - COALESCE(v.valor_desconto, 0)), 0) FROM dash_vendas v WHERE v.tenant_id = $1 AND COALESCE(v.data_hora_proc, v.data_vencimento, v.data_venda) >= $2 AND COALESCE(v.data_hora_proc, v.data_vencimento, v.data_venda) <= $3 ${salesFilter} ${df.clause} ${vf.clause}) AS total,
                    (SELECT COUNT(*) FROM dash_vendas v WHERE v.tenant_id = $1 AND COALESCE(v.data_hora_proc, v.data_vencimento, v.data_venda) >= $2 AND COALESCE(v.data_hora_proc, v.data_vencimento, v.data_venda) <= $3 ${salesFilter} ${df.clause} ${vf.clause}) AS qtd,
                    (SELECT COALESCE(SUM(vi.quantidade * (CASE WHEN v.valor_total < 0 THEN -1 ELSE 1 END)), 0) FROM dash_vendas_itens vi JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id WHERE v.tenant_id = $1 AND COALESCE(v.data_hora_proc, v.data_vencimento, v.data_venda) >= $2 AND COALESCE(v.data_hora_proc, v.data_vencimento, v.data_venda) <= $3 ${salesFilter} ${df.clause} ${vf.clause}) AS qtd_itens
            `, [tenantId, prevStart, prevEnd, ...df.params, ...vf.params]),
            db.query(devAnterior.sql, devAnterior.params),
            // 4. Status PENDENTE/ABERTO
            db.query(`SELECT COUNT(*) AS qtd FROM dash_vendas v WHERE v.tenant_id = $1 AND COALESCE(v.data_hora_proc, v.data_vencimento, v.data_venda) >= $2 AND COALESCE(v.data_hora_proc, v.data_vencimento, v.data_venda) <= $3 AND UPPER(TRIM(v.status)) IN ('PENDENTE','ABERTO') ${cfopFilter} ${df.clause} ${vf.clause}`, [tenantId, start, end, ...df.params, ...vf.params]),
            // 5. Status faturado válido (usa SALES_FILTER completo)
            db.query(`SELECT COUNT(*) AS qtd FROM dash_vendas v WHERE v.tenant_id = $1 AND COALESCE(v.data_hora_proc, v.data_vencimento, v.data_venda) >= $2 AND COALESCE(v.data_hora_proc, v.data_vencimento, v.data_venda) <= $3 ${cfopFilter} ${procStatusFilter} ${df.clause} ${vf.clause}`, [tenantId, start, end, ...df.params, ...vf.params]),
            // 6. Status CANCELADO
            db.query(`SELECT COUNT(*) AS qtd FROM dash_vendas v WHERE v.tenant_id = $1 AND COALESCE(v.data_hora_proc, v.data_vencimento, v.data_venda) >= $2 AND COALESCE(v.data_hora_proc, v.data_vencimento, v.data_venda) <= $3 AND UPPER(TRIM(v.status)) = 'CANCELADO' ${cfopFilter} ${df.clause} ${vf.clause}`, [tenantId, start, end, ...df.params, ...vf.params]),
            // 7-10. Financeiro
            db.query(`SELECT COALESCE(SUM(f.valor - f.valor_pago),0) AS v FROM dash_financeiro f WHERE f.tenant_id = $1 AND COALESCE(f.data_vencimento, f.data_emissao, NOW()) >= $2 AND COALESCE(f.data_vencimento, f.data_emissao, NOW()) <= $3 AND TRIM(f.tipo) = 'RECEBER' AND TRIM(f.status_pagamento) = 'ABERTO'${dfFin.clause}`, [tenantId, finRange.start, finRange.end, ...dfFin.params]),
            db.query(`SELECT COALESCE(SUM((CASE WHEN f.valor_pago = 0 THEN f.valor ELSE f.valor_pago END)),0) AS v FROM dash_financeiro f WHERE f.tenant_id = $1 AND COALESCE(f.data_pagamento, f.data_vencimento, NOW()) >= $2 AND COALESCE(f.data_pagamento, f.data_vencimento, NOW()) <= $3 AND TRIM(f.tipo) = 'RECEBER' AND TRIM(f.status_pagamento) = 'PAGO'${dfFin.clause}`, [tenantId, finRange.start, finRange.end, ...dfFin.params]),
            db.query(`SELECT COALESCE(SUM(f.valor - f.valor_pago),0) AS v FROM dash_financeiro f WHERE f.tenant_id = $1 AND COALESCE(f.data_vencimento, f.data_emissao, NOW()) >= $2 AND COALESCE(f.data_vencimento, f.data_emissao, NOW()) <= $3 AND TRIM(f.tipo) = 'PAGAR' AND TRIM(f.status_pagamento) = 'ABERTO'${dfFin.clause}`, [tenantId, finRange.start, finRange.end, ...dfFin.params]),
            db.query(`SELECT COALESCE(SUM((CASE WHEN f.valor_pago = 0 THEN f.valor ELSE f.valor_pago END)),0) AS v FROM dash_financeiro f WHERE f.tenant_id = $1 AND COALESCE(f.data_pagamento, f.data_vencimento, NOW()) >= $2 AND COALESCE(f.data_pagamento, f.data_vencimento, NOW()) <= $3 AND TRIM(f.tipo) = 'PAGAR' AND TRIM(f.status_pagamento) = 'PAGO'${dfFin.clause}`, [tenantId, finRange.start, finRange.end, ...dfFin.params]),
            // 11. Top marcas - CTE pré-filtra vendas antes do JOIN com itens (1.2M linhas)
            db.query(`
                WITH vf AS NOT MATERIALIZED (
                    SELECT v.id_firebird, v.tenant_id, v.valor_total, v.valor_desconto
                    FROM dash_vendas v
                    WHERE v.tenant_id = $1 AND COALESCE(v.data_hora_proc, v.data_vencimento, v.data_venda) >= $2 AND COALESCE(v.data_hora_proc, v.data_vencimento, v.data_venda) <= $3
                      ${salesFilter} ${df.clause} ${vf.clause}
                )
                SELECT COALESCE(vi.marca, p.marca, 'S/ MARCA') AS marca, 
                       SUM(COALESCE(vi.valor_total * (1 - COALESCE(vf.valor_desconto, 0) / NULLIF(vf.valor_total, 0)) * (CASE WHEN vf.valor_total < 0 THEN -1 ELSE 1 END), 0)) AS total
                FROM dash_vendas_itens vi
                JOIN vf ON vf.id_firebird = vi.venda_id_firebird AND vf.tenant_id = vi.tenant_id
                LEFT JOIN dash_produtos p ON p.id_firebird = vi.produto_id_firebird AND p.tenant_id = vi.tenant_id
                WHERE vi.tenant_id = $1
                  AND COALESCE(vi.marca, p.marca) IS NOT NULL AND COALESCE(vi.marca, p.marca) != ''
                GROUP BY 1 ORDER BY total DESC LIMIT 15
            `, [tenantId, start, end, ...df.params, ...vf.params]),
            // 12. Top categorias - CTE pré-filtra vendas antes do JOIN com itens
            db.query(`
                WITH vf AS NOT MATERIALIZED (
                    SELECT v.id_firebird, v.tenant_id, v.valor_total, v.valor_desconto
                    FROM dash_vendas v
                    WHERE v.tenant_id = $1 AND COALESCE(v.data_hora_proc, v.data_vencimento, v.data_venda) >= $2 AND COALESCE(v.data_hora_proc, v.data_vencimento, v.data_venda) <= $3
                      ${salesFilter} ${df.clause} ${vf.clause}
                )
                SELECT COALESCE(vi.categoria, p.categoria, 'S/ GRUPO') AS categoria, 
                       SUM(COALESCE(vi.valor_total * (1 - COALESCE(vf.valor_desconto, 0) / NULLIF(vf.valor_total, 0)) * (CASE WHEN vf.valor_total < 0 THEN -1 ELSE 1 END), 0)) AS total
                FROM dash_vendas_itens vi
                JOIN vf ON vf.id_firebird = vi.venda_id_firebird AND vf.tenant_id = vi.tenant_id
                LEFT JOIN dash_produtos p ON p.id_firebird = vi.produto_id_firebird AND p.tenant_id = vi.tenant_id
                WHERE vi.tenant_id = $1
                  AND COALESCE(vi.categoria, p.categoria) IS NOT NULL AND COALESCE(vi.categoria, p.categoria) != ''
                GROUP BY 1 ORDER BY total DESC LIMIT 15
            `, [tenantId, start, end, ...df.params, ...vf.params])
        ]);

        const totalHoje = parseFloat(vHoje.rows[0].total) - parseFloat(dHoje.rows[0].total);
        const totalMes = parseFloat(vMes.rows[0].total) - parseFloat(dMes.rows[0].total);
        const totalAnt = parseFloat(vAnterior.rows[0].total) - parseFloat(dAnterior.rows[0].total);

        // Ticket médio calculado sobre o líquido por pedido
        const qtdMes = parseInt(vMes.rows[0].qtd);
        const ticketMedio = qtdMes > 0 ? totalMes / qtdMes : 0;

        const result = {
            hoje: { 
                total: totalHoje, 
                qtd: parseInt(vHoje.rows[0].qtd),
                qtd_itens: parseFloat(vHoje.rows[0].qtd_itens || 0)
            },
            mes: { 
                total: totalMes, 
                qtd: qtdMes, 
                qtd_itens: parseFloat(vMes.rows[0].qtd_itens || 0),
                ticket_medio: ticketMedio 
            },
            anterior: { 
                total: totalAnt, 
                qtd: parseInt(vAnterior.rows[0].qtd),
                qtd_itens: parseFloat(vAnterior.rows[0].qtd_itens || 0)
            },
            meta_total: totalMes * 1.15,
            pedidos_abertos: parseInt(pAbertos.rows[0].qtd),
            pedidos_processados: parseInt(pProc.rows[0].qtd),
            pedidos_cancelados: parseInt(pCanc.rows[0].qtd),
            total_receber: parseFloat(fReceber.rows[0].v),
            total_recebido: parseFloat(fRecebido.rows[0].v),
            total_pagar: parseFloat(fPagar.rows[0].v),
            total_pago: parseFloat(fPago.rows[0].v),
            top_marcas: topMarcasVendas.rows.map(r => ({ marca: r.marca, total: parseFloat(r.total) })),
            top_categorias: topCatsVendas.rows.map(r => ({ categoria: r.categoria, total: parseFloat(r.total) }))
        };

        setCache(cacheKey, result, 120);
        res.json(result);
    } catch (err) {
        next(err);
    }
});

// GET /api/estatisticas/visao-estrategica
router.get('/visao-estrategica', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const period = req.query.period || 'currentMonth';
        const { start_date, end_date } = req.query;
        const deptoId = req.query.depto_id;
        const vendedorId = req.query.vendedor_id;
        const marca = req.query.marca;
        const compareMode = req.query.compare_mode || 'ano_acumulado'; // 'mes_anterior' | 'mesmo_mes_ano_ant' | 'ano_acumulado'

        const store = db.dbContext.getStore();
        const tzOffset = store ? store.tzOffset : -180;
        const anchorDate = new Date(Date.now() + (tzOffset * 60 * 1000));

        const { start, end } = getPeriodRange(period, start_date, end_date, anchorDate);
        const endDateObj = new Date(end);
        const startDateObj = new Date(start);

        const currentYear = endDateObj.getUTCFullYear();
        const prevYear = currentYear - 1;

        // Filtro de departamento e vendedor
        const df = buildDeptoFilter(deptoId, 4, 'v');
        const vf = buildVendedorFilter(vendedorId, 4 + df.params.length, 'v', req.user?.allowedSellers);

        // Filtro de marca opcional
        let marcaClause = '';
        let marcaParams = [];
        if (marca && marca !== 'todas' && marca !== 'all' && marca !== 'TODAS') {
            const nextIdx = 4 + df.params.length + vf.params.length;
            marcaClause = ` AND EXISTS (
                SELECT 1 FROM dash_vendas_itens vi2 
                LEFT JOIN dash_produtos p2 ON p2.id_firebird = vi2.produto_id_firebird AND p2.tenant_id = vi2.tenant_id
                WHERE vi2.venda_id_firebird = v.id_firebird AND vi2.tenant_id = v.tenant_id
                  AND UPPER(TRIM(COALESCE(vi2.marca, p2.marca, ''))) = UPPER(TRIM($${nextIdx}))
            )`;
            marcaParams.push(marca);
        }

        const allExtraParams = [...df.params, ...vf.params, ...marcaParams];
        const salesFilter = cfopUtil.getSalesFilterClause('v');

        // Ranges para os comparativos
        // 1. Mês Anterior (período anterior de mesmo tamanho ou mês anterior)
        const diffTime = Math.abs(endDateObj.getTime() - startDateObj.getTime());
        const prevEndObj = new Date(startDateObj.getTime() - 1);
        const prevStartObj = new Date(prevEndObj.getTime() - diffTime);
        const prevStartStr = require('../utils/period').toSafeSqlString(prevStartObj);
        const prevEndStr = require('../utils/period').toSafeSqlString(prevEndObj);

        // 2. Mesmo Período Ano Anterior (-1 ano)
        const samePeriodPrevYearStartObj = new Date(startDateObj);
        samePeriodPrevYearStartObj.setUTCFullYear(currentYear - 1);
        const samePeriodPrevYearEndObj = new Date(endDateObj);
        samePeriodPrevYearEndObj.setUTCFullYear(currentYear - 1);
        const samePeriodPrevYearStartStr = require('../utils/period').toSafeSqlString(samePeriodPrevYearStartObj);
        const samePeriodPrevYearEndStr = require('../utils/period').toSafeSqlString(samePeriodPrevYearEndObj);

        // 3. YTD Ano Atual (01/Jan até o corte)
        const ytdCurrentStartStr = `${currentYear}-01-01 00:00:00`;
        const ytdCurrentEndStr = require('../utils/period').toSafeSqlString(endDateObj);

        // 4. YTD Ano Anterior (01/Jan até o mesmo corte no ano anterior)
        const ytdPrevStartStr = `${prevYear}-01-01 00:00:00`;
        const ytdPrevEndObj = new Date(endDateObj);
        ytdPrevEndObj.setUTCFullYear(prevYear);
        const ytdPrevEndStr = require('../utils/period').toSafeSqlString(ytdPrevEndObj);

        // 5. Ano Anterior Fechado Completo (12 Meses)
        const prevYearFullStartStr = `${prevYear}-01-01 00:00:00`;
        const prevYearFullEndStr = `${prevYear}-12-31 23:59:59`;

        const queryVendas = (startStr, endStr) => {
            return db.query(`
                SELECT 
                    COALESCE(SUM(v.valor_total - COALESCE(v.valor_desconto, 0)), 0) AS total,
                    COUNT(DISTINCT v.id_firebird) AS qtd_pedidos,
                    COUNT(DISTINCT v.cliente_id_firebird) AS clientes_unicos
                FROM dash_vendas v
                WHERE v.tenant_id = $1 
                  AND COALESCE(v.data_hora_proc, v.data_vencimento, v.data_venda) >= $2 
                  AND COALESCE(v.data_hora_proc, v.data_vencimento, v.data_venda) <= $3 
                  ${salesFilter} ${df.clause} ${vf.clause} ${marcaClause}
            `, [tenantId, startStr, endStr, ...allExtraParams]);
        };

        const [
            vAtual,
            vPrevPeriod,
            vSameMonthPrevYear,
            vYtdCurrent,
            vYtdPrev,
            vPrevYearFull,
            topSellersRes,
            topClientsRes,
            topBrandsRes,
            topCitiesRes,
            totalClientsBaseRes
        ] = await Promise.all([
            queryVendas(start, end),
            queryVendas(prevStartStr, prevEndStr),
            queryVendas(samePeriodPrevYearStartStr, samePeriodPrevYearEndStr),
            queryVendas(ytdCurrentStartStr, ytdCurrentEndStr),
            queryVendas(ytdPrevStartStr, ytdPrevEndStr),
            queryVendas(prevYearFullStartStr, prevYearFullEndStr),

            // Top Vendedor
            db.query(`
                SELECT COALESCE(NULLIF(TRIM(vd.nome), ''), 'Vendedor ' || COALESCE(v.vendedor_id_firebird::text, '?')) AS nome, 
                       SUM(v.valor_total - COALESCE(v.valor_desconto, 0)) AS total
                FROM dash_vendas v
                LEFT JOIN dash_vendedores vd ON vd.id_firebird = v.vendedor_id_firebird AND vd.tenant_id = v.tenant_id
                WHERE v.tenant_id = $1 
                  AND COALESCE(v.data_hora_proc, v.data_vencimento, v.data_venda) >= $2 
                  AND COALESCE(v.data_hora_proc, v.data_vencimento, v.data_venda) <= $3 
                  ${salesFilter} ${df.clause} ${vf.clause} ${marcaClause}
                GROUP BY 1
                ORDER BY total DESC LIMIT 1
            `, [tenantId, start, end, ...allExtraParams]),

            // Top Cliente
            db.query(`
                SELECT COALESCE(c.nome, v.cliente_nome, 'CLIENTE') AS nome, SUM(v.valor_total - COALESCE(v.valor_desconto, 0)) AS total
                FROM dash_vendas v
                LEFT JOIN dash_clientes c ON c.id_firebird = v.cliente_id_firebird AND c.tenant_id = v.tenant_id
                WHERE v.tenant_id = $1 
                  AND COALESCE(v.data_hora_proc, v.data_vencimento, v.data_venda) >= $2 
                  AND COALESCE(v.data_hora_proc, v.data_vencimento, v.data_venda) <= $3 
                  ${salesFilter} ${df.clause} ${vf.clause} ${marcaClause}
                GROUP BY COALESCE(c.nome, v.cliente_nome, 'CLIENTE')
                ORDER BY total DESC LIMIT 1
            `, [tenantId, start, end, ...allExtraParams]),

            // Top Marca
            db.query(`
                WITH vf AS (
                    SELECT v.id_firebird, v.tenant_id, v.valor_total, v.valor_desconto
                    FROM dash_vendas v
                    WHERE v.tenant_id = $1
                      AND COALESCE(v.data_hora_proc, v.data_vencimento, v.data_venda) >= $2
                      AND COALESCE(v.data_hora_proc, v.data_vencimento, v.data_venda) <= $3
                      ${salesFilter} ${df.clause} ${vf.clause}
                )
                SELECT COALESCE(NULLIF(TRIM(COALESCE(vi.marca, p.marca)), ''), 'S/ MARCA') AS nome, 
                       SUM(COALESCE(vi.valor_total * (1 - COALESCE(vf.valor_desconto, 0) / NULLIF(vf.valor_total, 0)) * (CASE WHEN vf.valor_total < 0 THEN -1 ELSE 1 END), 0)) AS total
                FROM dash_vendas_itens vi
                JOIN vf ON vf.id_firebird = vi.venda_id_firebird AND vf.tenant_id = vi.tenant_id
                LEFT JOIN dash_produtos p ON p.id_firebird = vi.produto_id_firebird AND p.tenant_id = vi.tenant_id
                WHERE vi.tenant_id = $1
                  AND COALESCE(vi.marca, p.marca) IS NOT NULL AND COALESCE(vi.marca, p.marca) != ''
                GROUP BY 1 ORDER BY total DESC LIMIT 1
            `, [tenantId, start, end, ...df.params, ...vf.params]),

            // Top Cidade
            db.query(`
                SELECT COALESCE(NULLIF(TRIM(c.cidade), ''), 'NÃO INFORMADA') AS nome, 
                       SUM(v.valor_total - COALESCE(v.valor_desconto, 0)) AS total
                FROM dash_vendas v
                LEFT JOIN dash_clientes c ON c.id_firebird = v.cliente_id_firebird AND c.tenant_id = v.tenant_id
                WHERE v.tenant_id = $1 
                  AND COALESCE(v.data_hora_proc, v.data_vencimento, v.data_venda) >= $2 
                  AND COALESCE(v.data_hora_proc, v.data_vencimento, v.data_venda) <= $3 
                  ${salesFilter} ${df.clause} ${vf.clause} ${marcaClause}
                GROUP BY 1 ORDER BY total DESC LIMIT 1
            `, [tenantId, start, end, ...allExtraParams]),

            // Total de clientes ativos na base
            db.query(`SELECT COUNT(*) AS total FROM dash_clientes WHERE tenant_id = $1 AND ativo = true`, [tenantId])
        ]);

        const faturamentoAtual = parseFloat(vAtual.rows[0]?.total || 0);
        const qtdPedidos = parseInt(vAtual.rows[0]?.qtd_pedidos || 0, 10);
        const clientesAtivos = parseInt(vAtual.rows[0]?.clientes_unicos || 0, 10);
        const totalClientesBase = parseInt(totalClientsBaseRes.rows[0]?.total || 0, 10);
        const ticketMedio = qtdPedidos > 0 ? faturamentoAtual / qtdPedidos : 0;

        const faturamentoMesAnterior = parseFloat(vPrevPeriod.rows[0]?.total || 0);
        const faturamentoMesmoMesAnoAnt = parseFloat(vSameMonthPrevYear.rows[0]?.total || 0);
        const ytdAtual = parseFloat(vYtdCurrent.rows[0]?.total || 0);
        const ytdAnterior = parseFloat(vYtdPrev.rows[0]?.total || 0);
        const totalAnoAnterior12m = parseFloat(vPrevYearFull.rows[0]?.total || 0);

        // Crescimentos
        const crescMesAnterior = faturamentoMesAnterior > 0 ? ((faturamentoAtual - faturamentoMesAnterior) / faturamentoMesAnterior) * 100 : 0;
        const crescMesmoMesAnoAnt = faturamentoMesmoMesAnoAnt > 0 ? ((faturamentoAtual - faturamentoMesmoMesAnoAnt) / faturamentoMesmoMesAnoAnt) * 100 : 0;
        const crescYtd = ytdAnterior > 0 ? ((ytdAtual - ytdAnterior) / ytdAnterior) * 100 : 0;

        // Superação ano fechado
        const superacaoValor = ytdAtual - totalAnoAnterior12m;
        const superacaoPct = totalAnoAnterior12m > 0 ? (ytdAtual / totalAnoAnterior12m) * 100 : 0;

        // Highlights com share percentual
        const melhorVendedor = topSellersRes.rows[0] ? {
            nome: topSellersRes.rows[0].nome,
            total: parseFloat(topSellersRes.rows[0].total),
            pct_share: faturamentoAtual > 0 ? (parseFloat(topSellersRes.rows[0].total) / faturamentoAtual) * 100 : 0
        } : { nome: 'N/A', total: 0, pct_share: 0 };

        const melhorCliente = topClientsRes.rows[0] ? {
            nome: topClientsRes.rows[0].nome,
            total: parseFloat(topClientsRes.rows[0].total),
            pct_share: faturamentoAtual > 0 ? (parseFloat(topClientsRes.rows[0].total) / faturamentoAtual) * 100 : 0
        } : { nome: 'N/A', total: 0, pct_share: 0 };

        const marcaMaisVendida = topBrandsRes.rows[0] ? {
            nome: topBrandsRes.rows[0].nome,
            total: parseFloat(topBrandsRes.rows[0].total),
            pct_share: faturamentoAtual > 0 ? (parseFloat(topBrandsRes.rows[0].total) / faturamentoAtual) * 100 : 0
        } : { nome: 'N/A', total: 0, pct_share: 0 };

        const cidadeDestaque = topCitiesRes.rows[0] ? {
            nome: topCitiesRes.rows[0].nome,
            total: parseFloat(topCitiesRes.rows[0].total),
            pct_share: faturamentoAtual > 0 ? (parseFloat(topCitiesRes.rows[0].total) / faturamentoAtual) * 100 : 0
        } : { nome: 'N/A', total: 0, pct_share: 0 };

        // Taxa de recompra estimada
        const taxaRecompra = totalClientesBase > 0 ? (clientesAtivos / totalClientesBase) * 100 : 0;

        const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        const currentMonthName = months[endDateObj.getUTCMonth()];
        const prevMonthName = months[(endDateObj.getUTCMonth() + 11) % 12];

        res.json({
            success: true,
            years: { current: currentYear, prev: prevYear },
            periodo_atual_label: `${currentMonthName} / ${currentYear}`,
            periodo_anterior_label: `${prevMonthName} / ${currentYear}`,
            periodo_mesmo_mes_ano_ant_label: `${currentMonthName} / ${prevYear}`,
            corte_label_atual: `01/Jan até ${currentMonthName} / ${currentYear}`,
            corte_label_anterior: `01/Jan a corte de ${prevYear}`,
            faturamento_atual: faturamentoAtual,
            faturamento_mes_anterior: faturamentoMesAnterior,
            cresc_mes_anterior: crescMesAnterior,
            faturamento_mesmo_mes_ano_ant: faturamentoMesmoMesAnoAnt,
            cresc_mesmo_mes_ano_ant: crescMesmoMesAnoAnt,
            ytd_atual: ytdAtual,
            ytd_anterior: ytdAnterior,
            cresc_ytd: crescYtd,
            total_ano_anterior_12m: totalAnoAnterior12m,
            superacao_valor: superacaoValor,
            superacao_pct: superacaoPct,
            qtd_pedidos: qtdPedidos,
            ticket_medio: ticketMedio,
            taxa_recompra: taxaRecompra,
            clientes_com_compra: clientesAtivos,
            total_clientes_base: totalClientesBase,
            highlights: {
                melhor_vendedor: melhorVendedor,
                melhor_cliente: melhorCliente,
                marca_mais_vendida: marcaMaisVendida,
                cidade_destaque: cidadeDestaque
            }
        });
    } catch (err) {
        next(err);
    }
});

// GET /api/estatisticas/kpis
router.get('/kpis', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const period = req.query.period || 'last12m';
        const { start_date, end_date } = req.query;
        const deptoId = req.query.depto_id;
        const vendedorId = req.query.vendedor_id;

        const store = db.dbContext.getStore();
        const tzOffset = store ? store.tzOffset : -180;
        const anchorKpi = new Date(Date.now() + (tzOffset * 60 * 1000));
        const { start, end } = getPeriodRange(period, start_date, end_date, anchorKpi);

        const df = buildDeptoFilter(deptoId, 4, 'v');
        const dfFin = buildDeptoFilter(deptoId, 4, 'f');
        const dfVi = buildDeptoFilter(deptoId, 4, 'vi');
        const dfV = buildDeptoFilter(deptoId, 4, 'v');  // para uso em CTEs com alias 'v'

        const vf = buildVendedorFilter(vendedorId, 4 + df.params.length, 'v', req.user?.allowedSellers);
        const vfVi = buildVendedorFilter(vendedorId, 4 + dfVi.params.length, 'v', req.user?.allowedSellers);
        const vfV = buildVendedorFilter(vendedorId, 4 + dfV.params.length, 'v', req.user?.allowedSellers);  // para CTEs com alias 'v'

        const salesFilter = cfopUtil.getSalesFilterClause('v');

        const getDevQuery = (startStr, endStr) => {
            const needsJoin = (vendedorId && vendedorId !== 'todas' && vendedorId !== 'all' && vendedorId !== 'TODOS') || (req.user?.allowedSellers !== null && req.user?.allowedSellers !== undefined);
            // Sistema Coliseu unificado: sem branches VET
            let sql = `SELECT COALESCE(SUM(d.valor),0) AS total FROM dash_devolucoes d LEFT JOIN dash_vendas v2 ON v2.id_firebird = d.venda_id_firebird AND v2.tenant_id = d.tenant_id WHERE d.tenant_id = $1 AND d.data_devolucao >= $2 AND d.data_devolucao <= $3 ${df.clause.replace(/v\./g, 'v2.')}`;
            let params = [tenantId, startStr, endStr, ...df.params];
            let nextIdx = 4 + df.params.length;
            if (needsJoin) {
                const vfDev = buildVendedorFilter(vendedorId, nextIdx, 'v2', req.user?.allowedSellers);
                sql += vfDev.clause;
                params.push(...vfDev.params);
            }
            return { sql, params };
        };

        const devQuery = getDevQuery(start, end);

        const [salesRes, devRes, fRes, topCatsRes, rCliRes, rTotCliRes, topClientesRes, rEstRes, topProdRes] = await Promise.all([
            db.query(`
                SELECT 
                    COALESCE(SUM(v.valor_total), 0) AS total_bruto,
                    COUNT(DISTINCT v.id_firebird) AS qtd_pedidos,
                    COALESCE(SUM(v.valor_desconto), 0) AS total_descontos,
                    (SELECT COALESCE(SUM(vi.quantidade * (CASE WHEN v2.valor_total < 0 THEN -1 ELSE 1 END)), 0) FROM dash_vendas_itens vi JOIN dash_vendas v2 ON v2.id_firebird = vi.venda_id_firebird AND v2.tenant_id = vi.tenant_id WHERE v2.tenant_id = $1 AND COALESCE(v2.data_hora_proc, v2.data_vencimento, v2.data_venda) >= $2 AND COALESCE(v2.data_hora_proc, v2.data_vencimento, v2.data_venda) <= $3 ${salesFilter.replace(/v\./g, 'v2.')} ${df.clause.replace(/v\./g, 'v2.')} ${vf.clause.replace(/v\./g, 'v2.')}) AS qtd_itens
                FROM dash_vendas v
                WHERE v.tenant_id = $1 AND COALESCE(v.data_hora_proc, v.data_vencimento, v.data_venda) >= $2 AND COALESCE(v.data_hora_proc, v.data_vencimento, v.data_venda) <= $3 ${salesFilter} ${df.clause} ${vf.clause}
            `, [tenantId, start, end, ...df.params, ...vf.params]),
            db.query(devQuery.sql, devQuery.params),
            db.query(`
                SELECT 
                    COALESCE(SUM(CASE WHEN TRIM(f.tipo) = 'RECEBER' AND TRIM(f.status_pagamento) = 'ABERTO' AND COALESCE(f.data_vencimento, f.data_emissao, NOW()) >= $2 AND COALESCE(f.data_vencimento, f.data_emissao, NOW()) <= $3 THEN f.valor - (CASE WHEN f.valor_pago = 0 THEN 0 ELSE f.valor_pago END) ELSE 0 END), 0) AS a_receber,
                    COALESCE(SUM(CASE WHEN TRIM(f.tipo) = 'RECEBER' AND TRIM(f.status_pagamento) = 'PAGO' AND COALESCE(f.data_pagamento, f.data_vencimento, NOW()) >= $2 AND COALESCE(f.data_pagamento, f.data_vencimento, NOW()) <= $3 THEN (CASE WHEN f.valor_pago = 0 THEN f.valor ELSE f.valor_pago END) ELSE 0 END), 0) AS recebido,
                    COALESCE(SUM(CASE WHEN TRIM(f.tipo) = 'PAGAR' AND TRIM(f.status_pagamento) = 'ABERTO' AND COALESCE(f.data_vencimento, f.data_emissao, NOW()) >= $2 AND COALESCE(f.data_vencimento, f.data_emissao, NOW()) <= $3 THEN f.valor - (CASE WHEN f.valor_pago = 0 THEN 0 ELSE f.valor_pago END) ELSE 0 END), 0) AS a_pagar
                FROM dash_financeiro f
                WHERE f.tenant_id = $1 
                  AND (
                      (TRIM(f.status_pagamento) = 'ABERTO' AND COALESCE(f.data_vencimento, f.data_emissao, NOW()) >= $2 AND COALESCE(f.data_vencimento, f.data_emissao, NOW()) <= $3)
                      OR
                      (TRIM(f.status_pagamento) = 'PAGO' AND COALESCE(f.data_pagamento, f.data_vencimento, NOW()) >= $2 AND COALESCE(f.data_pagamento, f.data_vencimento, NOW()) <= $3)
                  )${dfFin.clause}
            `, [tenantId, start, end, ...dfFin.params]),
            db.query(`
                WITH vf AS NOT MATERIALIZED (
                    SELECT v.id_firebird, v.tenant_id, v.valor_total, v.valor_desconto
                    FROM dash_vendas v
                    WHERE v.tenant_id = $1 AND v.data_hora_proc >= $2 AND v.data_hora_proc <= $3
                      ${salesFilter} ${dfV.clause} ${vfV.clause}
                )
                SELECT COALESCE(vi.categoria, p.categoria, 'S/ GRUPO') as categoria, 
                       SUM(COALESCE(vi.valor_total * (1 - COALESCE(vf.valor_desconto, 0) / NULLIF(vf.valor_total, 0)) * (CASE WHEN vf.valor_total < 0 THEN -1 ELSE 1 END), 0)) AS total
                FROM dash_vendas_itens vi
                JOIN vf ON vf.id_firebird = vi.venda_id_firebird AND vf.tenant_id = vi.tenant_id
                LEFT JOIN dash_produtos p ON p.id_firebird = vi.produto_id_firebird AND p.tenant_id = vi.tenant_id
                WHERE vi.tenant_id = $1
                  AND COALESCE(vi.categoria, p.categoria) IS NOT NULL AND COALESCE(vi.categoria, p.categoria) != ''
                GROUP BY 1 ORDER BY total DESC LIMIT 5
            `, [tenantId, start, end, ...dfV.params, ...vfV.params]),
            db.query(`SELECT COUNT(DISTINCT v.cliente_id_firebird) AS ativos FROM dash_vendas v WHERE v.tenant_id = $1 AND v.data_hora_proc >= $2 AND v.data_hora_proc <= $3 ${salesFilter} ${df.clause} ${vf.clause}`, [tenantId, start, end, ...df.params, ...vf.params]),
            db.query(`SELECT COUNT(*) AS total FROM dash_clientes WHERE tenant_id = $1 AND ativo = true`, [tenantId]),
            db.query(`
                SELECT COALESCE(c.nome, 'Cliente ' || COALESCE(v.cliente_id_firebird::text, '?')) AS nome, SUM(v.valor_total - COALESCE(v.valor_desconto, 0)) AS total
                FROM dash_vendas v
                LEFT JOIN dash_clientes c ON c.id_firebird = v.cliente_id_firebird AND c.tenant_id = v.tenant_id
                WHERE v.tenant_id = $1 AND v.data_hora_proc >= $2 AND v.data_hora_proc <= $3 ${salesFilter} ${df.clause} ${vf.clause}
                GROUP BY COALESCE(c.nome, 'Cliente ' || COALESCE(v.cliente_id_firebird::text, '?'))
                ORDER BY total DESC LIMIT 5
            `, [tenantId, start, end, ...df.params, ...vf.params]),
            db.query(`SELECT COALESCE(SUM(estoque), 0) AS qtd, COALESCE(SUM(estoque * preco), 0) AS valor FROM dash_produtos WHERE tenant_id = $1 AND ativo = true`, [tenantId]),
            db.query(`
                SELECT COALESCE(vi.produto, p.nome, 'Sem nome') AS nome, SUM(vi.quantidade * (CASE WHEN v.valor_total < 0 THEN -1 ELSE 1 END)) AS qtd
                FROM dash_vendas_itens vi
                JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id
                LEFT JOIN dash_produtos p ON p.id_firebird = vi.produto_id_firebird AND p.tenant_id = vi.tenant_id
                WHERE vi.tenant_id = $1 AND v.data_hora_proc >= $2 AND v.data_hora_proc <= $3 ${salesFilter} ${dfVi.clause} ${vfVi.clause}
                GROUP BY 1
                ORDER BY qtd DESC LIMIT 1
            `, [tenantId, start, end, ...dfVi.params, ...vfVi.params])
        ]);

        const salesData = salesRes.rows[0];
        const devData = devRes.rows[0];
        const f = fRes.rows;
        const topCats = topCatsRes.rows;
        const rCli = rCliRes.rows;
        const rTotCli = rTotCliRes.rows;
        const topClientes = topClientesRes.rows;
        const rEst = rEstRes.rows;
        const topProd = topProdRes.rows;

        const totalBruto = parseFloat(salesData.total_bruto);
        const totalDev = parseFloat(devData.total);
        const totalDescontos = parseFloat(salesData.total_descontos);
        const faturamentoLiquido = totalBruto - totalDev - totalDescontos;
        const qtdPedidos = parseInt(salesData.qtd_pedidos, 10);
        const ticketMedio = qtdPedidos > 0 ? faturamentoLiquido / qtdPedidos : 0;

        const clientesAtivos = parseInt(rCli[0].ativos, 10);
        const totalClientes = parseInt(rTotCli[0].total, 10);
        const taxa_conversao_pct = totalClientes > 0 ? (clientesAtivos / totalClientes) * 100 : 0;

        res.json({
            period: { start, end, label: period },
            vendas: {
                faturamento: faturamentoLiquido,
                qtd_pedidos: qtdPedidos,
                qtd_itens: parseFloat(salesData.qtd_itens || 0),
                ticket_medio: ticketMedio,
                total_descontos: totalDescontos
            },
            financeiro: {
                a_receber: parseFloat(f[0].a_receber),
                recebido: parseFloat(f[0].recebido),
                a_pagar: parseFloat(f[0].a_pagar)
            },
            kpis: {
                clientes_ativos: clientesAtivos,
                total_clientes: totalClientes,
                ticket_medio: ticketMedio,
                top_clientes: topClientes.map(c => ({ nome: c.nome, total: parseFloat(c.total) })),
                estoque: {
                    qtd: parseFloat(rEst[0].qtd),
                    valor: parseFloat(rEst[0].valor)
                },
                taxa_conversao_pct,
                produto_mais_vendido: topProd.length > 0 ? topProd[0].nome : '—',
                top_categorias: topCats.map(r => ({ categoria: r.categoria, total: parseFloat(r.total) }))
            }
        });
    } catch (err) { next(err); }
});

// GET /api/estatisticas/debug-db
router.get('/debug-db', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const v = await db.query('SELECT COUNT(*) as c FROM dash_vendas WHERE tenant_id = $1', [tenantId]);
        const f = await db.query('SELECT COUNT(*) as c FROM dash_financeiro WHERE tenant_id = $1', [tenantId]);
        const p = await db.query('SELECT COUNT(*) as c FROM dash_produtos WHERE tenant_id = $1', [tenantId]);
        const c = await db.query('SELECT COUNT(*) as c FROM dash_clientes WHERE tenant_id = $1', [tenantId]);
        res.json({
            vendas: v.rows[0].c,
            financeiro: f.rows[0].c,
            produtos: p.rows[0].c,
            clientes: c.rows[0].c,
            tenant_usado: tenantId
        });
    } catch (err) {
        next(err);
    }
});


// GET /api/estatisticas/debug-vendas-hoje
router.get('/debug-vendas-hoje', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const { rows } = await db.query(`SELECT numero_pedido, valor_total, data_venda FROM dash_vendas WHERE tenant_id = $1 ORDER BY id DESC LIMIT 10`, [tenantId]);
        res.json({ ultimas_vendas: rows });
    } catch (err) { next(err); }
});
module.exports = router;
