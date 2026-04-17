import { useApiQuery } from '../hooks/useApi'
import KPICard from '../components/KPICard'
import ChartCard from '../components/ChartCard'
import { Link } from 'react-router-dom'
import {
  DollarSign, ShoppingBag, FileClock, Wallet, TrendingUp, AlertCircle,
  ArrowUpRight, Receipt,
} from 'lucide-react'
import { formatBRL, formatBRLCompact, formatNum, formatDateTime } from '../utils/format'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { CHART_COLORS } from '../utils/chartColors'

interface Overview {
  hoje: { total: number; qtd: number }
  mes: { total: number; qtd: number }
  pedidos_abertos: number
  total_receber: number
  total_pagar: number
  saldo_liquido: number
}

export default function Home() {
  const ov = useApiQuery<Overview>('/estatisticas/overview')
  const fatMes = useApiQuery<any>('/vendas/faturadas', { period: 'last7' })
  const recentes = useApiQuery<any>('/vendas/recentes', { limit: 8 })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-xl font-semibold">Visão Geral</h2>
        <p className="text-text-secondary text-sm">Resumo consolidado do negócio em tempo real</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPICard
          label="Faturamento Hoje"
          value={formatBRLCompact(ov.data?.hoje.total)}
          icon={DollarSign}
          iconColor="text-success"
          hint={`${ov.data?.hoje.qtd || 0} pedidos`}
          loading={ov.isLoading}
        />
        <KPICard
          label="Faturamento do Mês"
          value={formatBRLCompact(ov.data?.mes.total)}
          icon={TrendingUp}
          iconColor="text-brand-500"
          hint={`${ov.data?.mes.qtd || 0} pedidos`}
          loading={ov.isLoading}
        />
        <KPICard
          label="Pedidos em Aberto"
          value={formatNum(ov.data?.pedidos_abertos)}
          icon={ShoppingBag}
          iconColor="text-warning"
          loading={ov.isLoading}
        />
        <KPICard
          label="A Receber"
          value={formatBRLCompact(ov.data?.total_receber)}
          icon={Wallet}
          iconColor="text-success"
          loading={ov.isLoading}
        />
        <KPICard
          label="A Pagar"
          value={formatBRLCompact(ov.data?.total_pagar)}
          icon={Receipt}
          iconColor="text-danger"
          loading={ov.isLoading}
        />
        <KPICard
          label="Saldo Líquido"
          value={formatBRLCompact(ov.data?.saldo_liquido)}
          icon={AlertCircle}
          iconColor={(ov.data?.saldo_liquido || 0) >= 0 ? 'text-success' : 'text-danger'}
          loading={ov.isLoading}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Gráfico de vendas últimos 7 dias */}
        <ChartCard
          title="Vendas · Últimos 7 dias"
          subtitle="Faturamento diário"
          className="lg:col-span-2"
          loading={fatMes.isLoading}
          empty={!fatMes.data?.data?.length}
          action={
            <Link to="/vendas" className="text-xs text-brand-500 hover:underline flex items-center gap-1">
              Ver detalhes <ArrowUpRight size={12} />
            </Link>
          }
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fatMes.data?.data || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                <XAxis
                  dataKey="data"
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                  tickFormatter={(d) => d.slice(5)}
                />
                <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} tickFormatter={(v) => formatBRLCompact(v)} />
                <Tooltip
                  formatter={(v: any) => formatBRL(v)}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E5E7EB' }}
                />
                <Bar dataKey="total" fill={CHART_COLORS.primary} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Acesso rápido */}
        <ChartCard title="Atalhos" subtitle="Acesso rápido aos módulos">
          <div className="grid grid-cols-2 gap-2">
            {[
              { to: '/vendas', label: 'Vendas' },
              { to: '/financeiro', label: 'Financeiro' },
              { to: '/lucratividade', label: 'Lucro' },
              { to: '/comissoes', label: 'Comissões' },
              { to: '/ranking', label: 'Ranking' },
              { to: '/produtos', label: 'Produtos' },
              { to: '/clientes', label: 'Clientes' },
              { to: '/log', label: 'Log' },
            ].map((m) => (
              <Link
                key={m.to}
                to={m.to}
                className="px-3 py-2 rounded-lg bg-bg-secondary hover:bg-brand-50 hover:text-brand-600 text-sm font-medium text-text-primary text-center transition-colors"
              >
                {m.label}
              </Link>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Últimas vendas */}
      <ChartCard title="Últimas Vendas" subtitle="8 pedidos mais recentes" loading={recentes.isLoading}>
        <div className="overflow-x-auto -mx-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-text-secondary uppercase border-b border-[#E0E0E0]">
                <th className="text-left px-5 py-2">Pedido</th>
                <th className="text-left px-5 py-2">Cliente</th>
                <th className="text-left px-5 py-2">Vendedor</th>
                <th className="text-left px-5 py-2">Data</th>
                <th className="text-right px-5 py-2">Valor</th>
                <th className="text-center px-5 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {(recentes.data?.data || []).map((r: any) => (
                <tr key={r.id} className="border-b border-[#E0E0E0] last:border-0 hover:bg-bg-secondary">
                  <td className="px-5 py-2.5 mono text-brand-600 font-medium">{r.numero_pedido}</td>
                  <td className="px-5 py-2.5 truncate max-w-[200px]">{r.cliente || '—'}</td>
                  <td className="px-5 py-2.5 text-text-secondary">{r.vendedor || '—'}</td>
                  <td className="px-5 py-2.5 text-text-secondary">{formatDateTime(r.data_venda)}</td>
                  <td className="px-5 py-2.5 text-right mono font-medium">{formatBRL(r.valor_total)}</td>
                  <td className="px-5 py-2.5 text-center">
                    <span className={`badge-${r.status === 'FINALIZADO' ? 'success' : r.status === 'CANCELADO' ? 'neutral' : 'warning'}`}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  )
}
