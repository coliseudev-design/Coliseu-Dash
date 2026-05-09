'use strict';

const express = require('express');
const router = express.Router();
const db = require('../db/postgres');
const { getPeriodRange } = require('../utils/period');

// Helper para converter filtros do BI (inicio, fim) para datas
const getBiDateRange = (req) => {
    const { inicio, fim } = req.query;
    let start = new Date(0); // Epoch as default past
    let end = new Date(); // Now as default future
    
    if (inicio) {
        start = new Date(inicio);
        start.setHours(0, 0, 0, 0);
    }
    if (fim) {
        end = new Date(fim);
        end.setHours(23, 59, 59, 999);
    }
    
    return { start, end };
};

// ==========================================
// MÓDULO: SALES INTELLIGENCE
// ==========================================

// GET /api/bi/sales/executive-summary
router.get('/sales/executive-summary', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const { start, end } = getBiDateRange(req);

        // Fetch metrics from dash_vendas
        const { rows: v } = await db.query(`
            SELECT 
                COALESCE(SUM(valor_total), 0) AS faturamento_total,
                COUNT(DISTINCT id_firebird) AS total_pedidos,
                COALESCE(SUM(valor_custo), 0) AS custo_total,
                COALESCE(AVG(valor_total), 0) AS ticket_medio
            FROM dash_vendas
            WHERE tenant_id = $1 AND data_venda >= $2 AND data_venda <= $3 AND TRIM(status) IN ('FATURADO', 'FINALIZADO')
        `, [tenantId, start, end]);

        const faturamento_total = parseFloat(v[0].faturamento_total);
        const custo_total = parseFloat(v[0].custo_total);
        const lucro_bruto = faturamento_total - custo_total;
        const margem_pct = faturamento_total > 0 ? (lucro_bruto / faturamento_total) * 100 : 0;

        res.json({
            faturamento_total,
            lucro_bruto,
            margem_pct,
            ticket_medio: parseFloat(v[0].ticket_medio),
            total_pedidos: parseInt(v[0].total_pedidos, 10),
            clientes_ativos: 0 // Será calculado depois ou em conjunto
        });
    } catch (err) { next(err); }
});

// GET /api/bi/sales/commercial-kpis
router.get('/sales/commercial-kpis', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const { start, end } = getBiDateRange(req);

        // Produtos vendidos
        const { rows: p } = await db.query(`
            SELECT COALESCE(SUM(vi.quantidade), 0) AS qtd
            FROM dash_vendas_itens vi
            JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id
            WHERE vi.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3 AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO')
        `, [tenantId, start, end]);

        // Total descontos
        const { rows: d } = await db.query(`
            SELECT COALESCE(SUM(valor_desconto), 0) AS descontos
            FROM dash_vendas
            WHERE tenant_id = $1 AND data_venda >= $2 AND data_venda <= $3 AND TRIM(status) IN ('FATURADO', 'FINALIZADO')
        `, [tenantId, start, end]);

        res.json({
            produtos_vendidos: parseFloat(p[0].qtd),
            descontos_concedidos: parseFloat(d[0].descontos),
            meta_atingida_pct: 0, // Placeholder para futuras métricas
            projecao_fechamento: 0
        });
    } catch (err) { next(err); }
});

// GET /api/bi/sales/sellers
router.get('/sales/sellers', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const { start, end } = getBiDateRange(req);

        const { rows } = await db.query(`
            SELECT 
                vend.nome as nome_vendedor, 
                SUM(v.valor_total) as faturamento, 
                COUNT(v.id_firebird) as pedidos,
                COALESCE(AVG(v.valor_total), 0) as ticket_medio,
                COALESCE(SUM(v.valor_total - v.valor_custo), 0) as lucro,
                MAX(v.data_venda) as ultima_venda
            FROM dash_vendas v
            JOIN dash_vendedores vend ON vend.id_firebird = v.vendedor_id_firebird AND vend.tenant_id = v.tenant_id
            WHERE v.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3 AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO')
            GROUP BY vend.id_firebird, vend.nome
            ORDER BY faturamento DESC
        `, [tenantId, start, end]);

        const mapped = rows.map(r => ({
            vendedor_id: r.vendedor_id_firebird || 0,
            nome_vendedor: r.nome_vendedor,
            faturamento: parseFloat(r.faturamento),
            pedidos: parseInt(r.pedidos, 10),
            ticket_medio: parseFloat(r.ticket_medio),
            margem_pct: parseFloat(r.faturamento) > 0 ? (parseFloat(r.lucro) / parseFloat(r.faturamento)) * 100 : 0,
            meta_pct: 100, // Mock for now
            status: 'Ativo',
            ultima_venda: r.ultima_venda
        }));

        res.json({ data: mapped });
    } catch (err) { next(err); }
});

// GET /api/bi/sales/abc-analysis
router.get('/sales/abc-analysis', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const { start, end } = getBiDateRange(req);

        const { rows } = await db.query(`
            SELECT 
                COALESCE(vi.produto, 'Desconhecido') as produto_nome,
                SUM(vi.quantidade) as quantidade_vendida,
                SUM(vi.valor_total) as faturamento_total,
                SUM(vi.valor_total - vi.custo_unitario * vi.quantidade) as lucro_bruto
            FROM dash_vendas_itens vi
            JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id
            WHERE vi.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3 AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO')
            GROUP BY vi.produto
            ORDER BY faturamento_total DESC
            LIMIT 50
        `, [tenantId, start, end]);

        let totalFaturamentoGeral = 0;
        rows.forEach(r => totalFaturamentoGeral += parseFloat(r.faturamento_total));

        let acumulado = 0;
        const mapped = rows.map((r, i) => {
            const fat = parseFloat(r.faturamento_total);
            const qtd = parseFloat(r.quantidade_vendida);
            const lucro = parseFloat(r.lucro_bruto);
            const pct = totalFaturamentoGeral > 0 ? (fat / totalFaturamentoGeral) * 100 : 0;
            acumulado += pct;
            
            let curva = 'C';
            if (acumulado <= 80) curva = 'A';
            else if (acumulado <= 95) curva = 'B';

            return {
                produto_id: i + 1,
                produto_nome: r.produto_nome,
                faturamento_total: fat,
                quantidade_vendida: qtd,
                lucro_bruto: lucro,
                margem_pct: fat > 0 ? (lucro / fat) * 100 : 0,
                curva: curva,
                participacao_pct: pct,
                acumulado_pct: acumulado
            };
        });

        res.json({
            curva_a_count: mapped.filter(x => x.curva === 'A').length,
            curva_b_count: mapped.filter(x => x.curva === 'B').length,
            curva_c_count: mapped.filter(x => x.curva === 'C').length,
            data: mapped
        });
    } catch (err) { next(err); }
});

// ==========================================
// MÓDULO: FINANCIAL INTELLIGENCE
// ==========================================

// GET /api/bi/financial/summary
router.get('/financial/summary', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const { start, end } = getBiDateRange(req);

        const { rows: f } = await db.query(`
            SELECT 
                COALESCE(SUM(CASE WHEN TRIM(tipo) = 'RECEBER' AND TRIM(status_pagamento) = 'ABERTO' AND COALESCE(data_vencimento, data_emissao, NOW()) >= $2 AND COALESCE(data_vencimento, data_emissao, NOW()) <= $3 THEN valor - (CASE WHEN valor_pago = 0 THEN 0 ELSE valor_pago END) ELSE 0 END), 0) AS contas_receber,
                COALESCE(SUM(CASE WHEN TRIM(tipo) = 'PAGAR' AND TRIM(status_pagamento) = 'ABERTO' AND COALESCE(data_vencimento, data_emissao, NOW()) >= $2 AND COALESCE(data_vencimento, data_emissao, NOW()) <= $3 THEN valor - (CASE WHEN valor_pago = 0 THEN 0 ELSE valor_pago END) ELSE 0 END), 0) AS contas_pagar,
                COALESCE(SUM(CASE WHEN TRIM(tipo) = 'RECEBER' AND TRIM(status_pagamento) = 'PAGO' AND COALESCE(data_pagamento, data_vencimento, NOW()) >= $2 AND COALESCE(data_pagamento, data_vencimento, NOW()) <= $3 THEN (CASE WHEN valor_pago = 0 THEN valor ELSE valor_pago END) ELSE 0 END), 0) AS recebimentos_realizados,
                COALESCE(SUM(CASE WHEN TRIM(tipo) = 'PAGAR' AND TRIM(status_pagamento) = 'PAGO' AND COALESCE(data_pagamento, data_vencimento, NOW()) >= $2 AND COALESCE(data_pagamento, data_vencimento, NOW()) <= $3 THEN (CASE WHEN valor_pago = 0 THEN valor ELSE valor_pago END) ELSE 0 END), 0) AS pagamentos_realizados
            FROM dash_financeiro
            WHERE tenant_id = $1
        `, [tenantId, start, end]);

        const a_receber = parseFloat(f[0].contas_receber);
        const a_pagar = parseFloat(f[0].contas_pagar);
        const recebidos = parseFloat(f[0].recebimentos_realizados);
        const pagos = parseFloat(f[0].pagamentos_realizados);

        res.json({
            saldo_atual: recebidos - pagos,
            contas_receber: a_receber,
            contas_pagar: a_pagar,
            recebimentos_realizados: recebidos,
            pagamentos_realizados: pagos,
            inadimplencia_pct: 0 // Placeholder
        });
    } catch (err) { next(err); }
});

// GET /api/bi/financial/cash-flow (Mocked placeholder pending complex daily group by)
router.get('/financial/cash-flow', async (req, res, next) => {
    try {
        // Return an empty array for now to let frontend use the placeholder or show empty state
        res.json({
            dre_resumo: {
                receita_operacional: 0,
                custos_operacionais: 0,
                despesas_fixas: 0,
                ebitda: 0,
                lucro_liquido: 0,
                margem_liquida_pct: 0
            },
            fluxo_caixa: []
        });
    } catch (err) { next(err); }
});

// ==========================================
// MÓDULO: CUSTOMER ANALYTICS & RADAR 360
// ==========================================

// GET /api/bi/customer/analytics
router.get('/customer/analytics', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const { start, end } = getBiDateRange(req);

        // Clientes ativos vs Novos
        const { rows: atv } = await db.query(`
            SELECT COUNT(DISTINCT cliente_id_firebird) AS ativos
            FROM dash_vendas
            WHERE tenant_id = $1 AND data_venda >= $2 AND data_venda <= $3 AND TRIM(status) IN ('FATURADO', 'FINALIZADO')
        `, [tenantId, start, end]);

        const { rows: tot } = await db.query(`
            SELECT COUNT(*) AS totais,
                   SUM(CASE WHEN data_cadastro >= $2 AND data_cadastro <= $3 THEN 1 ELSE 0 END) AS novos
            FROM dash_clientes
            WHERE tenant_id = $1 AND ativo = true
        `, [tenantId, start, end]);

        // Top 50 clientes em risco (compraram antes do inicio, mas nao no periodo atual)
        const { rows: risco } = await db.query(`
            SELECT c.id_firebird, c.nome, MAX(v.data_venda) as ultima_compra, SUM(v.valor_total) as LTV
            FROM dash_clientes c
            JOIN dash_vendas v ON v.cliente_id_firebird = c.id_firebird AND v.tenant_id = c.tenant_id
            WHERE c.tenant_id = $1 AND v.data_venda < $2 AND c.ativo = true
              AND c.id_firebird NOT IN (
                  SELECT DISTINCT cliente_id_firebird FROM dash_vendas 
                  WHERE tenant_id = $1 AND data_venda >= $2 AND data_venda <= $3
              )
            GROUP BY c.id_firebird, c.nome
            ORDER BY ultima_compra DESC, LTV DESC
            LIMIT 50
        `, [tenantId, start, end]);

        const total_clientes = parseInt(tot[0].totais || 0);
        const clientes_ativos = parseInt(atv[0].ativos || 0);
        const retencao_pct = total_clientes > 0 ? (clientes_ativos / total_clientes) * 100 : 0;

        res.json({
            retencao_pct,
            clientes_ativos,
            clientes_inativos: total_clientes - clientes_ativos,
            novos_clientes: parseInt(tot[0].novos || 0),
            top_clientes_faturamento: [], // Mock array to fulfill interface, can add a heavy query later
            clientes_risco_churn: risco.map(r => ({
                cliente_id: r.id_firebird,
                nome: r.nome,
                ultima_compra: r.ultima_compra,
                dias_inativo: Math.floor((new Date() - new Date(r.ultima_compra)) / (1000 * 60 * 60 * 24)),
                ltv: parseFloat(r.ltv)
            }))
        });
    } catch (err) { next(err); }
});

// GET /api/bi/customer/radar-360
router.get('/customer/radar-360', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const searchId = req.query.id; // Expecting a customer ID

        if (!searchId) {
            return res.json({
                dna: { cliente_id: 0, nome: "Busque um cliente", documento: "-", cidade: "-", estado: "-", data_cadastro: new Date(), status: "INATIVO", ltv: 0 },
                behavior: { produto_favorito: "-", marca_favorita: "-", ticket_medio_historico: 0, frequencia_dias: 0 },
                risk_assessment: { risco_churn_pct: 0, tendencia: "ESTAVEL", ultima_compra: null, dias_sem_comprar: 0 },
                order_history: []
            });
        }

        const { rows: c } = await db.query(`SELECT * FROM dash_clientes WHERE tenant_id = $1 AND id_firebird = $2`, [tenantId, searchId]);
        
        if (c.length === 0) return res.status(404).json({ error: 'Cliente não encontrado' });

        const cliente = c[0];

        // LTV e Ticket Medio Histórico
        const { rows: vInfo } = await db.query(`
            SELECT 
                COUNT(*) as qtd_pedidos,
                COALESCE(SUM(valor_total), 0) as ltv,
                MAX(data_venda) as ultima_compra
            FROM dash_vendas 
            WHERE tenant_id = $1 AND cliente_id_firebird = $2 AND TRIM(status) IN ('FATURADO', 'FINALIZADO')
        `, [tenantId, searchId]);

        const ltv = parseFloat(vInfo[0].ltv);
        const qtd_pedidos = parseInt(vInfo[0].qtd_pedidos);
        const ticket_medio_historico = qtd_pedidos > 0 ? ltv / qtd_pedidos : 0;
        const ultima_compra = vInfo[0].ultima_compra;
        const dias_sem_comprar = ultima_compra ? Math.floor((new Date() - new Date(ultima_compra)) / (1000 * 60 * 60 * 24)) : 999;

        // Risco Churn básico (baseado nos 45 dias médios do varejo)
        let risco_churn_pct = 0;
        if (dias_sem_comprar > 90) risco_churn_pct = 95;
        else if (dias_sem_comprar > 45) risco_churn_pct = 60;
        else if (dias_sem_comprar > 30) risco_churn_pct = 30;

        res.json({
            dna: {
                cliente_id: cliente.id_firebird,
                nome: cliente.nome,
                documento: cliente.documento,
                cidade: cliente.cidade,
                estado: cliente.estado,
                data_cadastro: cliente.data_cadastro,
                status: cliente.ativo ? "ATIVO" : "INATIVO",
                ltv
            },
            behavior: {
                produto_favorito: "Análise dinâmica pendente", // Requires complex join
                marca_favorita: "Análise dinâmica pendente",
                ticket_medio_historico,
                frequencia_dias: 30 // Mock
            },
            risk_assessment: {
                risco_churn_pct,
                tendencia: risco_churn_pct > 50 ? "QUEDA" : "CRESCIMENTO",
                ultima_compra,
                dias_sem_comprar
            },
            order_history: [] // Mock
        });
    } catch (err) { next(err); }
});

// ==========================================
// MÓDULO: COMPARATIVE ANALYSIS
// ==========================================

// GET /api/bi/comparative/summary
router.get('/comparative/summary', async (req, res, next) => {
    try {
        // This is a complex logic that requires shifting the start/end dates backward
        // For simplicity in Phase 2, we return a structural mock simulating SQL delta results
        const tenantId = req.tenant.id;
        res.json({
            periodo_atual: { faturamento: 150000, volume_pedidos: 300, ticket_medio: 500 },
            periodo_anterior: { faturamento: 120000, volume_pedidos: 250, ticket_medio: 480 },
            deltas: { faturamento_pct: 25, volume_pedidos_pct: 20, ticket_medio_pct: 4.1 },
            ranking_vendedores_mudanca: []
        });
    } catch (err) { next(err); }
});

// ==========================================
// MÓDULO: METAS E FORNECEDORES
// ==========================================

router.get('/goals/summary', async (req, res, next) => {
    try {
        res.json({
            meta_global: { objetivo: 500000, realizado: 345000, projetado_fechamento: 480000, pct_atingimento: 69 },
            ritmo_vendas: { diaria_necessaria: 15000, diaria_realizada: 12500, status_ritmo: "ABAIXO" },
            metas_vendedores: [],
            metas_marcas: []
        });
    } catch (err) { next(err); }
});

router.get('/supplier/analytics', async (req, res, next) => {
    try {
        res.json({
            supplier_overview: { total_fornecedores: 50, fornecedores_ativos: 30, compras_totais: 200000, numero_compras: 80, ticket_medio_compra: 2500, prazo_medio_entrega_dias: 5, taxa_devolucao_pct: 1.2 },
            top_fornecedores: [],
            analise_estoque: { estoque_total_valor: 1000000, estoque_total_quantidade: 20000, produtos_estoque_critico: 10, produtos_estoque_baixo: 50, produtos_sem_estoque: 5, dias_estoque_medio: 60 },
            ranking_marcas: []
        });
    } catch (err) { next(err); }
});

// ==========================================
// MÓDULO: AI INSIGHTS
// ==========================================

router.get('/ai-insights', async (req, res, next) => {
    try {
        // AI Rules engine simulated via Node.js logic
        res.json({
            precision_score: 95.5,
            patterns_found: 8,
            last_analysis: new Date(),
            insights: [
                { type: "opportunity", title: "Aumento de Ticket Médio Possível", description: "Vendas casadas de produto X e Y aumentaram 15% na região Sul. Ofereça combos." },
                { type: "risk", title: "Possível quebra de estoque", description: "O item Z tem giro alto e estoque baixo." }
            ]
        });
    } catch (err) { next(err); }
});

module.exports = router;
