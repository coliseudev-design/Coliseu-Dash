'use strict';

const express = require('express');
const router = express.Router();
const db = require('../db/postgres');
const { getPeriodRange } = require('../utils/period');

// GET /api/estatisticas/overview
router.get('/overview', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const period = req.query.period || 'last30'; // default to last 30 if none
        const { start_date, end_date } = req.query;
        
        // 1) Descobre a data-âncora de VENDAS
        const { rows: rMax } = await db.query(`SELECT COALESCE(MAX(data_venda), CURRENT_DATE) as d FROM dash_vendas WHERE tenant_id = $1`, [tenantId]);
        const maxDate = rMax[0].d;

        // 2) Descobre a data-âncora FINANCEIRA (pois nem sempre bate com as vendas)
        const { rows: rMaxFin } = await db.query(`SELECT COALESCE(MAX(data_emissao), CURRENT_DATE) as d FROM dash_financeiro WHERE tenant_id = $1`, [tenantId]);
        const maxDateFin = rMaxFin[0].d;

        // Aplica getPeriodRange passando a data-âncora de vendas
        const { start, end } = getPeriodRange(period, start_date, end_date, maxDate);
        
        // Para os dados "Hoje", vamos usar sempre o próprio maxDate para não mostrar zerado (se a base legada usar Hoje, será o último dia que teve algo)
        const startHoje = new Date(maxDate);
        startHoje.setHours(0,0,0,0);
        const endHoje = new Date(maxDate);
        endHoje.setHours(23,59,59,999);
        
        // Aplica getPeriodRange passando a data-âncora financeira
        const finRange = getPeriodRange(period, start_date, end_date, maxDateFin);

        // Vendas hoje (dia mais recente) e período (filtrado)
        const { rows: vHoje } = await db.query(`SELECT COALESCE(SUM(valor_total),0) AS total, COUNT(*) AS qtd FROM dash_vendas WHERE tenant_id = $1 AND data_venda >= $2 AND data_venda <= $3`, [tenantId, startHoje, endHoje]);
        const { rows: vMes } = await db.query(`SELECT COALESCE(SUM(valor_total),0) AS total, COUNT(*) AS qtd FROM dash_vendas WHERE tenant_id = $1 AND data_venda >= $2 AND data_venda <= $3`, [tenantId, start, end]);
        
        // Pedidos do período filtrado
        const { rows: pAbertos } = await db.query(`SELECT COUNT(*) AS qtd FROM dash_vendas WHERE tenant_id = $1 AND data_venda >= $2 AND data_venda <= $3 AND status IN ('PENDENTE','ABERTO')`, [tenantId, start, end]);
        const { rows: pProc } = await db.query(`SELECT COUNT(*) AS qtd FROM dash_vendas WHERE tenant_id = $1 AND data_venda >= $2 AND data_venda <= $3 AND status IN ('FATURADO','FINALIZADO','CANCELADO')`, [tenantId, start, end]);
        
        // Financeiro do período filtrado (usando emissão/vencimento)
        const { rows: fReceber } = await db.query(`SELECT COALESCE(SUM(valor - valor_pago),0) AS v FROM dash_financeiro WHERE tenant_id = $1 AND COALESCE(data_vencimento, data_emissao, NOW()) >= $2 AND COALESCE(data_vencimento, data_emissao, NOW()) <= $3 AND tipo = 'RECEBER' AND status_pagamento = 'ABERTO'`, [tenantId, finRange.start, finRange.end]);
        const { rows: fRecebido } = await db.query(`SELECT COALESCE(SUM((CASE WHEN valor_pago = 0 THEN valor ELSE valor_pago END)),0) AS v FROM dash_financeiro WHERE tenant_id = $1 AND COALESCE(data_vencimento, data_emissao, NOW()) >= $2 AND COALESCE(data_vencimento, data_emissao, NOW()) <= $3 AND tipo = 'RECEBER' AND status_pagamento = 'PAGO'`, [tenantId, finRange.start, finRange.end]);
        const { rows: fPagar } = await db.query(`SELECT COALESCE(SUM(valor - (CASE WHEN valor_pago = 0 THEN valor ELSE valor_pago END)),0) AS v FROM dash_financeiro WHERE tenant_id = $1 AND COALESCE(data_vencimento, data_emissao, NOW()) >= $2 AND COALESCE(data_vencimento, data_emissao, NOW()) <= $3 AND tipo = 'PAGAR' AND status_pagamento = 'ABERTO'`, [tenantId, finRange.start, finRange.end]);
        const { rows: fPago } = await db.query(`SELECT COALESCE(SUM((CASE WHEN valor_pago = 0 THEN valor ELSE valor_pago END)),0) AS v FROM dash_financeiro WHERE tenant_id = $1 AND COALESCE(data_vencimento, data_emissao, NOW()) >= $2 AND COALESCE(data_vencimento, data_emissao, NOW()) <= $3 AND tipo = 'PAGAR' AND status_pagamento = 'PAGO'`, [tenantId, finRange.start, finRange.end]);
        
        // Top Marcas e Categorias no período filtrado
        const { rows: topMarcasItens } = await db.query(`
            SELECT vi.marca, SUM(vi.valor_total) AS total
            FROM dash_vendas_itens vi
            JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id
            WHERE vi.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3 AND vi.marca IS NOT NULL AND vi.marca != ''
            GROUP BY vi.marca ORDER BY total DESC LIMIT 10
        `, [tenantId, start, end]);

        const { rows: topMarcasVendas } = await db.query(`
            SELECT marca, SUM(valor_total) AS total
            FROM dash_vendas
            WHERE tenant_id = $1 AND data_venda >= $2 AND data_venda <= $3 AND marca IS NOT NULL AND marca != ''
            GROUP BY marca ORDER BY total DESC LIMIT 10
        `, [tenantId, start, end]);

        const topMarcas = topMarcasItens.length > 0 ? topMarcasItens : topMarcasVendas;

        const { rows: topCatsItens } = await db.query(`
            SELECT vi.categoria, SUM(vi.valor_total) AS total
            FROM dash_vendas_itens vi
            JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id
            WHERE vi.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3 AND vi.categoria IS NOT NULL AND vi.categoria != ''
            GROUP BY vi.categoria ORDER BY total DESC LIMIT 10
        `, [tenantId, start, end]);

        const { rows: topCatsVendas } = await db.query(`
            SELECT categoria, SUM(valor_total) AS total
            FROM dash_vendas
            WHERE tenant_id = $1 AND data_venda >= $2 AND data_venda <= $3 AND categoria IS NOT NULL AND categoria != ''
            GROUP BY categoria ORDER BY total DESC LIMIT 10
        `, [tenantId, start, end]);

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
        
        const { rows: rMax } = await db.query(`SELECT COALESCE(MAX(data_venda), CURRENT_DATE) as d FROM dash_vendas WHERE tenant_id = $1`, [tenantId]);
        const maxDate = rMax[0].d;
        const { start, end } = getPeriodRange(period, start_date, end_date, maxDate);

        const { rows: v } = await db.query(`
            SELECT 
                COALESCE(SUM(valor_total), 0) AS faturamento,
                COUNT(DISTINCT id_firebird) AS qtd_pedidos,
                COALESCE(AVG(valor_total), 0) AS ticket_medio,
                COALESCE(SUM(valor_desconto), 0) AS total_descontos
            FROM dash_vendas
            WHERE tenant_id = $1 AND data_venda >= $2 AND data_venda <= $3
        `, [tenantId, start, end]);

        const { rows: f } = await db.query(`
            SELECT 
                COALESCE(SUM(CASE WHEN tipo = 'RECEBER' AND status_pagamento = 'ABERTO' THEN valor - (CASE WHEN valor_pago = 0 THEN 0 ELSE valor_pago END) ELSE 0 END), 0) AS a_receber,
                COALESCE(SUM(CASE WHEN tipo = 'RECEBER' AND status_pagamento = 'PAGO' THEN (CASE WHEN valor_pago = 0 THEN valor ELSE valor_pago END) ELSE 0 END), 0) AS recebido,
                COALESCE(SUM(CASE WHEN tipo = 'PAGAR' AND status_pagamento = 'ABERTO' THEN valor - (CASE WHEN valor_pago = 0 THEN 0 ELSE valor_pago END) ELSE 0 END), 0) AS a_pagar
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

        const { rows: rCli } = await db.query(`SELECT COUNT(DISTINCT cliente_id_firebird) AS ativos FROM dash_vendas WHERE tenant_id = $1 AND data_venda >= $2 AND data_venda <= $3`, [tenantId, start, end]);
        const { rows: rTotCli } = await db.query(`SELECT COUNT(*) AS total FROM dash_clientes WHERE tenant_id = $1 AND ativo = true`, [tenantId]);

        const { rows: topClientes } = await db.query(`
            SELECT c.nome, SUM(v.valor_total) AS total
            FROM dash_vendas v
            JOIN dash_clientes c ON c.id_firebird = v.cliente_id_firebird AND c.tenant_id = v.tenant_id
            WHERE v.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3
            GROUP BY c.id, c.nome
            ORDER BY total DESC LIMIT 5
        `, [tenantId, start, end]);

        const { rows: rEst } = await db.query(`SELECT COALESCE(SUM(estoque), 0) AS qtd, COALESCE(SUM(estoque * preco), 0) AS valor FROM dash_produtos WHERE tenant_id = $1 AND ativo = true`, [tenantId]);

        const { rows: topProd } = await db.query(`
            SELECT COALESCE(vi.produto, 'Sem nome') AS nome, SUM(vi.quantidade) AS qtd
            FROM dash_vendas_itens vi
            JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id
            WHERE vi.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3 AND vi.produto IS NOT NULL
            GROUP BY vi.produto
            ORDER BY qtd DESC LIMIT 1
        `, [tenantId, start, end]);

        const clientesAtivos = parseInt(rCli[0].ativos, 10);
        const totalClientes = parseInt(rTotCli[0].total, 10);
        const taxa_conversao_pct = totalClientes > 0 ? (clientesAtivos / totalClientes) * 100 : 0;

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
            kpis: {
                clientes_ativos: clientesAtivos,
                total_clientes: totalClientes,
                ticket_medio: parseFloat(v[0].ticket_medio),
                top_clientes: topClientes.map(c => ({ nome: c.nome, total: parseFloat(c.total) })),
                estoque: {
                    qtd: parseFloat(rEst[0].qtd),
                    valor: parseFloat(rEst[0].valor)
                },
                taxa_conversao_pct,
                produto_mais_vendido: topProd.length > 0 ? topProd[0].nome : '—',
                top_categorias: topCats.map(r => ({ categoria: r.categoria, total: parseFloat(r.total) }))
            }
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
