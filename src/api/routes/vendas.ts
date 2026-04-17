import { Hono } from 'hono'
import { resolvePeriod } from '../lib/period'
import type { Bindings, Variables, Period } from '../lib/types'

const vendas = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// GET /api/vendas/faturadas?period=today&start_date=&end_date=
vendas.get('/faturadas', async (c) => {
  const period = (c.req.query('period') || 'last7') as Period
  const { start, end, label } = resolvePeriod(period, c.req.query('start_date') || undefined, c.req.query('end_date') || undefined)

  // Agregação por dia
  const { results } = await c.env.DB.prepare(
    `SELECT substr(data_venda, 1, 10) AS data,
            SUM(valor_total) AS total,
            COUNT(*) AS quantidade
       FROM sync_vendas
      WHERE data_venda BETWEEN ? AND ?
        AND status = 'FINALIZADO'
      GROUP BY substr(data_venda, 1, 10)
      ORDER BY data`
  ).bind(start, end).all()

  return c.json({ period: { start, end, label }, data: results })
})

// GET /api/vendas/por-horario?date=YYYY-MM-DD (opcional)
vendas.get('/por-horario', async (c) => {
  const date = c.req.query('date')
  let sql: string
  let binds: any[]
  if (date) {
    sql = `SELECT CAST(substr(data_venda, 12, 2) AS INTEGER) AS hora,
                  COUNT(*) AS quantidade,
                  SUM(valor_total) AS total
             FROM sync_vendas
            WHERE substr(data_venda, 1, 10) = ?
              AND status = 'FINALIZADO'
            GROUP BY hora
            ORDER BY hora`
    binds = [date]
  } else {
    // Últimos 30 dias - média por hora
    sql = `SELECT CAST(substr(data_venda, 12, 2) AS INTEGER) AS hora,
                  COUNT(*) AS quantidade,
                  SUM(valor_total) AS total
             FROM sync_vendas
            WHERE date(data_venda) >= date('now', '-30 days')
              AND status = 'FINALIZADO'
            GROUP BY hora
            ORDER BY hora`
    binds = []
  }
  const { results } = await c.env.DB.prepare(sql).bind(...binds).all()
  // Preenche horas faltantes com zero
  const map = new Map<number, { hora: number; quantidade: number; total: number }>()
  for (let h = 0; h < 24; h++) map.set(h, { hora: h, quantidade: 0, total: 0 })
  for (const r of results as any[]) {
    map.set(r.hora, { hora: r.hora, quantidade: r.quantidade, total: r.total || 0 })
  }
  return c.json({ data: Array.from(map.values()) })
})

// GET /api/vendas/pedidos-abertos
vendas.get('/pedidos-abertos', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT status, COUNT(*) AS quantidade, SUM(valor_total) AS total
       FROM sync_vendas
      WHERE status != 'FINALIZADO'
      GROUP BY status
      ORDER BY quantidade DESC`
  ).all()
  return c.json({ data: results })
})

// GET /api/vendas/kpis?period=today
vendas.get('/kpis', async (c) => {
  const period = (c.req.query('period') || 'today') as Period
  const { start, end, label } = resolvePeriod(period, c.req.query('start_date') || undefined, c.req.query('end_date') || undefined)
  const row = await c.env.DB.prepare(
    `SELECT COALESCE(SUM(valor_total), 0) AS total_faturado,
            COUNT(*) AS qtd_pedidos,
            COALESCE(AVG(valor_total), 0) AS ticket_medio,
            COALESCE(MAX(valor_total), 0) AS maior_venda,
            COALESCE(MIN(valor_total), 0) AS menor_venda
       FROM sync_vendas
      WHERE data_venda BETWEEN ? AND ?
        AND status = 'FINALIZADO'`
  ).bind(start, end).first<any>()
  return c.json({ period: { start, end, label }, kpis: row })
})

// GET /api/vendas/recentes - últimas 20 vendas
vendas.get('/recentes', async (c) => {
  const limit = Number(c.req.query('limit') || 20)
  const { results } = await c.env.DB.prepare(
    `SELECT v.id, v.numero_pedido, v.data_venda, v.valor_total, v.status,
            c.nome AS cliente, vd.nome AS vendedor
       FROM sync_vendas v
       LEFT JOIN sync_clientes c ON c.id = v.cliente_id
       LEFT JOIN sync_vendedores vd ON vd.id = v.vendedor_id
      ORDER BY v.data_venda DESC
      LIMIT ?`
  ).bind(limit).all()
  return c.json({ data: results })
})

export default vendas
