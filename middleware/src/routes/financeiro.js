'use strict';

const express = require('express');
const router = express.Router();
const db = require('../db/postgres');
const { getPeriodRange } = require('../utils/period');

/**
 * Usa MAX(data_emissao) do financeiro como âncora para filtros de período.
 * Garante que dados antigos do Firebird sempre apareçam.
 */
async function getFinanceiroAnchor(tenantId, period, start_date, end_date) {
    const { rows } = await db.query(
        `SELECT COALESCE(MAX(data_emissao), MAX(data_vencimento), NOW()) as anchor FROM dash_financeiro WHERE tenant_id = $1`,
        [tenantId]
    );
    const anchor = new Date(rows[0].anchor);
    const { getPeriodRange } = require('../utils/period');
    // Calcula usando a âncora como se fosse 'agora'
    const fakeNow = anchor;
    let start = new Date(fakeNow);
    let end = new Date(fakeNow);
    end.setHours(23, 59, 59, 999);

    switch (period) {
        case 'today': case 'hoje': start.setHours(0, 0, 0, 0); break;
        case 'yesterday':
            start.setDate(start.getDate() - 1); start.setHours(0, 0, 0, 0);
            end = new Date(start); end.setHours(23, 59, 59, 999); break;
        case 'last7': case '7d': start.setDate(start.getDate() - 7); break;
        case 'thisMonth': case '1m':
            start = new Date(fakeNow.getFullYear(), fakeNow.getMonth(), 1);
            end = new Date(fakeNow.getFullYear(), fakeNow.getMonth() + 1, 0, 23, 59, 59); break;
        case 'lastMonth':
            start = new Date(fakeNow.getFullYear(), fakeNow.getMonth() - 1, 1);
            end = new Date(fakeNow.getFullYear(), fakeNow.getMonth(), 0, 23, 59, 59); break;
        case 'custom':
            if (start_date && end_date) return { start: new Date(start_date), end: new Date(end_date) };
            start.setFullYear(start.getFullYear() - 1); break;
        case 'all': start = new Date(1970, 0, 1); break;
        case 'last12m': case '1y': default:
            start.setFullYear(start.getFullYear() - 1); break;
    }
    return { start, end };
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
        const filterCaixa = caixaId ? ` AND caixa_id_firebird = ${parseInt(caixaId)}` : '';
        const { rows } = await db.query(`
            SELECT 
                ${CAT_SQL} AS status,
                COUNT(*) AS quantidade,
                SUM(valor) AS total
            FROM dash_financeiro
            WHERE tenant_id = $1 
              AND TRIM(tipo) = 'RECEBER'
              ${filterCaixa}
            GROUP BY 1
            ORDER BY 1
        `, [tenantId]);

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
        const filterCaixa = caixaId ? ` AND caixa_id_firebird = ${parseInt(caixaId)}` : '';
        const { rows } = await db.query(`
            SELECT 
                ${CAT_SQL} AS status,
                COUNT(*) AS quantidade,
                SUM(valor) AS total
            FROM dash_financeiro
            WHERE tenant_id = $1 
              AND TRIM(tipo) = 'PAGAR'
              ${filterCaixa}
            GROUP BY 1
            ORDER BY 1
        `, [tenantId]);

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

// GET /api/financeiro/fluxo-caixa
router.get('/fluxo-caixa', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const caixaId = req.query.caixa_id;
        const filterCaixa = caixaId ? ` AND caixa_id_firebird = ${parseInt(caixaId)}` : '';
        const period = req.query.period || 'last12m';
        const { start, end } = await getFinanceiroAnchor(tenantId, period, req.query.start_date, req.query.end_date);

        const { rows } = await db.query(`
            SELECT 
                TO_CHAR(COALESCE(data_pagamento, data_vencimento), 'YYYY-MM-DD') AS data,
                SUM(CASE WHEN TRIM(tipo) = 'RECEBER' AND TRIM(status_pagamento) = 'PAGO' THEN (CASE WHEN valor_pago = 0 THEN valor ELSE valor_pago END) ELSE 0 END) AS entradas,
                SUM(CASE WHEN TRIM(tipo) = 'PAGAR' AND TRIM(status_pagamento) = 'PAGO' THEN (CASE WHEN valor_pago = 0 THEN valor ELSE valor_pago END) ELSE 0 END) AS saidas
            FROM dash_financeiro
            WHERE tenant_id = $1
              AND COALESCE(data_pagamento, data_vencimento) >= $2
              AND COALESCE(data_pagamento, data_vencimento) <= $3
              ${filterCaixa}
            GROUP BY TO_CHAR(COALESCE(data_pagamento, data_vencimento), 'YYYY-MM-DD')
            ORDER BY data
        `, [tenantId, start, end]);

        let acc = 0;
        const data = rows.map((r) => {
            const entradas = parseFloat(r.entradas || 0);
            const saidas = parseFloat(r.saidas || 0);
            acc += entradas - saidas;
            return {
                data: r.data,
                entradas,
                saidas,
                saldo: acc
            };
        });

        res.json({ period: { start, end, label: period }, data });
    } catch (err) {
        next(err);
    }
});

// GET /api/financeiro/kpis
router.get('/kpis', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const caixaId = req.query.caixa_id;
        const filterCaixa = caixaId ? ` AND caixa_id_firebird = ${parseInt(caixaId)}` : '';

        const [rReceber, rPagar, rVencidas, rGeral, rDmp] = await Promise.all([
            db.query(`SELECT COALESCE(SUM(valor - valor_pago), 0) AS v FROM dash_financeiro WHERE tenant_id = $1 AND TRIM(tipo) = 'RECEBER' AND TRIM(status_pagamento) = 'ABERTO' ${filterCaixa}`, [tenantId]),
            db.query(`SELECT COALESCE(SUM(valor - valor_pago), 0) AS v FROM dash_financeiro WHERE tenant_id = $1 AND TRIM(tipo) = 'PAGAR' AND TRIM(status_pagamento) = 'ABERTO' ${filterCaixa}`, [tenantId]),
            db.query(`SELECT COALESCE(SUM(valor - valor_pago), 0) AS vencidas_valor, COUNT(*) AS vencidas_qtd FROM dash_financeiro WHERE tenant_id = $1 AND TRIM(tipo) = 'RECEBER' AND TRIM(status_pagamento) = 'ABERTO' AND data_vencimento < NOW() ${filterCaixa}`, [tenantId]),
            db.query(`SELECT COALESCE(SUM(valor), 0) AS total_geral FROM dash_financeiro WHERE tenant_id = $1 AND TRIM(tipo) = 'RECEBER' ${filterCaixa}`, [tenantId]),
            db.query(`SELECT AVG(EXTRACT(EPOCH FROM (data_pagamento - data_emissao))/86400) AS dias FROM dash_financeiro WHERE tenant_id = $1 AND TRIM(tipo) = 'RECEBER' AND TRIM(status_pagamento) = 'PAGO' AND data_pagamento IS NOT NULL AND data_emissao IS NOT NULL ${filterCaixa}`, [tenantId])
        ]);

        const totalReceberGeral = parseFloat(rGeral.rows[0]?.total_geral || 0);
        const vencidasValor = parseFloat(rVencidas.rows[0]?.vencidas_valor || 0);
        const inadimp = totalReceberGeral > 0 ? (vencidasValor / totalReceberGeral) * 100 : 0;
        const totalReceber = parseFloat(rReceber.rows[0]?.v || 0);
        const totalPagar = parseFloat(rPagar.rows[0]?.v || 0);

        res.json({
            kpis: {
                total_receber: totalReceber,
                total_pagar: totalPagar,
                saldo_liquido: totalReceber - totalPagar,
                inadimplencia_pct: Number(inadimp.toFixed(2)),
                vencidas_qtd: parseInt(rVencidas.rows[0]?.vencidas_qtd || 0, 10),
                vencidas_valor: vencidasValor,
                dias_medio_recebimento: Number(parseFloat(rDmp.rows[0]?.dias || 0).toFixed(1)),
            }
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
        const filterCaixa = caixaId ? ` AND caixa_id_firebird = ${parseInt(caixaId)}` : '';
        const period = req.query.period || 'last12m';
        const { start, end } = await getFinanceiroAnchor(tenantId, period, req.query.start_date, req.query.end_date);

        const totP = await db.query(`
            SELECT
                COALESCE(SUM(CASE WHEN TRIM(tipo) = 'RECEBER' AND TRIM(status_pagamento) = 'PAGO' AND COALESCE(data_pagamento, data_vencimento) >= $2 AND COALESCE(data_pagamento, data_vencimento) <= $3 THEN (CASE WHEN valor_pago = 0 THEN valor ELSE valor_pago END) ELSE 0 END), 0) AS entradas,
                COALESCE(SUM(CASE WHEN TRIM(tipo) = 'PAGAR' AND TRIM(status_pagamento) = 'PAGO' AND COALESCE(data_pagamento, data_vencimento) >= $2 AND COALESCE(data_pagamento, data_vencimento) <= $3 THEN (CASE WHEN valor_pago = 0 THEN valor ELSE valor_pago END) ELSE 0 END), 0) AS saidas,
                COUNT(DISTINCT CASE WHEN TRIM(tipo) = 'RECEBER' AND TRIM(status_pagamento) = 'PAGO' AND COALESCE(data_pagamento, data_vencimento) >= $2 AND COALESCE(data_pagamento, data_vencimento) <= $3 THEN id END) AS qtd_entradas,
                COUNT(DISTINCT CASE WHEN TRIM(tipo) = 'PAGAR' AND TRIM(status_pagamento) = 'PAGO' AND COALESCE(data_pagamento, data_vencimento) >= $2 AND COALESCE(data_pagamento, data_vencimento) <= $3 THEN id END) AS qtd_saidas
            FROM dash_financeiro
            WHERE tenant_id = $1
              ${filterCaixa}
        `, [tenantId, start, end]);

        const movP = await db.query(`
            SELECT 
                TO_CHAR(COALESCE(data_pagamento, data_vencimento), 'YYYY-MM-DD') AS data,
                SUM(CASE WHEN TRIM(tipo) = 'RECEBER' THEN (CASE WHEN valor_pago = 0 THEN valor ELSE valor_pago END) ELSE 0 END) AS entradas,
                SUM(CASE WHEN TRIM(tipo) = 'PAGAR' THEN (CASE WHEN valor_pago = 0 THEN valor ELSE valor_pago END) ELSE 0 END) AS saidas
            FROM dash_financeiro
            WHERE tenant_id = $1 
              AND TRIM(status_pagamento) = 'PAGO'
              AND COALESCE(data_pagamento, data_vencimento) >= $2 
              AND COALESCE(data_pagamento, data_vencimento) <= $3
              ${filterCaixa}
            GROUP BY TO_CHAR(COALESCE(data_pagamento, data_vencimento), 'YYYY-MM-DD')
            ORDER BY data
        `, [tenantId, start, end]);

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

        const entradas = parseFloat(totP.rows[0].entradas || 0);
        const saidas = parseFloat(totP.rows[0].saidas || 0);
        const qtd_entradas = parseInt(totP.rows[0].qtd_entradas || 0, 10);
        const qtd_saidas = parseInt(totP.rows[0].qtd_saidas || 0, 10);

        res.json({
            period: { start, end, label: period },
            kpis: {
                entradas,
                saidas,
                saldo: entradas - saidas,
                qtd_entradas,
                qtd_saidas,
                ticket_medio_entrada: qtd_entradas > 0 ? (entradas / qtd_entradas) : 0
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
              AND v.data_venda >= $2 AND v.data_venda <= $3
              AND v.status = 'FINALIZADO'
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
              AND v.data_venda >= $2 AND v.data_venda <= $3
              AND v.status = 'FINALIZADO'
            GROUP BY COALESCE(NULLIF(p.categoria, ''), 'Sem categoria')
            ORDER BY total DESC
        `, [tenantId, start, end]);

        const totP = await db.query(`
            SELECT SUM(i.valor_total) AS total, SUM(i.quantidade) AS quantidade
            FROM dash_vendas_itens i
            INNER JOIN dash_vendas v ON v.id_firebird = i.venda_id_firebird AND v.tenant_id = i.tenant_id
            WHERE i.tenant_id = $1
              AND v.data_venda >= $2 AND v.data_venda <= $3
              AND v.status = 'FINALIZADO'
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
        const limit = parseInt(req.query.limit, 10) || 100;
        const tenantId = req.tenant.id;

        const where = ['f.tenant_id = $1'];
        const binds = [tenantId];
        let pIndex = 2;

        if (tipo) {
            where.push(`TRIM(f.tipo) = $${pIndex++}`);
            binds.push(tipo.trim());
        }
        
        if (req.query.caixa_id) {
            where.push(`f.caixa_id_firebird = $${pIndex++}`);
            binds.push(parseInt(req.query.caixa_id));
        }

        if (statusPg === 'VENCIDA') {
            where.push(`TRIM(f.status_pagamento) = 'ABERTO' AND f.data_vencimento < NOW()`);
        } else if (statusPg) {
            where.push(`TRIM(f.status_pagamento) = $${pIndex++}`);
            binds.push(statusPg.trim());
        }

        binds.push(limit);
        const limitIdx = pIndex;

        const sql = `
            SELECT 
                f.id_firebird AS id, f.tipo, f.descricao, f.data_emissao, f.data_vencimento, f.data_pagamento,
                f.valor, f.valor_pago, f.status_pagamento,
                c.nome AS cliente
            FROM dash_financeiro f
            LEFT JOIN dash_clientes c ON c.id_firebird = f.cliente_id_firebird AND c.tenant_id = f.tenant_id
            WHERE ${where.join(' AND ')}
            ORDER BY f.data_vencimento DESC
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
