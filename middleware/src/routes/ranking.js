'use strict';

const express = require('express');
const router = express.Router();
const db = require('../db/postgres');
const { getPeriodRange } = require('../utils/period');

// GET /api/ranking/vendedores
router.get('/vendedores', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const period = req.query.period || 'last12m';
        const { start_date, end_date } = req.query;
        const limit = parseInt(req.query.limit) || 10;
        const { start, end } = getPeriodRange(period, start_date, end_date);

        const { rows } = await db.query(`
            SELECT 
                v.vendedor_id_firebird AS id,
                COALESCE(vd.nome, 'Vendedor ' || v.vendedor_id_firebird::text) AS nome,
                SUM(v.valor_total) AS total,
                COUNT(DISTINCT v.id_firebird) AS qtd_pedidos,
                AVG(v.valor_total) AS ticket_medio
            FROM dash_vendas v
            LEFT JOIN dash_vendedores vd ON vd.id_firebird = v.vendedor_id_firebird AND vd.tenant_id = v.tenant_id
            WHERE v.tenant_id = $1
              AND v.data_venda >= $2 AND v.data_venda <= $3
              AND v.status = 'FATURADO'
              AND v.vendedor_id_firebird IS NOT NULL
            GROUP BY v.vendedor_id_firebird, vd.nome
            ORDER BY total DESC
            LIMIT $4
        `, [tenantId, start, end, limit]);

        res.json({ data: rows.map(r => ({
            id: r.id,
            nome: r.nome,
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
        const period = req.query.period || 'last12m';
        const { start_date, end_date } = req.query;
        const limit = parseInt(req.query.limit) || 10;
        const { start, end } = getPeriodRange(period, start_date, end_date);

        const { rows } = await db.query(`
            SELECT 
                vi.produto AS nome,
                SUM(vi.valor_total) AS total,
                SUM(vi.quantidade) AS qtd_vendida,
                AVG(vi.preco_unitario) AS preco_medio
            FROM dash_vendas_itens vi
            JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id
            WHERE vi.tenant_id = $1
              AND v.data_venda >= $2 AND v.data_venda <= $3
              AND vi.produto IS NOT NULL AND vi.produto != ''
            GROUP BY vi.produto
            ORDER BY total DESC
            LIMIT $4
        `, [tenantId, start, end, limit]);

        res.json({ data: rows.map(r => ({
            nome: r.nome,
            total: parseFloat(r.total || 0),
            qtd_vendida: parseFloat(r.qtd_vendida || 0),
            preco_medio: parseFloat(r.preco_medio || 0)
        })) });
    } catch (err) { next(err); }
});

// GET /api/ranking/clientes
router.get('/clientes', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const period = req.query.period || 'last12m';
        const { start_date, end_date } = req.query;
        const limit = parseInt(req.query.limit) || 10;
        const { start, end } = getPeriodRange(period, start_date, end_date);

        const { rows } = await db.query(`
            SELECT 
                v.cliente_id_firebird AS id,
                COALESCE(c.nome, 'Cliente ' || v.cliente_id_firebird::text) AS nome,
                SUM(v.valor_total) AS total,
                COUNT(DISTINCT v.id_firebird) AS qtd_pedidos
            FROM dash_vendas v
            LEFT JOIN dash_clientes c ON c.id_firebird = v.cliente_id_firebird AND c.tenant_id = v.tenant_id
            WHERE v.tenant_id = $1
              AND v.data_venda >= $2 AND v.data_venda <= $3
              AND v.status = 'FATURADO'
              AND v.cliente_id_firebird IS NOT NULL
            GROUP BY v.cliente_id_firebird, c.nome
            ORDER BY total DESC
            LIMIT $4
        `, [tenantId, start, end, limit]);

        res.json({ data: rows.map(r => ({
            id: r.id,
            nome: r.nome,
            total: parseFloat(r.total || 0),
            qtd_pedidos: parseInt(r.qtd_pedidos)
        })) });
    } catch (err) { next(err); }
});

// GET /api/ranking/marcas
router.get('/marcas', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const period = req.query.period || 'last12m';
        const { start_date, end_date } = req.query;
        const limit = parseInt(req.query.limit) || 10;
        const { start, end } = getPeriodRange(period, start_date, end_date);

        const { rows } = await db.query(`
            SELECT 
                vi.marca,
                SUM(vi.valor_total) AS total,
                COUNT(*) AS qtd_itens
            FROM dash_vendas_itens vi
            JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id
            WHERE vi.tenant_id = $1
              AND v.data_venda >= $2 AND v.data_venda <= $3
              AND vi.marca IS NOT NULL AND vi.marca != ''
            GROUP BY vi.marca
            ORDER BY total DESC
            LIMIT $4
        `, [tenantId, start, end, limit]);

        res.json({ data: rows.map(r => ({
            nome: r.marca,
            total: parseFloat(r.total || 0),
            qtd_itens: parseInt(r.qtd_itens)
        })) });
    } catch (err) { next(err); }
});

// GET /api/ranking/especies
router.get('/especies', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const period = req.query.period || 'last12m';
        const { start_date, end_date } = req.query;
        const limit = parseInt(req.query.limit) || 10;
        const { start, end } = getPeriodRange(period, start_date, end_date);

        // Usa financeiro para agrupar por espécie de pagamento
        const { rows } = await db.query(`
            SELECT 
                COALESCE(f.descricao, 'Outros') AS nome,
                SUM(f.valor_pago) AS total,
                COUNT(*) AS qtd
            FROM dash_financeiro f
            WHERE f.tenant_id = $1
              AND f.data_pagamento >= $2 AND f.data_pagamento <= $3
              AND f.status_pagamento = 'PAGO'
            GROUP BY f.descricao
            ORDER BY total DESC
            LIMIT $4
        `, [tenantId, start, end, limit]);

        res.json({ data: rows.map(r => ({
            nome: r.nome,
            total: parseFloat(r.total || 0),
            qtd: parseInt(r.qtd)
        })) });
    } catch (err) { next(err); }
});

// GET /api/ranking/ranking (alias para /comissoes/ranking usado no frontend)
router.get('/ranking', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const period = req.query.period || 'last12m';
        const { start_date, end_date } = req.query;
        const limit = parseInt(req.query.limit) || 10;
        const { start, end } = getPeriodRange(period, start_date, end_date);

        const { rows } = await db.query(`
            SELECT 
                v.vendedor_id_firebird AS id,
                COALESCE(vd.nome, 'Vendedor ' || v.vendedor_id_firebird::text) AS nome,
                SUM(v.valor_total) AS faturamento,
                COUNT(DISTINCT v.id_firebird) AS qtd_pedidos,
                AVG(v.valor_total) AS ticket_medio
            FROM dash_vendas v
            LEFT JOIN dash_vendedores vd ON vd.id_firebird = v.vendedor_id_firebird AND vd.tenant_id = v.tenant_id
            WHERE v.tenant_id = $1
              AND v.data_venda >= $2 AND v.data_venda <= $3
              AND v.status = 'FATURADO'
              AND v.vendedor_id_firebird IS NOT NULL
            GROUP BY v.vendedor_id_firebird, vd.nome
            ORDER BY faturamento DESC
            LIMIT $4
        `, [tenantId, start, end, limit]);

        res.json({ data: rows.map(r => ({
            id: r.id,
            nome: r.nome,
            faturamento: parseFloat(r.faturamento || 0),
            qtd_pedidos: parseInt(r.qtd_pedidos),
            ticket_medio: parseFloat(r.ticket_medio || 0)
        })) });
    } catch (err) { next(err); }
});

module.exports = router;
