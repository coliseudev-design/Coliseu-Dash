import { useApiQuery, usePeriodQuery } from '../hooks/useApi'
import KPICard from '../components/KPICard'
import ChartCard from '../components/ChartCard'
import PeriodFilter from '../components/PeriodFilter'
import DataTable from '../components/DataTable'
import { Wallet, Receipt, Scale, AlertTriangle, Clock, FileX2 } from 'lucide-react'
import {
  PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { formatBRL, formatBRLCompact, formatDate, formatPct } from '../utils/format'
import { CHART_COLORS, STATUS_COLORS } from '../utils/chartColors'

const STATUS_LABELS: Record<string, string> = {
  VENCIDA: 'Vencida',
  A_VENCER: 'A vencer',
  PAGA: 'Paga',
  FUTURA: 'Futura',
  CANCELADA: 'Cancelada',
}

export default function Financeiro() {
  const kpis = useApiQuery<any>('/financeiro/kpis')
  const receber = useApiQuery<any>('/financeiro/contas-receber')
  const pagar = useApiQuery<any>('/financeiro/contas-pagar')
  const fluxo = usePeriodQuery<any>('/financeiro/fluxo-caixa')
  const vencidas = useApiQuery<any>('/financeiro/contas', { tipo: 'RECEBER', status: 'VENCIDA', limit: 50 })

  return (
    <div className="space-y-6">
      <PeriodFilter />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KPICard
          label="Total a Receber"
          value={formatBRLCompact(kpis.data?.kpis?.total_receber)}
          icon={Wallet}
          iconColor="text-success"
          loading={kpis.isLoading}
        />
        <KPICard
          label="Total a Pagar"
          value={formatBRLCompact(kpis.data?.kpis?.total_pagar)}
          icon={Receipt}
          iconColor="text-danger"
          loading={kpis.isLoading}
        />
        <KPICard
          label="Saldo Líquido"
          value={formatBRLCompact(kpis.data?.kpis?.saldo_liquido)}
          icon={Scale}
          iconColor={(kpis.data?.kpis?.saldo_liquido || 0) >= 0 ? 'text-success' : 'text-danger'}
          loading={kpis.isLoading}
        />
        <KPICard
          label="Inadimplência"
          value={formatPct(kpis.data?.kpis?.inadimplencia_pct)}
          icon={AlertTriangle}
          iconColor="text-warning"
          hint={`${kpis.data?.kpis?.vencidas_qtd || 0} vencidas`}
          loading={kpis.isLoading}
        />
        <KPICard
          label="Dias Médio Recebimento"
          value={`${kpis.data?.kpis?.dias_medio_recebimento || 0} d`}
          icon={Clock}
          loading={kpis.isLoading}
        />
      </div>

      {/* Pizzas de receber/pagar */}
      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard
          title="Contas a Receber"
          subtitle="Distribuição por status"
          loading={receber.isLoading}
          empty={!receber.data?.data?.length}
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={receber.data?.data || []}
                  dataKey="total"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={50}
                  label={(e: any) => STATUS_LABELS[e.status] || e.status}
                >
                  {(receber.data?.data || []).map((e: any, i: number) => (
                    <Cell key={i} fill={STATUS_COLORS[e.status] || CHART_COLORS.neutral} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => formatBRL(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v) => STATUS_LABELS[v as string] || v} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="Contas a Pagar"
          subtitle="Distribuição por status"
          loading={pagar.isLoading}
          empty={!pagar.data?.data?.length}
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pagar.data?.data || []}
                  dataKey="total"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={50}
                  label={(e: any) => STATUS_LABELS[e.status] || e.status}
                >
                  {(pagar.data?.data || []).map((e: any, i: number) => (
                    <Cell key={i} fill={STATUS_COLORS[e.status] || CHART_COLORS.neutral} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => formatBRL(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v) => STATUS_LABELS[v as string] || v} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Fluxo de caixa */}
      <ChartCard
        title="Fluxo de Caixa"
        subtitle="Entradas vs Saídas com saldo acumulado"
        loading={fluxo.isLoading}
        empty={!fluxo.data?.data?.length}
      >
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={fluxo.data?.data || []}>
              <defs>
                <linearGradient id="colorEntr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.success} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={CHART_COLORS.success} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorSai" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.danger} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={CHART_COLORS.danger} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="data" tick={{ fontSize: 11, fill: '#6B7280' }} tickFormatter={(d) => d?.slice(5) || d} />
              <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} tickFormatter={formatBRLCompact} />
              <Tooltip formatter={(v: any) => formatBRL(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="entradas" stroke={CHART_COLORS.success} fill="url(#colorEntr)" name="Entradas" />
              <Area type="monotone" dataKey="saidas" stroke={CHART_COLORS.danger} fill="url(#colorSai)" name="Saídas" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Vencidas */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <FileX2 size={18} className="text-danger" />
          <h3 className="font-heading font-semibold">Contas Vencidas</h3>
          <span className="badge-danger">{vencidas.data?.data?.length || 0}</span>
        </div>
        <DataTable
          loading={vencidas.isLoading}
          data={vencidas.data?.data || []}
          empty="Nenhuma conta vencida 🎉"
          columns={[
            { key: 'descricao', label: 'Descrição' },
            { key: 'cliente', label: 'Cliente' },
            { key: 'data_vencimento', label: 'Venc.', render: (r: any) => formatDate(r.data_vencimento) },
            { key: 'valor', label: 'Valor', align: 'right', render: (r: any) => formatBRL(r.valor) },
          ]}
        />
      </div>
    </div>
  )
}
