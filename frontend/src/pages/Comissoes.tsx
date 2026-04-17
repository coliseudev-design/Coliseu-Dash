import { usePeriodQuery } from '../hooks/useApi'
import KPICard from '../components/KPICard'
import ChartCard from '../components/ChartCard'
import PeriodFilter from '../components/PeriodFilter'
import DataTable from '../components/DataTable'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { formatBRL, formatBRLCompact, formatPct, formatDate, formatNum } from '../utils/format'
import { CHART_PALETTE } from '../utils/chartColors'
import { Percent, Award, ArrowDownAZ, Hash } from 'lucide-react'

export default function Comissoes() {
  const kpis = usePeriodQuery<any>('/comissoes/kpis')
  const ranking = usePeriodQuery<any>('/comissoes/ranking')
  const detalhes = usePeriodQuery<any>('/comissoes/detalhes', { limit: 100 })

  return (
    <div className="space-y-4 sm:space-y-6">
      <PeriodFilter />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
        <KPICard
          label="Total de Comissões"
          value={formatBRLCompact(kpis.data?.kpis?.total)}
          icon={Percent}
          iconColor="text-brand-500"
          loading={kpis.isLoading}
        />
        <KPICard
          label="Comissão Média"
          value={formatBRL(kpis.data?.kpis?.media)}
          icon={ArrowDownAZ}
          loading={kpis.isLoading}
        />
        <KPICard
          label="Maior Comissão"
          value={formatBRL(kpis.data?.kpis?.maior)}
          icon={Award}
          iconColor="text-success"
          loading={kpis.isLoading}
        />
        <KPICard
          label="Menor Comissão"
          value={formatBRL(kpis.data?.kpis?.menor)}
          icon={ArrowDownAZ}
          iconColor="text-neutral"
          loading={kpis.isLoading}
        />
        <KPICard
          label="Qtd. Comissões"
          value={formatNum(kpis.data?.kpis?.qtd)}
          icon={Hash}
          loading={kpis.isLoading}
        />
      </div>

      {/* Ranking barras horizontal */}
      <ChartCard
        title="Ranking de Comissões · Top 10"
        subtitle="Vendedores com maior comissão no período"
        loading={ranking.isLoading}
        empty={!ranking.data?.data?.length}
      >
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={(ranking.data?.data || []).slice(0, 10)} layout="vertical" margin={{ left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#6B7280' }} tickFormatter={formatBRLCompact} />
              <YAxis
                type="category"
                dataKey="vendedor"
                tick={{ fontSize: 11, fill: '#374151' }}
                width={130}
              />
              <Tooltip formatter={(v: any) => formatBRL(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="total_comissao" radius={[0, 6, 6, 0]}>
                {(ranking.data?.data || []).map((_: any, i: number) => (
                  <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <div>
        <h3 className="font-heading font-semibold mb-3">Detalhamento de Comissões</h3>
        <DataTable
          loading={detalhes.isLoading}
          data={detalhes.data?.data || []}
          empty="Sem comissões no período"
          columns={[
            { key: 'data_referencia', label: 'Data', render: (r: any) => formatDate(r.data_referencia) },
            { key: 'vendedor', label: 'Vendedor' },
            { key: 'numero_pedido', label: 'Pedido', render: (r: any) => <span className="mono text-brand-600">{r.numero_pedido}</span> },
            { key: 'valor_vendas', label: 'Vendas', align: 'right', render: (r: any) => formatBRL(r.valor_vendas) },
            { key: 'percentual', label: '%', align: 'right', render: (r: any) => formatPct(r.percentual) },
            { key: 'valor_comissao', label: 'Comissão', align: 'right', render: (r: any) => <span className="font-semibold text-success">{formatBRL(r.valor_comissao)}</span> },
          ]}
        />
      </div>
    </div>
  )
}
