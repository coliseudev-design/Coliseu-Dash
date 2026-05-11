'use strict';

const express = require('express');
const router = express.Router();
const db = require('../db/postgres');
const { getPeriodRange } = require('../utils/period');
const { getCache, setCache } = require('../config/cache');
const { buildDeptoFilter } = require('./filiais');

// GET /api/estatisticas/overview
router.get('/overview', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const period = req.query.period || 'last30';
        const { start_date, end_date } = req.query;
        const deptoId = req.query.depto_id;

        const cacheKey = `overview:${tenantId}:${period}:${start_date || 'null'}:${end_date || 'null'}:${deptoId || 'todas'}`;
        const cached = getCache(cacheKey);
        if (cached) return res.json(cached);

        const maxDate = new Date();
        const maxDateFin = new Date();

        const { start, end } = getPeriodRange(period, start_date, end_date, maxDate);
        const finRange = getPeriodRange(period, start_date, end_date, maxDateFin);

        const startHoje = new Date(maxDate); startHoje.setUTCHours(0,0,0,0);
        const endHoje = new Date(maxDate); endHoje.setUTCHours(23,59,59,999);

        // Filtro de departamento — injetado condicionalmente
        const df = buildDeptoFilter(deptoId, 4, 'v');
        const dfFin = buildDeptoFilter(deptoId, 4, 'f');

        const [
            vHoje, vMes, pAbertos, pProc, pCanc, fReceber, fRecebido, fPagar, fPago, topMarcasItens, topMarcasVendas, topCatsItens, topCatsVendas
        ] = await Promise.all([
            db.query(`SELECT COALESCE(SUM(v.valor_total),0) AS total, COUNT(*) AS qtd FROM dash_vendas v WHERE v.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3 AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO')${df.clause}`, [tenantId, startHoje, endHoje, ...df.params]),
            db.query(`SELECT COALESCE(SUM(v.valor_total),0) AS total, COUNT(*) AS qtd FROM dash_vendas v WHERE v.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3 AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO')${df.clause}`, [tenantId, start, end, ...df.params]),
            db.query(`SELECT COUNT(*) AS qtd FROM dash_vendas v WHERE v.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3 AND TRIM(v.status) IN ('PENDENTE','ABERTO')${df.clause}`, [tenantId, start, end, ...df.params]),
            db.query(`SELECT COUNT(*) AS qtd FROM dash_vendas v WHERE v.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3 AND TRIM(v.status) IN ('FATURADO','FINALIZADO')${df.clause}`, [tenantId, start, end, ...df.params]),
            db.query(`SELECT COUNT(*) AS qtd FROM dash_vendas v WHERE v.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3 AND TRIM(v.status) = 'CANCELADO'${df.clause}`, [tenantId, start, end, ...df.params]),
            db.query(`SELECT COALESCE(SUM(f.valor - f.valor_pago),0) AS v FROM dash_financeiro f WHERE f.tenant_id = $1 AND COALESCE(f.data_vencimento, f.data_emissao, NOW()) >= $2 AND COALESCE(f.data_vencimento, f.data_emissao, NOW()) <= $3 AND TRIM(f.tipo) = 'RECEBER' AND TRIM(f.status_pagamento) = 'ABERTO'${dfFin.clause}`, [tenantId, finRange.start, finRange.end, ...dfFin.params]),
            db.query(`SELECT COALESCE(SUM((CASE WHEN f.valor_pago = 0 THEN f.valor ELSE f.valor_pago END)),0) AS v FROM dash_financeiro f WHERE f.tenant_id = $1 AND COALESCE(f.data_pagamento, f.data_vencimento, NOW()) >= $2 AND COALESCE(f.data_pagamento, f.data_vencimento, NOW()) <= $3 AND TRIM(f.tipo) = 'RECEBER' AND TRIM(f.status_pagamento) = 'PAGO'${dfFin.clause}`, [tenantId, finRange.start, finRange.end, ...dfFin.params]),
            db.query(`SELECT COALESCE(SUM(f.valor - f.valor_pago),0) AS v FROM dash_financeiro f WHERE f.tenant_id = $1 AND COALESCE(f.data_vencimento, f.data_emissao, NOW()) >= $2 AND COALESCE(f.data_vencimento, f.data_emissao, NOW()) <= $3 AND TRIM(f.tipo) = 'PAGAR' AND TRIM(f.status_pagamento) = 'ABERTO'${dfFin.clause}`, [tenantId, finRange.start, finRange.end, ...dfFin.params]),
            db.query(`SELECT COALESCE(SUM((CASE WHEN f.valor_pago = 0 THEN f.valor ELSE f.valor_pago END)),0) AS v FROM dash_financeiro f WHERE f.tenant_id = $1 AND COALESCE(f.data_pagamento, f.data_vencimento, NOW()) >= $2 AND COALESCE(f.data_pagamento, f.data_vencimento, NOW()) <= $3 AND TRIM(f.tipo) = 'PAGAR' AND TRIM(f.status_pagamento) = 'PAGO'${dfFin.clause}`, [tenantId, finRange.start, finRange.end, ...dfFin.params]),
            db.query(`SELECT vi.marca, SUM(vi.valor_total) AS total FROM dash_vendas_itens vi JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id WHERE vi.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3 AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO') AND vi.marca IS NOT NULL AND vi.marca != ''${buildDeptoFilter(deptoId, 4, 'vi').clause} GROUP BY vi.marca ORDER BY total DESC LIMIT 10`, [tenantId, start, end, ...buildDeptoFilter(deptoId, 4, 'vi').params]),
            db.query(`SELECT v.marca, SUM(v.valor_total) AS total FROM dash_vendas v WHERE v.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3 AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO') AND v.marca IS NOT NULL AND v.marca != ''${df.clause} GROUP BY v.marca ORDER BY total DESC LIMIT 10`, [tenantId, start, end, ...df.params]),
            db.query(`SELECT vi.categoria, SUM(vi.valor_total) AS total FROM dash_vendas_itens vi JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id WHERE vi.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3 AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO') AND vi.categoria IS NOT NULL AND vi.categoria != ''${buildDeptoFilter(deptoId, 4, 'vi').clause} GROUP BY vi.categoria ORDER BY total DESC LIMIT 10`, [tenantId, start, end, ...buildDeptoFilter(deptoId, 4, 'vi').params]),
            db.query(`SELECT v.categoria, SUM(v.valor_total) AS total FROM dash_vendas v WHERE v.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3 AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO') AND v.categoria IS NOT NULL AND v.categoria != ''${df.clause} GROUP BY v.categoria ORDER BY total DESC LIMIT 10`, [tenantId, start, end, ...df.params])
        ]);

        const topMarcas = topMarcasItens.rows.length > 0 ? topMarcasItens.rows : topMarcasVendas.rows;
        const topCats = topCatsItens.rows.length > 0 ? topCatsItens.rows : topCatsVendas.rows;

        const result = {
            hoje: { total: parseFloat(vHoje.rows[0].total), qtd: parseInt(vHoje.rows[0].qtd) },
            mes: { total: parseFloat(vMes.rows[0].total), qtd: parseInt(vMes.rows[0].qtd) },
            pedidos_abertos: parseInt(pAbertos.rows[0].qtd),
            pedidos_processados: parseInt(pProc.rows[0].qtd),
            pedidos_cancelados: parseInt(pCanc.rows[0].qtd),
            total_receber: parseFloat(fReceber.rows[0].v),
            total_recebido: parseFloat(fRecebido.rows[0].v),
            total_pagar: parseFloat(fPagar.rows[0].v),
            total_pago: parseFloat(fPago.rows[0].v),
            top_marcas: topMarcas.map(r => ({ marca: r.marca, total: parseFloat(r.total) })),
            top_categorias: topCats.map(r => ({ categoria: r.categoria, total: parseFloat(r.total) }))
        };

        setCache(cacheKey, result, 120);
        res.json(result);
    } catch (err) {
        next(err);
    }
});

// GET /api/estatisticas/kpis
router.get('/kpis', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const period = req.query.period || 'last12m';
        const { start_date, end_date } = req.query;
        const deptoId = req.query.depto_id;

        const maxDate = new Date();
        const { start, end } = getPeriodRange(period, start_date, end_date, maxDate);

        const df = buildDeptoFilter(deptoId, 4, 'v');
        const dfFin = buildDeptoFilter(deptoId, 4, 'f');
        const dfVi = buildDeptoFilter(deptoId, 4, 'vi');

        const { rows: v } = await db.query(`
            SELECT 
                COALESCE(SUM(v.valor_total), 0) AS faturamento,
                COUNT(DISTINCT v.id_firebird) AS qtd_pedidos,
                COALESCE(AVG(v.valor_total), 0) AS ticket_medio,
                COALESCE(SUM(v.valor_desconto), 0) AS total_descontos
            FROM dash_vendas v
            WHERE v.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3 AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO')${df.clause}
        `, [tenantId, start, end, ...df.params]);

        const { rows: f } = await db.query(`
            SELECT 
                COALESCE(SUM(CASE WHEN TRIM(f.tipo) = 'RECEBER' AND TRIM(f.status_pagamento) = 'ABERTO' AND COALESCE(f.data_vencimento, f.data_emissao, NOW()) >= $2 AND COALESCE(f.data_vencimento, f.data_emissao, NOW()) <= $3 THEN f.valor - (CASE WHEN f.valor_pago = 0 THEN 0 ELSE f.valor_pago END) ELSE 0 END), 0) AS a_receber,
                COALESCE(SUM(CASE WHEN TRIM(f.tipo) = 'RECEBER' AND TRIM(f.status_pagamento) = 'PAGO' AND COALESCE(f.data_pagamento, f.data_vencimento, NOW()) >= $2 AND COALESCE(f.data_pagamento, f.data_vencimento, NOW()) <= $3 THEN (CASE WHEN f.valor_pago = 0 THEN f.valor ELSE f.valor_pago END) ELSE 0 END), 0) AS recebido,
                COALESCE(SUM(CASE WHEN TRIM(f.tipo) = 'PAGAR' AND TRIM(f.status_pagamento) = 'ABERTO' AND COALESCE(f.data_vencimento, f.data_emissao, NOW()) >= $2 AND COALESCE(f.data_vencimento, f.data_emissao, NOW()) <= $3 THEN f.valor - (CASE WHEN f.valor_pago = 0 THEN 0 ELSE f.valor_pago END) ELSE 0 END), 0) AS a_pagar
            FROM dash_financeiro f
            WHERE f.tenant_id = $1 
              AND (
                  (TRIM(f.status_pagamento) = 'ABERTO' AND COALESCE(f.data_vencimento, f.data_emissao, NOW()) >= $2 AND COALESCE(f.data_vencimento, f.data_emissao, NOW()) <= $3)
                  OR
                  (TRIM(f.status_pagamento) = 'PAGO' AND COALESCE(f.data_pagamento, f.data_vencimento, NOW()) >= $2 AND COALESCE(f.data_pagamento, f.data_vencimento, NOW()) <= $3)
              )${dfFin.clause}
        `, [tenantId, start, end, ...dfFin.params]);

        const { rows: topCats } = await db.query(`
            SELECT vi.categoria as categoria, SUM(vi.valor_total) AS total
            FROM dash_vendas_itens vi
            JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id
            WHERE vi.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3 AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO')
              AND vi.categoria IS NOT NULL AND vi.categoria != ''${dfVi.clause}
            GROUP BY vi.categoria ORDER BY total DESC LIMIT 5
        `, [tenantId, start, end, ...dfVi.params]);

        const { rows: rCli } = await db.query(`SELECT COUNT(DISTINCT v.cliente_id_firebird) AS ativos FROM dash_vendas v WHERE v.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3 AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO')${df.clause}`, [tenantId, start, end, ...df.params]);
        const { rows: rTotCli } = await db.query(`SELECT COUNT(*) AS total FROM dash_clientes WHERE tenant_id = $1 AND ativo = true`, [tenantId]);

        const { rows: topClientes } = await db.query(`
            SELECT c.nome, SUM(v.valor_total) AS total
            FROM dash_vendas v
            JOIN dash_clientes c ON c.id_firebird = v.cliente_id_firebird AND c.tenant_id = v.tenant_id
            WHERE v.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3 AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO')${df.clause}
            GROUP BY c.id, c.nome
            ORDER BY total DESC LIMIT 5
        `, [tenantId, start, end, ...df.params]);

        const { rows: rEst } = await db.query(`SELECT COALESCE(SUM(estoque), 0) AS qtd, COALESCE(SUM(estoque * preco), 0) AS valor FROM dash_produtos WHERE tenant_id = $1 AND ativo = true`, [tenantId]);

        const { rows: topProd } = await db.query(`
            SELECT COALESCE(vi.produto, 'Sem nome') AS nome, SUM(vi.quantidade) AS qtd
            FROM dash_vendas_itens vi
            JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id
            WHERE vi.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3 AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO') AND vi.produto IS NOT NULL${dfVi.clause}
            GROUP BY vi.produto
            ORDER BY qtd DESC LIMIT 1
        `, [tenantId, start, end, ...dfVi.params]);

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
