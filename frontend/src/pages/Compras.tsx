import { usePeriodQuery } from '../hooks/useApi'
import KPICard from '../components/KPICard'
import ChartCard from '../components/ChartCard'
import PeriodFilter from '../components/PeriodFilter'
import DataTable from '../components/DataTable'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { formatBRL, formatBRLCompact, formatDate, formatNum } from '../utils/format'
import { CHART_PALETTE } from '../utils/chartColors'
import { Truck, DollarSign, ShoppingBag, Building2, Award } from 'lucide-react'

export default function Compras() {
  const kpis = usePeriodQuery<any>('/compras/kpis')
  const porForn = usePeriodQuery<any>('/compras/por-fornecedor')
  const pedidos = usePeriodQuery<any>('/compras/pedidos', { limit: 100 })

  const k = kpis.data?.kpis

  return (
    <div className="space-y-6">
      <PeriodFilter />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KPICard
          label="Total de Compras"
          value={formatBRLCompact(k?.total_compras)}
          icon={DollarSign}
          iconColor="text-danger"
          loading={kpis.isLoading}
        />
        <KPICard
          label="Pedidos"
          value={formatNum(k?.qtd_pedidos)}
          icon={ShoppingBag}
          loading={kpis.isLoading}
        />
        <KPICard
          label="Ticket Médio"
          value={formatBRL(k?.ticket_medio)}
          icon={Truck}
          loading={kpis.isLoading}
        />
        <KPICard
          label="Fornecedores"
          value={formatNum(k?.qtd_fornecedores)}
          icon={Building2}
          iconColor="text-brand-500"
          loading={kpis.isLoading}
        />
        <KPICard
          label="Top Fornecedor"
          value={k?.top_fornecedor || '—'}
          icon={Award}
          iconColor="text-warning"
          hint={formatBRL(k?.top_fornecedor_valor)}
          loading={kpis.isLoading}
        />
      </div>

      <ChartCard
        title="Compras por Fornecedor"
        subtitle="Distribuição do volume de compras no período"
        loading={porForn.isLoading}
        empty={!porForn.data?.data?.length}
      >
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={porForn.data?.data || []} layout="vertical" margin={{ left: 110 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#6B7280' }} tickFormatter={formatBRLCompact} />
              <YAxis type="category" dataKey="fornecedor" tick={{ fontSize: 11, fill: '#374151' }} width={190} />
              <Tooltip formatter={(v: any) => formatBRL(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="total" radius={[0, 6, 6, 0]}>
                {(porForn.data?.data || []).map((_: any, i: number) => (
                  <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <div>
        <h3 className="font-heading font-semibold mb-3">Pedidos de Compra</h3>
        <DataTable
          loading={pedidos.isLoading}
          data={pedidos.data?.data || []}
          empty="Sem pedidos no período"
          columns={[
            { key: 'numero_pedido', label: 'Nº Pedido', render: (r: any) => <span className="mono text-brand-600">{r.numero_pedido}</span> },
            { key: 'fornecedor', label: 'Fornecedor' },
            { key: 'data_pedido', label: 'Data', render: (r: any) => formatDate(r.data_pedido) },
            { key: 'data_entrega', label: 'Entrega', render: (r: any) => formatDate(r.data_entrega) },
            { key: 'valor_total', label: 'Valor', align: 'right', render: (r: any) => formatBRL(r.valor_total) },
            { key: 'status', label: 'Status', align: 'center',
              render: (r: any) => <span className={`badge-${r.status === 'FINALIZADO' ? 'success' : 'warning'}`}>{r.status}</span> },
          ]}
        />
      </div>
    </div>
  )
}
