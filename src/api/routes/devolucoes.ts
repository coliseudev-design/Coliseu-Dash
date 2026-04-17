import { Hono } from 'hono'
import { resolvePeriod } from '../lib/period'
import type { Bindings, Variables, Period } from '../lib/types'

const devolucoes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// GET /api/devolucoes/por-motivo
devolucoes.get('/por-motivo', async (c) => {
  const period = (c.req.query('period') || 'thisMonth') as Period
  const { start, end, label } = resolvePeriod(period, c.req.query('start_date') || undefined, c.req.query('end_date') || undefined)
  const { results } = await c.env.DB.prepare(
    `SELECT motivo, COUNT(*) AS quantidade, COALESCE(SUM(valor), 0) AS total
       FROM sync_devolucoes
      WHERE data_devolucao BETWEEN ? AND ?
      GROUP BY motivo
      ORDER BY total DESC`
  ).bind(start, end).all()
  return c.json({ period: { start, end, label }, data: results })
})

// GET /api/devolucoes/por-periodo
devolucoes.get('/por-periodo', async (c) => {
  const period = (c.req.query('period') || 'thisMonth') as Period
  const { start, end, label } = resolvePeriod(period, c.req.query('start_date') || undefined, c.req.query('end_date') || undefined)
  const { results } = await c.env.DB.prepare(
    `SELECT substr(data_devolucao, 1, 10) AS data,
            COUNT(*) AS quantidade,
            COALESCE(SUM(valor), 0) AS total
       FROM sync_devolucoes
      WHERE data_devolucao BETWEEN ? AND ?
      GROUP BY data
      ORDER BY data`
  ).bind(start, end).all()
  return c.json({ period: { start, end, label }, data: results })
})

// GET /api/devolucoes/detalhes
devolucoes.get('/detalhes', async (c) => {
  const period = (c.req.query('period') || 'thisMonth') as Period
  const { start, end, label } = resolvePeriod(period, c.req.query('start_date') || undefined, c.req.query('end_date') || undefined)
  const limit = Number(c.req.query('limit') || 200)
  const { results } = await c.env.DB.prepare(
    `SELECT d.id, d.data_devolucao, d.motivo, d.quantidade, d.valor,
            p.nome AS produto, v.numero_pedido
       FROM sync_devolucoes d
       LEFT JOIN sync_produtos p ON p.id = d.produto_id
       LEFT JOIN sync_vendas v ON v.id = d.venda_id
      WHERE d.data_devolucao BETWEEN ? AND ?
      ORDER BY d.data_devolucao DESC
      LIMIT ?`
  ).bind(start, end, limit).all()
  return c.json({ period: { start, end, label }, data: results })
})

// GET /api/devolucoes/kpis
devolucoes.get('/kpis', async (c) => {
  const period = (c.req.query('period') || 'thisMonth') as Period
  const { start, end, label } = resolvePeriod(period, c.req.query('start_date') || undefined, c.req.query('end_date') || undefined)

  const devAgg = await c.env.DB.prepare(
    `SELECT COALESCE(SUM(valor), 0) AS total, COUNT(*) AS qtd
       FROM sync_devolucoes
      WHERE data_devolucao BETWEEN ? AND ?`
  ).bind(start, end).first<any>()

  const vendasTotal = await c.env.DB.prepare(
    `SELECT COALESCE(SUM(valor_total), 0) AS total
       FROM sync_vendas WHERE data_venda BETWEEN ? AND ? AND status = 'FINALIZADO'`
  ).bind(start, end).first<any>()

  const taxa = vendasTotal?.total > 0 ? ((devAgg?.total || 0) / vendasTotal.total) * 100 : 0

  const topMotivo = await c.env.DB.prepare(
    `SELECT motivo, COUNT(*) AS qtd FROM sync_devolucoes
      WHERE data_devolucao BETWEEN ? AND ?
      GROUP BY motivo ORDER BY qtd DESC LIMIT 1`
  ).bind(start, end).first<any>()

  const topProduto = await c.env.DB.prepare(
    `SELECT p.nome AS produto, COUNT(*) AS qtd
       FROM sync_devolucoes d
       JOIN sync_produtos p ON p.id = d.produto_id
      WHERE d.data_devolucao BETWEEN ? AND ?
      GROUP BY p.id ORDER BY qtd DESC LIMIT 1`
  ).bind(start, end).first<any>()

  return c.json({
    period: { start, end, label },
    kpis: {
      total_devolucoes: devAgg?.total || 0,
      qtd_devolucoes: devAgg?.qtd || 0,
      taxa_devolucao_pct: Number(taxa.toFixed(2)),
      motivo_mais_comum: topMotivo?.motivo || '—',
      produto_mais_devolvido: topProduto?.produto || '—',
    },
  })
})

export default devolucoes
