'use strict';

const express = require('express');
const router = express.Router();
const db = require('../db/postgres');
const { getPeriodRange, toSafeSqlString } = require('../utils/period');
const { buildDeptoFilter, buildCentroCustoFilter } = require('./filiais');

const getBiDateRange = (req) => {
    const period = req.query.period;
    const inicioParam = req.query.inicio || req.query.startDate || req.query.start_date;
    const fimParam = req.query.fim || req.query.endDate || req.query.end_date;
    
    if (period && period !== 'custom') {
        const pr = getPeriodRange(period);
        // getPeriodRange retorna strings, precisamos converter para Date
        return { start: new Date(pr.start), end: new Date(pr.end) };
    }

    const now = new Date();
    let start = new Date(1970, 0, 1);
    let end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (inicioParam) {
        start = new Date(`${inicioParam}T00:00:00`);
    }
    
    if (fimParam) {
        end = new Date(`${fimParam}T23:59:59.999`);
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
        const deptoId = req.query.depto_id;
        const df = buildDeptoFilter(deptoId, 4, 'v');
        
        // Calcular período anterior de mesmo tamanho
        const diffTime = Math.abs(end - start);
        const prevEnd = new Date(start.getTime() - 1);
        const prevStart = new Date(prevEnd.getTime() - diffTime);

        // --- 1. Executive Summary ---
        const { rows: v } = await db.query(`
            SELECT 
                COALESCE(SUM(
                    v.valor_total
                ), 0) AS faturamento_total,
                COUNT(DISTINCT v.id_firebird) AS total_pedidos
            FROM dash_vendas v
            WHERE v.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3 
              AND UPPER(TRIM(v.status)) NOT IN ('CANCELADO', 'ABERTO', 'PENDENTE', 'ORÇAMENTO', 'ORCAMENTO', 'NULO')
              ${df.clause}
        `, [tenantId, toSafeSqlString(start), toSafeSqlString(end), ...df.params]);

        const { rows: vPrev } = await db.query(`
            SELECT 
                COALESCE(SUM(
                    v.valor_total
                ), 0) AS faturamento_total,
                COUNT(DISTINCT v.id_firebird) AS total_pedidos
            FROM dash_vendas v
            WHERE v.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3 
              AND UPPER(TRIM(v.status)) NOT IN ('CANCELADO', 'ABERTO', 'PENDENTE', 'ORÇAMENTO', 'ORCAMENTO', 'NULO')
              ${df.clause}
        `, [tenantId, toSafeSqlString(prevStart), toSafeSqlString(prevEnd), ...df.params]);


        const { rows: dev_rows } = await db.query(`
            SELECT COALESCE(SUM(d.valor), 0) AS devolucao_total
            FROM dash_devolucoes d
            LEFT JOIN dash_vendas v ON v.id_firebird = d.venda_id_firebird AND v.tenant_id = d.tenant_id
            WHERE d.tenant_id = \$1 AND d.data_devolucao >= \$2 AND d.data_devolucao <= \$3
            ${df.clause}
        `, [tenantId, toSafeSqlString(start), toSafeSqlString(end), ...df.params]);
        const devolucoes = parseFloat(dev_rows[0].devolucao_total);

        const { rows: dev_prev_rows } = await db.query(`
            SELECT COALESCE(SUM(d.valor), 0) AS devolucao_total
            FROM dash_devolucoes d
            LEFT JOIN dash_vendas v ON v.id_firebird = d.venda_id_firebird AND v.tenant_id = d.tenant_id
            WHERE d.tenant_id = \$1 AND d.data_devolucao >= \$2 AND d.data_devolucao <= \$3
            ${df.clause}
        `, [tenantId, toSafeSqlString(prevStart), toSafeSqlString(prevEnd), ...df.params]);
        const devolucoes_anterior = parseFloat(dev_prev_rows[0].devolucao_total);

        const faturamento = parseFloat(v[0].faturamento_total) - devolucoes;
        const faturamento_anterior = parseFloat(vPrev[0].faturamento_total) - devolucoes_anterior;

        const crescimento_pct = faturamento_anterior > 0 ? ((faturamento - faturamento_anterior) / faturamento_anterior) * 100 : 0;

        const qtd = parseInt(v[0].total_pedidos, 10);
        const qtd_ant = parseInt(vPrev[0].total_pedidos, 10);
        const cresc_qtd_pct = qtd_ant > 0 ? ((qtd - qtd_ant) / qtd_ant) * 100 : 0;

        const tm = qtd > 0 ? faturamento / qtd : 0;
        const tm_ant = qtd_ant > 0 ? faturamento_anterior / qtd_ant : 0;
        const cresc_tm_pct = tm_ant > 0 ? ((tm - tm_ant) / tm_ant) * 100 : 0;

        // --- 2. Top Sellers ---
        const { rows: sellers } = await db.query(`
            SELECT COALESCE(vend.nome, 'Vendedor ' || COALESCE(v.vendedor_id_firebird::text, '?')) as nome, 
                   SUM(
                       v.valor_total
                   ) as vendas
            FROM dash_vendas v
            LEFT JOIN dash_vendedores vend ON vend.id_firebird = v.vendedor_id_firebird AND vend.tenant_id = v.tenant_id
            WHERE v.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3 
              AND UPPER(TRIM(v.status)) NOT IN ('CANCELADO', 'ABERTO', 'PENDENTE', 'ORÇAMENTO', 'ORCAMENTO', 'NULO')
              ${df.clause}
            GROUP BY v.vendedor_id_firebird, vend.nome
            ORDER BY vendas DESC
            LIMIT 10
        `, [tenantId, toSafeSqlString(start), toSafeSqlString(end), ...df.params]);

        const colors = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];
        const top_sellers = sellers.map((s, i) => ({
            rank: i + 1,
            name: s.nome || 'N/A',
            value: parseFloat(s.vendas), // Map to value for UI
            metaPct: 100,
            metaStatus: 'Meta Alcançada',
            color: colors[i % colors.length]
        }));

        // --- 3. Top Products ---
        const { rows: prods } = await db.query(`
            SELECT COALESCE(vi.produto, 'Produto ' || COALESCE(vi.produto_id_firebird::text, '?')) AS nome, 
                   SUM(
                       vi.valor_total
                   ) as vendas
            FROM dash_vendas_itens vi
            JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id
            WHERE vi.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3 
              AND UPPER(TRIM(v.status)) NOT IN ('CANCELADO', 'ABERTO', 'PENDENTE', 'ORÇAMENTO', 'ORCAMENTO', 'NULO')
              AND COALESCE(vi.produto, vi.produto_id_firebird::text) IS NOT NULL${df.clause}
            GROUP BY COALESCE(vi.produto, 'Produto ' || COALESCE(vi.produto_id_firebird::text, '?'))
            ORDER BY vendas DESC
            LIMIT 10
        `, [tenantId, toSafeSqlString(start), toSafeSqlString(end), ...df.params]);

        const top_products = prods.map((p, i) => ({
            rank: i + 1,
            name: p.nome,
            current: parseFloat(p.vendas),
            prev: null, // Removed fake mock
            delta: null // Removed fake mock
        }));

        // --- 4. Top Brands ---
        const { rows: brands } = await db.query(`
            SELECT COALESCE(vi.marca, v.marca, 'S/ MARCA') as nome, 
                   SUM(
                       vi.valor_total
                   ) as vendas
            FROM dash_vendas_itens vi
            JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id
            WHERE vi.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3 
              AND UPPER(TRIM(v.status)) NOT IN ('CANCELADO', 'ABERTO', 'PENDENTE', 'ORÇAMENTO', 'ORCAMENTO', 'NULO')
              AND COALESCE(vi.marca, v.marca) IS NOT NULL AND COALESCE(vi.marca, v.marca) != ''${df.clause}
            GROUP BY COALESCE(vi.marca, v.marca, 'S/ MARCA')
            ORDER BY vendas DESC
            LIMIT 10
        `, [tenantId, toSafeSqlString(start), toSafeSqlString(end), ...df.params]);

        const top_brands = brands.map((b, i) => ({
            rank: i + 1,
            name: b.nome,
            current: parseFloat(b.vendas),
            prev: null, // Removed fake mock
            delta: null // Removed fake mock
        }));

        // --- 5. Top Regions (Cities) ---
        const { rows: regions } = await db.query(`
            SELECT COALESCE(c.cidade, 'NÃO INFORMADA') as nome, 
                   SUM(
                       v.valor_total
                   ) as vendas
            FROM dash_vendas v
            LEFT JOIN dash_clientes c ON c.id_firebird = v.cliente_id_firebird AND c.tenant_id = v.tenant_id
            WHERE v.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3 
              AND UPPER(TRIM(v.status)) NOT IN ('CANCELADO', 'ABERTO', 'PENDENTE', 'ORÇAMENTO', 'ORCAMENTO', 'NULO')
              ${df.clause}
            GROUP BY c.cidade
            ORDER BY vendas DESC
            LIMIT 10
        `, [tenantId, toSafeSqlString(start), toSafeSqlString(end), ...df.params]);

        const top_regions = regions.map((r, i) => ({
            rank: i + 1,
            name: r.nome,
            current: parseFloat(r.vendas),
            share: faturamento > 0 ? ((parseFloat(r.vendas) / faturamento) * 100).toFixed(1) : 0
        }));

        // --- 6. Top Categories ---
        const { rows: categories } = await db.query(`
            SELECT COALESCE(vi.categoria, v.categoria, 'S/ GRUPO') as nome, 
                   SUM(
                       vi.valor_total
                   ) as vendas
            FROM dash_vendas_itens vi
            JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id
            WHERE vi.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3 
              AND UPPER(TRIM(v.status)) NOT IN ('CANCELADO', 'ABERTO', 'PENDENTE', 'ORÇAMENTO', 'ORCAMENTO', 'NULO')
              AND COALESCE(vi.categoria, v.categoria) IS NOT NULL AND COALESCE(vi.categoria, v.categoria) != ''${df.clause}
            GROUP BY COALESCE(vi.categoria, v.categoria, 'S/ GRUPO')
            ORDER BY vendas DESC
            LIMIT 10
        `, [tenantId, toSafeSqlString(start), toSafeSqlString(end), ...df.params]);

        const top_categories = categories.map((c, i) => ({
            rank: i + 1,
            name: c.nome,
            current: parseFloat(c.vendas),
            prev: null, // Removed fake mock
            delta: null // Removed fake mock
        }));

        // --- 7. Top Clientes ---
        const { rows: clients } = await db.query(`
            SELECT COALESCE(c.nome, 'Cliente ' || COALESCE(v.cliente_id_firebird::text, '?')) as nome, 
                   SUM(
                       v.valor_total
                   ) as vendas
            FROM dash_vendas v
            LEFT JOIN dash_clientes c ON c.id_firebird = v.cliente_id_firebird AND c.tenant_id = v.tenant_id
            WHERE v.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3 
              AND UPPER(TRIM(v.status)) NOT IN ('CANCELADO', 'ABERTO', 'PENDENTE', 'ORÇAMENTO', 'ORCAMENTO', 'NULO')
            GROUP BY v.cliente_id_firebird, c.nome
            ORDER BY vendas DESC
            LIMIT 10
        `, [tenantId, toSafeSqlString(start), toSafeSqlString(end)]);

        const top_clients = clients.map((c, i) => ({
            rank: i + 1,
            name: c.nome,
            value: parseFloat(c.vendas)
        }));

        res.json({
            executive_summary: {
                faturamento, faturamento_anterior, crescimento_pct,
                quantidade_pedidos: qtd, quantidade_pedidos_anterior: qtd_ant, crescimento_pedidos_pct: cresc_qtd_pct,
                ticket_medio: tm, ticket_medio_anterior: tm_ant, crescimento_ticket_pct: cresc_tm_pct
            },
            top_sellers,
            top_products,
            top_brands,
            top_regions,
            top_categories,
            top_clients,
            revenue_trajectory: [] // Will be mapped properly if required
        });
    } catch (err) { next(err); }
});

// GET /api/bi/sales/commercial-kpis
router.get('/sales/commercial-kpis', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const { start, end } = getBiDateRange(req);
        const deptoId = req.query.depto_id;
        const df = buildDeptoFilter(deptoId, 4, 'v');

        // Produtos vendidos e Faturamento Total (separando para não duplicar faturamento por causa do JOIN)
        const { rows: pItems } = await db.query(`
            SELECT COALESCE(SUM(quantidade), 0) AS qtd
            FROM dash_vendas_itens
            WHERE tenant_id = $1 AND venda_id_firebird IN (
                SELECT id_firebird FROM dash_vendas v WHERE v.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3 
                AND UPPER(TRIM(v.status)) NOT IN ('CANCELADO', 'ABERTO', 'PENDENTE', 'ORÇAMENTO', 'ORCAMENTO', 'NULO')
                ${df.clause}
            )
        `, [tenantId, toSafeSqlString(start), toSafeSqlString(end), ...df.params]);

        const { rows: pVendas } = await db.query(`
            SELECT 
                COUNT(DISTINCT v.id_firebird) as pedidos,
                COALESCE(SUM(
                    v.valor_total
                ), 0) as faturamento_total
            FROM dash_vendas v
            WHERE v.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3 
              AND UPPER(TRIM(v.status)) NOT IN ('CANCELADO', 'ABERTO', 'PENDENTE', 'ORÇAMENTO', 'ORCAMENTO', 'NULO')
        ${df.clause}
        `, [tenantId, toSafeSqlString(start), toSafeSqlString(end), ...df.params]);

        // Total descontos
        const { rows: d } = await db.query(`
            SELECT COALESCE(SUM(v.valor_desconto), 0) AS descontos
            FROM dash_vendas v
            WHERE v.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3 AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO')
            ${df.clause}
        `, [tenantId, toSafeSqlString(start), toSafeSqlString(end), ...df.params]);

        // --- Vendedores ---
        const { rows: vends } = await db.query(`
            SELECT COALESCE(vend.nome, 'Vendedor ' || COALESCE(v.vendedor_id_firebird::text, '?')) as nome, 
                   SUM(v.valor_total) as vendas
            FROM dash_vendas v
            LEFT JOIN dash_vendedores vend ON vend.id_firebird = v.vendedor_id_firebird AND vend.tenant_id = v.tenant_id
            WHERE v.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3 AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO', 'PAGO', 'EMITIDO', 'CONCLUIDO', 'VENDIDO', 'DEVOLVIDO', 'DEVOLUCAO', 'DEVOLUÇÃO', 'TROCA')
            ${df.clause}
            GROUP BY v.vendedor_id_firebird, vend.nome
            ORDER BY vendas DESC
            LIMIT 10
        `, [tenantId, toSafeSqlString(start), toSafeSqlString(end), ...df.params]);


        const { rows: dev_rows } = await db.query(`
            SELECT COALESCE(SUM(d.valor), 0) AS devolucao_total
            FROM dash_devolucoes d
            LEFT JOIN dash_vendas v ON v.id_firebird = d.venda_id_firebird AND v.tenant_id = d.tenant_id
            WHERE d.tenant_id = \$1 AND d.data_devolucao >= \$2 AND d.data_devolucao <= \$3
            ${df.clause}
        `, [tenantId, toSafeSqlString(start), toSafeSqlString(end), ...df.params]);
        const devolucoes = parseFloat(dev_rows[0].devolucao_total);

        // Calcula total faturado para share (usando faturamento_total real)
        const totalFaturamento = parseFloat(pVendas[0].faturamento_total || 0) - devolucoes;

        const top_sellers = vends.map((v, i) => {
            const colors = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#14B8A6'];
            return {
                name: v.nome,
                value: parseFloat(v.vendas),
                share: totalFaturamento > 0 ? (parseFloat(v.vendas) / totalFaturamento) * 100 : 0,
                color: colors[i % colors.length]
            };
        });

        const totalPedidos = parseInt(pVendas[0].pedidos || 0);
        const ticketMedio = totalPedidos > 0 ? totalFaturamento / totalPedidos : 0;

        const { rows: recent } = await db.query(`
            SELECT 
                v.id_firebird as id,
                v.numero_pedido as numero_nota,
                c.nome as cliente,
                vend.nome as vendedor,
                TO_CHAR(v.data_venda, 'DD/MM/YYYY') as data,
                v.valor_total as valor,
                v.status
            FROM dash_vendas v
            LEFT JOIN dash_clientes c ON c.id_firebird = v.cliente_id_firebird AND c.tenant_id = v.tenant_id
            LEFT JOIN dash_vendedores vend ON vend.id_firebird = v.vendedor_id_firebird AND vend.tenant_id = v.tenant_id
            WHERE v.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3
            ${df.clause}
            ORDER BY v.data_venda DESC, v.id_firebird DESC
        `, [tenantId, toSafeSqlString(start), toSafeSqlString(end), ...df.params]);

        res.json({
            produtos_vendidos: parseFloat(pItems[0].qtd),
            descontos_concedidos: parseFloat(d[0].descontos),
            faturamento_total: totalFaturamento,
            ticket_medio: ticketMedio,
            total_pedidos: totalPedidos,
            meta_atingida_pct: 0, // Placeholder para futuras métricas
            projecao_fechamento: 0,
            top_sellers,
            recent_orders: recent.map(r => ({
                id: String(r.id),
                numero_nota: r.numero_nota || '-',
                cliente: r.cliente || 'Consumidor',
                vendedor: r.vendedor || 'Vendedor',
                data: r.data,
                valor: parseFloat(r.valor || 0),
                status: r.status
            }))
        });
    } catch (err) { next(err); }
});

// GET /api/bi/sales/sellers
router.get('/sales/sellers', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const { start, end } = getBiDateRange(req);
        const deptoId = req.query.depto_id;
        const df = buildDeptoFilter(deptoId, 4, 'v');

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
            WHERE v.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3 AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO', 'PAGO', 'EMITIDO', 'CONCLUIDO', 'VENDIDO', 'DEVOLVIDO', 'DEVOLUCAO', 'DEVOLUÇÃO', 'TROCA')
            ${df.clause}
            GROUP BY vend.id_firebird, vend.nome
            ORDER BY faturamento DESC
        `, [tenantId, toSafeSqlString(start), toSafeSqlString(end), ...df.params]);

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

        // Inventory values from dash_produtos
        const { rows: inv } = await db.query(`
            SELECT 
                COALESCE(SUM(estoque * custo), 0) AS valor_estoque_custo,
                COALESCE(SUM(estoque * preco), 0) AS valor_estoque_venda,
                COALESCE(SUM(estoque), 0) AS total_volume,
                COUNT(CASE WHEN estoque > 0 THEN 1 END) AS skus_com_saldo,
                COUNT(id_firebird) AS total_skus
            FROM dash_produtos
            WHERE tenant_id = $1 AND ativo = true
        `, [tenantId]);

        const valor_estoque_custo = parseFloat(inv[0].valor_estoque_custo);
        const valor_estoque_venda = parseFloat(inv[0].valor_estoque_venda);
        const total_volume = parseInt(inv[0].total_volume, 10);
        const skus_com_saldo = parseInt(inv[0].skus_com_saldo, 10);
        const total_skus = parseInt(inv[0].total_skus, 10);
        const ruptura_pct = total_skus > 0 ? ((total_skus - skus_com_saldo) / total_skus) * 100 : 0;

        // Fetch product list and calculate ABC
        const { rows: prods } = await db.query(`
            SELECT 
                p.id_firebird, p.nome, COALESCE(p.marca, 'DIVERSAS') as marca, 
                COALESCE(p.categoria, 'OUTROS') as grupo, p.estoque, p.custo, p.preco,
                COALESCE(SUM(vi.valor_total), 0) as faturamento_historico
            FROM dash_produtos p
            LEFT JOIN dash_vendas_itens vi ON vi.produto_id_firebird = p.id_firebird AND vi.tenant_id = p.tenant_id
            WHERE p.tenant_id = $1 AND p.ativo = true
            GROUP BY p.id_firebird, p.nome, p.marca, p.categoria, p.estoque, p.custo, p.preco
            ORDER BY faturamento_historico DESC
            LIMIT 500
        `, [tenantId]);

        let totalFaturamentoGeral = 0;
        prods.forEach(r => totalFaturamentoGeral += parseFloat(r.faturamento_historico));

        let acumulado = 0;
        const mapped = prods.map(p => {
            const fat = parseFloat(p.faturamento_historico);
            const pct = totalFaturamentoGeral > 0 ? (fat / totalFaturamentoGeral) * 100 : 0;
            acumulado += pct;
            
            let curva = 'C';
            if (acumulado <= 80) curva = 'A';
            else if (acumulado <= 95) curva = 'B';

            const estoque = parseFloat(p.estoque);
            let status = 'Ideal';
            let alert = false;
            if (estoque <= 0) { status = 'Sem Giro'; alert = true; }
            else if (estoque < 10) { status = 'Crítico'; alert = true; }
            else if (estoque < 20) { status = 'Atenção'; }

            return {
                cod: String(p.id_firebird),
                desc: p.nome,
                emb: 'UN',
                marca: p.marca,
                grupo: p.grupo,
                abc: curva,
                status: status,
                estoque: estoque,
                custo: parseFloat(p.custo),
                preco: parseFloat(p.preco),
                dias: 30, // Mock for now
                alert: alert,
                faturamento: fat
            };
        });

        // Distribution by Grupo
        const { rows: distGrupo } = await db.query(`
            SELECT COALESCE(categoria, 'OUTROS') as name, COUNT(id_firebird) as value
            FROM dash_produtos WHERE tenant_id = $1 AND ativo = true GROUP BY categoria ORDER BY value DESC LIMIT 10
        `, [tenantId]);

        // Distribution by Marca
        const { rows: distMarca } = await db.query(`
            SELECT COALESCE(marca, 'DIVERSAS') as name, COUNT(id_firebird) as value
            FROM dash_produtos WHERE tenant_id = $1 AND ativo = true GROUP BY marca ORDER BY value DESC LIMIT 10
        `, [tenantId]);

        // Bar Chart (Top 15 Marcas por Estoque)
        const { rows: barChart } = await db.query(`
            SELECT COALESCE(marca, 'DIVERSAS') as name, SUM(estoque * custo) as estoque
            FROM dash_produtos WHERE tenant_id = $1 AND ativo = true GROUP BY marca ORDER BY estoque DESC LIMIT 15
        `, [tenantId]);

        res.json({
            kpis: {
                valor_estoque_custo,
                valor_estoque_venda,
                total_volume,
                skus_com_saldo,
                ruptura_pct,
                curva_a_count: mapped.filter(x => x.abc === 'A').length,
                curva_b_count: mapped.filter(x => x.abc === 'B').length,
                curva_c_count: mapped.filter(x => x.abc === 'C').length
            },
            distGrupo: distGrupo.map(g => ({ name: g.name, value: parseInt(g.value) })),
            distMarca: distMarca.map(m => ({ name: m.name, value: parseInt(m.value) })),
            barChartData: barChart.map(b => ({ name: b.name, estoque: parseFloat(b.estoque), giro: '0x' })),
            tableData: mapped
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
        const centroCusto = req.query.centro_custo;
        const deptoId = req.query.depto_id;
        
        let cf = { clause: '', params: [] };
        if (centroCusto && centroCusto !== 'todas') {
            cf = buildCentroCustoFilter(centroCusto, 4, 'f');
        } else if (deptoId && deptoId !== 'todas') {
            cf = buildDeptoFilter(deptoId, 4, 'f');
        }

        const { rows: f } = await db.query(`
            SELECT 
                COALESCE(SUM(CASE WHEN TRIM(f.tipo) = 'RECEBER' AND TRIM(f.status_pagamento) = 'ABERTO' THEN f.valor - (CASE WHEN f.valor_pago = 0 THEN 0 ELSE f.valor_pago END) ELSE 0 END), 0) AS contas_receber,
                COALESCE(SUM(CASE WHEN TRIM(f.tipo) = 'PAGAR' AND TRIM(f.status_pagamento) = 'ABERTO' THEN f.valor - (CASE WHEN f.valor_pago = 0 THEN 0 ELSE f.valor_pago END) ELSE 0 END), 0) AS contas_pagar,
                COALESCE(SUM(CASE WHEN TRIM(f.tipo) = 'RECEBER' AND TRIM(f.status_pagamento) = 'ABERTO' AND f.data_vencimento < NOW() THEN f.valor - (CASE WHEN f.valor_pago = 0 THEN 0 ELSE f.valor_pago END) ELSE 0 END), 0) AS receber_vencido,
                COALESCE(SUM(CASE WHEN TRIM(f.tipo) = 'PAGAR' AND TRIM(f.status_pagamento) = 'ABERTO' AND f.data_vencimento < NOW() THEN f.valor - (CASE WHEN f.valor_pago = 0 THEN 0 ELSE f.valor_pago END) ELSE 0 END), 0) AS pagar_vencido,
                COALESCE(SUM(CASE WHEN TRIM(f.tipo) = 'RECEBER' AND TRIM(f.status_pagamento) = 'PAGO' AND COALESCE(f.data_pagamento, f.data_vencimento, NOW()) >= $2 AND COALESCE(f.data_pagamento, f.data_vencimento, NOW()) <= $3 THEN (CASE WHEN f.valor_pago = 0 THEN f.valor ELSE f.valor_pago END) ELSE 0 END), 0) AS recebimentos_realizados,
                COALESCE(SUM(CASE WHEN TRIM(f.tipo) = 'PAGAR' AND TRIM(f.status_pagamento) = 'PAGO' AND COALESCE(f.data_pagamento, f.data_vencimento, NOW()) >= $2 AND COALESCE(f.data_pagamento, f.data_vencimento, NOW()) <= $3 THEN (CASE WHEN f.valor_pago = 0 THEN f.valor ELSE f.valor_pago END) ELSE 0 END), 0) AS pagamentos_realizados
            FROM dash_financeiro f
            WHERE f.tenant_id = $1
            ${cf.clause}
        `, [tenantId, toSafeSqlString(start), toSafeSqlString(end), ...cf.params]);

        const a_receber = parseFloat(f[0].contas_receber);
        const a_pagar = parseFloat(f[0].contas_pagar);
        const receber_vencido = parseFloat(f[0].receber_vencido);
        const pagar_vencido = parseFloat(f[0].pagar_vencido);
        const recebidos = parseFloat(f[0].recebimentos_realizados);
        const pagos = parseFloat(f[0].pagamentos_realizados);
        const inadimplencia_pct = a_receber > 0 ? (receber_vencido / a_receber) * 100 : 0;

        res.json({
            saldo_atual: recebidos - pagos,
            contas_receber: a_receber,
            contas_pagar: a_pagar,
            receber_vencido: receber_vencido,
            pagar_vencido: pagar_vencido,
            recebimentos_realizados: recebidos,
            pagamentos_realizados: pagos,
            inadimplencia_pct: Number(inadimplencia_pct.toFixed(1))
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
        const deptoId = req.query.depto_id;
        const df = buildDeptoFilter(deptoId, 4, 'v');

        // Clientes ativos vs Novos
        const { rows: atv } = await db.query(`
            SELECT COUNT(DISTINCT v.cliente_id_firebird) AS ativos
            FROM dash_vendas v
            WHERE v.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3 AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO')
            ${df.clause}
        `, [tenantId, toSafeSqlString(start), toSafeSqlString(end), ...df.params]);

        const { rows: tot } = await db.query(`
            SELECT COUNT(*) AS totais,
                   SUM(CASE WHEN data_cadastro >= $2 AND data_cadastro <= $3 THEN 1 ELSE 0 END) AS novos
            FROM dash_clientes
            WHERE tenant_id = $1 AND ativo = true
        `, [tenantId, toSafeSqlString(start), toSafeSqlString(end)]);

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
              ${df.clause}
            GROUP BY c.id_firebird, c.nome
            ORDER BY ultima_compra DESC, LTV DESC
            LIMIT 50
        `, [tenantId, toSafeSqlString(start), toSafeSqlString(end), ...df.params]);

        const total_clientes = parseInt(tot[0].totais || 0);
        const clientes_ativos = parseInt(atv[0].ativos || 0);
        const retencao_pct = total_clientes > 0 ? (clientes_ativos / total_clientes) * 100 : 0;
        const novos = parseInt(tot[0].novos || 0);

        res.json({
            customer_overview: {
                total_clientes,
                clientes_ativos,
                clientes_novos: novos,
                clientes_em_crescimento: 0, // Mock
                clientes_em_queda: 0, // Mock
                clientes_inativos: total_clientes - clientes_ativos,
                taxa_retencao_pct: retencao_pct,
                valor_medio_cliente: 0 // Mock
            },
            top_clientes: [], // Mock array to fulfill interface, can add a heavy query later
            clientes_sem_comprar: risco.map(r => ({
                cliente_id: r.id_firebird,
                nome: r.nome,
                ultima_compra: r.ultima_compra,
                dias_sem_comprar: Math.floor((new Date() - new Date(r.ultima_compra)) / (1000 * 60 * 60 * 24)),
                faturamento_historico: parseFloat(r.ltv),
                frequencia_dias: 30, // Mock for now
                risco_churn_pct: 50.0 // Mock for now
            }))
        });
    } catch (err) { next(err); }
});

// GET /api/bi/customer/search
router.get('/customer/search', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const query = req.query.q?.toUpperCase() || '';
        
        if (!query || query.length < 3) {
            return res.json([]);
        }

        const { rows } = await db.query(`
            SELECT 
                c.id_firebird as id, 
                c.nome, 
                c.documento as cnpj,
                COALESCE((
                    SELECT SUM(v.valor_total) 
                    FROM dash_vendas v 
                    WHERE v.cliente_id_firebird = c.id_firebird AND v.tenant_id = c.tenant_id
                ), 0) as ltv,
                (
                    SELECT MAX(data_venda) 
                    FROM dash_vendas v 
                    WHERE v.cliente_id_firebird = c.id_firebird AND v.tenant_id = c.tenant_id
                ) as ultima_compra
            FROM dash_clientes c
            WHERE c.tenant_id = $1 
              AND (UPPER(c.nome) LIKE $2 OR c.documento LIKE $2)
            ORDER BY c.nome ASC
            LIMIT 10
        `, [tenantId, `%${query}%`]);

        // Calcula risco_churn basico no runtime para o Mini-Card
        const now = new Date();
        const results = rows.map(r => {
            let churnRisk = 0;
            if (r.ultima_compra) {
                const diffTime = Math.abs(now.getTime() - new Date(r.ultima_compra).getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays > 90) churnRisk = 95;
                else if (diffDays > 60) churnRisk = 75;
                else if (diffDays > 30) churnRisk = 40;
                else churnRisk = 10;
            } else {
                churnRisk = 100; // Nunca comprou
            }
            return { ...r, ltv: parseFloat(r.ltv), risco_churn_pct: churnRisk };
        });

        res.json(results);
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
                COALESCE(SUM(v.valor_total), 0) as ltv,
                COUNT(DISTINCT v.id_firebird) as total_pedidos,
                MAX(v.data_venda) as ultima_compra
            FROM dash_vendas v
            WHERE v.tenant_id = $1 AND v.cliente_id_firebird = $2 AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO', 'PAGO', 'EMITIDO', 'CONCLUIDO', 'VENDIDO', 'DEVOLVIDO', 'DEVOLUCAO', 'DEVOLUÇÃO', 'TROCA')
        `, [tenantId, searchId]);

        const ltv = parseFloat(vInfo[0].ltv);
        const qtd_pedidos = parseInt(vInfo[0].total_pedidos);
        const ticket_medio_historico = qtd_pedidos > 0 ? ltv / qtd_pedidos : 0;
        const ultima_compra = vInfo[0].ultima_compra;
        const dias_sem_comprar = ultima_compra ? Math.floor((new Date() - new Date(ultima_compra)) / (1000 * 60 * 60 * 24)) : 999;

        // Risco Churn básico (baseado nos 45 dias médios do varejo)
        let risco_churn_pct = 0;
        if (dias_sem_comprar > 90) risco_churn_pct = 95;
        else if (dias_sem_comprar > 45) risco_churn_pct = 60;
        else if (dias_sem_comprar > 30) risco_churn_pct = 30;


        // Vendedor Estrela
        const { rows: vendedores } = await db.query(`
            SELECT vendedor, SUM(valor_total) as total_vendido
            FROM dash_vendas
            WHERE tenant_id = $1 AND cliente_id_firebird = $2 AND vendedor IS NOT NULL AND vendedor != ''
            GROUP BY vendedor
            ORDER BY total_vendido DESC
            LIMIT 1
        `, [tenantId, searchId]);
        const vendedor_estrela = vendedores.length > 0 ? vendedores[0].vendedor : 'N/A';

        // Melhor Horário (Densidade)
        const { rows: heatmap } = await db.query(`
            SELECT EXTRACT(HOUR FROM data_venda) as hora, COUNT(*) as qtd
            FROM dash_vendas
            WHERE tenant_id = $1 AND cliente_id_firebird = $2
            GROUP BY hora
            ORDER BY qtd DESC
            LIMIT 1
        `, [tenantId, searchId]);
        const melhor_horario = heatmap.length > 0 ? `${String(heatmap[0].hora).padStart(2, '0')}:00` : 'N/A';

        // Order History
        const { rows: history } = await db.query(`
            SELECT id_firebird as id, numero_pedido as numero_nota, data_venda as data_emissao, vendedor as vendedor_nome, valor_total, status 
            FROM dash_vendas
            WHERE tenant_id = $1 AND cliente_id_firebird = $2
            ORDER BY data_venda DESC
            LIMIT 10
        `, [tenantId, searchId]);

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
                produto_favorito: "Análise dinâmica pendente",
                marca_favorita: "Análise dinâmica pendente",
                ticket_medio_historico,
                frequencia_dias: 30, // Mock
                melhor_horario
            },
            affinity: {
                vendedor_estrela
            },
            risk_assessment: {
                risco_churn_pct,
                tendencia: risco_churn_pct > 50 ? "QUEDA" : "CRESCIMENTO",
                ultima_compra,
                dias_sem_comprar
            },
            order_history: history.map(h => ({
                id: h.id,
                numero_nota: h.numero_nota,
                data_emissao: h.data_emissao ? new Date(h.data_emissao).toLocaleDateString('pt-BR') : '',
                vendedor_nome: h.vendedor_nome,
                valor_total: parseFloat(h.valor_total),
                status: h.status
            }))
        });

    } catch (err) { next(err); }
});

// ==========================================
// MÓDULO: COMPARATIVE ANALYSIS
// ==========================================

// GET /api/bi/comparative/summary
router.get('/comparative/summary', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const { start, end } = getBiDateRange(req);
        const deptoId = req.query.depto_id;
        const df = buildDeptoFilter(deptoId, 4, 'v');

        // --- KPI Overview ---
        const { rows: kpis } = await db.query(`
            SELECT 
                COALESCE(SUM(v.valor_total), 0) AS faturamento,
                COALESCE(SUM(v.valor_custo), 0) AS custo
            FROM dash_vendas v
            WHERE v.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3 AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO', 'PAGO', 'EMITIDO', 'CONCLUIDO', 'VENDIDO', 'DEVOLVIDO', 'DEVOLUCAO', 'DEVOLUÇÃO', 'TROCA')
            ${df.clause}
        `, [tenantId, toSafeSqlString(start), toSafeSqlString(end), ...df.params]);

        const faturamento = parseFloat(kpis[0].faturamento);
        const custo = parseFloat(kpis[0].custo);
        const lucro = faturamento - custo;
        const margem_pct = faturamento > 0 ? (lucro / faturamento) * 100 : 0;

        // --- Marcas ---
        const { rows: marcas } = await db.query(`
            SELECT COALESCE(vi.marca, v.marca, 'S/ MARCA') as nome, 
                   SUM(vi.valor_total) as vendas,
                   SUM(vi.custo_unitario * vi.quantidade) as custo
            FROM dash_vendas_itens vi
            JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id
            WHERE vi.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3 AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO', 'PAGO', 'EMITIDO', 'CONCLUIDO', 'VENDIDO', 'DEVOLVIDO', 'DEVOLUCAO', 'DEVOLUÇÃO', 'TROCA')
              AND COALESCE(vi.marca, v.marca) IS NOT NULL AND COALESCE(vi.marca, v.marca) != ''
              ${df.clause}
            GROUP BY COALESCE(vi.marca, v.marca, 'S/ MARCA')
            ORDER BY vendas DESC
            LIMIT 15
        `, [tenantId, toSafeSqlString(start), toSafeSqlString(end), ...df.params]);

        const colors = ['#0EA5E9', '#10B981', '#3B82F6', '#8B5CF6', '#A855F7', '#D946EF', '#F472B6', '#F43F5E', '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#EAB308'];

        const marcaData = marcas.map((m, i) => {
            const m_vendas = parseFloat(m.vendas || 0);
            const m_custo = parseFloat(m.custo || 0);
            const m_lucro = m_vendas - m_custo;
            return {
                rank: i + 1,
                name: m.nome,
                vendas: m_vendas,
                custo: m_custo,
                lucro: m_lucro,
                luc_pct: m_vendas > 0 ? (m_lucro / m_vendas) * 100 : 0,
                color: colors[i % colors.length]
            };
        });

        // --- Grupos/Categorias ---
        const { rows: grupos } = await db.query(`
            SELECT COALESCE(vi.categoria, v.categoria, 'S/ GRUPO') as nome, 
                   SUM(vi.valor_total) as vendas,
                   SUM(vi.custo_unitario * vi.quantidade) as custo
            FROM dash_vendas_itens vi
            JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id
            WHERE vi.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3 AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO', 'PAGO', 'EMITIDO', 'CONCLUIDO', 'VENDIDO', 'DEVOLVIDO', 'DEVOLUCAO', 'DEVOLUÇÃO', 'TROCA')
              AND COALESCE(vi.categoria, v.categoria) IS NOT NULL AND COALESCE(vi.categoria, v.categoria) != ''
              ${df.clause}
            GROUP BY COALESCE(vi.categoria, v.categoria, 'S/ GRUPO')
            ORDER BY vendas DESC
            LIMIT 15
        `, [tenantId, toSafeSqlString(start), toSafeSqlString(end), ...df.params]);

        const grupoData = grupos.map((g, i) => {
            const g_vendas = parseFloat(g.vendas || 0);
            const g_custo = parseFloat(g.custo || 0);
            const g_lucro = g_vendas - g_custo;
            return {
                rank: i + 1,
                name: g.nome,
                vendas: g_vendas,
                custo: g_custo,
                lucro: g_lucro,
                luc_pct: g_vendas > 0 ? (g_lucro / g_vendas) * 100 : 0
            };
        });

        // --- Vendedores ---
        const { rows: vends } = await db.query(`
            SELECT COALESCE(vend.nome, 'Vendedor ' || COALESCE(v.vendedor_id_firebird::text, '?')) as nome, 
                   SUM(v.valor_total) as vendas,
                   SUM(v.valor_custo) as custo
            FROM dash_vendas v
            LEFT JOIN dash_vendedores vend ON vend.id_firebird = v.vendedor_id_firebird AND vend.tenant_id = v.tenant_id
            WHERE v.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3 AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO', 'PAGO', 'EMITIDO', 'CONCLUIDO', 'VENDIDO', 'DEVOLVIDO', 'DEVOLUCAO', 'DEVOLUÇÃO', 'TROCA')
            ${df.clause}
            GROUP BY v.vendedor_id_firebird, vend.nome
            ORDER BY vendas DESC
            LIMIT 15
        `, [tenantId, toSafeSqlString(start), toSafeSqlString(end), ...df.params]);

        const vendedorData = vends.map((vd, i) => {
            const vd_vendas = parseFloat(vd.vendas || 0);
            const vd_custo = parseFloat(vd.custo || 0);
            const vd_lucro = vd_vendas - vd_custo;
            return {
                rank: i + 1,
                name: vd.nome,
                vendas: vd_vendas,
                custo: vd_custo,
                lucro: vd_lucro,
                luc_pct: vd_vendas > 0 ? (vd_lucro / vd_vendas) * 100 : 0,
                color: colors[i % colors.length]
            };
        });

        res.json({
            overview: {
                faturamento,
                custo,
                lucro,
                margem_pct
            },
            marcaData,
            grupoData,
            vendedorData
        });
    } catch (err) { next(err); }
});

// ==========================================
// MÓDULO: METAS E FORNECEDORES
// ==========================================

router.get('/goals/summary', async (req, res, next) => {
    try {
        res.json({
            meta_geral: {
                meta_total: 500000.00,
                realizado: 345000.00,
                atingimento_pct: 69.0,
                diferenca: -155000.00,
                projecao: 480000.00,
                projecao_atingimento_pct: 96.0,
                dias_uteis: 22,
                media_diaria: 15681.82,
                meta_diaria: 22727.27,
                dias_restantes: 5
            },
            metas_por_vendedor: [],
            metas_por_marca: [],
            metas_por_grupo: []
        });
    } catch (err) { next(err); }
});

router.get('/supplier/analytics', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const { start, end } = getBiDateRange(req);
        const deptoId = req.query.depto_id;
        const df = buildDeptoFilter(deptoId, 4, 'v');
        const { marca } = req.query;

        let baseQuery = `
            SELECT 
                SUM(vi.valor_total) as receita,
                SUM(vi.custo_unitario * vi.quantidade) as custo,
                COUNT(DISTINCT v.id_firebird) as pedidos,
                COUNT(DISTINCT v.cliente_id_firebird) as clientes
            FROM dash_vendas_itens vi
            JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id
            WHERE vi.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3 AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO', 'PAGO', 'EMITIDO', 'CONCLUIDO', 'VENDIDO', 'DEVOLVIDO', 'DEVOLUCAO', 'DEVOLUÇÃO', 'TROCA')
        `;
        let params = [tenantId, toSafeSqlString(start), toSafeSqlString(end)];
        
        if (marca) {
            baseQuery += ` AND vi.marca = $4`;
            params.push(marca);
        }

        const { rows: kpis } = await db.query(baseQuery, params);

        // Fetch top 3 products
        let prodQuery = `
            SELECT COALESCE(vi.produto, 'S/ NOME') as nome, SUM(vi.quantidade) as qtde, SUM(vi.valor_total) as receita
            FROM dash_vendas_itens vi
            JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id
            WHERE vi.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3 AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO', 'PAGO', 'EMITIDO', 'CONCLUIDO', 'VENDIDO', 'DEVOLVIDO', 'DEVOLUCAO', 'DEVOLUÇÃO', 'TROCA')
        `;
        if (marca) prodQuery += ` AND vi.marca = $4`;
        prodQuery += ` GROUP BY vi.produto ORDER BY receita DESC LIMIT 30`; // Top 30 for the ranking table, top 3 for cards
        
        const { rows: top_products } = await db.query(prodQuery, params);

        // Fetch Top Brands
        let brandQuery = `
            SELECT 
                COALESCE(vi.marca, 'S/ MARCA') as nome, 
                SUM(vi.quantidade) as qtde, 
                SUM(vi.valor_total) as receita,
                RANK() OVER (ORDER BY SUM(vi.valor_total) DESC) as rank
            FROM dash_vendas_itens vi
            JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id
            WHERE vi.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3 AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO', 'PAGO', 'EMITIDO', 'CONCLUIDO', 'VENDIDO', 'DEVOLVIDO', 'DEVOLUCAO', 'DEVOLUÇÃO', 'TROCA')
            GROUP BY COALESCE(vi.marca, 'S/ MARCA')
            ORDER BY receita DESC
        `;
        const { rows: all_brands_ranked } = await db.query(brandQuery, [tenantId, toSafeSqlString(start), toSafeSqlString(end)]);
        
        let top_brands = all_brands_ranked.slice(0, 10).map(b => ({
            rank: parseInt(b.rank),
            name: b.nome,
            volume: parseFloat(b.qtde || 0),
            receita: parseFloat(b.receita || 0)
        }));

        if (marca) {
            const selectedBrandData = all_brands_ranked.find(b => b.nome === marca);
            if (selectedBrandData && parseInt(selectedBrandData.rank) > 10) {
                top_brands.push({
                    rank: parseInt(selectedBrandData.rank),
                    name: selectedBrandData.nome,
                    volume: parseFloat(selectedBrandData.qtde || 0),
                    receita: parseFloat(selectedBrandData.receita || 0)
                });
            }
        }

        // Fetch monthly performance
        let monthlyQuery = `
            SELECT 
                TO_CHAR(v.data_venda, 'MM/YYYY') as mes_ano,
                SUM(vi.valor_total) as receita,
                SUM(vi.quantidade) as qtde
            FROM dash_vendas_itens vi
            JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id
            WHERE vi.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3 AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO', 'PAGO', 'EMITIDO', 'CONCLUIDO', 'VENDIDO', 'DEVOLVIDO', 'DEVOLUCAO', 'DEVOLUÇÃO', 'TROCA')
        `;
        if (marca) monthlyQuery += ` AND vi.marca = $4`;
        monthlyQuery += ` GROUP BY TO_CHAR(v.data_venda, 'MM/YYYY') ORDER BY MIN(v.data_venda) ASC`;
        
        const { rows: monthly } = await db.query(monthlyQuery, params);

        // Fetch all distinct brands for the dropdown filter
        const { rows: allBrands } = await db.query(`
            SELECT DISTINCT marca FROM dash_vendas_itens WHERE tenant_id = $1 AND marca IS NOT NULL ORDER BY marca ASC
        `, [tenantId]);

        res.json({
            overview: {
                receita: parseFloat(kpis[0]?.receita || 0),
                custo: parseFloat(kpis[0]?.custo || 0),
                pedidos: parseInt(kpis[0]?.pedidos || 0),
                clientes: parseInt(kpis[0]?.clientes || 0)
            },
            top_products: top_products.map((p, i) => ({
                rank: i + 1,
                name: p.nome,
                volume: parseFloat(p.qtde || 0),
                receita: parseFloat(p.receita || 0)
            })),
            top_brands: top_brands,
            monthly_performance: monthly.map(m => ({
                mes: m.mes_ano,
                valor: parseFloat(m.receita || 0),
                qtde: parseFloat(m.qtde || 0),
                margem: 30 // Mock margin for now since we didn't fetch cost per month
            })),
            available_brands: allBrands.map(b => b.marca)
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
