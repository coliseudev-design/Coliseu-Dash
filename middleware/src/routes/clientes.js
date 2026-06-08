'use strict';

const express = require('express');
const router = express.Router();
const db = require('../db/postgres');
const { getPeriodRange } = require('../utils/period');
const cfopUtil = require('../utils/cfop');

// GET /api/clientes/lista?search=&limit=&offset=
router.get('/lista', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const search = req.query.search || '';
        const limit = Math.min(parseInt(req.query.limit, 10) || 100, 1000);
        const offset = parseInt(req.query.offset, 10) || 0;

        const salesFilter = cfopUtil.getSalesFilterClause('v');

        const where = ['c.tenant_id = $1', 'c.ativo = true'];
        const binds = [tenantId];
        let pIndex = 2;

        if (search) {
            where.push(`(c.nome ILIKE $${pIndex} OR c.documento ILIKE $${pIndex})`);
            binds.push(`%${search}%`);
            pIndex++;
        }
        
        const whereSql = `WHERE ${where.join(' AND ')}`;

        const totalP = await db.query(`SELECT COUNT(*) AS total FROM dash_clientes c ${whereSql}`, binds);

        const limitIdx = pIndex++;
        const offsetIdx = pIndex++;

        // Subqueries foram convertidas para usar id_firebird e tenant_id e aplicar salesFilter
        const { rows } = await db.query(`
            SELECT 
                c.id_firebird AS id, c.nome, c.documento, c.email, c.telefone, c.cidade, c.estado,
                c.data_cadastro,
                (SELECT COUNT(*) FROM dash_vendas v WHERE v.cliente_id_firebird = c.id_firebird AND v.tenant_id = c.tenant_id ${salesFilter}) AS qtd_pedidos,
                (SELECT MAX(v.data_venda) FROM dash_vendas v WHERE v.cliente_id_firebird = c.id_firebird AND v.tenant_id = c.tenant_id ${salesFilter}) AS ultimo_pedido,
                (SELECT COALESCE(SUM(v.valor_total), 0) FROM dash_vendas v WHERE v.cliente_id_firebird = c.id_firebird AND v.tenant_id = c.tenant_id ${salesFilter}) AS total_gasto
            FROM dash_clientes c
            ${whereSql}
            ORDER BY c.nome
            LIMIT $${limitIdx} OFFSET $${offsetIdx}
        `, [...binds, limit, offset]);

        const formatted = rows.map(r => ({
            ...r,
            qtd_pedidos: parseInt(r.qtd_pedidos || 0, 10),
            total_gasto: parseFloat(r.total_gasto || 0)
        }));

        res.json({ 
            data: formatted, 
            total: parseInt(totalP.rows[0]?.total || 0, 10), 
            limit, 
            offset 
        });
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
            'SELECT COUNT(*) AS total FROM dash_clientes WHERE tenant_id = $1 AND ativo = true', 
            [tenantId]
        );

        const ativosP = await db.query(`
            SELECT COUNT(DISTINCT v.cliente_id_firebird) AS total
            FROM dash_vendas v
            WHERE v.tenant_id = $1 
              AND v.data_venda >= $2 AND v.data_venda <= $3
              ${salesFilter}
        `, [tenantId, start, end]);

        const topP = await db.query(`
            SELECT c.nome, SUM(v.valor_total) AS total
            FROM dash_vendas v
            JOIN dash_clientes c ON c.id_firebird = v.cliente_id_firebird AND c.tenant_id = v.tenant_id
            WHERE v.tenant_id = $1
              AND v.data_venda >= $2 AND v.data_venda <= $3
              ${salesFilter}
            GROUP BY c.id, c.nome
            ORDER BY total DESC LIMIT 1
        `, [tenantId, start, end]);

        const ticketP = await db.query(`
            SELECT COALESCE(AVG(totais.total), 0) AS ticket
            FROM (
                SELECT v.cliente_id_firebird, SUM(v.valor_total) AS total
                FROM dash_vendas v
                WHERE v.tenant_id = $1
                  AND v.data_venda >= $2 AND v.data_venda <= $3
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
