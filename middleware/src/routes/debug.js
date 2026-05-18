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

module.exports = router;
