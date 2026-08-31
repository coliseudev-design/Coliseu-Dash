'use strict';

const express = require('express');
const router = express.Router();
const db = require('../db/postgres');

// GET /api/produtos/lista?search=&limit=&offset=&categoria=&vendedor_id=
router.get('/lista', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const search = req.query.search || '';
        // Remove hard cap — permite até 50 000 itens para bases grandes
        const limit = Math.min(parseInt(req.query.limit, 10) || 200, 50000);
        const offset = parseInt(req.query.offset, 10) || 0;
        const categoria = req.query.categoria;
        const vendedorId = req.query.vendedor_id ? parseInt(req.query.vendedor_id, 10) : null;
        const deptoId = req.query.depto_id || req.query.centro_custo;
        const deptoNum = parseInt(deptoId, 10);
        const hasDepto = !isNaN(deptoNum) && deptoNum > 0;

        const where = ['p.tenant_id = $1', 'p.ativo = true'];
        const binds = [tenantId];
        let pIndex = 2;

        if (search) {
            where.push(`(
                p.nome ILIKE $${pIndex} 
                OR CAST(p.id_firebird AS TEXT) ILIKE $${pIndex} 
                OR p.codigo ILIKE $${pIndex} 
                OR p.referencia ILIKE $${pIndex} 
                OR p.codigo_fabrica ILIKE $${pIndex}
            )`);
            binds.push(`%${search}%`);
            pIndex++;
        }

        if (categoria) {
            where.push(`p.categoria = $${pIndex}`);
            binds.push(categoria);
            pIndex++;
        }

        // Filtro por vendedor: retorna apenas produtos que esse vendedor vendeu
        if (vendedorId) {
            where.push(`p.id_firebird IN (
                SELECT DISTINCT vi.produto_id_firebird
                FROM dash_vendas_itens vi
                JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id
                WHERE vi.tenant_id = $1
                  AND v.vendedor_id_firebird = $${pIndex}
            )`);
            binds.push(vendedorId);
            pIndex++;
        }

        const whereSql = `WHERE ${where.join(' AND ')}`;
        const deptoJoin = hasDepto
            ? `LEFT JOIN dash_produtos_depto pd ON pd.produto_id_firebird = p.id_firebird AND pd.tenant_id = p.tenant_id AND pd.depto_id = ${deptoNum}`
            : ``;
        const estoqueExpr = hasDepto ? `COALESCE(pd.estoque, p.estoque)` : `p.estoque`;

        const totalP = await db.query(`SELECT COUNT(*) AS total FROM dash_produtos p ${whereSql}`, binds);

        const limitIdx = pIndex++;
        const offsetIdx = pIndex++;
        
        const { rows } = await db.query(`
            SELECT 
                p.id_firebird AS id, p.codigo, p.nome, p.categoria, p.marca, p.referencia, p.codigo_fabrica, p.preco, p.custo, 
                ${estoqueExpr} AS estoque, 
                p.estoque_minimo,
                (p.preco * ${estoqueExpr}) AS valor_total_estoque
            FROM dash_produtos p
            ${deptoJoin}
            ${whereSql}
            ORDER BY p.nome
            LIMIT $${limitIdx} OFFSET $${offsetIdx}
        `, [...binds, limit, offset]);

        const formatted = rows.map(r => ({
            ...r,
            preco: parseFloat(r.preco),
            custo: parseFloat(r.custo),
            estoque: parseFloat(r.estoque),
            estoque_minimo: parseFloat(r.estoque_minimo),
            valor_total_estoque: parseFloat(r.valor_total_estoque)
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

// GET /api/produtos/categorias
router.get('/categorias', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const { rows } = await db.query(`
            SELECT 
                COALESCE(NULLIF(categoria, ''), 'Sem categoria') AS categoria, 
                COUNT(*) AS qtd, 
                SUM(preco * estoque) AS valor_estoque
            FROM dash_produtos 
            WHERE tenant_id = $1 AND ativo = true
            GROUP BY COALESCE(NULLIF(categoria, ''), 'Sem categoria')
            ORDER BY categoria
        `, [tenantId]);

        const formatted = rows.map(r => ({
            categoria: r.categoria,
            qtd: parseInt(r.qtd, 10),
            valor_estoque: parseFloat(r.valor_estoque || 0)
        }));

        res.json({ data: formatted });
    } catch (err) {
        next(err);
    }
});

// GET /api/produtos/kpis
router.get('/kpis', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        
        const rP = await db.query(`
            SELECT 
                COUNT(*) AS total,
                COALESCE(SUM(preco * estoque), 0) AS valor_total_estoque,
                COALESCE(MAX(preco), 0) AS mais_caro,
                COALESCE(MIN(preco), 0) AS mais_barato,
                SUM(CASE WHEN estoque <= estoque_minimo THEN 1 ELSE 0 END) AS baixo_estoque
            FROM dash_produtos 
            WHERE tenant_id = $1 AND ativo = true
        `, [tenantId]);

        const caroP = await db.query(`
            SELECT nome FROM dash_produtos 
            WHERE tenant_id = $1 AND ativo = true 
            ORDER BY preco DESC LIMIT 1
        `, [tenantId]);

        const baratoP = await db.query(`
            SELECT nome FROM dash_produtos 
            WHERE tenant_id = $1 AND ativo = true AND preco > 0 
            ORDER BY preco ASC LIMIT 1
        `, [tenantId]);

        res.json({
            kpis: {
                total_produtos: parseInt(rP.rows[0]?.total || 0, 10),
                valor_total_estoque: parseFloat(rP.rows[0]?.valor_total_estoque || 0),
                baixo_estoque: parseInt(rP.rows[0]?.baixo_estoque || 0, 10),
                produto_mais_caro: caroP.rows[0]?.nome || '—',
                produto_mais_barato: baratoP.rows[0]?.nome || '—',
            }
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
