import { Hono } from 'hono'
import { resolvePeriod } from '../lib/period'
import type { Bindings, Variables, Period } from '../lib/types'

const comissoes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// GET /api/comissoes/ranking?period=
comissoes.get('/ranking', async (c) => {
  const period = (c.req.query('period') || 'thisMonth') as Period
  const { start, end, label } = resolvePeriod(period, c.req.query('start_date') || undefined, c.req.query('end_date') || undefined)

  const { results } = await c.env.DB.prepare(
    `SELECT v.nome AS vendedor,
            v.id AS vendedor_id,
            COALESCE(SUM(co.valor_vendas), 0) AS total_vendas,
            COALESCE(SUM(co.valor_comissao), 0) AS total_comissao,
            COUNT(co.id) AS qtd_vendas,
            CASE WHEN SUM(co.valor_vendas) > 0
                 THEN (SUM(co.valor_comissao) * 100.0 / SUM(co.valor_vendas))
                 ELSE 0
            END AS percentual_medio
       FROM sync_vendedores v
       LEFT JOIN sync_comissoes co ON co.vendedor_id = v.id
        AND co.data_referencia BETWEEN ? AND ?
      GROUP BY v.id, v.nome
     HAVING total_comissao > 0
      ORDER BY total_comissao DESC`
  ).bind(start.slice(0, 10), end.slice(0, 10)).all()

  return c.json({ period: { start, end, label }, data: results })
})

// GET /api/comissoes/detalhes
comissoes.get('/detalhes', async (c) => {
  const period = (c.req.query('period') || 'thisMonth') as Period
  const { start, end, label } = resolvePeriod(period, c.req.query('start_date') || undefined, c.req.query('end_date') || undefined)
  const limit = Number(c.req.query('limit') || 200)
  const { results } = await c.env.DB.prepare(
    `SELECT co.id, co.data_referencia, co.valor_vendas, co.percentual, co.valor_comissao,
            v.nome AS vendedor, ve.numero_pedido
       FROM sync_comissoes co
       LEFT JOIN sync_vendedores v ON v.id = co.vendedor_id
       LEFT JOIN sync_vendas ve ON ve.id = co.venda_id
      WHERE co.data_referencia BETWEEN ? AND ?
      ORDER BY co.data_referencia DESC
      LIMIT ?`
  ).bind(start.slice(0, 10), end.slice(0, 10), limit).all()
  return c.json({ period: { start, end, label }, data: results })
})

// GET /api/comissoes/kpis
comissoes.get('/kpis', async (c) => {
  const period = (c.req.query('period') || 'thisMonth') as Period
  const { start, end, label } = resolvePeriod(period, c.req.query('start_date') || undefined, c.req.query('end_date') || undefined)
  const row = await c.env.DB.prepare(
    `SELECT COALESCE(SUM(valor_comissao), 0) AS total,
            COALESCE(AVG(valor_comissao), 0) AS media,
            COALESCE(MAX(valor_comissao), 0) AS maior,
            COALESCE(MIN(valor_comissao), 0) AS menor,
            COUNT(*) AS qtd
       FROM sync_comissoes
      WHERE data_referencia BETWEEN ? AND ?`
  ).bind(start.slice(0, 10), end.slice(0, 10)).first<any>()
  return c.json({ period: { start, end, label }, kpis: row })
})

export default comissoes
