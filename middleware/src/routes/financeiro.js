'use strict';

const express = require('express');
const router = express.Router();
const db = require('../db/postgres');
const { getPeriodRange } = require('../utils/period');
const cfopUtil = require('../utils/cfop');
const { buildDeptoFilter } = require('./filiais');

/**
 * Âncora precisa baseada no fuso horário do tenant/sistema.
 * Garante que filtros de período funcionem com as datas reais de negócio.
 */
async function getFinanceiroAnchor(tenantId, period, start_date, end_date) {
    const store = db.dbContext ? db.dbContext.getStore() : null;
    const tzOffset = store ? store.tzOffset : -180;
    const anchor = new Date(Date.now() + (tzOffset * 60 * 1000));
    const { getPeriodRange, parseDateString } = require('../utils/period');
    const pr = getPeriodRange(period, start_date, end_date, anchor);
    return {
        start: parseDateString(pr.start),
        end: parseDateString(pr.end)
    };
}

// Helper: classifica conta 
const CAT_SQL = `
  CASE
    WHEN TRIM(status_pagamento) = 'PAGO' THEN 'PAGA'
    WHEN TRIM(status_pagamento) = 'CANCELADO' THEN 'CANCELADA'
    WHEN data_vencimento < NOW() THEN 'VENCIDA'
    WHEN data_vencimento <= NOW() + INTERVAL '30 days' THEN 'A_VENCER'
    ELSE 'FUTURA'
  END
`;

// GET /api/financeiro/contas-receber
router.get('/contas-receber', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const caixaId = req.query.caixa_id;
        const filterCaixa = (caixaId && caixaId !== 'todos') ? ` AND f.caixa_id_firebird = ${parseInt(caixaId)}` : '';
        const deptoId = req.query.depto_id || req.query.centro_custo;
        const df = buildDeptoFilter(deptoId, 2, 'f');
        const { rows } = await db.query(`
            SELECT 
                ${CAT_SQL} AS status,
                COUNT(*) AS quantidade,
                SUM(CASE WHEN TRIM(f.status_pagamento) = 'PAGO' THEN (CASE WHEN f.valor_pago = 0 THEN f.valor ELSE f.valor_pago END) ELSE (f.valor - COALESCE(f.valor_pago, 0)) END) AS total
            FROM dash_financeiro f
            WHERE f.tenant_id = $1 
              AND TRIM(f.tipo) = 'RECEBER'
              ${filterCaixa}
              ${df.clause}
            GROUP BY 1
            ORDER BY 1
        `, [tenantId, ...df.params]);

        const formatted = rows.map(r => ({
            status: r.status,
            quantidade: parseInt(r.quantidade, 10),
            total: parseFloat(r.total || 0)
        }));

        res.json({ data: formatted });
    } catch (err) {
        next(err);
    }
});

// GET /api/financeiro/contas-pagar
router.get('/contas-pagar', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const caixaId = req.query.caixa_id;
        const filterCaixa = (caixaId && caixaId !== 'todos') ? ` AND f.caixa_id_firebird = ${parseInt(caixaId)}` : '';
        const deptoId = req.query.depto_id || req.query.centro_custo;
        const df = buildDeptoFilter(deptoId, 2, 'f');
        const { rows } = await db.query(`
            SELECT 
                ${CAT_SQL} AS status,
                COUNT(*) AS quantidade,
                SUM(CASE WHEN TRIM(f.status_pagamento) = 'PAGO' THEN (CASE WHEN f.valor_pago = 0 THEN f.valor ELSE f.valor_pago END) ELSE (f.valor - COALESCE(f.valor_pago, 0)) END) AS total
            FROM dash_financeiro f
            WHERE f.tenant_id = $1 
              AND TRIM(f.tipo) = 'PAGAR'
              ${filterCaixa}
              ${df.clause}
            GROUP BY 1
            ORDER BY 1
        `, [tenantId, ...df.params]);

        const formatted = rows.map(r => ({
            status: r.status,
            quantidade: parseInt(r.quantidade, 10),
            total: parseFloat(r.total || 0)
        }));

        res.json({ data: formatted });
    } catch (err) {
        next(err);
    }
});

// GET /api/financeiro/resumo-mes
router.get('/resumo-mes', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const caixaId = req.query.caixa_id;
        const filterCaixa = (caixaId && caixaId !== 'todos') ? ` AND f.caixa_id_firebird = ${parseInt(caixaId)}` : '';
        const { start, end } = await getFinanceiroAnchor(tenantId, req.query.period || 'thisMonth', req.query.start_date, req.query.end_date);
        const deptoId = req.query.depto_id || req.query.centro_custo;
        const df = buildDeptoFilter(deptoId, 4, 'f');

        const { rows } = await db.query(`
            SELECT
                SUM(CASE WHEN TRIM(f.tipo) = 'RECEBER' AND TRIM(f.status_pagamento) = 'PAGO' AND f.data_pagamento >= $2 AND f.data_pagamento <= $3 THEN (CASE WHEN f.valor_pago = 0 THEN f.valor ELSE f.valor_pago END) ELSE 0 END) AS total_recebido,
                SUM(CASE WHEN TRIM(f.tipo) = 'RECEBER' AND TRIM(f.status_pagamento) = 'ABERTO' AND f.data_vencimento >= $2 AND f.data_vencimento <= $3 THEN (f.valor - COALESCE(f.valor_pago, 0)) ELSE 0 END) AS total_a_receber,
                SUM(CASE WHEN TRIM(f.tipo) = 'PAGAR' AND TRIM(f.status_pagamento) = 'PAGO' AND f.data_pagamento >= $2 AND f.data_pagamento <= $3 THEN (CASE WHEN f.valor_pago = 0 THEN f.valor ELSE f.valor_pago END) ELSE 0 END) AS total_pago,
                SUM(CASE WHEN TRIM(f.tipo) = 'PAGAR' AND TRIM(f.status_pagamento) = 'ABERTO' AND f.data_vencimento >= $2 AND f.data_vencimento <= $3 THEN (f.valor - COALESCE(f.valor_pago, 0)) ELSE 0 END) AS total_a_pagar,
                COUNT(DISTINCT CASE WHEN TRIM(f.tipo) = 'RECEBER' AND TRIM(f.status_pagamento) = 'ABERTO' AND f.data_vencimento < NOW() AND (f.valor - COALESCE(f.valor_pago, 0)) > 0 THEN f.id END) AS qtd_inadimplentes,
                SUM(CASE WHEN TRIM(f.tipo) = 'RECEBER' AND TRIM(f.status_pagamento) = 'ABERTO' AND f.data_vencimento < NOW() THEN (f.valor - COALESCE(f.valor_pago, 0)) ELSE 0 END) AS total_inadimplente
            FROM dash_financeiro f
            WHERE f.tenant_id = $1 
              ${filterCaixa}
              ${df.clause}
        `, [tenantId, start, end, ...df.params]);

        const r = rows[0] || {};
        res.json({
            period: { start, end },
            resumo: {
                total_recebido: parseFloat(r.total_recebido || 0),
                total_a_receber: parseFloat(r.total_a_receber || 0),
                total_pago: parseFloat(r.total_pago || 0),
                total_a_pagar: parseFloat(r.total_a_pagar || 0),
                qtd_inadimplentes: parseInt(r.qtd_inadimplentes || 0, 10),
                total_inadimplente: parseFloat(r.total_inadimplente || 0),
                saldo_projetado: (parseFloat(r.total_recebido || 0) + parseFloat(r.total_a_receber || 0)) -
                                 (parseFloat(r.total_pago || 0) + parseFloat(r.total_a_pagar || 0))
            }
        });
    } catch (err) {
        next(err);
    }
});

// GET /api/financeiro/fluxo-caixa
router.get('/fluxo-caixa', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const caixaId = req.query.caixa_id;
        const filterCaixa = (caixaId && caixaId !== 'todos') ? ` AND f.caixa_id_firebird = ${parseInt(caixaId)}` : '';
        const { start, end } = await getFinanceiroAnchor(tenantId, req.query.period || 'thisMonth', req.query.start_date, req.query.end_date);
        const deptoId = req.query.depto_id || req.query.centro_custo;
        const df = buildDeptoFilter(deptoId, 4, 'f');

        const { rows } = await db.query(`
            SELECT 
                TO_CHAR(COALESCE(f.data_pagamento, f.data_vencimento), 'YYYY-MM-DD') AS data,
                SUM(CASE WHEN TRIM(f.tipo) = 'RECEBER' THEN (CASE WHEN f.valor_pago = 0 THEN f.valor ELSE f.valor_pago END) ELSE 0 END) AS entradas,
                SUM(CASE WHEN TRIM(f.tipo) = 'PAGAR' THEN (CASE WHEN f.valor_pago = 0 THEN f.valor ELSE f.valor_pago END) ELSE 0 END) AS saidas
            FROM dash_financeiro f
            WHERE f.tenant_id = $1 
              AND TRIM(f.status_pagamento) = 'PAGO'
              AND COALESCE(f.data_pagamento, f.data_vencimento) >= $2 
              AND COALESCE(f.data_pagamento, f.data_vencimento) <= $3
              ${filterCaixa}
              ${df.clause}
            GROUP BY TO_CHAR(COALESCE(f.data_pagamento, f.data_vencimento), 'YYYY-MM-DD')
            ORDER BY data
        `, [tenantId, start, end, ...df.params]);

        let acc = 0;
        const result = rows.map(r => {
            const ent = parseFloat(r.entradas || 0);
            const sai = parseFloat(r.saidas || 0);
            acc += ent - sai;
            return {
                data: r.data,
                entradas: ent,
                saidas: sai,
                saldo_do_dia: ent - sai,
                saldo_acumulado: acc
            };
        });

        res.json({
            period: { start, end },
            fluxo: result
        });
    } catch (err) {
        next(err);
    }
});

// GET /api/financeiro/caixa?period=
router.get('/caixa', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const caixaId = req.query.caixa_id;
        const filterCaixa = (caixaId && caixaId !== 'todos') ? ` AND f.caixa_id_firebird = ${parseInt(caixaId)}` : '';
        const period = req.query.period || 'last12m';
        const { start, end } = await getFinanceiroAnchor(tenantId, period, req.query.start_date, req.query.end_date);
        const deptoId = req.query.depto_id || req.query.centro_custo;
        const df = buildDeptoFilter(deptoId, 4, 'f');
        const dfVendas = buildDeptoFilter(deptoId, 4, 'v');

        const totP = await db.query(`
            SELECT
                COALESCE(SUM(CASE WHEN TRIM(f.tipo) = 'RECEBER' AND TRIM(f.status_pagamento) = 'PAGO' AND COALESCE(f.data_pagamento, f.data_vencimento) >= $2 AND COALESCE(f.data_pagamento, f.data_vencimento) <= $3 THEN (CASE WHEN f.valor_pago = 0 THEN f.valor ELSE f.valor_pago END) ELSE 0 END), 0) AS entradas,
                COALESCE(SUM(CASE WHEN TRIM(f.tipo) = 'PAGAR' AND TRIM(f.status_pagamento) = 'PAGO' AND COALESCE(f.data_pagamento, f.data_vencimento) >= $2 AND COALESCE(f.data_pagamento, f.data_vencimento) <= $3 THEN (CASE WHEN f.valor_pago = 0 THEN f.valor ELSE f.valor_pago END) ELSE 0 END), 0) AS saidas,
                COUNT(DISTINCT CASE WHEN TRIM(f.tipo) = 'RECEBER' AND TRIM(f.status_pagamento) = 'PAGO' AND COALESCE(f.data_pagamento, f.data_vencimento) >= $2 AND COALESCE(f.data_pagamento, f.data_vencimento) <= $3 THEN f.id END) AS qtd_entradas,
                COUNT(DISTINCT CASE WHEN TRIM(f.tipo) = 'PAGAR' AND TRIM(f.status_pagamento) = 'PAGO' AND COALESCE(f.data_pagamento, f.data_vencimento) >= $2 AND COALESCE(f.data_pagamento, f.data_vencimento) <= $3 THEN f.id END) AS qtd_saidas
            FROM dash_financeiro f
            WHERE f.tenant_id = $1
              ${filterCaixa}
              ${df.clause}
        `, [tenantId, start, end, ...df.params]);

        // Saldos do Caixa agrupados por tipo de espécie (DINHEIRO, CARTÃO DÉBITO, CARTÃO CRÉDITO, PIX, CHEQUE)
        const saldosEspP = await db.query(`
            SELECT 
                CASE 
                    WHEN UPPER(COALESCE(v.especie, f.descricao, '')) LIKE '%DINHEIRO%' THEN 'DINHEIRO'
                    WHEN UPPER(COALESCE(v.especie, f.descricao, '')) LIKE '%DEBITO%' OR UPPER(COALESCE(v.especie, f.descricao, '')) LIKE '%DÉBITO%' THEN 'CARTAO DEBITO'
                    WHEN UPPER(COALESCE(v.especie, f.descricao, '')) LIKE '%CREDITO%' OR UPPER(COALESCE(v.especie, f.descricao, '')) LIKE '%CRÉDITO%' OR UPPER(COALESCE(v.especie, f.descricao, '')) LIKE '%CARTAO%' OR UPPER(COALESCE(v.especie, f.descricao, '')) LIKE '%CARTÃO%' THEN 'CARTAO CREDITO'
                    WHEN UPPER(COALESCE(v.especie, f.descricao, '')) LIKE '%PIX%' THEN 'PIX'
                    WHEN UPPER(COALESCE(v.especie, f.descricao, '')) LIKE '%CHEQUE%' THEN 'CHEQUE'
                    ELSE 'DINHEIRO'
                END AS especie_grupo,
                COALESCE(SUM(CASE WHEN TRIM(f.tipo) = 'RECEBER' THEN COALESCE(f.valor_pago, f.valor) ELSE -COALESCE(f.valor_pago, f.valor) END), 0) AS saldo_especie
            FROM dash_financeiro f
            LEFT JOIN dash_vendas v ON v.tenant_id = f.tenant_id
              AND (v.id_firebird = f.venda_id_firebird OR (v.cliente_id_firebird = f.cliente_id_firebird AND ABS(v.valor_total - COALESCE(v.valor_desconto, 0) - f.valor) < 0.01))
            WHERE f.tenant_id = $1
              AND TRIM(f.status_pagamento) = 'PAGO'
              AND COALESCE(f.data_pagamento, f.data_vencimento) >= $2 
              AND COALESCE(f.data_pagamento, f.data_vencimento) <= $3
              ${filterCaixa}
              ${df.clause}
            GROUP BY 1
            ORDER BY saldo_especie DESC
        `, [tenantId, start, end, ...df.params]);

        // Consulta de Vendas por Espécie (Vendas à Vista no Caixa e Vendas a Prazo)
        const vendasEspP = await db.query(`
            WITH raw_vendas AS (
                SELECT v.id_firebird, v.especie, v.valor_total, v.depto_id, v.data_venda
                FROM dash_vendas v
                WHERE v.tenant_id = $1
                  AND COALESCE(v.data_hora_proc, v.data_vencimento, v.data_venda) >= $2 
                  AND COALESCE(v.data_hora_proc, v.data_vencimento, v.data_venda) <= $3
                  ${cfopUtil.getSalesFilterClause('v')}
                  ${dfVendas.clause}
            ),
            split_especies AS (
                SELECT 
                    v.id_firebird,
                    trim(split_part(s.elem, ':', 1)) as especie_nome,
                    CASE 
                        WHEN split_part(s.elem, ':', 2) ~ '^[0-9]+(\.[0-9]+)?$' 
                        THEN split_part(s.elem, ':', 2)::numeric 
                        ELSE v.valor_total 
                    END as valor_especie
                FROM raw_vendas v
                CROSS JOIN LATERAL unnest(string_to_array(v.especie, '|')) AS s(elem)
                WHERE v.especie IS NOT NULL AND TRIM(v.especie) <> ''
            )
            SELECT 
                CASE 
                    WHEN UPPER(especie_nome) LIKE '%CARTAO%' OR UPPER(especie_nome) LIKE '%CARTÃO%' OR UPPER(especie_nome) LIKE '%DINHEIRO%' OR UPPER(especie_nome) LIKE '%PIX%' THEN 'VISTA_CAIXA'
                    ELSE 'PRAZO'
                END as grupo,
                especie_nome,
                COUNT(*) as qtd,
                SUM(valor_especie) as total
            FROM split_especies
            GROUP BY 1, 2
            ORDER BY 1, total DESC
        `, [tenantId, start, end, ...dfVendas.params]);

        const movP = await db.query(`
            SELECT 
                TO_CHAR(COALESCE(f.data_pagamento, f.data_vencimento), 'YYYY-MM-DD') AS data,
                SUM(CASE WHEN TRIM(f.tipo) = 'RECEBER' THEN (CASE WHEN f.valor_pago = 0 THEN f.valor ELSE f.valor_pago END) ELSE 0 END) AS entradas,
                SUM(CASE WHEN TRIM(f.tipo) = 'PAGAR' THEN (CASE WHEN f.valor_pago = 0 THEN f.valor ELSE f.valor_pago END) ELSE 0 END) AS saidas
            FROM dash_financeiro f
            WHERE f.tenant_id = $1 
              AND TRIM(f.status_pagamento) = 'PAGO'
              AND COALESCE(f.data_pagamento, f.data_vencimento) >= $2 
              AND COALESCE(f.data_pagamento, f.data_vencimento) <= $3
              ${filterCaixa}
              ${df.clause}
            GROUP BY TO_CHAR(COALESCE(f.data_pagamento, f.data_vencimento), 'YYYY-MM-DD')
            ORDER BY data
        `, [tenantId, start, end, ...df.params]);

        let acc = 0;
        const movimentacoes = movP.rows.map(m => {
            const entradas = parseFloat(m.entradas || 0);
            const saidas = parseFloat(m.saidas || 0);
            acc += entradas - saidas;
            return {
                data: m.data,
                entradas,
                saidas,
                saldo_acumulado: acc
            };
        });

        const entradas = parseFloat(totP.rows[0]?.entradas || 0);
        const saidas = parseFloat(totP.rows[0]?.saidas || 0);
        const qtd_entradas = parseInt(totP.rows[0]?.qtd_entradas || 0, 10);
        const qtd_saidas = parseInt(totP.rows[0]?.qtd_saidas || 0, 10);

        // Separa Vendas por Espécie em Vista (Caixa) vs A Prazo
        const vendasVista = [];
        let subtotalVista = 0;
        const vendasPrazo = [];
        let subtotalPrazo = 0;

        for (const row of vendasEspP.rows) {
            const item = {
                nome: row.especie_nome,
                qtd: parseInt(row.qtd || 0, 10),
                total: parseFloat(row.total || 0)
            };
            if (row.grupo === 'VISTA_CAIXA') {
                vendasVista.push(item);
                subtotalVista += item.total;
            } else {
                vendasPrazo.push(item);
                subtotalPrazo += item.total;
            }
        }

        const saldosPorEspecie = saldosEspP.rows.map(r => ({
            nome: r.especie_grupo,
            total: parseFloat(r.saldo_especie || 0)
        }));

        res.json({
            period: { start, end, label: period },
            kpis: {
                entradas,
                saidas,
                saldo: entradas - saidas,
                qtd_entradas,
                qtd_saidas,
                saldos_especies: saldosPorEspecie,
                ticket_medio_entrada: qtd_entradas > 0 ? (entradas / qtd_entradas) : 0
            },
            vendas_por_especie: {
                vista_caixa: {
                    itens: vendasVista,
                    subtotal: subtotalVista
                },
                prazo: {
                    itens: vendasPrazo,
                    subtotal: subtotalPrazo
                },
                total_geral: subtotalVista + subtotalPrazo
            },
            movimentacoes
        });
    } catch (err) {
        next(err);
    }
});

// GET /api/financeiro/especies-vendidas
router.get('/especies-vendidas', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const period = req.query.period || '30d';
        const { start, end } = await getFinanceiroAnchor(tenantId, period, req.query.start_date, req.query.end_date);
        const limit = parseInt(req.query.limit, 10) || 15;

        const prodP = await db.query(`
            SELECT 
                p.id_firebird AS id,
                p.codigo,
                p.nome,
                p.categoria,
                SUM(i.quantidade) AS quantidade_vendida,
                SUM(i.valor_total) AS total_vendido,
                COUNT(DISTINCT i.venda_id_firebird) AS qtd_vendas,
                AVG(i.preco_unitario) AS preco_medio
            FROM dash_vendas_itens i
            INNER JOIN dash_vendas v ON v.id_firebird = i.venda_id_firebird AND v.tenant_id = i.tenant_id
            INNER JOIN dash_produtos p ON p.id_firebird = i.produto_id_firebird AND p.tenant_id = i.tenant_id
            WHERE i.tenant_id = $1
              AND COALESCE(v.data_vencimento, v.data_venda) >= $2 AND COALESCE(v.data_vencimento, v.data_venda) <= $3
              ${cfopUtil.getSalesFilterClause('v')}
            GROUP BY p.id_firebird, p.codigo, p.nome, p.categoria
            ORDER BY total_vendido DESC
            LIMIT $4
        `, [tenantId, start, end, limit]);

        const catP = await db.query(`
            SELECT 
                COALESCE(NULLIF(p.categoria, ''), 'Sem categoria') AS categoria,
                SUM(i.quantidade) AS quantidade,
                SUM(i.valor_total) AS total
            FROM dash_vendas_itens i
            INNER JOIN dash_vendas v ON v.id_firebird = i.venda_id_firebird AND v.tenant_id = i.tenant_id
            INNER JOIN dash_produtos p ON p.id_firebird = i.produto_id_firebird AND p.tenant_id = i.tenant_id
            WHERE i.tenant_id = $1
              AND COALESCE(v.data_vencimento, v.data_venda) >= $2 AND COALESCE(v.data_vencimento, v.data_venda) <= $3
              ${cfopUtil.getSalesFilterClause('v')}
            GROUP BY COALESCE(NULLIF(p.categoria, ''), 'Sem categoria')
            ORDER BY total DESC
        `, [tenantId, start, end]);

        const totP = await db.query(`
            SELECT SUM(i.valor_total) AS total, SUM(i.quantidade) AS quantidade
            FROM dash_vendas_itens i
            INNER JOIN dash_vendas v ON v.id_firebird = i.venda_id_firebird AND v.tenant_id = i.tenant_id
            WHERE i.tenant_id = $1
              AND COALESCE(v.data_vencimento, v.data_venda) >= $2 AND COALESCE(v.data_vencimento, v.data_venda) <= $3
              ${cfopUtil.getSalesFilterClause('v')}
        `, [tenantId, start, end]);

        res.json({
            period: { start, end, label: period },
            total: {
                valor: parseFloat(totP.rows[0]?.total || 0),
                quantidade: parseFloat(totP.rows[0]?.quantidade || 0)
            },
            produtos: prodP.rows.map(r => ({ ...r, total_vendido: parseFloat(r.total_vendido), quantidade_vendida: parseFloat(r.quantidade_vendida) })),
            categorias: catP.rows.map(r => ({ ...r, total: parseFloat(r.total), quantidade: parseFloat(r.quantidade) }))
        });

    } catch (err) {
        next(err);
    }
});

// GET /api/financeiro/contas
router.get('/contas', async (req, res, next) => {
    try {
        const tipo = req.query.tipo;
        const statusPg = req.query.status;
        const apenasVendas = req.query.apenas_vendas === 'true' || req.query.apenas_vendas === true;
        const limit = parseInt(req.query.limit, 10) || 150;
        const tenantId = req.tenant.id;

        // Resolve período (period=hoje/semana/mes/custom + start_date/end_date)
        const { start, end } = await getFinanceiroAnchor(
            tenantId,
            req.query.period,
            req.query.start_date,
            req.query.end_date
        );

        const where = ['f.tenant_id = $1'];
        const binds = [tenantId];
        let pIndex = 2;

        if (tipo) {
            where.push(`TRIM(f.tipo) = $${pIndex++}`);
            binds.push(tipo.trim());
        }

        if (req.query.caixa_id && req.query.caixa_id !== 'todos') {
            where.push(`f.caixa_id_firebird = $${pIndex++}`);
            binds.push(parseInt(req.query.caixa_id));
        }

        if (statusPg === 'VENCIDA') {
            where.push(`TRIM(f.status_pagamento) = 'ABERTO' AND f.data_vencimento < NOW()`);
        } else if (statusPg) {
            where.push(`TRIM(f.status_pagamento) = $${pIndex++}`);
            binds.push(statusPg.trim());
        }

        const deptoId = req.query.depto_id || req.query.centro_custo;
        const df = buildDeptoFilter(deptoId, pIndex, 'f');
        if (df.clause) {
            where.push(df.clause.replace(/^\s*AND\s+/i, ''));
            binds.push(...df.params);
            pIndex += df.params.length;
        }

        // Filtro de período resolvido (sempre aplicado)
        where.push(`COALESCE(f.data_pagamento, f.data_vencimento) >= $${pIndex++}`);
        binds.push(start);
        where.push(`COALESCE(f.data_pagamento, f.data_vencimento) <= $${pIndex++}`);
        binds.push(end);

        if (apenasVendas) {
            where.push(`(v.id_firebird IS NOT NULL OR f.venda_id_firebird IS NOT NULL OR UPPER(f.descricao) LIKE '%CONSUMIDOR%' OR UPPER(f.descricao) LIKE '%PEDIDO%')`);
        }

        binds.push(limit);
        const limitIdx = pIndex;

        const sql = `
            SELECT 
                f.id_firebird AS id, f.tipo, f.descricao, f.data_emissao, f.data_vencimento, f.data_pagamento,
                f.valor, f.valor_pago, f.status_pagamento,
                COALESCE(c.nome, f.descricao) AS cliente,
                COALESCE(v.numero_pedido, f.tipo_documento, '') AS numero_pedido,
                COALESCE(cx.descricao, 'CAIXA GERAL') AS nome_caixa,
                CASE 
                    WHEN v.id_firebird IS NOT NULL OR f.venda_id_firebird IS NOT NULL OR UPPER(f.descricao) LIKE '%CONSUMIDOR%' OR UPPER(f.descricao) LIKE '%PEDIDO%' THEN true 
                    ELSE false 
                END AS is_venda,
                TRIM(UPPER(COALESCE(
                    v.especie,
                    CASE 
                        WHEN UPPER(f.descricao) LIKE '%DEBITO%' OR UPPER(f.descricao) LIKE '%DÉBITO%' THEN 'CARTAO DEBITO'
                        WHEN UPPER(f.descricao) LIKE '%CREDITO%' OR UPPER(f.descricao) LIKE '%CRÉDITO%' OR UPPER(f.descricao) LIKE '%CARTAO%' OR UPPER(f.descricao) LIKE '%CARTÃO%' THEN 'CARTAO CREDITO'
                        WHEN UPPER(f.descricao) LIKE '%PIX%' THEN 'PIX'
                        WHEN UPPER(f.descricao) LIKE '%CHEQUE%' THEN 'CHEQUE'
                        WHEN UPPER(f.descricao) LIKE '%DINHEIRO%' THEN 'DINHEIRO'
                        ELSE 'DINHEIRO'
                    END
                ))) AS especie
            FROM dash_financeiro f
            LEFT JOIN dash_clientes c ON c.id_firebird = f.cliente_id_firebird AND c.tenant_id = f.tenant_id
            LEFT JOIN dash_caixas cx ON cx.id_firebird = f.caixa_id_firebird AND cx.tenant_id = f.tenant_id
            LEFT JOIN dash_vendas v ON v.tenant_id = f.tenant_id
              AND (v.id_firebird = f.venda_id_firebird OR (v.cliente_id_firebird = f.cliente_id_firebird AND ABS(v.valor_total - COALESCE(v.valor_desconto, 0) - f.valor) < 0.01))
            WHERE ${where.join(' AND ')}
            ORDER BY COALESCE(f.data_pagamento, f.data_vencimento) DESC, f.id_firebird DESC
            LIMIT $${limitIdx}
        `;

        const { rows } = await db.query(sql, binds);

        const formatted = rows.map(r => ({
            ...r,
            valor: parseFloat(r.valor),
            valor_pago: parseFloat(r.valor_pago)
        }));

        res.json({ data: formatted });
    } catch (err) {
        next(err);
    }
});


// GET /api/financeiro/caixas
router.get('/caixas', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const { rows } = await db.query(`
            SELECT id_firebird AS id, descricao AS nome
            FROM dash_caixas
            WHERE tenant_id = $1
            ORDER BY descricao ASC
        `, [tenantId]);
        res.json({ data: rows });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
