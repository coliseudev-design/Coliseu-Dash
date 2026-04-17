import { Hono } from 'hono'
import { resolvePeriod } from '../lib/period'
import type { Bindings, Variables, Period } from '../lib/types'

const ranking = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// GET /api/ranking/vendedores
ranking.get('/vendedores', async (c) => {
  const period = (c.req.query('period') || 'thisMonth') as Period
  const { start, end, label } = resolvePeriod(period, c.req.query('start_date') || undefined, c.req.query('end_date') || undefined)
  const limit = Number(c.req.query('limit') || 10)
  const { results } = await c.env.DB.prepare(
    `SELECT v.nome AS vendedor,
            COUNT(ve.id) AS transacoes,
            COALESCE(SUM(ve.valor_total), 0) AS total,
            COALESCE(AVG(ve.valor_total), 0) AS ticket_medio
       FROM sync_vendedores v
       LEFT JOIN sync_vendas ve ON ve.vendedor_id = v.id
        AND ve.data_venda BETWEEN ? AND ?
        AND ve.status = 'FINALIZADO'
      GROUP BY v.id, v.nome
     HAVING total > 0
      ORDER BY total DESC
      LIMIT ?`
  ).bind(start, end, limit).all()
  return c.json({ period: { start, end, label }, data: results })
})

// GET /api/ranking/produtos
ranking.get('/produtos', async (c) => {
  const period = (c.req.query('period') || 'thisMonth') as Period
  const { start, end, label } = resolvePeriod(period, c.req.query('start_date') || undefined, c.req.query('end_date') || undefined)
  const limit = Number(c.req.query('limit') || 10)
  const { results } = await c.env.DB.prepare(
    `SELECT p.nome AS produto, p.categoria,
            SUM(vi.quantidade) AS quantidade,
            SUM(vi.valor_total) AS total,
            COUNT(DISTINCT vi.venda_id) AS transacoes
       FROM sync_vendas_itens vi
       JOIN sync_vendas v ON v.id = vi.venda_id
       JOIN sync_produtos p ON p.id = vi.produto_id
      WHERE v.data_venda BETWEEN ? AND ?
        AND v.status = 'FINALIZADO'
      GROUP BY p.id, p.nome, p.categoria
      ORDER BY total DESC
      LIMIT ?`
  ).bind(start, end, limit).all()
  return c.json({ period: { start, end, label }, data: results })
})

// GET /api/ranking/clientes
ranking.get('/clientes', async (c) => {
  const period = (c.req.query('period') || 'thisMonth') as Period
  const { start, end, label } = resolvePeriod(period, c.req.query('start_date') || undefined, c.req.query('end_date') || undefined)
  const limit = Number(c.req.query('limit') || 10)
  const { results } = await c.env.DB.prepare(
    `SELECT c.nome AS cliente, c.cidade, c.estado,
            COUNT(v.id) AS transacoes,
            COALESCE(SUM(v.valor_total), 0) AS total
       FROM sync_clientes c
       LEFT JOIN sync_vendas v ON v.cliente_id = c.id
        AND v.data_venda BETWEEN ? AND ?
        AND v.status = 'FINALIZADO'
      GROUP BY c.id, c.nome
     HAVING total > 0
      ORDER BY total DESC
      LIMIT ?`
  ).bind(start, end, limit).all()
  return c.json({ period: { start, end, label }, data: results })
})

export default ranking
