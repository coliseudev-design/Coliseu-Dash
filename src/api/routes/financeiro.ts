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

// GET /api/financeiro/caixa?period= - resumo de caixa (entradas/saidas pagas no período)
financeiro.get('/caixa', async (c) => {
  const period = (c.req.query('period') || 'thisMonth') as Period
  const { start, end, label } = resolvePeriod(
    period,
    c.req.query('start_date') || undefined,
    c.req.query('end_date') || undefined,
  )

  // Totais do período (somente pagos)
  const tot = await c.env.DB.prepare(
    `SELECT
        COALESCE(SUM(CASE WHEN tipo = 'RECEBER' AND status_pagamento = 'PAGO'
                          AND data_pagamento BETWEEN ? AND ? THEN valor_pago ELSE 0 END), 0) AS entradas,
        COALESCE(SUM(CASE WHEN tipo = 'PAGAR'   AND status_pagamento = 'PAGO'
                          AND data_pagamento BETWEEN ? AND ? THEN valor_pago ELSE 0 END), 0) AS saidas,
        COUNT(DISTINCT CASE WHEN tipo = 'RECEBER' AND status_pagamento = 'PAGO'
                            AND data_pagamento BETWEEN ? AND ? THEN id END) AS qtd_entradas,
        COUNT(DISTINCT CASE WHEN tipo = 'PAGAR'   AND status_pagamento = 'PAGO'
                            AND data_pagamento BETWEEN ? AND ? THEN id END) AS qtd_saidas
       FROM sync_financeiro`
  ).bind(start, end, start, end, start, end, start, end).first<any>()

  // Movimentações diárias
  const { results: mov } = await c.env.DB.prepare(
    `SELECT substr(data_pagamento, 1, 10) AS data,
            SUM(CASE WHEN tipo = 'RECEBER' THEN valor_pago ELSE 0 END) AS entradas,
            SUM(CASE WHEN tipo = 'PAGAR'   THEN valor_pago ELSE 0 END) AS saidas
       FROM sync_financeiro
      WHERE status_pagamento = 'PAGO'
        AND data_pagamento BETWEEN ? AND ?
      GROUP BY substr(data_pagamento, 1, 10)
      ORDER BY data`
  ).bind(start, end).all()

  // Saldo acumulado ao longo do período
  let acc = 0
  const movimentacoes = (mov as any[]).map((m) => {
    acc += (m.entradas || 0) - (m.saidas || 0)
    return { ...m, saldo_acumulado: acc }
  })

  const entradas = tot?.entradas || 0
  const saidas = tot?.saidas || 0

  return c.json({
    period: { start, end, label },
    kpis: {
      entradas,
      saidas,
      saldo: entradas - saidas,
      qtd_entradas: tot?.qtd_entradas || 0,
      qtd_saidas: tot?.qtd_saidas || 0,
      ticket_medio_entrada: tot?.qtd_entradas > 0 ? entradas / tot.qtd_entradas : 0,
    },
    movimentacoes,
  })
})

// GET /api/financeiro/especies-vendidas?period= - produtos/categorias mais vendidos
financeiro.get('/especies-vendidas', async (c) => {
  const period = (c.req.query('period') || 'thisMonth') as Period
  const { start, end, label } = resolvePeriod(
    period,
    c.req.query('start_date') || undefined,
    c.req.query('end_date') || undefined,
  )
  const limit = Number(c.req.query('limit') || 15)

  // Top produtos (espécies) vendidos no período
  const { results: produtos } = await c.env.DB.prepare(
    `SELECT p.id,
            p.codigo,
            p.nome,
            p.categoria,
            SUM(i.quantidade) AS quantidade_vendida,
            SUM(i.valor_total) AS total_vendido,
            COUNT(DISTINCT i.venda_id) AS qtd_vendas,
            AVG(i.preco_unitario) AS preco_medio
       FROM sync_vendas_itens i
       INNER JOIN sync_vendas v ON v.id = i.venda_id
       INNER JOIN sync_produtos p ON p.id = i.produto_id
      WHERE v.data_venda BETWEEN ? AND ?
        AND v.status = 'FINALIZADO'
      GROUP BY p.id, p.codigo, p.nome, p.categoria
      ORDER BY total_vendido DESC
      LIMIT ?`
  ).bind(start, end, limit).all()

  // Totais por categoria (agrupado)
  const { results: categorias } = await c.env.DB.prepare(
    `SELECT COALESCE(NULLIF(p.categoria, ''), 'Sem categoria') AS categoria,
            SUM(i.quantidade) AS quantidade,
            SUM(i.valor_total) AS total
       FROM sync_vendas_itens i
       INNER JOIN sync_vendas v ON v.id = i.venda_id
       INNER JOIN sync_produtos p ON p.id = i.produto_id
      WHERE v.data_venda BETWEEN ? AND ?
        AND v.status = 'FINALIZADO'
      GROUP BY categoria
      ORDER BY total DESC`
  ).bind(start, end).all()

  // Total geral
  const totGeral = await c.env.DB.prepare(
    `SELECT SUM(i.valor_total) AS total, SUM(i.quantidade) AS quantidade
       FROM sync_vendas_itens i
       INNER JOIN sync_vendas v ON v.id = i.venda_id
      WHERE v.data_venda BETWEEN ? AND ?
        AND v.status = 'FINALIZADO'`
  ).bind(start, end).first<any>()

  return c.json({
    period: { start, end, label },
    total: {
      valor: totGeral?.total || 0,
      quantidade: totGeral?.quantidade || 0,
    },
    produtos,
    categorias,
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
