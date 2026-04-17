import { useApiQuery, usePeriodQuery } from '../hooks/useApi'
import KPICard from '../components/KPICard'
import ChartCard from '../components/ChartCard'
import PeriodFilter from '../components/PeriodFilter'
import DataTable from '../components/DataTable'
import {
  Wallet, Receipt, Scale, AlertTriangle, Clock, FileX2,
  ArrowDownCircle, ArrowUpCircle, Package, Banknote,
} from 'lucide-react'
import {
  PieChart, Pie, Cell, AreaChart, Area,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { formatBRL, formatBRLCompact, formatDate, formatNum, formatPct } from '../utils/format'
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
  const caixa = usePeriodQuery<any>('/financeiro/caixa')
  const especies = usePeriodQuery<any>('/financeiro/especies-vendidas', { limit: 12 })
  const receber = useApiQuery<any>('/financeiro/contas-receber')
  const pagar = useApiQuery<any>('/financeiro/contas-pagar')
  const fluxo = usePeriodQuery<any>('/financeiro/fluxo-caixa')
  const vencidas = useApiQuery<any>('/financeiro/contas', { tipo: 'RECEBER', status: 'VENCIDA', limit: 50 })

  return (
    <div className="space-y-4 sm:space-y-6">
      <PeriodFilter />

      {/* KPIs principais */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
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
          label="Dias Médio Recebto."
          value={`${kpis.data?.kpis?.dias_medio_recebimento || 0} d`}
          icon={Clock}
          loading={kpis.isLoading}
        />
      </div>

      {/* ====== CAIXA ====== */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Banknote size={20} className="text-brand-600" />
          <h2 className="font-heading font-semibold text-base sm:text-lg">Caixa</h2>
          <span className="text-xs text-text-secondary hidden sm:inline">
            · {caixa.data?.period?.label || ''}
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
          <KPICard
            label="Entradas"
            value={formatBRLCompact(caixa.data?.kpis?.entradas)}
            icon={ArrowDownCircle}
            iconColor="text-success"
            hint={`${caixa.data?.kpis?.qtd_entradas || 0} recebimentos`}
            loading={caixa.isLoading}
          />
          <KPICard
            label="Saídas"
            value={formatBRLCompact(caixa.data?.kpis?.saidas)}
            icon={ArrowUpCircle}
            iconColor="text-danger"
            hint={`${caixa.data?.kpis?.qtd_saidas || 0} pagamentos`}
            loading={caixa.isLoading}
          />
          <KPICard
            label="Saldo do Caixa"
            value={formatBRLCompact(caixa.data?.kpis?.saldo)}
            icon={Scale}
            iconColor={(caixa.data?.kpis?.saldo || 0) >= 0 ? 'text-success' : 'text-danger'}
            loading={caixa.isLoading}
          />
          <KPICard
            label="Ticket Médio Entrada"
            value={formatBRLCompact(caixa.data?.kpis?.ticket_medio_entrada)}
            icon={Banknote}
            iconColor="text-brand-500"
            loading={caixa.isLoading}
          />
        </div>

        <ChartCard
          title="Movimentação do Caixa"
          subtitle="Entradas, saídas e saldo acumulado no período"
          loading={caixa.isLoading}
          empty={!caixa.data?.movimentacoes?.length}
        >
          <div className="h-64 sm:h-72 -mx-1 sm:mx-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={caixa.data?.movimentacoes || []}>
                <defs>
                  <linearGradient id="colorEntrCaixa" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.success} stopOpacity={0.5} />
                    <stop offset="95%" stopColor={CHART_COLORS.success} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorSaiCaixa" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.danger} stopOpacity={0.5} />
                    <stop offset="95%" stopColor={CHART_COLORS.danger} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="data" tick={{ fontSize: 10, fill: '#6B7280' }} tickFormatter={(d) => d?.slice(5) || d} />
                <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} tickFormatter={formatBRLCompact} width={55} />
                <Tooltip formatter={(v: any) => formatBRL(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="entradas" stroke={CHART_COLORS.success} fill="url(#colorEntrCaixa)" name="Entradas" />
                <Area type="monotone" dataKey="saidas" stroke={CHART_COLORS.danger} fill="url(#colorSaiCaixa)" name="Saídas" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* ====== ESPÉCIES VENDIDAS ====== */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Package size={20} className="text-brand-600" />
          <h2 className="font-heading font-semibold text-base sm:text-lg">Espécies Vendidas</h2>
          <span className="text-xs text-text-secondary hidden sm:inline">
            · {especies.data?.period?.label || ''}
          </span>
        </div>

        {/* Totais */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4">
          <KPICard
            label="Total Vendido em Espécies"
            value={formatBRLCompact(especies.data?.total?.valor)}
            icon={Banknote}
            iconColor="text-brand-500"
            loading={especies.isLoading}
          />
          <KPICard
            label="Quantidade Total"
            value={formatNum(especies.data?.total?.quantidade)}
            icon={Package}
            iconColor="text-brand-500"
            hint="unidades vendidas"
            loading={especies.isLoading}
          />
        </div>

        <div className="grid lg:grid-cols-5 gap-4 sm:gap-6">
          {/* Categorias (pizza) */}
          <ChartCard
            title="Por Categoria"
            subtitle="Distribuição de receita"
            loading={especies.isLoading}
            empty={!especies.data?.categorias?.length}
            className="lg:col-span-2"
          >
            <div className="h-64 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={especies.data?.categorias || []}
                    dataKey="total"
                    nameKey="categoria"
                    cx="50%"
                    cy="50%"
                    outerRadius="75%"
                    innerRadius="45%"
                    paddingAngle={1}
                  >
                    {(especies.data?.categorias || []).map((_: any, i: number) => (
                      <Cell key={i} fill={Object.values(CHART_COLORS)[i % Object.values(CHART_COLORS).length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => formatBRL(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          {/* Top produtos (barras) */}
          <ChartCard
            title="Top Produtos / Espécies"
            subtitle={`Os mais vendidos do período`}
            loading={especies.isLoading}
            empty={!especies.data?.produtos?.length}
            className="lg:col-span-3"
          >
            <div className="h-64 sm:h-72 -mx-1 sm:mx-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={(especies.data?.produtos || []).slice(0, 8)}
                  layout="vertical"
                  margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#6B7280' }} tickFormatter={formatBRLCompact} />
                  <YAxis
                    type="category"
                    dataKey="nome"
                    tick={{ fontSize: 10, fill: '#6B7280' }}
                    width={120}
                    interval={0}
                    tickFormatter={(n: string) => (n?.length > 18 ? n.slice(0, 17) + '…' : n)}
                  />
                  <Tooltip formatter={(v: any) => formatBRL(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="total_vendido" fill={CHART_COLORS.primary} radius={[0, 6, 6, 0]} name="Total vendido" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>

        {/* Tabela detalhada */}
        <div className="mt-4">
          <DataTable
            loading={especies.isLoading}
            data={especies.data?.produtos || []}
            empty="Nenhuma venda no período"
            columns={[
              { key: 'codigo', label: 'Cód.', render: (r: any) => <span className="mono text-xs">{r.codigo || '—'}</span> },
              { key: 'nome', label: 'Espécie / Produto' },
              { key: 'categoria', label: 'Categoria', render: (r: any) => r.categoria || '—' },
              { key: 'quantidade_vendida', label: 'Qtd.', align: 'right', render: (r: any) => formatNum(r.quantidade_vendida) },
              { key: 'preco_medio', label: 'Preço médio', align: 'right', render: (r: any) => formatBRL(r.preco_medio) },
              { key: 'total_vendido', label: 'Total', align: 'right', render: (r: any) => <span className="font-semibold">{formatBRL(r.total_vendido)}</span> },
            ]}
          />
        </div>
      </div>

      {/* ====== RECEBER / PAGAR ====== */}
      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        <ChartCard
          title="Contas a Receber"
          subtitle="Distribuição por status"
          loading={receber.isLoading}
          empty={!receber.data?.data?.length}
        >
          <div className="h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={receber.data?.data || []}
                  dataKey="total"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius="75%"
                  innerRadius="45%"
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
          <div className="h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pagar.data?.data || []}
                  dataKey="total"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius="75%"
                  innerRadius="45%"
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

      {/* Fluxo de caixa geral */}
      <ChartCard
        title="Fluxo de Caixa"
        subtitle="Entradas vs Saídas"
        loading={fluxo.isLoading}
        empty={!fluxo.data?.data?.length}
      >
        <div className="h-64 sm:h-80 -mx-1 sm:mx-0">
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
              <XAxis dataKey="data" tick={{ fontSize: 10, fill: '#6B7280' }} tickFormatter={(d) => d?.slice(5) || d} />
              <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} tickFormatter={formatBRLCompact} width={55} />
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
          empty="Nenhuma conta vencida"
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
