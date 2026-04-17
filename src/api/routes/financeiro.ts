import { Hono } from 'hono'
import { resolvePeriod } from '../lib/period'
import type { Bindings, Variables, Period } from '../lib/types'

const financeiro = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// Helper: classifica conta (VENCIDA, A_VENCER, PAGA, FUTURA)
const CAT_SQL = `
  CASE
    WHEN status_pagamento = 'PAGO' THEN 'PAGA'
    WHEN status_pagamento = 'CANCELADO' THEN 'CANCELADA'
    WHEN date(data_vencimento) < date('now') THEN 'VENCIDA'
    WHEN date(data_vencimento) <= date('now', '+30 days') THEN 'A_VENCER'
    ELSE 'FUTURA'
  END
`

// GET /api/financeiro/contas-receber
financeiro.get('/contas-receber', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT ${CAT_SQL} AS status,
            COUNT(*) AS quantidade,
            SUM(valor) AS total
       FROM sync_financeiro
      WHERE tipo = 'RECEBER'
      GROUP BY status
      ORDER BY status`
  ).all()
  return c.json({ data: results })
})

// GET /api/financeiro/contas-pagar
financeiro.get('/contas-pagar', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT ${CAT_SQL} AS status,
            COUNT(*) AS quantidade,
            SUM(valor) AS total
       FROM sync_financeiro
      WHERE tipo = 'PAGAR'
      GROUP BY status
      ORDER BY status`
  ).all()
  return c.json({ data: results })
})

// GET /api/financeiro/fluxo-caixa?period=&start_date=&end_date=
financeiro.get('/fluxo-caixa', async (c) => {
  const period = (c.req.query('period') || 'last7') as Period
  const { start, end, label } = resolvePeriod(period, c.req.query('start_date') || undefined, c.req.query('end_date') || undefined)
  const { results } = await c.env.DB.prepare(
    `SELECT substr(COALESCE(data_pagamento, data_vencimento), 1, 10) AS data,
            SUM(CASE WHEN tipo = 'RECEBER' AND status_pagamento = 'PAGO' THEN valor_pago ELSE 0 END) AS entradas,
            SUM(CASE WHEN tipo = 'PAGAR' AND status_pagamento = 'PAGO' THEN valor_pago ELSE 0 END) AS saidas
       FROM sync_financeiro
      WHERE COALESCE(data_pagamento, data_vencimento) BETWEEN ? AND ?
      GROUP BY data
      ORDER BY data`
  ).bind(start, end).all()

  // Calcula saldo acumulado
  let acc = 0
  const data = (results as any[]).map((r) => {
    acc += (r.entradas || 0) - (r.saidas || 0)
    return { ...r, saldo: acc }
  })

  return c.json({ period: { start, end, label }, data })
})

// GET /api/financeiro/kpis
financeiro.get('/kpis', async (c) => {
  const totalReceber = await c.env.DB.prepare(
    `SELECT COALESCE(SUM(valor - valor_pago), 0) AS v
       FROM sync_financeiro
      WHERE tipo = 'RECEBER' AND status_pagamento = 'ABERTO'`
  ).first<any>()
  const totalPagar = await c.env.DB.prepare(
    `SELECT COALESCE(SUM(valor - valor_pago), 0) AS v
       FROM sync_financeiro
      WHERE tipo = 'PAGAR' AND status_pagamento = 'ABERTO'`
  ).first<any>()
  const vencidas = await c.env.DB.prepare(
    `SELECT COALESCE(SUM(valor - valor_pago), 0) AS vencidas_valor,
            COUNT(*) AS vencidas_qtd
       FROM sync_financeiro
      WHERE tipo = 'RECEBER'
        AND status_pagamento = 'ABERTO'
        AND date(data_vencimento) < date('now')`
  ).first<any>()
  const totalReceberGeral = await c.env.DB.prepare(
    `SELECT COALESCE(SUM(valor), 0) AS total_geral
       FROM sync_financeiro
      WHERE tipo = 'RECEBER'`
  ).first<any>()

  const inadimp =
    totalReceberGeral?.total_geral > 0
      ? (vencidas?.vencidas_valor || 0) / totalReceberGeral.total_geral * 100
      : 0

  // Dias médios de recebimento
  const dmp = await c.env.DB.prepare(
    `SELECT AVG(julianday(data_pagamento) - julianday(data_emissao)) AS dias
       FROM sync_financeiro
      WHERE tipo = 'RECEBER' AND status_pagamento = 'PAGO'
        AND data_pagamento IS NOT NULL AND data_emissao IS NOT NULL`
  ).first<any>()

  return c.json({
    kpis: {
      total_receber: totalReceber?.v || 0,
      total_pagar: totalPagar?.v || 0,
      saldo_liquido: (totalReceber?.v || 0) - (totalPagar?.v || 0),
      inadimplencia_pct: Number(inadimp.toFixed(2)),
      vencidas_qtd: vencidas?.vencidas_qtd || 0,
      vencidas_valor: vencidas?.vencidas_valor || 0,
      dias_medio_recebimento: Number((dmp?.dias || 0).toFixed(1)),
    },
  })
})

// GET /api/financeiro/contas - lista detalhada (com filtros)
financeiro.get('/contas', async (c) => {
  const tipo = c.req.query('tipo') // RECEBER | PAGAR
  const statusPg = c.req.query('status') // PAGO | ABERTO | VENCIDA
  const limit = Number(c.req.query('limit') || 100)

  const where: string[] = []
  const binds: any[] = []
  if (tipo) {
    where.push('f.tipo = ?')
    binds.push(tipo)
  }
  if (statusPg === 'VENCIDA') {
    where.push("f.status_pagamento = 'ABERTO' AND date(f.data_vencimento) < date('now')")
  } else if (statusPg) {
    where.push('f.status_pagamento = ?')
    binds.push(statusPg)
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

  const { results } = await c.env.DB.prepare(
    `SELECT f.id, f.tipo, f.descricao, f.data_emissao, f.data_vencimento, f.data_pagamento,
            f.valor, f.valor_pago, f.status_pagamento,
            c.nome AS cliente
       FROM sync_financeiro f
       LEFT JOIN sync_clientes c ON c.id = f.cliente_id
       ${whereSql}
      ORDER BY f.data_vencimento DESC
      LIMIT ?`
  ).bind(...binds, limit).all()

  return c.json({ data: results })
})

export default financeiro
