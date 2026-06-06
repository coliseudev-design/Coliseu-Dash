const express = require('express');
const router = express.Router();
const db = require('../db/postgres');

router.get('/vendas-17', async (req, res) => {
    try {
        const tenantId = req.tenant.id;
        const { rows } = await db.query(`
            SELECT id_firebird, data_venda, valor_total, status 
            FROM dash_vendas 
            WHERE tenant_id = $1 
              AND data_venda >= '2026-05-17 00:00:00' 
              AND data_venda <= '2026-05-17 23:59:59'
            ORDER BY data_venda ASC
        `, [tenantId]);
        res.json({ total_rows: rows.length, sum: rows.reduce((acc, curr) => acc + Number(curr.valor_total), 0), data: rows });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/db-summary', async (req, res) => {
    try {
        const tenantId = req.tenant.id;
        const salesRes = await db.query(`
            SELECT 
                COUNT(*) as total_sales,
                SUM(CASE WHEN cfop IS NULL THEN 1 ELSE 0 END) as cfop_null,
                SUM(CASE WHEN cfop IS NOT NULL THEN 1 ELSE 0 END) as cfop_not_null,
                MIN(data_venda) as min_date,
                MAX(data_venda) as max_date
            FROM dash_vendas
            WHERE tenant_id = $1
        `, [tenantId]);

        const distinctCfops = await db.query(`
            SELECT cfop, COUNT(*) as count, SUM(valor_total) as total_value
            FROM dash_vendas
            WHERE tenant_id = $1
            GROUP BY cfop
            ORDER BY count DESC
        `, [tenantId]);

        const devCount = await db.query(`
            SELECT COUNT(*) as count, SUM(valor) as total_value
            FROM dash_devolucoes
            WHERE tenant_id = $1
        `, [tenantId]);

        res.json({
            tenant_id: tenantId,
            sales: salesRes.rows[0],
            cfops: distinctCfops.rows,
            devolucoes: devCount.rows[0]
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/status-report', async (req, res) => {
    try {
        const tenantId = req.tenant.id;
        const { rows: statusRows } = await db.query(`
            SELECT 
                COALESCE(TRIM(status), '(NULL)') AS status_val,
                COUNT(*) AS count,
                SUM(valor_total) AS total_valor,
                MIN(data_venda) AS primeira_venda,
                MAX(data_venda) AS ultima_venda
            FROM dash_vendas
            WHERE tenant_id = $1
            GROUP BY COALESCE(TRIM(status), '(NULL)')
            ORDER BY count DESC
        `, [tenantId]);

        // Vendas do mês atual com cada status
        const { rows: mesRows } = await db.query(`
            SELECT 
                COALESCE(TRIM(status), '(NULL)') AS status_val,
                COUNT(*) AS count,
                SUM(valor_total) AS total_valor
            FROM dash_vendas
            WHERE tenant_id = $1
              AND data_venda >= date_trunc('month', NOW())
            GROUP BY COALESCE(TRIM(status), '(NULL)')
            ORDER BY count DESC
        `, [tenantId]);

        res.json({
            tenant_id: tenantId,
            todos_status: statusRows,
            status_mes_atual: mesRows
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
