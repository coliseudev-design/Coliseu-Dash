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
        
        // Top Marcas e Categorias: tenta dash_vendas_itens (com dados de marca/categoria por item)
        // e cai de volta para dash_vendas se não houver dados
        const { rows: topMarcasItens } = await db.query(`
            SELECT vi.marca, SUM(vi.valor_total) AS total
            FROM dash_vendas_itens vi
            WHERE vi.tenant_id = $1 AND vi.marca IS NOT NULL AND vi.marca != ''
            GROUP BY vi.marca ORDER BY total DESC LIMIT 10
        `, [tenantId]);

        const { rows: topMarcasVendas } = await db.query(`
            SELECT marca, SUM(valor_total) AS total
            FROM dash_vendas
            WHERE tenant_id = $1 AND marca IS NOT NULL AND marca != ''
            GROUP BY marca ORDER BY total DESC LIMIT 10
        `, [tenantId]);

        const topMarcas = topMarcasItens.length > 0 ? topMarcasItens : topMarcasVendas;

        const { rows: topCatsItens } = await db.query(`
            SELECT vi.categoria, SUM(vi.valor_total) AS total
            FROM dash_vendas_itens vi
            WHERE vi.tenant_id = $1 AND vi.categoria IS NOT NULL AND vi.categoria != ''
            GROUP BY vi.categoria ORDER BY total DESC LIMIT 10
        `, [tenantId]);

        const { rows: topCatsVendas } = await db.query(`
            SELECT categoria, SUM(valor_total) AS total
            FROM dash_vendas
            WHERE tenant_id = $1 AND categoria IS NOT NULL AND categoria != ''
            GROUP BY categoria ORDER BY total DESC LIMIT 10
        `, [tenantId]);

        const topCats = topCatsItens.length > 0 ? topCatsItens : topCatsVendas;

        res.json({
            hoje: { total: parseFloat(vHoje[0].total), qtd: parseInt(vHoje[0].qtd) },
            mes: { total: parseFloat(vMes[0].total), qtd: parseInt(vMes[0].qtd) },
            pedidos_abertos: parseInt(pAbertos[0].qtd),
            pedidos_processados: parseInt(pProc[0].qtd),
            total_receber: parseFloat(fReceber[0].v),
            total_recebido: parseFloat(fRecebido[0].v),
            total_pagar: parseFloat(fPagar[0].v),
            total_pago: parseFloat(fPago[0].v),
            top_marcas: topMarcas.map(r => ({ marca: r.marca, total: parseFloat(r.total) })),
            top_categorias: topCats.map(r => ({ categoria: r.categoria, total: parseFloat(r.total) }))
        });
    } catch (err) {
        next(err);
    }
});

// GET /api/estatisticas/kpis - resumo de KPIs agregados para página de Estatísticas
router.get('/kpis', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const period = req.query.period || 'last12m';
        const { start_date, end_date } = req.query;
        const { start, end } = getPeriodRange(period, start_date, end_date);

        const { rows: v } = await db.query(`
            SELECT 
                COALESCE(SUM(valor_total), 0) AS faturamento,
                COUNT(DISTINCT id_firebird) AS qtd_pedidos,
                COALESCE(AVG(valor_total), 0) AS ticket_medio,
                COALESCE(SUM(valor_desconto), 0) AS total_descontos
            FROM dash_vendas
            WHERE tenant_id = $1 AND data_venda >= $2 AND data_venda <= $3 AND status = 'FATURADO'
        `, [tenantId, start, end]);

        const { rows: f } = await db.query(`
            SELECT 
                COALESCE(SUM(CASE WHEN tipo = 'RECEBER' AND status_pagamento = 'ABERTO' THEN valor - valor_pago ELSE 0 END), 0) AS a_receber,
                COALESCE(SUM(CASE WHEN tipo = 'RECEBER' AND status_pagamento = 'PAGO' THEN valor_pago ELSE 0 END), 0) AS recebido,
                COALESCE(SUM(CASE WHEN tipo = 'PAGAR' AND status_pagamento = 'ABERTO' THEN valor - valor_pago ELSE 0 END), 0) AS a_pagar
            FROM dash_financeiro
            WHERE tenant_id = $1 
              AND COALESCE(data_vencimento, data_emissao, NOW()) >= $2 
              AND COALESCE(data_vencimento, data_emissao, NOW()) <= $3
        `, [tenantId, start, end]);

        const { rows: topCats } = await db.query(`
            SELECT categoria, SUM(valor_total) AS total
            FROM dash_vendas_itens vi
            JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id
            WHERE vi.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3
              AND vi.categoria IS NOT NULL AND vi.categoria != ''
            GROUP BY vi.categoria ORDER BY total DESC LIMIT 5
        `, [tenantId, start, end]);

        res.json({
            period: { start, end, label: period },
            vendas: {
                faturamento: parseFloat(v[0].faturamento),
                qtd_pedidos: parseInt(v[0].qtd_pedidos),
                ticket_medio: parseFloat(v[0].ticket_medio),
                total_descontos: parseFloat(v[0].total_descontos)
            },
            financeiro: {
                a_receber: parseFloat(f[0].a_receber),
                recebido: parseFloat(f[0].recebido),
                a_pagar: parseFloat(f[0].a_pagar)
            },
            top_categorias: topCats.map(r => ({ categoria: r.categoria, total: parseFloat(r.total) }))
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

module.exports = router;
