import { Hono } from 'hono'
import { resolvePeriod } from '../lib/period'
import type { Bindings, Variables, Period } from '../lib/types'

const estatisticas = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// GET /api/estatisticas/kpis
estatisticas.get('/kpis', async (c) => {
  const period = (c.req.query('period') || 'thisMonth') as Period
  const { start, end, label } = resolvePeriod(period, c.req.query('start_date') || undefined, c.req.query('end_date') || undefined)

  const vendasAgg = await c.env.DB.prepare(
    `SELECT COALESCE(SUM(valor_total), 0) AS total_faturado,
            COUNT(*) AS qtd_pedidos,
            COALESCE(AVG(valor_total), 0) AS ticket_medio,
            COUNT(DISTINCT cliente_id) AS clientes_ativos
       FROM sync_vendas
      WHERE data_venda BETWEEN ? AND ?
        AND status = 'FINALIZADO'`
  ).bind(start, end).first<any>()

  const totalClientes = await c.env.DB.prepare(
    'SELECT COUNT(*) AS total FROM sync_clientes WHERE ativo = 1'
  ).first<any>()

  const conversao =
    totalClientes?.total > 0 ? ((vendasAgg?.clientes_ativos || 0) / totalClientes.total) * 100 : 0

  const topProduto = await c.env.DB.prepare(
    `SELECT p.nome AS produto, SUM(vi.quantidade) AS qtd
       FROM sync_vendas_itens vi
       JOIN sync_vendas v ON v.id = vi.venda_id
       JOIN sync_produtos p ON p.id = vi.produto_id
      WHERE v.data_venda BETWEEN ? AND ?
        AND v.status = 'FINALIZADO'
      GROUP BY p.id, p.nome
      ORDER BY qtd DESC LIMIT 1`
  ).bind(start, end).first<any>()

  const topVendedor = await c.env.DB.prepare(
    `SELECT vd.nome AS vendedor, SUM(v.valor_total) AS total
       FROM sync_vendas v
       JOIN sync_vendedores vd ON vd.id = v.vendedor_id
      WHERE v.data_venda BETWEEN ? AND ?
        AND v.status = 'FINALIZADO'
      GROUP BY vd.id, vd.nome
      ORDER BY total DESC LIMIT 1`
  ).bind(start, end).first<any>()

  const topDia = await c.env.DB.prepare(
    `SELECT substr(data_venda, 1, 10) AS dia, SUM(valor_total) AS total
       FROM sync_vendas
      WHERE data_venda BETWEEN ? AND ?
        AND status = 'FINALIZADO'
      GROUP BY dia
      ORDER BY total DESC LIMIT 1`
  ).bind(start, end).first<any>()

  return c.json({
    period: { start, end, label },
    kpis: {
      total_faturado: vendasAgg?.total_faturado || 0,
      ticket_medio: vendasAgg?.ticket_medio || 0,
      qtd_pedidos: vendasAgg?.qtd_pedidos || 0,
      clientes_ativos: vendasAgg?.clientes_ativos || 0,
      total_clientes: totalClientes?.total || 0,
      taxa_conversao_pct: Number(conversao.toFixed(2)),
      produto_mais_vendido: topProduto?.produto || '—',
      vendedor_top: topVendedor?.vendedor || '—',
      vendedor_top_valor: topVendedor?.total || 0,
      melhor_dia: topDia?.dia || null,
      melhor_dia_valor: topDia?.total || 0,
    },
  })
})

// GET /api/estatisticas/overview - consolidado para dashboard inicial
estatisticas.get('/overview', async (c) => {
  const today = resolvePeriod('today')
  const month = resolvePeriod('thisMonth')

  const hoje = await c.env.DB.prepare(
    `SELECT COALESCE(SUM(valor_total), 0) AS total, COUNT(*) AS qtd
       FROM sync_vendas WHERE data_venda BETWEEN ? AND ? AND status = 'FINALIZADO'`
  ).bind(today.start, today.end).first<any>()

  const mes = await c.env.DB.prepare(
    `SELECT COALESCE(SUM(valor_total), 0) AS total, COUNT(*) AS qtd
       FROM sync_vendas WHERE data_venda BETWEEN ? AND ? AND status = 'FINALIZADO'`
  ).bind(month.start, month.end).first<any>()

  const abertos = await c.env.DB.prepare(
    `SELECT COUNT(*) AS qtd FROM sync_vendas WHERE status != 'FINALIZADO' AND status != 'CANCELADO'`
  ).first<any>()

  const totalReceber = await c.env.DB.prepare(
    `SELECT COALESCE(SUM(valor - valor_pago), 0) AS v
       FROM sync_financeiro WHERE tipo = 'RECEBER' AND status_pagamento = 'ABERTO'`
  ).first<any>()

  const totalPagar = await c.env.DB.prepare(
    `SELECT COALESCE(SUM(valor - valor_pago), 0) AS v
       FROM sync_financeiro WHERE tipo = 'PAGAR' AND status_pagamento = 'ABERTO'`
  ).first<any>()

  return c.json({
    hoje: { total: hoje?.total || 0, qtd: hoje?.qtd || 0 },
    mes: { total: mes?.total || 0, qtd: mes?.qtd || 0 },
    pedidos_abertos: abertos?.qtd || 0,
    total_receber: totalReceber?.v || 0,
    total_pagar: totalPagar?.v || 0,
    saldo_liquido: (totalReceber?.v || 0) - (totalPagar?.v || 0),
  })
})

export default estatisticas
