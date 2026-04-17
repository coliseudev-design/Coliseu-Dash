import { Hono } from 'hono'
import type { Bindings, Variables } from '../lib/types'

const produtos = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// GET /api/produtos/lista?search=&limit=&offset=
produtos.get('/lista', async (c) => {
  const search = c.req.query('search') || ''
  const limit = Math.min(Number(c.req.query('limit') || 100), 1000)
  const offset = Number(c.req.query('offset') || 0)
  const categoria = c.req.query('categoria')

  const where: string[] = ['ativo = 1']
  const binds: any[] = []
  if (search) {
    where.push('(LOWER(nome) LIKE ? OR LOWER(codigo) LIKE ?)')
    const s = `%${search.toLowerCase()}%`
    binds.push(s, s)
  }
  if (categoria) {
    where.push('categoria = ?')
    binds.push(categoria)
  }

  const whereSql = `WHERE ${where.join(' AND ')}`

  const totalRow = await c.env.DB.prepare(
    `SELECT COUNT(*) AS total FROM sync_produtos ${whereSql}`
  ).bind(...binds).first<any>()

  const { results } = await c.env.DB.prepare(
    `SELECT id, codigo, nome, categoria, preco, custo, estoque, estoque_minimo,
            (preco * estoque) AS valor_total_estoque
       FROM sync_produtos
       ${whereSql}
      ORDER BY nome
      LIMIT ? OFFSET ?`
  ).bind(...binds, limit, offset).all()

  return c.json({ data: results, total: totalRow?.total || 0, limit, offset })
})

// GET /api/produtos/categorias
produtos.get('/categorias', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT categoria, COUNT(*) AS qtd, SUM(preco * estoque) AS valor_estoque
       FROM sync_produtos WHERE ativo = 1
      GROUP BY categoria ORDER BY categoria`
  ).all()
  return c.json({ data: results })
})

// GET /api/produtos/kpis
produtos.get('/kpis', async (c) => {
  const r = await c.env.DB.prepare(
    `SELECT COUNT(*) AS total,
            COALESCE(SUM(preco * estoque), 0) AS valor_total_estoque,
            COALESCE(MAX(preco), 0) AS mais_caro,
            COALESCE(MIN(preco), 0) AS mais_barato,
            SUM(CASE WHEN estoque <= estoque_minimo THEN 1 ELSE 0 END) AS baixo_estoque
       FROM sync_produtos WHERE ativo = 1`
  ).first<any>()

  const caro = await c.env.DB.prepare(
    `SELECT nome FROM sync_produtos WHERE ativo = 1 ORDER BY preco DESC LIMIT 1`
  ).first<any>()
  const barato = await c.env.DB.prepare(
    `SELECT nome FROM sync_produtos WHERE ativo = 1 AND preco > 0 ORDER BY preco ASC LIMIT 1`
  ).first<any>()

  return c.json({
    kpis: {
      total_produtos: r?.total || 0,
      valor_total_estoque: r?.valor_total_estoque || 0,
      baixo_estoque: r?.baixo_estoque || 0,
      produto_mais_caro: caro?.nome || '—',
      produto_mais_barato: barato?.nome || '—',
    },
  })
})

export default produtos
