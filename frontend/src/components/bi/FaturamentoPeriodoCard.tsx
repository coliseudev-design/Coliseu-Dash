import { useState, useMemo } from 'react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts'
import {
  TrendingUp, BarChart3, LayoutGrid, Calendar, ArrowUpDown,
  Table2, CheckSquare, Square, Sparkles
} from 'lucide-react'
import clsx from 'clsx'
import { useApiQuery } from '../../hooks/useApi'
import { usePeriodStore, periodToParams } from '../../store/periodStore'
import { useBranchParam } from '../../contexts/BranchContext'
import { formatBRL, formatBRLCompact } from '../../utils/format'

interface FaturamentoPeriodoCardProps {
  vendedorId?: string
  marca?: string
  subtitle?: string
  className?: string
  initialViewMode?: 'grid' | 'chart' | 'split'
}

const MONTH_NAMES = [
  'JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN',
  'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'
]

const MONTH_NAMES_CAPITALIZED = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
]

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-3 rounded-xl z-50 min-w-[170px]">
        <p className="text-slate-500 dark:text-slate-400 text-xs mb-1.5 font-bold uppercase tracking-wider">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-3 text-xs font-bold text-slate-800 dark:text-white">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: entry.color || entry.fill || '#00a896' }} />
              {entry.name || 'Faturamento'}:
            </span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400">
              {typeof entry.value === 'number' ? formatBRL(entry.value) : entry.value}
            </span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

export default function FaturamentoPeriodoCard({
  vendedorId,
  marca,
  subtitle = 'Histórico consolidado do faturamento líquido no período',
  className,
  initialViewMode = 'grid'
}: FaturamentoPeriodoCardProps) {
  // Current calendar year (ex: 2026)
  const currentCalendarYear = useMemo(() => new Date().getFullYear(), [])
  const currentMonthKey = useMemo(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }, [])

  // Filtros locais do card conforme Imagens 2 e 3
  const [anoAtualChecked, setAnoAtualChecked] = useState(true)
  const [chartPeriodMode, setChartPeriodMode] = useState<'diario' | 'mensal'>('mensal')
  const [viewMode, setViewMode] = useState<'chart' | 'split' | 'grid'>(initialViewMode)
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc') // desc = atual -> mais antigo

  const branchParam = useBranchParam()
  const periodState = usePeriodStore()

  // Parametrização da query da API
  const queryParams = useMemo(() => {
    const p: Record<string, any> = {
      ...branchParam,
      vendedor_id: vendedorId && vendedorId !== 'todas' ? vendedorId : undefined,
      marca: marca && marca !== 'todas' ? marca : undefined,
    }

    if (anoAtualChecked) {
      p.period = 'year'
      p.start_date = `${currentCalendarYear}-01-01`
      p.end_date = `${currentCalendarYear}-12-31`
    } else {
      Object.assign(p, periodToParams(periodState))
    }

    return p
  }, [branchParam, vendedorId, marca, anoAtualChecked, currentCalendarYear, periodState])

  const { data: responseData, isLoading } = useApiQuery<any>('/vendas/faturadas', queryParams)

  // Dados diários brutos retornados pela API
  const rawDailyData = useMemo(() => {
    return responseData?.data || []
  }, [responseData])

  // Agrupamento mensal dos dados
  const monthlyData = useMemo(() => {
    const groups: Record<string, { total: number; quantidade: number }> = {}

    rawDailyData.forEach((d: any) => {
      if (!d.data) return
      const monthKey = d.data.substring(0, 7) // "YYYY-MM"
      if (!groups[monthKey]) {
        groups[monthKey] = { total: 0, quantidade: 0 }
      }
      groups[monthKey].total += Number(d.total || 0)
      groups[monthKey].quantidade += Number(d.quantidade || 0)
    })

    const keys = Object.keys(groups).sort()
    return keys.map((key) => {
      const [y, m] = key.split('-')
      const monthIdx = parseInt(m, 10) - 1
      const label = `${MONTH_NAMES[monthIdx]}/${y.substring(2)}`
      const shortName = `${MONTH_NAMES_CAPITALIZED[monthIdx]}/${y.substring(2)}`
      return {
        monthKey: key,
        monthNum: parseInt(m, 10),
        year: y,
        label,
        shortName,
        total: groups[key].total,
        quantidade: groups[key].quantidade
      }
    })
  }, [rawDailyData])

  // Estatísticas de Pico e Menor Mês para a análise inteligente (Imagem 3)
  const stats = useMemo(() => {
    if (!monthlyData || monthlyData.length === 0) {
      return {
        peakItem: null,
        minItem: null,
        peakValue: 1,
        itemsSorted: []
      }
    }

    let peak = monthlyData[0]
    // Considerar menor mês dentre os meses com faturamento positivo se houver, ou geral
    const validMonths = monthlyData.filter(m => m.total > 0)
    let min = validMonths.length > 0 ? validMonths[0] : monthlyData[0]

    for (const item of monthlyData) {
      if (item.total > peak.total) peak = item
    }

    for (const item of (validMonths.length > 0 ? validMonths : monthlyData)) {
      if (item.total < min.total) min = item
    }

    const peakVal = peak.total > 0 ? peak.total : 1

    const sorted = [...monthlyData].sort((a, b) => {
      return sortOrder === 'desc'
        ? b.monthKey.localeCompare(a.monthKey)
        : a.monthKey.localeCompare(b.monthKey)
    })

    return {
      peakItem: peak,
      minItem: min,
      peakValue: peakVal,
      itemsSorted: sorted
    }
  }, [monthlyData, sortOrder])

  // Dados para o Recharts (Gráfico de Barras ou Linha)
  const chartData = useMemo(() => {
    if (chartPeriodMode === 'diario') {
      return rawDailyData.map((d: any) => ({
        data: d.data?.slice(5) || d.data, // MM-DD
        fullDate: d.data,
        total: Number(d.total || 0)
      }))
    }
    // Mensal: ordenado cronologicamente Jan -> Dez
    return [...monthlyData].sort((a, b) => a.monthKey.localeCompare(b.monthKey)).map(m => ({
      data: m.shortName,
      total: m.total
    }))
  }, [chartPeriodMode, rawDailyData, monthlyData])

  return (
    <div
      aria-label="Faturamento no Período - Gráfico e Colunas de 12 Meses"
      className={clsx(
        "bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-sm transition-all duration-300",
        className
      )}
    >
      {/* ── CABEÇALHO DO CARD CONFORME MODELO (IMAGENS 2 E 3) ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="font-black text-slate-800 dark:text-white text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2">
            <TrendingUp size={18} className="text-[#00a896]" />
            FATURAMENTO NO PERÍODO
          </h3>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">
            {subtitle}
          </p>
        </div>

        {/* ── CONTROLES DO CABEÇALHO ── */}
        <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
          {/* Checkbox: ANO ATUAL (2026) */}
          <button
            type="button"
            onClick={() => setAnoAtualChecked(v => !v)}
            className={clsx(
              "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer border",
              anoAtualChecked
                ? "bg-[#00a896]/10 text-[#00a896] border-[#00a896]/30 shadow-2xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:text-slate-700 dark:hover:text-slate-300"
            )}
            title="Filtrar os 12 meses do ano atual"
          >
            {anoAtualChecked ? (
              <CheckSquare size={14} className="text-[#00a896]" />
            ) : (
              <Square size={14} className="text-slate-400" />
            )}
            <span className="uppercase text-[11px] tracking-wide">
              ANO ATUAL ({currentCalendarYear})
            </span>
          </button>

          {/* Toggle Diário / Mensal */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => setChartPeriodMode('diario')}
              className={clsx(
                "px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer",
                chartPeriodMode === 'diario'
                  ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              )}
            >
              Diário
            </button>
            <button
              type="button"
              onClick={() => setChartPeriodMode('mensal')}
              className={clsx(
                "px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer",
                chartPeriodMode === 'mensal'
                  ? "bg-[#00a896] text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              )}
            >
              Mensal
            </button>
          </div>

          {/* Alternador de Modo de Visualização (3 Modos: Gráfico, Split Tabela, Grade de Cards) */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
            {/* 1. Gráfico Puro */}
            <button
              type="button"
              onClick={() => setViewMode('chart')}
              className={clsx(
                "p-1.5 rounded-lg text-xs transition-all duration-200 cursor-pointer",
                viewMode === 'chart'
                  ? "bg-white dark:bg-slate-900 text-[#00a896] shadow-xs"
                  : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              )}
              title="Visualização em Gráfico de Barras"
            >
              <BarChart3 size={15} />
            </button>

            {/* 2. Split: Gráfico + Tabela Lateral (Imagem 2) */}
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={clsx(
                "p-1.5 rounded-lg text-xs transition-all duration-200 cursor-pointer",
                viewMode === 'split'
                  ? "bg-white dark:bg-slate-900 text-[#00a896] shadow-xs"
                  : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              )}
              title="Gráfico com Tabela Lateral (Faturamento por Mês)"
            >
              <Table2 size={15} />
            </button>

            {/* 3. Grade / Cards de 12 Meses (Imagem 3) */}
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={clsx(
                "p-1.5 rounded-lg text-xs transition-all duration-200 cursor-pointer",
                viewMode === 'grid'
                  ? "bg-white dark:bg-slate-900 text-[#00a896] shadow-xs"
                  : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              )}
              title="Visualização em Cards / Colunas (12 Meses)"
            >
              <LayoutGrid size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* ── CONTEÚDO PRINCIPAL ── */}
      {isLoading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-2 text-xs text-slate-400">
          <div className="w-6 h-6 border-2 border-[#00a896] border-t-transparent rounded-full animate-spin" />
          <span>Carregando dados de faturamento...</span>
        </div>
      ) : chartData.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-xs text-slate-400">
          <span>Sem faturamento registrado no período selecionado</span>
        </div>
      ) : (
        <>
          {/* ══════════════════════════════════════════════════════════════════════════
              VISUALIZAÇÃO 1: CARDS EM COLUNAS / GRADE DE 12 MESES (CONFORME IMAGEM 3)
             ══════════════════════════════════════════════════════════════════════════ */}
          {viewMode === 'grid' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Bloco de Insight Descritivo com borda verde lateral (Imagem 3) */}
              {stats.peakItem && (
                <div className="border-l-3 border-[#00a896] pl-3.5 py-1 text-xs text-slate-500 dark:text-slate-400 italic">
                  O faturamento mensal demonstra variação no período de consulta, registrando um pico de faturamento em{' '}
                  <strong className="font-semibold text-slate-700 dark:text-slate-200 not-italic">{stats.peakItem.label}</strong> no valor de{' '}
                  <strong className="font-semibold text-slate-700 dark:text-slate-200 not-italic">{formatBRL(stats.peakItem.total)}</strong>, e o menor faturamento em{' '}
                  <strong className="font-semibold text-slate-700 dark:text-slate-200 not-italic">{stats.minItem?.label}</strong> no valor de{' '}
                  <strong className="font-semibold text-slate-700 dark:text-slate-200 not-italic">{formatBRL(stats.minItem?.total || 0)}</strong>.
                </div>
              )}

              {/* Badge de Ordenação (clicável para alternar ordem) */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setSortOrder(o => o === 'desc' ? 'asc' : 'desc')}
                  className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Clique para alternar ordenação"
                >
                  <ArrowUpDown size={11} />
                  ORDENADO: {sortOrder === 'desc' ? 'ATUAL → MAIS ANTIGO' : 'MAIS ANTIGO → ATUAL'}
                </button>
              </div>

              {/* Grade de Cards de Meses (6 colunas em desktop, responsivo) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {stats.itemsSorted.map((item) => {
                  const isPeak = item.monthKey === stats.peakItem?.monthKey && item.total > 0
                  const isCurrent = item.monthKey === currentMonthKey
                  const pctDoPico = stats.peakValue > 0 ? Math.round((item.total / stats.peakValue) * 100) : 0

                  return (
                    <div
                      key={item.monthKey}
                      className={clsx(
                        "bg-white dark:bg-slate-800/90 border rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
                        isCurrent
                          ? "border-sky-300 dark:border-sky-700/80 shadow-xs"
                          : isPeak
                            ? "border-emerald-300 dark:border-emerald-700/80 shadow-xs"
                            : "border-slate-200/80 dark:border-slate-700/80 shadow-2xs"
                      )}
                    >
                      {/* Topo do Card: Nome do Mês + Badges */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-black text-xs text-slate-800 dark:text-white uppercase tracking-wider">
                          {item.label}
                        </span>

                        {isCurrent && (
                          <span className="bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800/80 text-[9px] font-bold px-1.5 py-0.5 rounded">
                            Atual
                          </span>
                        )}

                        {isPeak && !isCurrent && (
                          <span className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            Pico 🔥
                          </span>
                        )}
                        {isPeak && isCurrent && (
                          <span className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            Pico 🔥
                          </span>
                        )}
                      </div>

                      {/* Meio: Valor do Faturamento em R$ */}
                      <div className="my-2">
                        <div className="text-sm sm:text-base font-black text-slate-900 dark:text-white mono tracking-tight leading-snug">
                          {formatBRL(item.total)}
                        </div>
                      </div>

                      {/* Rodapé: % DO PICO + Barra de Progresso Visual */}
                      <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                        <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          <span>% DO PICO</span>
                          <span className="text-slate-600 dark:text-slate-300 font-mono">{pctDoPico}%</span>
                        </div>
                        <div className="w-full h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={clsx(
                              "h-full rounded-full transition-all duration-500",
                              isPeak ? "bg-[#00a896]" : "bg-slate-300 dark:bg-slate-600"
                            )}
                            style={{ width: `${Math.min(100, Math.max(2, pctDoPico))}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════════════
              VISUALIZAÇÃO 2: MODO SPLIT - GRÁFICO + TABELA LATERAL (CONFORME IMAGEM 2)
             ══════════════════════════════════════════════════════════════════════════ */}
          {viewMode === 'split' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
              {/* Lado Esquerdo (8 colunas): Gráfico de Barras */}
              <div className="lg:col-span-8 h-72 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.4} />
                    <XAxis
                      dataKey="data"
                      tick={{ fontSize: 10, fill: 'var(--color-text-muted)', fontWeight: 700 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: 'var(--color-text-muted)', fontWeight: 700 }}
                      tickFormatter={formatBRLCompact}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-bg-tertiary)', opacity: 0.3 }} />
                    <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={42} fill="#00a896">
                      {chartData.map((_, i) => (
                        <Cell key={`bar-${i}`} fill="#00a896" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Lado Direito (4 colunas): Tabela Lateral "FATURAMENTO POR MÊS" (Imagem 2) */}
              <div className="lg:col-span-4 bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200 dark:border-slate-700 text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
                    <Calendar size={15} className="text-[#00a896]" />
                    FATURAMENTO POR MÊS
                  </div>

                  <div className="space-y-1.5 overflow-y-auto max-h-[250px] pr-1">
                    {monthlyData.map((m) => (
                      <div
                        key={m.monthKey}
                        className="flex items-center justify-between py-1.5 px-2 rounded-lg text-xs hover:bg-white dark:hover:bg-slate-700/50 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-[10px] font-bold text-slate-400 w-4 text-center">
                            {m.monthNum}
                          </span>
                          <span className="font-bold text-slate-700 dark:text-slate-200">
                            {m.shortName}
                          </span>
                        </div>
                        <span className="font-extrabold mono text-slate-800 dark:text-white">
                          {formatBRL(m.total)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {stats.peakItem && (
                  <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-bold uppercase">Mês de Pico</span>
                    <span className="font-black text-[#00a896] mono">{stats.peakItem.label} ({formatBRLCompact(stats.peakItem.total)})</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════════════
              VISUALIZAÇÃO 3: GRÁFICO PURINHO FULL-WIDTH
             ══════════════════════════════════════════════════════════════════════════ */}
          {viewMode === 'chart' && (
            <div className="h-72 sm:h-80 w-full animate-in fade-in duration-200">
              <ResponsiveContainer width="100%" height="100%">
                {chartPeriodMode === 'diario' && chartData.length > 25 ? (
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.4} />
                    <XAxis
                      dataKey="data"
                      tick={{ fontSize: 10, fill: 'var(--color-text-muted)', fontWeight: 700 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: 'var(--color-text-muted)', fontWeight: 700 }}
                      tickFormatter={formatBRLCompact}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="#00a896"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 5, fill: '#00a896' }}
                    />
                  </LineChart>
                ) : (
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.4} />
                    <XAxis
                      dataKey="data"
                      tick={{ fontSize: 10, fill: 'var(--color-text-muted)', fontWeight: 700 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: 'var(--color-text-muted)', fontWeight: 700 }}
                      tickFormatter={formatBRLCompact}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-bg-tertiary)', opacity: 0.3 }} />
                    <Bar dataKey="total" radius={[5, 5, 0, 0]} maxBarSize={48} fill="#00a896">
                      {chartData.map((_, i) => (
                        <Cell key={`bar-${i}`} fill="#00a896" />
                      ))}
                    </Bar>
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  )
}
