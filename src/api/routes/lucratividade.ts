import { Hono } from 'hono'
import { resolvePeriod } from '../lib/period'
import type { Bindings, Variables, Period } from '../lib/types'

const lucratividade = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// Considera despesas operacionais como sync_financeiro PAGAR PAGO
async function despesasOperacionais(db: D1Database, start: string, end: string): Promise<number> {
  const r = await db.prepare(
    `SELECT COALESCE(SUM(valor_pago), 0) AS v
       FROM sync_financeiro
      WHERE tipo = 'PAGAR' AND status_pagamento = 'PAGO'
        AND data_pagamento BETWEEN ? AND ?`
  ).bind(start, end).first<any>()
  return r?.v || 0
}

// GET /api/lucratividade/margem-bruta
lucratividade.get('/margem-bruta', async (c) => {
  const period = (c.req.query('period') || 'last7') as Period
  const { start, end, label } = resolvePeriod(period, c.req.query('start_date') || undefined, c.req.query('end_date') || undefined)
  const { results } = await c.env.DB.prepare(
    `SELECT substr(data_venda, 1, 10) AS data,
            SUM(valor_total) AS receita,
            SUM(valor_custo) AS custo,
            SUM(valor_total - valor_custo) AS lucro,
            CASE WHEN SUM(valor_total) > 0
                 THEN (SUM(valor_total - valor_custo) * 100.0 / SUM(valor_total))
                 ELSE 0
            END AS margem_bruta
       FROM sync_vendas
      WHERE data_venda BETWEEN ? AND ?
        AND status = 'FINALIZADO'
      GROUP BY data
      ORDER BY data`
  ).bind(start, end).all()
  return c.json({ period: { start, end, label }, data: results })
})

// GET /api/lucratividade/lucro-liquido
lucratividade.get('/lucro-liquido', async (c) => {
  const period = (c.req.query('period') || 'last12m') as Period
  const { start, end, label } = resolvePeriod(period, c.req.query('start_date') || undefined, c.req.query('end_date') || undefined)
  // Agregação mensal
  const { results: vendas } = await c.env.DB.prepare(
    `SELECT substr(data_venda, 1, 7) AS mes,
            SUM(valor_total) AS receita,
            SUM(valor_custo) AS custo,
            SUM(valor_total - valor_custo) AS lucro_bruto
       FROM sync_vendas
      WHERE data_venda BETWEEN ? AND ?
        AND status = 'FINALIZADO'
      GROUP BY mes
      ORDER BY mes`
  ).bind(start, end).all()

  const { results: despesas } = await c.env.DB.prepare(
    `SELECT substr(COALESCE(data_pagamento, data_vencimento), 1, 7) AS mes,
            SUM(valor_pago) AS despesas
       FROM sync_financeiro
      WHERE tipo = 'PAGAR' AND status_pagamento = 'PAGO'
        AND COALESCE(data_pagamento, data_vencimento) BETWEEN ? AND ?
      GROUP BY mes`
  ).bind(start, end).all()

  const despMap = new Map<string, number>()
  for (const d of despesas as any[]) despMap.set(d.mes, d.despesas || 0)

  const data = (vendas as any[]).map((v) => {
    const desp = despMap.get(v.mes) || 0
    const lucroLiquido = (v.lucro_bruto || 0) - desp
    return {
      mes: v.mes,
      receita: v.receita || 0,
      custo: v.custo || 0,
      lucro_bruto: v.lucro_bruto || 0,
      despesas: desp,
      lucro_liquido: lucroLiquido,
    }
  })

  return c.json({ period: { start, end, label }, data })
})

// GET /api/lucratividade/comparativo
lucratividade.get('/comparativo', async (c) => {
  const period = (c.req.query('period') || 'last7') as Period
  const { start, end, label } = resolvePeriod(period, c.req.query('start_date') || undefined, c.req.query('end_date') || undefined)
  const { results } = await c.env.DB.prepare(
    `SELECT substr(data_venda, 1, 10) AS data,
            SUM(valor_total) AS receita,
            SUM(valor_custo) AS custo
       FROM sync_vendas
      WHERE data_venda BETWEEN ? AND ?
        AND status = 'FINALIZADO'
      GROUP BY data
      ORDER BY data`
  ).bind(start, end).all()
  return c.json({ period: { start, end, label }, data: results })
})

// GET /api/lucratividade/kpis
lucratividade.get('/kpis', async (c) => {
  const period = (c.req.query('period') || 'thisMonth') as Period
  const { start, end, label } = resolvePeriod(period, c.req.query('start_date') || undefined, c.req.query('end_date') || undefined)

  const v = await c.env.DB.prepare(
    `SELECT COALESCE(SUM(valor_total), 0) AS receita,
            COALESCE(SUM(valor_custo), 0) AS custo
       FROM sync_vendas
      WHERE data_venda BETWEEN ? AND ?
        AND status = 'FINALIZADO'`
  ).bind(start, end).first<any>()

  const desp = await despesasOperacionais(c.env.DB, start, end)

  const receita = v?.receita || 0
  const custo = v?.custo || 0
  const lucroBruto = receita - custo
  const lucroLiquido = lucroBruto - desp
  const margemBruta = receita > 0 ? (lucroBruto / receita) * 100 : 0
  const margemLiquida = receita > 0 ? (lucroLiquido / receita) * 100 : 0

  return c.json({
    period: { start, end, label },
    kpis: {
      receita_total: receita,
      custo_total: custo,
      despesas_operacionais: desp,
      lucro_bruto: lucroBruto,
      lucro_liquido: lucroLiquido,
      margem_bruta_pct: Number(margemBruta.toFixed(2)),
      margem_liquida_pct: Number(margemLiquida.toFixed(2)),
    },
  })
})

export default lucratividade
