import { useMemo, useState } from 'react'
import { useBranchPeriodQuery } from '../hooks/useApi'
import { Link } from 'react-router-dom'
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingBag,
  Calculator, Wallet, Receipt, ArrowUpRight,
  Trophy, Medal, ChevronRight, BarChart2, AlertTriangle,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LineChart, Line, ReferenceLine,
} from 'recharts'
import { formatBRL, formatBRLCompact, formatNum, formatDate, formatDateTime } from '../utils/format'
import { usePeriodStore } from '../store/periodStore'
import PeriodFilter from '../components/PeriodFilter'

// ─── helpers ─────────────────────────────────────────────────────────────────

const MEDAL_COLORS = ['#F59E0B', '#94A3B8', '#CD7C2F']
const MEDAL_LABELS = ['🥇', '🥈', '🥉']
const BAR_COLORS = [
  '#0066CC', '#10B981', '#F59E0B', '#EF4444',
  '#06B6D4', '#0891B2', '#EC4899', '#F97316',
  '#14B8A6', '#6366F1',
]

function Trend({ pct }: { pct: number }) {
  if (!Number.isFinite(pct) || pct === 0)
    return <span className="text-[10px] font-semibold text-text-muted px-1.5 py-0.5 rounded bg-bg-tertiary">—</span>
  const up = pct > 0
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded ${
        up ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
           : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      }`}
    >
      {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {Math.abs(pct).toFixed(1)}%
    </span>
  )
}

function SkeletonPulse({ className }: { className: string }) {
  return <div className={`animate-pulse bg-bg-tertiary rounded ${className}`} />
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-bg-primary border border-border shadow-card-hover rounded-lg p-3 text-xs">
      <p className="font-semibold text-text-secondary mb-1">{label}</p>
      {payload.map((e: any, i: number) => (
        <p key={i} className="font-bold text-text-primary">{formatBRL(e.value)}</p>
      ))}
    </div>
  )
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

interface KPIProps {
  label: string
  value: string
  sub?: string
  icon: React.ElementType
  accent: string        // tailwind text color
  accentBg: string      // tailwind bg color
  pct?: number
  loading?: boolean
  large?: boolean
}

function KPICard({ label, value, sub, icon: Icon, accent, accentBg, pct, loading, large }: KPIProps) {
  return (
    <div className={`card group flex flex-col gap-3 ${large ? 'py-5 px-5' : 'py-4 px-4'} transition-all duration-300 hover:-translate-y-0.5`}>
      <div className="flex items-start justify-between">
        <div className={`p-2 rounded-lg ${accentBg}`}>
          <Icon size={large ? 20 : 16} className={accent} />
        </div>
        {pct !== undefined && <Trend pct={pct} />}
      </div>
      {loading ? (
        <>
          <SkeletonPulse className={`h-${large ? 8 : 6} w-3/4`} />
          <SkeletonPulse className="h-3 w-1/2" />
        </>
      ) : (
        <>
          <div className={`${large ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'} font-bold text-text-primary leading-none mono`}>
            {value}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-text-secondary uppercase tracking-wide leading-tight">{label}</span>
          </div>
          {sub && <p className="text-[10px] text-text-muted">{sub}</p>}
        </>
      )}
    </div>
  )
}

// ─── Seller Row ───────────────────────────────────────────────────────────────

interface SellerRowProps {
  rank: number
  name: string
  value: number
  maxValue: number
}

function SellerRow({ rank, name, value, maxValue }: SellerRowProps) {
  const pct = maxValue > 0 ? (value / maxValue) * 100 : 0
  const medal = rank <= 3 ? MEDAL_LABELS[rank - 1] : null

  return (
    <div className="flex items-center gap-3 py-2.5 px-1 group hover:bg-bg-secondary rounded-lg transition-colors duration-200">
      <div className="w-7 text-center shrink-0">
        {medal ? (
          <span className="text-base">{medal}</span>
        ) : (
          <span className="text-[11px] font-bold text-text-muted mono">{rank}º</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-text-primary truncate capitalize">{name?.toLowerCase()}</p>
        <div className="mt-1 h-1.5 w-full bg-bg-tertiary rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${pct}%`,
              backgroundColor: rank <= 3 ? MEDAL_COLORS[rank - 1] : '#0066CC',
            }}
          />
        </div>
      </div>
      <span className="text-xs font-bold text-text-primary mono shrink-0">{formatBRLCompact(value)}</span>
    </div>
  )
}

// ─── Finance Bar ──────────────────────────────────────────────────────────────

function FinanceRow({ label, value, color, loading }: { label: string; value: number; color: string; loading?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-divider last:border-0">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${color}`} />
        <span className="text-[11px] font-medium text-text-secondary uppercase tracking-wide">{label}</span>
      </div>
      {loading
        ? <SkeletonPulse className="h-4 w-24" />
        : <span className="text-sm font-bold text-text-primary mono">{formatBRL(value)}</span>}
    </div>
  )
}

// ─── Recent Order Row ─────────────────────────────────────────────────────────

function RecentOrderRow({ order }: { order: any }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-divider last:border-0 group hover:bg-bg-secondary -mx-4 px-4 transition-colors rounded-lg">
      <div className="flex-1 min-w-0 mr-3">
        <p className="text-xs font-semibold text-text-primary truncate">{order.cliente || 'Consumidor Final'}</p>
        <p className="text-[10px] text-text-muted mt-0.5">
          #{order.numero_pedido} · {order.data_venda ? formatDateTime(order.data_venda) : '—'}
        </p>
      </div>
      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mono shrink-0">{formatBRL(order.valor_total)}</span>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

interface Overview {
  hoje: { total: number; qtd: number }
  mes: { total: number; qtd: number }
  anterior?: { total: number; qtd: number }
  pedidos_abertos: number
  pedidos_processados: number
  pedidos_cancelados: number
  total_receber: number
  total_recebido: number
  total_pagar: number
  total_pago: number
  top_marcas?: { marca: string; total: number }[]
  top_categorias?: { categoria: string; total: number }[]
}

export default function HomeV1() {
  const period = usePeriodStore((s) => s.period)
  const [rankTab, setRankTab] = useState<'vendedores' | 'marcas' | 'clientes'>('vendedores')

  const ov       = useBranchPeriodQuery<Overview>('/estatisticas/overview')
  const fatMes   = useBranchPeriodQuery<any>('/vendas/faturadas')
  const recentes = useBranchPeriodQuery<any>('/vendas/recentes', { limit: 8 })
  const vendors  = useBranchPeriodQuery<any>('/ranking/vendedores', { limit: 8 })
  const brands   = useBranchPeriodQuery<any>('/ranking/marcas', { limit: 8 })
  const clients  = useBranchPeriodQuery<any>('/ranking/clientes', { limit: 8 })

  const totalPeriodo  = ov.data?.mes?.total || 0
  const totalAnterior = ov.data?.anterior?.total || 0
  const qtdPeriodo    = ov.data?.mes?.qtd || 0
  const ticketMedio   = qtdPeriodo > 0 ? totalPeriodo / qtdPeriodo : 0
  const crescimentoPct = totalAnterior > 0 ? ((totalPeriodo - totalAnterior) / totalAnterior) * 100 : 0

  // Normaliza ranking data
  const normalize = (arr: any[], nameKey1: string, nameKey2: string) =>
    (arr || []).slice(0, 8).map((d: any) => ({
      nome: d[nameKey1] || d[nameKey2] || 'Desconhecido',
      total: parseFloat(d.total || d.faturamento || 0),
    }))

  const vendData  = normalize(vendors.data?.data,  'vendedor', 'nome')
  const brandData = normalize(brands.data?.data,   'nome',     'marca')
  const clientData= normalize(clients.data?.data,  'cliente',  'nome')

  const rankData = rankTab === 'vendedores' ? vendData
                 : rankTab === 'marcas'     ? brandData
                 : clientData
  const rankMax = rankData.length > 0 ? rankData[0].total : 1

  const chartData = useMemo(() => {
    const raw = fatMes.data?.data || []
    return raw.slice(-30)
  }, [fatMes.data])

  const recentOrders = useMemo(
    () => (recentes.data?.data || []).slice(0, 7),
    [recentes.data]
  )

  return (
    <div className="space-y-5 pb-10" aria-label="Visão Estratégica">

      {/* ── HEADER ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-text-primary tracking-tight">Visão Estratégica</h2>
          <p className="text-sm text-text-secondary mt-0.5">Resumo consolidado do negócio</p>
        </div>
        <PeriodFilter />
      </div>

      {/* ── HERO KPI — Faturamento Principal ──────────────────────── */}
      <div className="card relative overflow-hidden !p-5 sm:!p-6">
        {/* Accent stripe */}
        <div className="absolute left-0 top-0 h-full w-1 bg-brand-500 rounded-l-xl" />
        <div className="pl-3 sm:pl-4">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-widest mb-2">
                Faturamento do Período
              </p>
              {ov.isLoading ? (
                <SkeletonPulse className="h-12 w-48" />
              ) : (
                <div className="flex items-end gap-3">
                  <span className="text-4xl sm:text-5xl font-extrabold text-text-primary mono leading-none">
                    {formatBRL(totalPeriodo)}
                  </span>
                  <Trend pct={crescimentoPct} />
                </div>
              )}
              <p className="text-xs text-text-muted mt-2 flex items-center gap-2">
                <span>{qtdPeriodo} pedidos processados</span>
                {totalAnterior > 0 && (
                  <span className="text-text-muted/60">· anterior: {formatBRL(totalAnterior)}</span>
                )}
              </p>
            </div>

            {/* Mini donut / pill stats */}
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Hoje', value: ov.data?.hoje?.total, qty: ov.data?.hoje?.qtd, color: 'text-brand-500', bg: 'bg-brand-50 dark:bg-brand-500/10' },
                { label: 'Ticket Médio', value: ticketMedio, qty: null, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
              ].map((s) => (
                <div key={s.label} className={`rounded-xl px-4 py-3 ${s.bg} flex flex-col gap-0.5 min-w-[110px]`}>
                  <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wide">{s.label}</span>
                  {ov.isLoading
                    ? <SkeletonPulse className="h-5 w-20" />
                    : <span className={`text-base font-extrabold mono ${s.color}`}>{formatBRL(s.value)}</span>}
                  {s.qty !== null && !ov.isLoading && (
                    <span className="text-[10px] text-text-muted">{s.qty} pedidos</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── GRID: Status KPIs (4 cards) ───────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          label="Processados"
          value={formatNum(ov.data?.pedidos_processados)}
          sub="no período"
          icon={TrendingUp}
          accent="text-emerald-600"
          accentBg="bg-emerald-50 dark:bg-emerald-900/20"
          loading={ov.isLoading}
        />
        <KPICard
          label="Em Aberto"
          value={formatNum(ov.data?.pedidos_abertos)}
          sub="aguardando"
          icon={ShoppingBag}
          accent="text-amber-600"
          accentBg="bg-amber-50 dark:bg-amber-900/20"
          loading={ov.isLoading}
        />
        <KPICard
          label="Cancelados"
          value={formatNum(ov.data?.pedidos_cancelados)}
          sub="descartados"
          icon={AlertTriangle}
          accent="text-red-500"
          accentBg="bg-red-50 dark:bg-red-900/20"
          loading={ov.isLoading}
        />
        <KPICard
          label="Ticket Médio"
          value={formatBRL(ticketMedio)}
          sub="por pedido"
          icon={Calculator}
          accent="text-brand-500"
          accentBg="bg-brand-50 dark:bg-brand-500/10"
          loading={ov.isLoading}
        />
      </div>

      {/* ── GRID: Gráfico + Ranking ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* Gráfico de faturamento */}
        <div className="lg:col-span-8 card !p-4 sm:!p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart2 size={16} className="text-brand-500" />
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                Faturamento no Período
              </h3>
            </div>
            <Link
              to="/vendas"
              className="flex items-center gap-1 text-[11px] text-brand-500 hover:text-brand-600 font-semibold transition-colors"
            >
              Ver tudo <ArrowUpRight size={12} />
            </Link>
          </div>

          {fatMes.isLoading ? (
            <SkeletonPulse className="h-56 w-full" />
          ) : chartData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-sm text-text-muted">
              Sem dados no período selecionado
            </div>
          ) : (
            <div className="h-56 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                {chartData.length > 15 ? (
                  <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.6} />
                    <XAxis
                      dataKey="data"
                      tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
                      tickFormatter={(d: string) => d?.slice(5) || d}
                      axisLine={false} tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
                      tickFormatter={formatBRLCompact}
                      axisLine={false} tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={0} stroke="var(--color-border)" />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="#0066CC"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 0 }}
                    />
                  </LineChart>
                ) : (
                  <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.6} />
                    <XAxis
                      dataKey="data"
                      tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
                      tickFormatter={(d: string) => d?.slice(5) || d}
                      axisLine={false} tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
                      tickFormatter={formatBRLCompact}
                      axisLine={false} tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-bg-tertiary)', opacity: 0.5 }} />
                    <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={42}>
                      {chartData.map((_: any, i: number) => (
                        <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Saúde Financeira */}
        <div className="lg:col-span-4 card !p-4 sm:!p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign size={16} className="text-emerald-600" />
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">Saúde Financeira</h3>
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <FinanceRow label="A Receber"   value={ov.data?.total_receber  || 0} color="bg-amber-400"  loading={ov.isLoading} />
            <FinanceRow label="Recebido"    value={ov.data?.total_recebido || 0} color="bg-emerald-400" loading={ov.isLoading} />
            <FinanceRow label="A Pagar"     value={ov.data?.total_pagar    || 0} color="bg-red-400"    loading={ov.isLoading} />
            <FinanceRow label="Pago"        value={ov.data?.total_pago     || 0} color="bg-blue-400"   loading={ov.isLoading} />
          </div>
          <Link
            to="/fluxo-caixa"
            className="mt-4 flex items-center justify-center gap-1.5 text-xs font-semibold text-brand-500 hover:text-brand-600 border border-brand-500/20 hover:border-brand-500/40 rounded-lg py-2 transition-all duration-200"
          >
            <Wallet size={13} /> Ver Fluxo de Caixa
          </Link>
        </div>
      </div>

      {/* ── GRID: Ranking + Pedidos Recentes ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* Ranking com medalhas */}
        <div className="lg:col-span-7 card !p-4 sm:!p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Trophy size={15} className="text-amber-500" />
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">Ranking</h3>
            </div>
            <Link to="/ranking" className="flex items-center gap-1 text-[11px] text-brand-500 hover:text-brand-600 font-semibold transition-colors">
              Completo <ChevronRight size={12} />
            </Link>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-1 mb-4 bg-bg-secondary p-1 rounded-lg">
            {([
              { id: 'vendedores', label: 'Vendedores' },
              { id: 'marcas',    label: 'Marcas' },
              { id: 'clientes',  label: 'Clientes' },
            ] as const).map(t => (
              <button
                key={t.id}
                onClick={() => setRankTab(t.id)}
                className={`flex-1 py-1.5 px-2 rounded-md text-[11px] font-semibold transition-all duration-200 cursor-pointer ${
                  rankTab === t.id
                    ? 'bg-bg-primary text-brand-600 shadow-sm'
                    : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Seller list */}
          <div className="space-y-0.5">
            {(vendors.isLoading || brands.isLoading || clients.isLoading) ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-2.5">
                  <SkeletonPulse className="h-5 w-5 rounded-full" />
                  <SkeletonPulse className="h-4 flex-1" />
                  <SkeletonPulse className="h-4 w-16" />
                </div>
              ))
            ) : rankData.length === 0 ? (
              <p className="text-center text-sm text-text-muted py-8">Sem dados no período</p>
            ) : (
              rankData.map((item, i) => (
                <SellerRow
                  key={i}
                  rank={i + 1}
                  name={item.nome}
                  value={item.total}
                  maxValue={rankMax}
                />
              ))
            )}
          </div>
        </div>

        {/* Pedidos Recentes */}
        <div className="lg:col-span-5 card !p-4 sm:!p-5 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Receipt size={15} className="text-brand-500" />
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">Últimos Pedidos</h3>
            </div>
            <Link to="/vendas" className="flex items-center gap-1 text-[11px] text-brand-500 hover:text-brand-600 font-semibold transition-colors">
              Ver todos <ChevronRight size={12} />
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[320px] pr-1">
            {recentes.isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex justify-between py-2.5 border-b border-divider">
                  <SkeletonPulse className="h-8 w-3/4" />
                  <SkeletonPulse className="h-4 w-16" />
                </div>
              ))
            ) : recentOrders.length === 0 ? (
              <p className="text-center text-sm text-text-muted py-8">Nenhum pedido recente</p>
            ) : (
              recentOrders.map((order: any) => (
                <RecentOrderRow key={order.id} order={order} />
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Marcas + Categorias ────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {([
          {
            title: 'Marcas Mais Vendidas',
            data: (ov.data?.top_marcas || []).slice(0, 6).map((m) => ({ nome: m.marca, total: m.total })),
            loading: ov.isLoading,
          },
          {
            title: 'Categorias Principais',
            data: (ov.data?.top_categorias || []).slice(0, 6).map((c) => ({ nome: c.categoria, total: c.total })),
            loading: ov.isLoading,
          },
        ] ).map((section) => (
          <div key={section.title} className="card !p-4 sm:!p-5">
            <div className="flex items-center gap-2 mb-4">
              <Medal size={15} className="text-amber-500" />
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">{section.title}</h3>
            </div>
            {section.loading ? (
              <SkeletonPulse className="h-40 w-full" />
            ) : section.data.length === 0 ? (
              <p className="text-center text-sm text-text-muted py-6">Sem dados no período</p>
            ) : (
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={section.data}
                    layout="vertical"
                    margin={{ left: 0, right: 48, top: 0, bottom: 0 }}
                  >
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="nome"
                      axisLine={false}
                      tickLine={false}
                      width={96}
                      tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }}
                      tickFormatter={(v: string) => (v?.length > 14 ? v.substring(0, 13) + '…' : v) || '—'}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-bg-tertiary)', opacity: 0.5 }} />
                    <Bar dataKey="total" radius={[0, 4, 4, 0]} barSize={14} label={{ position: 'right', fontSize: 9, fill: 'var(--color-text-muted)', formatter: formatBRLCompact }}>
                      {section.data.map((_: any, i: number) => (
                        <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        ))}
      </div>

    </div>
  )
}
