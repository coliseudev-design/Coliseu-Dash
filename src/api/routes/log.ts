import { Hono } from 'hono'
import { resolvePeriod } from '../lib/period'
import type { Bindings, Variables, Period } from '../lib/types'

const log = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// GET /api/log/atividades?user=&operation=&start_date=&end_date=&limit=
log.get('/atividades', async (c) => {
  const user = c.req.query('user')
  const operation = c.req.query('operation')
  const period = c.req.query('period') as Period | undefined
  const limit = Math.min(Number(c.req.query('limit') || 500), 2000)
  const offset = Number(c.req.query('offset') || 0)

  const where: string[] = ['1=1']
  const binds: any[] = []

  if (user) {
    where.push('LOWER(usuario) = ?')
    binds.push(user.toLowerCase())
  }
  if (operation) {
    where.push('operacao = ?')
    binds.push(operation)
  }
  if (period) {
    const { start, end } = resolvePeriod(period, c.req.query('start_date') || undefined, c.req.query('end_date') || undefined)
    where.push('data_operacao BETWEEN ? AND ?')
    binds.push(start, end)
  } else if (c.req.query('start_date') && c.req.query('end_date')) {
    where.push('data_operacao BETWEEN ? AND ?')
    binds.push(c.req.query('start_date'), c.req.query('end_date'))
  }

  const whereSql = `WHERE ${where.join(' AND ')}`

  const totalRow = await c.env.DB.prepare(
    `SELECT COUNT(*) AS total FROM sync_log_atividades ${whereSql}`
  ).bind(...binds).first<any>()

  const { results } = await c.env.DB.prepare(
    `SELECT id, usuario, operacao, tabela, descricao, data_operacao
       FROM sync_log_atividades
       ${whereSql}
      ORDER BY data_operacao DESC
      LIMIT ? OFFSET ?`
  ).bind(...binds, limit, offset).all()

  return c.json({ data: results, total: totalRow?.total || 0, limit, offset })
})

// GET /api/log/usuarios-ativos
log.get('/usuarios-ativos', async (c) => {
  const period = (c.req.query('period') || 'last7') as Period
  const { start, end, label } = resolvePeriod(period, c.req.query('start_date') || undefined, c.req.query('end_date') || undefined)
  const { results } = await c.env.DB.prepare(
    `SELECT usuario, COUNT(*) AS operacoes
       FROM sync_log_atividades
      WHERE data_operacao BETWEEN ? AND ?
      GROUP BY usuario
      ORDER BY operacoes DESC`
  ).bind(start, end).all()
  return c.json({ period: { start, end, label }, data: results })
})

// GET /api/log/operacoes-frequentes
log.get('/operacoes-frequentes', async (c) => {
  const period = (c.req.query('period') || 'last7') as Period
  const { start, end, label } = resolvePeriod(period, c.req.query('start_date') || undefined, c.req.query('end_date') || undefined)
  const { results } = await c.env.DB.prepare(
    `SELECT operacao, COUNT(*) AS total
       FROM sync_log_atividades
      WHERE data_operacao BETWEEN ? AND ?
      GROUP BY operacao
      ORDER BY total DESC`
  ).bind(start, end).all()
  return c.json({ period: { start, end, label }, data: results })
})

// GET /api/log/kpis
log.get('/kpis', async (c) => {
  const period = (c.req.query('period') || 'last7') as Period
  const { start, end, label } = resolvePeriod(period, c.req.query('start_date') || undefined, c.req.query('end_date') || undefined)
  const r = await c.env.DB.prepare(
    `SELECT COUNT(*) AS total_operacoes,
            COUNT(DISTINCT usuario) AS usuarios_ativos
       FROM sync_log_atividades
      WHERE data_operacao BETWEEN ? AND ?`
  ).bind(start, end).first<any>()
  const top = await c.env.DB.prepare(
    `SELECT operacao FROM sync_log_atividades
      WHERE data_operacao BETWEEN ? AND ?
      GROUP BY operacao ORDER BY COUNT(*) DESC LIMIT 1`
  ).bind(start, end).first<any>()
  return c.json({
    period: { start, end, label },
    kpis: {
      total_operacoes: r?.total_operacoes || 0,
      usuarios_ativos: r?.usuarios_ativos || 0,
      operacao_mais_frequente: top?.operacao || '—',
    },
  })
})

export default log
