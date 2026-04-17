import { Hono } from 'hono'
import { resolvePeriod } from '../lib/period'
import type { Bindings, Variables, Period } from '../lib/types'

const compras = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// GET /api/compras/por-fornecedor
compras.get('/por-fornecedor', async (c) => {
  const period = (c.req.query('period') || 'thisMonth') as Period
  const { start, end, label } = resolvePeriod(period, c.req.query('start_date') || undefined, c.req.query('end_date') || undefined)
  const { results } = await c.env.DB.prepare(
    `SELECT f.nome AS fornecedor,
            f.cidade, f.estado,
            COUNT(c.id) AS qtd_pedidos,
            COALESCE(SUM(c.valor_total), 0) AS total
       FROM sync_fornecedores f
       LEFT JOIN sync_compras c ON c.fornecedor_id = f.id
        AND c.data_pedido BETWEEN ? AND ?
      GROUP BY f.id, f.nome
     HAVING total > 0
      ORDER BY total DESC`
  ).bind(start, end).all()
  return c.json({ period: { start, end, label }, data: results })
})

// GET /api/compras/pedidos
compras.get('/pedidos', async (c) => {
  const period = (c.req.query('period') || 'thisMonth') as Period
  const { start, end, label } = resolvePeriod(period, c.req.query('start_date') || undefined, c.req.query('end_date') || undefined)
  const limit = Number(c.req.query('limit') || 200)
  const { results } = await c.env.DB.prepare(
    `SELECT c.id, c.numero_pedido, c.data_pedido, c.data_entrega,
            c.valor_total, c.status, f.nome AS fornecedor
       FROM sync_compras c
       LEFT JOIN sync_fornecedores f ON f.id = c.fornecedor_id
      WHERE c.data_pedido BETWEEN ? AND ?
      ORDER BY c.data_pedido DESC
      LIMIT ?`
  ).bind(start, end, limit).all()
  return c.json({ period: { start, end, label }, data: results })
})

// GET /api/compras/kpis
compras.get('/kpis', async (c) => {
  const period = (c.req.query('period') || 'thisMonth') as Period
  const { start, end, label } = resolvePeriod(period, c.req.query('start_date') || undefined, c.req.query('end_date') || undefined)

  const kpis = await c.env.DB.prepare(
    `SELECT COALESCE(SUM(valor_total), 0) AS total_compras,
            COUNT(*) AS qtd_pedidos,
            COALESCE(AVG(valor_total), 0) AS ticket_medio,
            COUNT(DISTINCT fornecedor_id) AS qtd_fornecedores
       FROM sync_compras
      WHERE data_pedido BETWEEN ? AND ?`
  ).bind(start, end).first<any>()

  const topFornecedor = await c.env.DB.prepare(
    `SELECT f.nome AS fornecedor, SUM(c.valor_total) AS total
       FROM sync_compras c
       JOIN sync_fornecedores f ON f.id = c.fornecedor_id
      WHERE c.data_pedido BETWEEN ? AND ?
      GROUP BY f.id, f.nome
      ORDER BY total DESC LIMIT 1`
  ).bind(start, end).first<any>()

  return c.json({
    period: { start, end, label },
    kpis: {
      ...kpis,
      top_fornecedor: topFornecedor?.fornecedor || '—',
      top_fornecedor_valor: topFornecedor?.total || 0,
    },
  })
})

export default compras
