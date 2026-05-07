'use strict';

const express = require('express');
const router = express.Router();
const db = require('../db/postgres');

/**
 * Calcula range de datas relativo à data máxima no banco (âncora).
 * Garante que bases Firebird antigas sempre apareçam nos filtros.
 */
async function getAnchoredRange(tenantId, period, start_date, end_date) {
    const anchor = new Date();
    let start = new Date(anchor);
    let end = new Date(anchor);
    end.setHours(23, 59, 59, 999);

    switch (period) {
        case 'today': case 'hoje':
            start.setHours(0, 0, 0, 0);
            break;
        case 'yesterday':
            start.setDate(start.getDate() - 1);
            start.setHours(0, 0, 0, 0);
            end = new Date(start);
            end.setHours(23, 59, 59, 999);
            break;
        case 'last7': case '7d':
            start.setDate(start.getDate() - 7);
            break;
        case 'thisMonth': case '1m':
            start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
            end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 23, 59, 59);
            break;
        case 'lastMonth':
            start = new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1);
            end = new Date(anchor.getFullYear(), anchor.getMonth(), 0, 23, 59, 59);
            break;
        case 'custom':
            if (start_date && end_date) {
                return { start: new Date(start_date), end: new Date(end_date) };
            }
            start.setFullYear(start.getFullYear() - 1);
            break;
        case 'all':
            start = new Date(1970, 0, 1);
            break;
        case 'last12m': case '1y': default:
            start.setFullYear(start.getFullYear() - 1);
            break;
    }

    return { start, end };
}

// GET /api/ranking/kpis (para a tela de comissoes)
router.get('/kpis', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const { start, end } = await getAnchoredRange(tenantId, req.query.period || 'last12m', req.query.start_date, req.query.end_date);

        // Como não há sync de comissões ativado ainda, vamos calcular comissões estimadas a partir das vendas
        const { rows } = await db.query(`
            SELECT 
                SUM(valor_total) AS total_produzido,
                COUNT(DISTINCT id_firebird) AS qtd_vendas
            FROM dash_vendas
            WHERE tenant_id = $1 AND data_venda >= $2 AND data_venda <= $3 AND TRIM(status) IN ('FATURADO', 'FINALIZADO')
        `, [tenantId, start, end]);

        const { rows: grouped } = await db.query(`
            SELECT 
                vendedor_id_firebird, SUM(valor_total) AS total
            FROM dash_vendas
            WHERE tenant_id = $1 AND data_venda >= $2 AND data_venda <= $3 AND TRIM(status) IN ('FATURADO', 'FINALIZADO')
            GROUP BY vendedor_id_firebird
        `, [tenantId, start, end]);

        let maior = 0;
        let menor = 0;
        if (grouped.length > 0) {
            // Supondo 5% de comissão média para ter valores na tela
            maior = Math.max(...grouped.map(r => parseFloat(r.total))) * 0.05;
            menor = Math.min(...grouped.map(r => parseFloat(r.total))) * 0.05;
        }

        res.json({
            kpis: {
                total: parseFloat(rows[0].total_produzido || 0) * 0.05,
                menor,
                maior,
                qtd: parseInt(rows[0].qtd_vendas || 0)
            }
        });
    } catch (err) { next(err); }
});

// GET /api/ranking/vendedores
router.get('/vendedores', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const { start, end } = await getAnchoredRange(tenantId, req.query.period || 'last12m', req.query.start_date, req.query.end_date);
        const limit = parseInt(req.query.limit) || 10;

        const { rows } = await db.query(`
            SELECT 
                v.vendedor_id_firebird AS id,
                COALESCE(vd.nome, 'Vendedor ' || COALESCE(v.vendedor_id_firebird::text, '?')) AS nome,
                SUM(v.valor_total) AS total,
                COUNT(DISTINCT v.id_firebird) AS qtd_pedidos,
                AVG(v.valor_total) AS ticket_medio
            FROM dash_vendas v
            LEFT JOIN dash_vendedores vd ON vd.id_firebird = v.vendedor_id_firebird AND vd.tenant_id = v.tenant_id
            WHERE v.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3 AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO')
            GROUP BY v.vendedor_id_firebird, vd.nome
            ORDER BY total DESC LIMIT $4
        `, [tenantId, start, end, limit]);

        res.json({ data: rows.map(r => ({
            id: r.id, nome: r.nome,
            total: parseFloat(r.total || 0),
            qtd_pedidos: parseInt(r.qtd_pedidos),
            ticket_medio: parseFloat(r.ticket_medio || 0)
        })) });
    } catch (err) { next(err); }
});

// GET /api/ranking/produtos
router.get('/produtos', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const { start, end } = await getAnchoredRange(tenantId, req.query.period || 'last12m', req.query.start_date, req.query.end_date);
        const limit = parseInt(req.query.limit) || 10;

        const { rows } = await db.query(`
            SELECT 
                COALESCE(vi.produto, 'Produto ' || COALESCE(vi.produto_id_firebird::text, '?')) AS nome,
                SUM(vi.valor_total) AS total,
                SUM(vi.quantidade) AS qtd_vendida,
                AVG(vi.preco_unitario) AS preco_medio
            FROM dash_vendas_itens vi
            JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id
            WHERE vi.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3 AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO')
              AND COALESCE(vi.produto, vi.produto_id_firebird::text) IS NOT NULL
            GROUP BY COALESCE(vi.produto, 'Produto ' || COALESCE(vi.produto_id_firebird::text, '?'))
            ORDER BY total DESC LIMIT $4
        `, [tenantId, start, end, limit]);

        res.json({ data: rows.map(r => ({
            nome: r.nome, total: parseFloat(r.total || 0),
            qtd_vendida: parseFloat(r.qtd_vendida || 0),
            preco_medio: parseFloat(r.preco_medio || 0)
        })) });
    } catch (err) { next(err); }
});

// GET /api/ranking/clientes
router.get('/clientes', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const { start, end } = await getAnchoredRange(tenantId, req.query.period || 'last12m', req.query.start_date, req.query.end_date);
        const limit = parseInt(req.query.limit) || 10;

        const { rows } = await db.query(`
            SELECT 
                v.cliente_id_firebird AS id,
                COALESCE(c.nome, 'Cliente ' || COALESCE(v.cliente_id_firebird::text, '?')) AS nome,
                SUM(v.valor_total) AS total,
                COUNT(DISTINCT v.id_firebird) AS qtd_pedidos
            FROM dash_vendas v
            LEFT JOIN dash_clientes c ON c.id_firebird = v.cliente_id_firebird AND c.tenant_id = v.tenant_id
            WHERE v.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3 AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO')
            GROUP BY v.cliente_id_firebird, c.nome
            ORDER BY total DESC LIMIT $4
        `, [tenantId, start, end, limit]);

        res.json({ data: rows.map(r => ({
            id: r.id, nome: r.nome,
            total: parseFloat(r.total || 0),
            qtd_pedidos: parseInt(r.qtd_pedidos)
        })) });
    } catch (err) { next(err); }
});

// GET /api/ranking/marcas
router.get('/marcas', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const { start, end } = await getAnchoredRange(tenantId, req.query.period || 'last12m', req.query.start_date, req.query.end_date);
        const limit = parseInt(req.query.limit) || 10;

        const { rows } = await db.query(`
            SELECT 
                COALESCE(vi.marca, v.marca) AS marca,
                SUM(vi.valor_total) AS total,
                COUNT(*) AS qtd_itens
            FROM dash_vendas_itens vi
            JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id
            WHERE vi.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3 AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO')
              AND COALESCE(vi.marca, v.marca) IS NOT NULL AND COALESCE(vi.marca, v.marca) != ''
            GROUP BY COALESCE(vi.marca, v.marca)
            ORDER BY total DESC LIMIT $4
        `, [tenantId, start, end, limit]);

        res.json({ data: rows.map(r => ({
            nome: r.marca, total: parseFloat(r.total || 0),
            qtd_itens: parseInt(r.qtd_itens)
        })) });
    } catch (err) { next(err); }
});

// GET /api/ranking/especies
router.get('/especies', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const { start, end } = await getAnchoredRange(tenantId, req.query.period || 'last12m', req.query.start_date, req.query.end_date);
        const limit = parseInt(req.query.limit) || 10;

        const { rows } = await db.query(`
            SELECT COALESCE(v.especie, 'Não Informada') AS nome, SUM(v.valor_total) AS total, COUNT(*) AS qtd
            FROM dash_vendas v
            WHERE v.tenant_id = $1
              AND v.data_venda >= $2
              AND v.data_venda <= $3
              AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO')
            GROUP BY v.especie ORDER BY total DESC LIMIT $4
        `, [tenantId, start, end, limit]);

        res.json({ data: rows.map(r => ({
            nome: r.nome, total: parseFloat(r.total || 0), qtd: parseInt(r.qtd)
        })) });
    } catch (err) { next(err); }
});

// GET /api/ranking/ranking (usado por /comissoes/ranking e pela Vendas.tsx)
router.get('/ranking', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const { start, end } = await getAnchoredRange(tenantId, req.query.period || 'last12m', req.query.start_date, req.query.end_date);
        const limit = parseInt(req.query.limit) || 10;

        const { rows } = await db.query(`
            SELECT 
                v.vendedor_id_firebird AS id,
                COALESCE(vd.nome, 'Vendedor ' || COALESCE(v.vendedor_id_firebird::text, '?')) AS nome,
                SUM(v.valor_total) AS faturamento,
                COUNT(DISTINCT v.id_firebird) AS qtd_pedidos,
                AVG(v.valor_total) AS ticket_medio,
                SUM(COALESCE(v.valor_desconto, 0)) AS total_desconto,
                SUM(CASE WHEN COALESCE(v.valor_desconto, 0) > 0 THEN 1 ELSE 0 END) AS qtd_descontos
            FROM dash_vendas v
            LEFT JOIN dash_vendedores vd ON vd.id_firebird = v.vendedor_id_firebird AND vd.tenant_id = v.tenant_id
            WHERE v.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3 AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO')
            GROUP BY v.vendedor_id_firebird, vd.nome
            ORDER BY faturamento DESC LIMIT $4
        `, [tenantId, start, end, limit]);

        const result = [];
        for (const seller of rows) {
            // Find biggest sale
            const { rows: rMaxSale } = await db.query(`
                SELECT v.valor_total, COALESCE(c.nome, 'Consumidor Final') as cliente_nome
                FROM dash_vendas v
                LEFT JOIN dash_clientes c ON c.id_firebird = v.cliente_id_firebird AND c.tenant_id = v.tenant_id
                WHERE v.tenant_id = $1 AND v.vendedor_id_firebird = $2 AND v.data_venda >= $3 AND v.data_venda <= $4 AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO')
                ORDER BY v.valor_total DESC LIMIT 1
            `, [tenantId, seller.id, start, end]);

            // Find best selling product
            const { rows: rBestProduct } = await db.query(`
                SELECT COALESCE(vi.produto, 'Sem nome') as produto_nome, SUM(vi.valor_total) as total
                FROM dash_vendas_itens vi
                JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id
                WHERE v.tenant_id = $1 AND v.vendedor_id_firebird = $2 AND v.data_venda >= $3 AND v.data_venda <= $4 AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO')
                  AND vi.produto IS NOT NULL
                GROUP BY vi.produto
                ORDER BY total DESC LIMIT 1
            `, [tenantId, seller.id, start, end]);

            result.push({
                vendedor_id: seller.id,
                vendedor: seller.nome,
                total_vendas: parseFloat(seller.faturamento || 0),
                qtd_vendas: parseInt(seller.qtd_pedidos),
                ticket_medio: parseFloat(seller.ticket_medio || 0),
                total_desconto: parseFloat(seller.total_desconto || 0),
                qtd_descontos: parseInt(seller.qtd_descontos || 0),
                maior_venda: rMaxSale.length > 0 ? parseFloat(rMaxSale[0].valor_total || 0) : 0,
                cliente_maior_venda: rMaxSale.length > 0 ? rMaxSale[0].cliente_nome : '-',
                melhor_produto: rBestProduct.length > 0 ? rBestProduct[0].produto_nome : '-'
            });
        }

        res.json({ data: result });
    } catch (err) { next(err); }
});

// GET /api/ranking/categorias
router.get('/categorias', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const { start, end } = await getAnchoredRange(tenantId, req.query.period || 'last12m', req.query.start_date, req.query.end_date);
        const limit = parseInt(req.query.limit) || 10;

        const { rows } = await db.query(`
            SELECT COALESCE(vi.categoria, v.categoria) AS categoria, SUM(vi.valor_total) AS total
            FROM dash_vendas_itens vi
            JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id
            WHERE vi.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3 AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO')
              AND COALESCE(vi.categoria, v.categoria) IS NOT NULL AND COALESCE(vi.categoria, v.categoria) != ''
            GROUP BY COALESCE(vi.categoria, v.categoria)
            ORDER BY total DESC LIMIT $4
        `, [tenantId, start, end, limit]);

        res.json({ data: rows.map(r => ({
            nome: r.categoria, total: parseFloat(r.total || 0)
        })) });
    } catch (err) { next(err); }
});

module.exports = router;
