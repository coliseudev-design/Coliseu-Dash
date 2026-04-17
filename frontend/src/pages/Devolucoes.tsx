import { usePeriodQuery } from '../hooks/useApi'
import KPICard from '../components/KPICard'
import ChartCard from '../components/ChartCard'
import PeriodFilter from '../components/PeriodFilter'
import DataTable from '../components/DataTable'
import {
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { formatBRL, formatBRLCompact, formatDate, formatNum, formatPct } from '../utils/format'
import { CHART_PALETTE } from '../utils/chartColors'
import { RotateCcw, Hash, Percent, AlertTriangle, Package } from 'lucide-react'

export default function Devolucoes() {
  const kpis = usePeriodQuery<any>('/devolucoes/kpis')
  const porMotivo = usePeriodQuery<any>('/devolucoes/por-motivo')
  const porPeriodo = usePeriodQuery<any>('/devolucoes/por-periodo')
  const detalhes = usePeriodQuery<any>('/devolucoes/detalhes', { limit: 100 })

  const k = kpis.data?.kpis

  return (
    <div className="space-y-6">
      <PeriodFilter />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KPICard
          label="Total Devoluções"
          value={formatBRLCompact(k?.total_devolucoes)}
          icon={RotateCcw}
          iconColor="text-danger"
          loading={kpis.isLoading}
        />
        <KPICard
          label="Quantidade"
          value={formatNum(k?.qtd_devolucoes)}
          icon={Hash}
          loading={kpis.isLoading}
        />
        <KPICard
          label="Taxa de Devolução"
          value={formatPct(k?.taxa_devolucao_pct)}
          icon={Percent}
          iconColor="text-warning"
          hint="sobre faturamento"
          loading={kpis.isLoading}
        />
        <KPICard
          label="Motivo + Comum"
          value={k?.motivo_mais_comum || '—'}
          icon={AlertTriangle}
          iconColor="text-warning"
          loading={kpis.isLoading}
        />
        <KPICard
          label="Produto + Devolvido"
          value={k?.produto_mais_devolvido || '—'}
          icon={Package}
          iconColor="text-neutral"
          loading={kpis.isLoading}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard
          title="Devoluções por Motivo"
          loading={porMotivo.isLoading}
          empty={!porMotivo.data?.data?.length}
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={porMotivo.data?.data || []}
                  dataKey="total"
                  nameKey="motivo"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={50}
                  label={(e: any) => e.motivo}
                >
                  {(porMotivo.data?.data || []).map((_: any, i: number) => (
                    <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => formatBRL(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="Devoluções por Período"
          loading={porPeriodo.isLoading}
          empty={!porPeriodo.data?.data?.length}
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porPeriodo.data?.data || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="data" tick={{ fontSize: 11, fill: '#6B7280' }} tickFormatter={(d) => d?.slice(5) || d} />
                <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} tickFormatter={formatBRLCompact} />
                <Tooltip formatter={(v: any) => formatBRL(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="total" fill="#DC3545" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div>
        <h3 className="font-heading font-semibold mb-3">Detalhamento</h3>
        <DataTable
          loading={detalhes.isLoading}
          data={detalhes.data?.data || []}
          empty="Sem devoluções no período 🎉"
          columns={[
            { key: 'data_devolucao', label: 'Data', render: (r: any) => formatDate(r.data_devolucao) },
            { key: 'numero_pedido', label: 'Pedido', render: (r: any) => <span className="mono text-brand-600">{r.numero_pedido}</span> },
            { key: 'produto', label: 'Produto' },
            { key: 'motivo', label: 'Motivo' },
            { key: 'quantidade', label: 'Qtd', align: 'right', render: (r: any) => formatNum(r.quantidade) },
            { key: 'valor', label: 'Valor', align: 'right', render: (r: any) => <span className="text-danger font-medium">{formatBRL(r.valor)}</span> },
          ]}
        />
      </div>
    </div>
  )
}
