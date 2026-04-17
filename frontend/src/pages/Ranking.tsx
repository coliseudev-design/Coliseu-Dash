import { usePeriodQuery } from '../hooks/useApi'
import ChartCard from '../components/ChartCard'
import PeriodFilter from '../components/PeriodFilter'
import DataTable from '../components/DataTable'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { formatBRL, formatBRLCompact, formatNum } from '../utils/format'
import { CHART_PALETTE } from '../utils/chartColors'
import { Trophy, Package } from 'lucide-react'

export default function Ranking() {
  const vendedores = usePeriodQuery<any>('/ranking/vendedores', { limit: 10 })
  const produtos = usePeriodQuery<any>('/ranking/produtos', { limit: 10 })
  const clientes = usePeriodQuery<any>('/ranking/clientes', { limit: 10 })

  return (
    <div className="space-y-4 sm:space-y-6">
      <PeriodFilter />

      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        <ChartCard
          title="Top 10 Vendedores"
          subtitle="Vendedores com maior volume de vendas"
          loading={vendedores.isLoading}
          empty={!vendedores.data?.data?.length}
          action={<Trophy size={16} className="text-warning" />}
        >
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={vendedores.data?.data || []} layout="vertical" margin={{ left: 70 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#6B7280' }} tickFormatter={formatBRLCompact} />
                <YAxis type="category" dataKey="vendedor" tick={{ fontSize: 11, fill: '#374151' }} width={120} />
                <Tooltip formatter={(v: any) => formatBRL(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="total" radius={[0, 6, 6, 0]}>
                  {(vendedores.data?.data || []).map((_: any, i: number) => (
                    <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="Top 10 Produtos"
          subtitle="Produtos mais vendidos (por faturamento)"
          loading={produtos.isLoading}
          empty={!produtos.data?.data?.length}
          action={<Package size={16} className="text-brand-500" />}
        >
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={produtos.data?.data || []} layout="vertical" margin={{ left: 90 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#6B7280' }} tickFormatter={formatBRLCompact} />
                <YAxis type="category" dataKey="produto" tick={{ fontSize: 10, fill: '#374151' }} width={170} />
                <Tooltip formatter={(v: any) => formatBRL(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="total" radius={[0, 6, 6, 0]}>
                  {(produtos.data?.data || []).map((_: any, i: number) => (
                    <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div>
        <h3 className="font-heading font-semibold mb-3">Top 10 Clientes</h3>
        <DataTable
          loading={clientes.isLoading}
          data={clientes.data?.data || []}
          empty="Sem dados"
          columns={[
            { key: '#', label: '#', width: '60px', render: (_: any, i: number) => <span className="text-text-muted mono">{i + 1}º</span> },
            { key: 'cliente', label: 'Cliente' },
            { key: 'cidade', label: 'Cidade', render: (r: any) => r.cidade ? `${r.cidade}/${r.estado}` : '—' },
            { key: 'transacoes', label: 'Pedidos', align: 'right', render: (r: any) => formatNum(r.transacoes) },
            { key: 'total', label: 'Total', align: 'right', render: (r: any) => <span className="font-semibold">{formatBRL(r.total)}</span> },
          ]}
        />
      </div>
    </div>
  )
}
