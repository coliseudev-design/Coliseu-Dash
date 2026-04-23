'use strict';

const express = require('express');
const router = express.Router();
const db = require('../db/postgres');

/**
 * Calcula range de datas relativo à data máxima no banco (âncora).
 * Garante que bases Firebird antigas sempre apareçam nos filtros.
 */
async function getAnchoredRange(tenantId, period, start_date, end_date) {
    const { rows } = await db.query(
        `SELECT COALESCE(MAX(data_venda), NOW()) as anchor FROM dash_vendas WHERE tenant_id = $1`,
        [tenantId]
    );
    const anchor = new Date(rows[0].anchor);
    let start = new Date(anchor);
    let end = new Date(anchor);
    end.setHours(23, 59, 59, 999);

    switch (period) {
        case 'today': case 'hoje':
            start.setHours(0, 0, 0, 0);
            break;
        case 'yesterday':
            start.setDate(start.getDate() - 1);
            start.setHours(0, 0, 0, 0);
            end = new Date(start);
            end.setHours(23, 59, 59, 999);
            break;
        case 'last7': case '7d':
            start.setDate(start.getDate() - 7);
            break;
        case 'thisMonth': case '1m':
            start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
            end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 23, 59, 59);
            break;
        case 'lastMonth':
            start = new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1);
            end = new Date(anchor.getFullYear(), anchor.getMonth(), 0, 23, 59, 59);
            break;
        case 'custom':
            if (start_date && end_date) {
                return { start: new Date(start_date), end: new Date(end_date) };
            }
            start.setFullYear(start.getFullYear() - 1);
            break;
        case 'all':
            start = new Date(1970, 0, 1);
            break;
        case 'last12m': case '1y': default:
            start.setFullYear(start.getFullYear() - 1);
            break;
    }

    return { start, end };
}

// GET /api/ranking/vendedores
router.get('/vendedores', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const { start, end } = await getAnchoredRange(tenantId, req.query.period || 'last12m', req.query.start_date, req.query.end_date);
        const limit = parseInt(req.query.limit) || 10;

        const { rows } = await db.query(`
            SELECT 
                v.vendedor_id_firebird AS id,
                COALESCE(vd.nome, 'Vendedor ' || COALESCE(v.vendedor_id_firebird::text, '?')) AS nome,
                SUM(v.valor_total) AS total,
                COUNT(DISTINCT v.id_firebird) AS qtd_pedidos,
                AVG(v.valor_total) AS ticket_medio
            FROM dash_vendas v
            LEFT JOIN dash_vendedores vd ON vd.id_firebird = v.vendedor_id_firebird AND vd.tenant_id = v.tenant_id
            WHERE v.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3
            GROUP BY v.vendedor_id_firebird, vd.nome
            ORDER BY total DESC LIMIT $4
        `, [tenantId, start, end, limit]);

        res.json({ data: rows.map(r => ({
            id: r.id, nome: r.nome,
            total: parseFloat(r.total || 0),
            qtd_pedidos: parseInt(r.qtd_pedidos),
            ticket_medio: parseFloat(r.ticket_medio || 0)
        })) });
    } catch (err) { next(err); }
});

// GET /api/ranking/produtos
router.get('/produtos', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const { start, end } = await getAnchoredRange(tenantId, req.query.period || 'last12m', req.query.start_date, req.query.end_date);
        const limit = parseInt(req.query.limit) || 10;

        const { rows } = await db.query(`
            SELECT 
                COALESCE(vi.produto, 'Produto ' || COALESCE(vi.produto_id_firebird::text, '?')) AS nome,
                SUM(vi.valor_total) AS total,
                SUM(vi.quantidade) AS qtd_vendida,
                AVG(vi.preco_unitario) AS preco_medio
            FROM dash_vendas_itens vi
            JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id
            WHERE vi.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3
              AND COALESCE(vi.produto, vi.produto_id_firebird::text) IS NOT NULL
            GROUP BY COALESCE(vi.produto, 'Produto ' || COALESCE(vi.produto_id_firebird::text, '?'))
            ORDER BY total DESC LIMIT $4
        `, [tenantId, start, end, limit]);

        res.json({ data: rows.map(r => ({
            nome: r.nome, total: parseFloat(r.total || 0),
            qtd_vendida: parseFloat(r.qtd_vendida || 0),
            preco_medio: parseFloat(r.preco_medio || 0)
        })) });
    } catch (err) { next(err); }
});

// GET /api/ranking/clientes
router.get('/clientes', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const { start, end } = await getAnchoredRange(tenantId, req.query.period || 'last12m', req.query.start_date, req.query.end_date);
        const limit = parseInt(req.query.limit) || 10;

        const { rows } = await db.query(`
            SELECT 
                v.cliente_id_firebird AS id,
                COALESCE(c.nome, 'Cliente ' || COALESCE(v.cliente_id_firebird::text, '?')) AS nome,
                SUM(v.valor_total) AS total,
                COUNT(DISTINCT v.id_firebird) AS qtd_pedidos
            FROM dash_vendas v
            LEFT JOIN dash_clientes c ON c.id_firebird = v.cliente_id_firebird AND c.tenant_id = v.tenant_id
            WHERE v.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3
            GROUP BY v.cliente_id_firebird, c.nome
            ORDER BY total DESC LIMIT $4
        `, [tenantId, start, end, limit]);

        res.json({ data: rows.map(r => ({
            id: r.id, nome: r.nome,
            total: parseFloat(r.total || 0),
            qtd_pedidos: parseInt(r.qtd_pedidos)
        })) });
    } catch (err) { next(err); }
});

// GET /api/ranking/marcas
router.get('/marcas', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const { start, end } = await getAnchoredRange(tenantId, req.query.period || 'last12m', req.query.start_date, req.query.end_date);
        const limit = parseInt(req.query.limit) || 10;

        const { rows } = await db.query(`
            SELECT 
                COALESCE(vi.marca, v.marca) AS marca,
                SUM(vi.valor_total) AS total,
                COUNT(*) AS qtd_itens
            FROM dash_vendas_itens vi
            JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id
            WHERE vi.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3
              AND COALESCE(vi.marca, v.marca) IS NOT NULL AND COALESCE(vi.marca, v.marca) != ''
            GROUP BY COALESCE(vi.marca, v.marca)
            ORDER BY total DESC LIMIT $4
        `, [tenantId, start, end, limit]);

        res.json({ data: rows.map(r => ({
            nome: r.marca, total: parseFloat(r.total || 0),
            qtd_itens: parseInt(r.qtd_itens)
        })) });
    } catch (err) { next(err); }
});

// GET /api/ranking/especies
router.get('/especies', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const { start, end } = await getAnchoredRange(tenantId, req.query.period || 'last12m', req.query.start_date, req.query.end_date);
        const limit = parseInt(req.query.limit) || 10;

        const { rows } = await db.query(`
            SELECT COALESCE(f.descricao, 'Outros') AS nome, SUM(f.valor_pago) AS total, COUNT(*) AS qtd
            FROM dash_financeiro f
            WHERE f.tenant_id = $1
              AND COALESCE(f.data_pagamento, f.data_vencimento) >= $2
              AND COALESCE(f.data_pagamento, f.data_vencimento) <= $3
              AND f.status_pagamento = 'PAGO'
            GROUP BY f.descricao ORDER BY total DESC LIMIT $4
        `, [tenantId, start, end, limit]);

        res.json({ data: rows.map(r => ({
            nome: r.nome, total: parseFloat(r.total || 0), qtd: parseInt(r.qtd)
        })) });
    } catch (err) { next(err); }
});

// GET /api/ranking/ranking (alias para /comissoes/ranking)
router.get('/ranking', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const { start, end } = await getAnchoredRange(tenantId, req.query.period || 'last12m', req.query.start_date, req.query.end_date);
        const limit = parseInt(req.query.limit) || 10;

        const { rows } = await db.query(`
            SELECT 
                v.vendedor_id_firebird AS id,
                COALESCE(vd.nome, 'Vendedor ' || COALESCE(v.vendedor_id_firebird::text, '?')) AS nome,
                SUM(v.valor_total) AS faturamento,
                COUNT(DISTINCT v.id_firebird) AS qtd_pedidos,
                AVG(v.valor_total) AS ticket_medio
            FROM dash_vendas v
            LEFT JOIN dash_vendedores vd ON vd.id_firebird = v.vendedor_id_firebird AND vd.tenant_id = v.tenant_id
            WHERE v.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3
            GROUP BY v.vendedor_id_firebird, vd.nome
            ORDER BY faturamento DESC LIMIT $4
        `, [tenantId, start, end, limit]);

        res.json({ data: rows.map(r => ({
            id: r.id, nome: r.nome,
            faturamento: parseFloat(r.faturamento || 0),
            qtd_pedidos: parseInt(r.qtd_pedidos),
            ticket_medio: parseFloat(r.ticket_medio || 0)
        })) });
    } catch (err) { next(err); }
});

module.exports = router;
