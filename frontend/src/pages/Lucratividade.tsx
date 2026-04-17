import { usePeriodQuery } from '../hooks/useApi'
import KPICard from '../components/KPICard'
import ChartCard from '../components/ChartCard'
import PeriodFilter from '../components/PeriodFilter'
import {
  BarChart, Bar, LineChart, Line, ComposedChart, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { formatBRL, formatBRLCompact, formatPct } from '../utils/format'
import { CHART_COLORS } from '../utils/chartColors'
import { TrendingUp, TrendingDown, DollarSign, Percent, Target, Activity } from 'lucide-react'

export default function Lucratividade() {
  const kpis = usePeriodQuery<any>('/lucratividade/kpis')
  const margem = usePeriodQuery<any>('/lucratividade/margem-bruta')
  const lucroLiq = usePeriodQuery<any>('/lucratividade/lucro-liquido')
  const compar = usePeriodQuery<any>('/lucratividade/comparativo')

  return (
    <div className="space-y-6">
      <PeriodFilter />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <KPICard
          label="Receita"
          value={formatBRLCompact(kpis.data?.kpis?.receita_total)}
          icon={DollarSign}
          iconColor="text-success"
          loading={kpis.isLoading}
        />
        <KPICard
          label="Custo"
          value={formatBRLCompact(kpis.data?.kpis?.custo_total)}
          icon={TrendingDown}
          iconColor="text-danger"
          loading={kpis.isLoading}
        />
        <KPICard
          label="Despesas Op."
          value={formatBRLCompact(kpis.data?.kpis?.despesas_operacionais)}
          icon={Activity}
          iconColor="text-warning"
          loading={kpis.isLoading}
        />
        <KPICard
          label="Lucro Bruto"
          value={formatBRLCompact(kpis.data?.kpis?.lucro_bruto)}
          icon={TrendingUp}
          iconColor="text-brand-500"
          loading={kpis.isLoading}
        />
        <KPICard
          label="Lucro Líquido"
          value={formatBRLCompact(kpis.data?.kpis?.lucro_liquido)}
          icon={Target}
          iconColor={(kpis.data?.kpis?.lucro_liquido || 0) >= 0 ? 'text-success' : 'text-danger'}
          loading={kpis.isLoading}
        />
        <KPICard
          label="Margem Bruta"
          value={formatPct(kpis.data?.kpis?.margem_bruta_pct)}
          icon={Percent}
          iconColor="text-brand-500"
          loading={kpis.isLoading}
        />
        <KPICard
          label="Margem Líquida"
          value={formatPct(kpis.data?.kpis?.margem_liquida_pct)}
          icon={Percent}
          iconColor={(kpis.data?.kpis?.margem_liquida_pct || 0) >= 0 ? 'text-success' : 'text-danger'}
          loading={kpis.isLoading}
        />
      </div>

      {/* Margem Bruta por dia */}
      <ChartCard
        title="Margem Bruta por Período"
        subtitle="Percentual de lucro bruto ao longo dos dias"
        loading={margem.isLoading}
        empty={!margem.data?.data?.length}
      >
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={margem.data?.data || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="data" tick={{ fontSize: 11, fill: '#6B7280' }} tickFormatter={(d) => d?.slice(5) || d} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#6B7280' }} tickFormatter={formatBRLCompact} />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11, fill: '#6B7280' }}
                tickFormatter={(v) => `${v.toFixed(0)}%`}
                domain={[0, 100]}
              />
              <Tooltip
                formatter={(v: any, n: string) =>
                  n === 'margem_bruta' ? formatPct(v) : formatBRL(v)
                }
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="left" dataKey="lucro" fill={CHART_COLORS.success} name="Lucro" radius={[4, 4, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="margem_bruta" stroke={CHART_COLORS.primary} name="Margem %" strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Lucro Líquido mensal */}
      <ChartCard
        title="Lucro Líquido por Mês"
        subtitle="Receita − Custo − Despesas operacionais"
        loading={lucroLiq.isLoading}
        empty={!lucroLiq.data?.data?.length}
      >
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lucroLiq.data?.data || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#6B7280' }} />
              <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} tickFormatter={formatBRLCompact} />
              <Tooltip formatter={(v: any) => formatBRL(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="receita" stroke={CHART_COLORS.success} strokeWidth={2} name="Receita" />
              <Line type="monotone" dataKey="lucro_bruto" stroke={CHART_COLORS.primary} strokeWidth={2} name="Lucro Bruto" />
              <Line type="monotone" dataKey="lucro_liquido" stroke={CHART_COLORS.purple} strokeWidth={2} name="Lucro Líquido" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Receita vs Custo */}
      <ChartCard
        title="Comparativo · Custo × Receita"
        subtitle="Barras agrupadas por dia"
        loading={compar.isLoading}
        empty={!compar.data?.data?.length}
      >
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={compar.data?.data || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="data" tick={{ fontSize: 11, fill: '#6B7280' }} tickFormatter={(d) => d?.slice(5) || d} />
              <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} tickFormatter={formatBRLCompact} />
              <Tooltip formatter={(v: any) => formatBRL(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="receita" fill={CHART_COLORS.success} name="Receita" radius={[4, 4, 0, 0]} />
              <Bar dataKey="custo" fill={CHART_COLORS.danger} name="Custo" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    </div>
  )
}
