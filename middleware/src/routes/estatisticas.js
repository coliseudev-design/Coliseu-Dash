'use strict';

const express = require('express');
const router = express.Router();
const db = require('../db/postgres');
const { getPeriodRange } = require('../utils/period');

// GET /api/estatisticas/overview
router.get('/overview', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        
        // Obter data máxima da base de vendas (pois a base de teste pode ser muito antiga)
        const { rows: rMax } = await db.query(`SELECT COALESCE(MAX(data_venda), CURRENT_DATE) as d FROM dash_vendas WHERE tenant_id = $1`, [tenantId]);
        const maxDate = rMax[0].d;

        // Vendas hoje e mês (Relativos à data mais recente daquele tenant)
        const { rows: vHoje } = await db.query(`SELECT COALESCE(SUM(valor_total),0) AS total, COUNT(*) AS qtd FROM dash_vendas WHERE tenant_id = $1 AND DATE(data_venda) = DATE($2)`, [tenantId, maxDate]);
        const { rows: vMes } = await db.query(`SELECT COALESCE(SUM(valor_total),0) AS total, COUNT(*) AS qtd FROM dash_vendas WHERE tenant_id = $1 AND EXTRACT(MONTH FROM data_venda) = EXTRACT(MONTH FROM $2::date) AND EXTRACT(YEAR FROM data_venda) = EXTRACT(YEAR FROM $2::date)`, [tenantId, maxDate]);
        
        // Pedidos (Worker do MVP do Coliseu manda "FATURADO" para pedidos concretizados)
        const { rows: pAbertos } = await db.query(`SELECT COUNT(*) AS qtd FROM dash_vendas WHERE tenant_id = $1 AND status != 'FATURADO'`, [tenantId]);
        const { rows: pProc } = await db.query(`SELECT COUNT(*) AS qtd FROM dash_vendas WHERE tenant_id = $1 AND status = 'FATURADO'`, [tenantId]);
        
        // Financeiro
        const { rows: fReceber } = await db.query(`SELECT COALESCE(SUM(valor - valor_pago),0) AS v FROM dash_financeiro WHERE tenant_id = $1 AND tipo = 'RECEBER' AND status_pagamento = 'ABERTO'`, [tenantId]);
        const { rows: fRecebido } = await db.query(`SELECT COALESCE(SUM(valor_pago),0) AS v FROM dash_financeiro WHERE tenant_id = $1 AND tipo = 'RECEBER' AND status_pagamento = 'PAGO'`, [tenantId]);
        const { rows: fPagar } = await db.query(`SELECT COALESCE(SUM(valor - valor_pago),0) AS v FROM dash_financeiro WHERE tenant_id = $1 AND tipo = 'PAGAR' AND status_pagamento = 'ABERTO'`, [tenantId]);
        const { rows: fPago } = await db.query(`SELECT COALESCE(SUM(valor_pago),0) AS v FROM dash_financeiro WHERE tenant_id = $1 AND tipo = 'PAGAR' AND status_pagamento = 'PAGO'`, [tenantId]);
        
        res.json({
            hoje: { total: parseFloat(vHoje[0].total), qtd: parseInt(vHoje[0].qtd) },
            mes: { total: parseFloat(vMes[0].total), qtd: parseInt(vMes[0].qtd) },
            pedidos_abertos: parseInt(pAbertos[0].qtd),
            pedidos_processados: parseInt(pProc[0].qtd),
            total_receber: parseFloat(fReceber[0].v),
            total_recebido: parseFloat(fRecebido[0].v),
            total_pagar: parseFloat(fPagar[0].v),
            total_pago: parseFloat(fPago[0].v)
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
