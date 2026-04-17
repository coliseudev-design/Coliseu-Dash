import { useState } from 'react'
import { useApiQuery, usePeriodQuery } from '../hooks/useApi'
import KPICard from '../components/KPICard'
import DataTable from '../components/DataTable'
import PeriodFilter from '../components/PeriodFilter'
import { Users, UserCheck, Award, Receipt, Search } from 'lucide-react'
import { formatBRL, formatBRLCompact, formatDate, formatNum } from '../utils/format'

export default function Clientes() {
  const [search, setSearch] = useState('')
  const kpis = usePeriodQuery<any>('/clientes/kpis')
  const lista = useApiQuery<any>(
    '/clientes/lista',
    { search, limit: 200 },
    { placeholderData: (prev: any) => prev },
  )

  const k = kpis.data?.kpis

  return (
    <div className="space-y-6">
      <PeriodFilter />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          label="Total Clientes"
          value={formatNum(k?.total_clientes)}
          icon={Users}
          iconColor="text-brand-500"
          loading={kpis.isLoading}
        />
        <KPICard
          label="Clientes Ativos"
          value={formatNum(k?.clientes_ativos)}
          icon={UserCheck}
          iconColor="text-success"
          hint="no período"
          loading={kpis.isLoading}
        />
        <KPICard
          label="Top Cliente"
          value={k?.top_cliente || '—'}
          icon={Award}
          iconColor="text-warning"
          hint={formatBRL(k?.top_cliente_valor)}
          loading={kpis.isLoading}
        />
        <KPICard
          label="Ticket Médio / Cliente"
          value={formatBRLCompact(k?.ticket_medio_por_cliente)}
          icon={Receipt}
          loading={kpis.isLoading}
        />
      </div>

      <div className="card !p-3 flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            className="input !pl-9"
            placeholder="Buscar por nome ou documento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span className="text-xs text-text-secondary">
          {lista.data?.total || 0} clientes
        </span>
      </div>

      <DataTable
        loading={lista.isLoading}
        data={lista.data?.data || []}
        empty="Nenhum cliente encontrado"
        columns={[
          { key: 'nome', label: 'Nome' },
          { key: 'documento', label: 'Documento', render: (r: any) => <span className="mono text-xs">{r.documento || '—'}</span> },
          { key: 'cidade', label: 'Cidade', render: (r: any) => r.cidade ? `${r.cidade}/${r.estado}` : '—' },
          { key: 'qtd_pedidos', label: 'Pedidos', align: 'right', render: (r: any) => formatNum(r.qtd_pedidos) },
          { key: 'total_gasto', label: 'Total Gasto', align: 'right',
            render: (r: any) => <span className="font-semibold">{formatBRL(r.total_gasto)}</span> },
          { key: 'ultimo_pedido', label: 'Último Pedido', render: (r: any) => formatDate(r.ultimo_pedido) },
        ]}
      />
    </div>
  )
}
