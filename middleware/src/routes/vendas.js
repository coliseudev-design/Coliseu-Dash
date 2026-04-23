'use strict';

const express = require('express');
const router = express.Router();
const db = require('../db/postgres');
const { getPeriodRange } = require('../utils/period');

// GET /api/vendas/faturadas?period=today
router.get('/faturadas', async (req, res, next) => {
    try {
        const period = req.query.period || '7d';
        const { start, end } = getPeriodRange(period);
        const tenantId = req.tenant.id;

        const { rows } = await db.query(`
            SELECT 
                TO_CHAR(data_venda, 'YYYY-MM-DD') AS data,
                SUM(valor_total) AS total,
                COUNT(*) AS quantidade
            FROM dash_vendas
            WHERE tenant_id = $1 
              AND data_venda >= $2 
              AND data_venda <= $3
              AND status = 'FATURADO'
            GROUP BY TO_CHAR(data_venda, 'YYYY-MM-DD')
            ORDER BY data
        `, [tenantId, start, end]);

        // Retorna numbers para o frontend em total e quantidade
        const formatted = rows.map(r => ({
            data: r.data,
            total: parseFloat(r.total),
            quantidade: parseInt(r.quantidade, 10)
        }));

        res.json({ period: { start, end, label: period }, data: formatted });
    } catch (err) {
        next(err);
    }
});

// GET /api/vendas/por-horario
router.get('/por-horario', async (req, res, next) => {
    try {
        const date = req.query.date;
        const tenantId = req.tenant.id;
        let sql;
        let params;

        if (date) {
            sql = `
                SELECT 
                    EXTRACT(HOUR FROM data_venda) AS hora,
                    COUNT(*) AS quantidade,
                    SUM(valor_total) AS total
                FROM dash_vendas
                WHERE tenant_id = $1
                  AND TO_CHAR(data_venda, 'YYYY-MM-DD') = $2
                  AND status = 'FATURADO'
                GROUP BY EXTRACT(HOUR FROM data_venda)
                ORDER BY hora
            `;
            params = [tenantId, date];
        } else {
            // Últimos 30 dias
            sql = `
                SELECT 
                    EXTRACT(HOUR FROM data_venda) AS hora,
                    COUNT(*) AS quantidade,
                    SUM(valor_total) AS total
                FROM dash_vendas
                WHERE tenant_id = $1
                  AND data_venda >= NOW() - INTERVAL '30 days'
                  AND status = 'FATURADO'
                GROUP BY EXTRACT(HOUR FROM data_venda)
                ORDER BY hora
            `;
            params = [tenantId];
        }

        const { rows } = await db.query(sql, params);

        const map = new Map();
        for (let h = 0; h < 24; h++) map.set(h, { hora: h, quantidade: 0, total: 0 });

        for (const r of rows) {
            const h = parseInt(r.hora, 10);
            map.set(h, { hora: h, quantidade: parseInt(r.quantidade, 10), total: parseFloat(r.total) || 0 });
        }

        res.json({ data: Array.from(map.values()) });
    } catch (err) {
        next(err);
    }
});

// GET /api/vendas/pedidos-abertos
router.get('/pedidos-abertos', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const { rows } = await db.query(`
            SELECT 
                status, 
                COUNT(*) AS quantidade, 
                SUM(valor_total) AS total
            FROM dash_vendas
            WHERE tenant_id = $1 
              AND status != 'FATURADO'
            GROUP BY status
            ORDER BY quantidade DESC
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

// GET /api/vendas/kpis
router.get('/kpis', async (req, res, next) => {
    try {
        const period = req.query.period || 'hoje';
        const { start, end } = getPeriodRange(period);
        const tenantId = req.tenant.id;

        const { rows } = await db.query(`
            SELECT 
                COALESCE(SUM(valor_total), 0) AS total_faturado,
                COUNT(*) AS qtd_pedidos,
                COALESCE(AVG(valor_total), 0) AS ticket_medio,
                COALESCE(MAX(valor_total), 0) AS maior_venda,
                COALESCE(MIN(valor_total), 0) AS menor_venda
            FROM dash_vendas
            WHERE tenant_id = $1
              AND data_venda >= $2
              AND data_venda <= $3
              AND status = 'FATURADO'
        `, [tenantId, start, end]);

        const kpis = {
            total_faturado: parseFloat(rows[0].total_faturado),
            qtd_pedidos: parseInt(rows[0].qtd_pedidos, 10),
            ticket_medio: parseFloat(rows[0].ticket_medio),
            maior_venda: parseFloat(rows[0].maior_venda),
            menor_venda: parseFloat(rows[0].menor_venda)
        };

        res.json({ period: { start, end, label: period }, kpis });
    } catch (err) {
        next(err);
    }
});

// GET /api/vendas/recentes
router.get('/recentes', async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit, 10) || 20;
        const tenantId = req.tenant.id;

        // join com tabelas sincronizadas usa id_firebird pq é ele quem vem nos FKs da tabela de vendas
        const { rows } = await db.query(`
            SELECT 
                v.id_firebird AS id, 
                v.numero_pedido, 
                v.data_venda, 
                v.valor_total, 
                v.status,
                c.nome AS cliente, 
                vd.nome AS vendedor
            FROM dash_vendas v
            LEFT JOIN dash_clientes c ON c.id_firebird = v.cliente_id_firebird AND c.tenant_id = v.tenant_id
            LEFT JOIN dash_vendedores vd ON vd.id_firebird = v.vendedor_id_firebird AND vd.tenant_id = v.tenant_id
            WHERE v.tenant_id = $1
            ORDER BY v.data_venda DESC
            LIMIT $2
        `, [tenantId, limit]);

        res.json({ data: rows });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
