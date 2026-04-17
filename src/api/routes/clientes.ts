import { Hono } from 'hono'
import { resolvePeriod } from '../lib/period'
import type { Bindings, Variables, Period } from '../lib/types'

const clientes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// GET /api/clientes/lista?search=&limit=&offset=
clientes.get('/lista', async (c) => {
  const search = c.req.query('search') || ''
  const limit = Math.min(Number(c.req.query('limit') || 100), 1000)
  const offset = Number(c.req.query('offset') || 0)

  const where: string[] = ['c.ativo = 1']
  const binds: any[] = []
  if (search) {
    where.push('(LOWER(c.nome) LIKE ? OR c.documento LIKE ?)')
    const s = `%${search.toLowerCase()}%`
    binds.push(s, s)
  }
  const whereSql = `WHERE ${where.join(' AND ')}`

  const totalRow = await c.env.DB.prepare(
    `SELECT COUNT(*) AS total FROM sync_clientes c ${whereSql}`
  ).bind(...binds).first<any>()

  const { results } = await c.env.DB.prepare(
    `SELECT c.id, c.nome, c.documento, c.email, c.telefone, c.cidade, c.estado,
            c.data_cadastro,
            (SELECT COUNT(*) FROM sync_vendas v WHERE v.cliente_id = c.id) AS qtd_pedidos,
            (SELECT MAX(v.data_venda) FROM sync_vendas v WHERE v.cliente_id = c.id) AS ultimo_pedido,
            (SELECT COALESCE(SUM(v.valor_total), 0) FROM sync_vendas v
              WHERE v.cliente_id = c.id AND v.status = 'FINALIZADO') AS total_gasto
       FROM sync_clientes c
       ${whereSql}
      ORDER BY c.nome
      LIMIT ? OFFSET ?`
  ).bind(...binds, limit, offset).all()

  return c.json({ data: results, total: totalRow?.total || 0, limit, offset })
})

// GET /api/clientes/kpis
clientes.get('/kpis', async (c) => {
  const period = (c.req.query('period') || 'thisMonth') as Period
  const { start, end, label } = resolvePeriod(period, c.req.query('start_date') || undefined, c.req.query('end_date') || undefined)

  const total = await c.env.DB.prepare(
    'SELECT COUNT(*) AS total FROM sync_clientes WHERE ativo = 1'
  ).first<any>()

  const ativos = await c.env.DB.prepare(
    `SELECT COUNT(DISTINCT cliente_id) AS total
       FROM sync_vendas
      WHERE data_venda BETWEEN ? AND ?
        AND status = 'FINALIZADO'`
  ).bind(start, end).first<any>()

  const topCliente = await c.env.DB.prepare(
    `SELECT c.nome, SUM(v.valor_total) AS total
       FROM sync_vendas v
       JOIN sync_clientes c ON c.id = v.cliente_id
      WHERE v.data_venda BETWEEN ? AND ?
        AND v.status = 'FINALIZADO'
      GROUP BY c.id, c.nome
      ORDER BY total DESC LIMIT 1`
  ).bind(start, end).first<any>()

  const ticketMedio = await c.env.DB.prepare(
    `SELECT COALESCE(AVG(totais.total), 0) AS ticket
       FROM (
         SELECT cliente_id, SUM(valor_total) AS total
           FROM sync_vendas
          WHERE data_venda BETWEEN ? AND ?
            AND status = 'FINALIZADO'
          GROUP BY cliente_id
       ) totais`
  ).bind(start, end).first<any>()

  return c.json({
    period: { start, end, label },
    kpis: {
      total_clientes: total?.total || 0,
      clientes_ativos: ativos?.total || 0,
      top_cliente: topCliente?.nome || '—',
      top_cliente_valor: topCliente?.total || 0,
      ticket_medio_por_cliente: ticketMedio?.ticket || 0,
    },
  })
})

export default clientes
