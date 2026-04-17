import { usePeriodQuery } from '../hooks/useApi'
import KPICard from '../components/KPICard'
import ChartCard from '../components/ChartCard'
import PeriodFilter from '../components/PeriodFilter'
import {
  ShoppingCart, Receipt, DollarSign, TrendingUp, TrendingDown,
} from 'lucide-react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { formatBRL, formatBRLCompact, formatNum } from '../utils/format'
import { CHART_COLORS, STATUS_COLORS } from '../utils/chartColors'

export default function Vendas() {
  const kpis = usePeriodQuery<any>('/vendas/kpis')
  const faturadas = usePeriodQuery<any>('/vendas/faturadas')
  const horario = usePeriodQuery<any>('/vendas/por-horario')
  const abertos = usePeriodQuery<any>('/vendas/pedidos-abertos')

  return (
    <div className="space-y-4 sm:space-y-6">
      <PeriodFilter />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
        <KPICard
          label="Total Faturado"
          value={formatBRLCompact(kpis.data?.kpis?.total_faturado)}
          icon={DollarSign}
          iconColor="text-success"
          loading={kpis.isLoading}
        />
        <KPICard
          label="Pedidos"
          value={formatNum(kpis.data?.kpis?.qtd_pedidos)}
          icon={ShoppingCart}
          loading={kpis.isLoading}
        />
        <KPICard
          label="Ticket Médio"
          value={formatBRL(kpis.data?.kpis?.ticket_medio)}
          icon={Receipt}
          loading={kpis.isLoading}
        />
        <KPICard
          label="Maior Venda"
          value={formatBRL(kpis.data?.kpis?.maior_venda)}
          icon={TrendingUp}
          iconColor="text-success"
          loading={kpis.isLoading}
        />
        <KPICard
          label="Menor Venda"
          value={formatBRL(kpis.data?.kpis?.menor_venda)}
          icon={TrendingDown}
          iconColor="text-neutral"
          loading={kpis.isLoading}
        />
      </div>

      {/* Faturadas por dia */}
      <ChartCard
        title="Vendas Faturadas"
        subtitle="Evolução diária no período"
        loading={faturadas.isLoading}
        empty={!faturadas.data?.data?.length}
      >
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={faturadas.data?.data || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
              <XAxis
                dataKey="data"
                tick={{ fontSize: 11, fill: '#6B7280' }}
                tickFormatter={(d) => (d?.slice ? d.slice(5) : d)}
              />
              <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} tickFormatter={formatBRLCompact} />
              <Tooltip
                formatter={(v: any, n: string) => [n === 'total' ? formatBRL(v) : v, n === 'total' ? 'Faturamento' : 'Qtd']}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Bar dataKey="total" fill={CHART_COLORS.primary} radius={[6, 6, 0, 0]} name="Faturamento" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Por horário */}
        <ChartCard
          title="Vendas por Horário"
          subtitle="Padrão de vendas ao longo do dia (últimos 30 dias)"
          loading={horario.isLoading}
          empty={!horario.data?.data?.length}
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={horario.data?.data || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="hora"
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                  tickFormatter={(h) => `${String(h).padStart(2, '0')}h`}
                />
                <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} />
                <Tooltip
                  formatter={(v: any) => [formatNum(v), 'Qtd vendas']}
                  labelFormatter={(l) => `${String(l).padStart(2, '0')}:00`}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Line
                  type="monotone"
                  dataKey="quantidade"
                  stroke={CHART_COLORS.primary}
                  strokeWidth={2}
                  dot={{ fill: CHART_COLORS.primary, r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Pedidos em aberto */}
        <ChartCard
          title="Pedidos em Aberto"
          subtitle="Distribuição por status"
          loading={abertos.isLoading}
          empty={!abertos.data?.data?.length}
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={abertos.data?.data || []}
                  dataKey="quantidade"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={50}
                  label={(e: any) => `${e.status}: ${e.quantidade}`}
                >
                  {(abertos.data?.data || []).map((entry: any, i: number) => (
                    <Cell key={i} fill={STATUS_COLORS[entry.status] || CHART_COLORS.neutral} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
    </div>
  )
}
