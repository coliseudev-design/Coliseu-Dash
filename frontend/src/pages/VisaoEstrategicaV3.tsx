import { useState, useEffect, useMemo } from 'react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell
} from 'recharts'
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingBag, 
  Users, Award, MapPin, Trophy, ChevronDown, LayoutDashboard,
  Tag, Package, Calendar, RotateCcw, Target, BarChart3, LineChart as LineChartIcon,
  CheckCircle2, Sparkles, SlidersHorizontal
} from 'lucide-react'
import { useBranchPeriodQuery, useApiQuery } from '../hooks/useApi'
import { useAuthStore } from '../store/authStore'
import PeriodFilter from '../components/PeriodFilter'
import { PageFilters } from '../components/PageFilters'
import { usePeriodStore } from '../store/periodStore'
import { useBranch } from '../contexts/BranchContext'
import { formatBRL, formatBRLCompact, formatNum } from '../utils/format'
import clsx from 'clsx'

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-bg-primary border border-border shadow-card-hover p-3 rounded-xl z-50 min-w-[160px]">
        <p className="text-text-secondary text-xs mb-1.5 font-bold uppercase tracking-wider">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-3 text-xs font-bold text-text-primary">
            <span style={{ color: entry.color || entry.fill }}>{entry.name || 'Valor'}:</span>
            <span className="font-mono">
              {typeof entry.value === 'number' && entry.value > 100
                ? formatBRL(entry.value)
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

interface RankingCardProps {
  title: string
  data: { name: string; value: number }[]
  isLoading: boolean
  total: number
  icon: React.ElementType
  colorClass: string
  badgeBg: string
}

function RankingCardWithToggle({
  title,
  data,
  isLoading,
  total,
  icon: Icon,
  colorClass,
  badgeBg
}: RankingCardProps) {
  const [viewType, setViewType] = useState<'list' | 'chart'>('list')

  return (
    <div className="bg-bg-primary border border-border shadow-card rounded-2xl p-5 flex flex-col h-full animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-4 border-b border-divider/40 pb-3">
        <h3 className="font-black text-text-primary text-xs uppercase tracking-wider flex items-center gap-2">
          <div className={clsx("p-1.5 rounded-lg", badgeBg, colorClass)}>
            <Icon size={14} />
          </div>
          {title}
        </h3>
        
        {/* Toggle Gráfico / Lista */}
        <button
          type="button"
          onClick={() => setViewType(v => v === 'list' ? 'chart' : 'list')}
          className="text-[11px] font-bold text-text-secondary hover:text-text-primary px-2.5 py-1 bg-bg-secondary hover:bg-bg-tertiary border border-border rounded-lg transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
        >
          {viewType === 'list' ? (
            <>
              <BarChart3 size={13} className="text-brand-500" /> Gráfico
            </>
          ) : (
            <>
              <SlidersHorizontal size={13} className="text-brand-500" /> Lista
            </>
          )}
        </button>
      </div>

      <div className="flex-1 min-h-[260px] flex flex-col justify-center">
        {isLoading ? (
          <div className="h-48 flex items-center justify-center text-xs text-text-secondary">Carregando dados...</div>
        ) : data.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-xs text-text-secondary">Sem dados registrados</div>
        ) : viewType === 'list' ? (
          <div className="space-y-1.5 overflow-y-auto max-h-[280px] pr-1">
            {data.slice(0, 10).map((item, i) => {
              const pct = total > 0 ? (item.value / total) * 100 : 0
              return (
                <div key={i} className="flex items-center justify-between p-2 hover:bg-bg-secondary/60 rounded-xl transition-all duration-200 border border-transparent hover:border-divider/30">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-6 shrink-0 flex items-center justify-center">
                      <span className={clsx(
                        "text-xs font-black font-mono",
                        i === 0 ? "text-amber-500" : i === 1 ? "text-slate-400" : i === 2 ? "text-amber-700" : "text-text-muted"
                      )}>
                        #{i + 1}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-text-primary uppercase truncate max-w-[160px] sm:max-w-[200px]" title={item.name}>
                      {item.name}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-black text-text-primary font-mono">{formatBRL(item.value)}</div>
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">{pct.toFixed(1)}% share</div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="h-[260px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.slice(0, 8)} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" opacity={0.4} />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tickFormatter={(v) => String(v).length > 10 ? String(v).substring(0, 10) + '...' : v}
                  tick={{ fontSize: 10, fill: 'var(--color-text-primary)', fontWeight: 600 }} 
                  width={75} 
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-bg-tertiary)', opacity: 0.3 }} />
                <Bar dataKey="value" name="Total" fill="#3B82F6" radius={[0, 4, 4, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}

export default function VisaoEstrategicaV3() {
  const user = useAuthStore((s) => s.user)
  
  // Modos de visualização do Card "Resultados de Vendas"
  const [compareMode, setCompareMode] = useState<'mes_anterior' | 'mesmo_mes_ano_ant' | 'ano_acumulado'>('ano_acumulado')
  const [viewMetric, setViewMetric] = useState<'faturamento' | 'metas'>('faturamento')

  // Filtros locais Vendedor/Marca
  const [selectedVendedor, setSelectedVendedor] = useState('todas')
  const [selectedMarca, setSelectedMarca] = useState('todas')

  // Toggle do gráfico inferior: Período Diário/Mensal e Formato Barras/Linha
  const [chartPeriodMode, setChartPeriodMode] = useState<'diario' | 'mensal'>('mensal')
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar')

  // Consultas da API
  const { filiais, selectedBranch } = useBranch()

  const params = useMemo(() => ({
    vendedor_id: selectedVendedor !== 'todas' ? selectedVendedor : undefined,
    marca: selectedMarca !== 'todas' ? selectedMarca : undefined,
    compare_mode: compareMode
  }), [selectedVendedor, selectedMarca, compareMode])

  const visaoQuery = useBranchPeriodQuery<any>('/estatisticas/visao-estrategica', params)
  const fatMes = useBranchPeriodQuery<any>('/vendas/faturadas', {
    vendedor_id: selectedVendedor !== 'todas' ? selectedVendedor : undefined
  })
  const vd = useBranchPeriodQuery<any>('/ranking/vendedores', { limit: 100, marca: selectedMarca !== 'todas' ? selectedMarca : undefined })
  const prod = useBranchPeriodQuery<any>('/ranking/produtos', { limit: 100, marca: selectedMarca !== 'todas' ? selectedMarca : undefined, vendedor_id: selectedVendedor !== 'todas' ? selectedVendedor : undefined })
  const cli = useBranchPeriodQuery<any>('/ranking/clientes', { limit: 100, marca: selectedMarca !== 'todas' ? selectedMarca : undefined, vendedor_id: selectedVendedor !== 'todas' ? selectedVendedor : undefined })
  const marcas = useBranchPeriodQuery<any>('/ranking/marcas', { limit: 100, vendedor_id: selectedVendedor !== 'todas' ? selectedVendedor : undefined })
  const cidades = useBranchPeriodQuery<any>('/ranking/cidades', { limit: 100, marca: selectedMarca !== 'todas' ? selectedMarca : undefined, vendedor_id: selectedVendedor !== 'todas' ? selectedVendedor : undefined })
  const categorias = useBranchPeriodQuery<any>('/ranking/categorias', { limit: 100, marca: selectedMarca !== 'todas' ? selectedMarca : undefined, vendedor_id: selectedVendedor !== 'todas' ? selectedVendedor : undefined })

  const data = visaoQuery.data || {}
  const currentYear = data?.years?.current || 2026
  const prevYear = data?.years?.prev || 2025

  // Cálculos do Card Resultados de Vendas
  const faturamentoAtual = data?.faturamento_atual || 0
  const ytdAtual = data?.ytd_atual || 0
  const ytdAnterior = data?.ytd_anterior || 0
  const crescYtd = data?.cresc_ytd || 0
  const totalAnoAnterior12m = data?.total_ano_anterior_12m || 0
  const superacaoValor = data?.superacao_valor || 0
  const superacaoPct = data?.superacao_pct || 0

  const faturamentoMesAnterior = data?.faturamento_mes_anterior || 0
  const crescMesAnterior = data?.cresc_mes_anterior || 0

  const faturamentoMesmoMesAnoAnt = data?.faturamento_mesmo_mes_ano_ant || 0
  const crescMesmoMesAnoAnt = data?.cresc_mesmo_mes_ano_ant || 0

  const qtdPedidos = data?.qtd_pedidos || 0
  const ticketMedio = data?.ticket_medio || 0
  const taxaRecompra = data?.taxa_recompra || 0
  const clientesComCompra = data?.clientes_com_compra || 0
  const totalClientesBase = data?.total_clientes_base || 0

  // Highlights
  const melhorVendedor = data?.highlights?.melhor_vendedor || { nome: '-', total: 0, pct_share: 0 }
  const melhorCliente = data?.highlights?.melhor_cliente || { nome: '-', total: 0, pct_share: 0 }
  const marcaMaisVendida = data?.highlights?.marca_mais_vendida || { nome: '-', total: 0, pct_share: 0 }
  const cidadeDestaque = data?.highlights?.cidade_destaque || { nome: '-', total: 0, pct_share: 0 }

  // Rankings
  const mockTopSellers = useMemo(() => {
    return vd.data?.data?.map((s: any) => ({ name: s.nome || s.vendedor, value: s.total || s.total_vendas })) || []
  }, [vd.data])

  const mockTopBrands = useMemo(() => {
    return marcas.data?.data?.map((m: any) => ({ name: m.nome || m.marca, value: m.total })) || []
  }, [marcas.data])

  const mockTopCategories = useMemo(() => {
    return categorias.data?.data?.map((c: any) => ({ name: c.nome || c.categoria, value: c.total })) || []
  }, [categorias.data])

  const mockTopCities = useMemo(() => {
    return cidades.data?.data?.map((c: any) => ({ name: c.nome || c.cidade, value: c.total })) || []
  }, [cidades.data])

  const mockTopClients = useMemo(() => {
    return cli.data?.data?.map((c: any) => ({ name: c.nome || c.cliente, value: c.total })) || []
  }, [cli.data])

  const faturamentoPeriodoData = useMemo(() => {
    if (fatMes.data?.data && fatMes.data.data.length > 0) {
      return fatMes.data.data
    }
    return [
      { data: 'Jan', total: 156000 },
      { data: 'Fev', total: 142000 },
      { data: 'Mar', total: 180000 },
      { data: 'Abr', total: 175000 },
      { data: 'Mai', total: 198000 },
      { data: 'Jun', total: 210000 },
      { data: 'Jul', total: 223838 },
      { data: 'Ago', total: 240116 },
      { data: 'Set', total: 310500 },
    ]
  }, [fatMes.data])

  const barColors = [
    '#3B82F6', '#10B981', '#06B6D4', '#F59E0B', '#EF4444', 
    '#0D9488', '#EC4899', '#6366F1', '#14B8A6', '#F97316'
  ]

  return (
    <div className="space-y-4 pb-8 animate-in fade-in duration-300" aria-label="Visão Estratégica">
      
      {/* 1. HEADER EXECUTIVO COM FILTROS DE PERÍODO */}
      <div className="bg-bg-primary border border-border rounded-2xl p-5 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 shadow-sm">
            <LayoutDashboard size={24} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight">VISÃO ESTRATÉGICA</h1>
            <p className="text-xs text-text-secondary font-medium">Visão geral executiva da empresa, vendas acumuladas e clientes</p>
          </div>
        </div>

        {/* Period Filter (MÊS ATUAL, MÊS ANTERIOR, 12 MESES, PERSONALIZADO) */}
        <div className="flex items-center">
          <PeriodFilter excludePeriods={['today', 'yesterday', 'last7']} />
        </div>
      </div>

      {/* 2. BARRA DE FILTROS SECUNDÁRIOS: VENDEDOR & MARCA */}
      <div className="bg-bg-primary border border-border rounded-2xl p-4 shadow-card grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Vendedor */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-text-secondary uppercase tracking-wider block">
            Vendedor
          </label>
          <div className="relative">
            <select
              value={selectedVendedor}
              onChange={(e) => setSelectedVendedor(e.target.value)}
              className="w-full bg-bg-secondary hover:bg-bg-tertiary border border-border rounded-xl px-3.5 py-2 text-xs font-bold text-text-primary outline-none cursor-pointer focus:border-brand-500 transition-all appearance-none pr-8"
            >
              <option value="todas">Todos os Vendedores</option>
              {vd.data?.data?.map((v: any) => (
                <option key={v.id || v.nome} value={v.nome}>{v.nome}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
          </div>
        </div>

        {/* Marca */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-text-secondary uppercase tracking-wider block">
            Marca
          </label>
          <div className="relative">
            <select
              value={selectedMarca}
              onChange={(e) => setSelectedMarca(e.target.value)}
              className="w-full bg-bg-secondary hover:bg-bg-tertiary border border-border rounded-xl px-3.5 py-2 text-xs font-bold text-text-primary outline-none cursor-pointer focus:border-brand-500 transition-all appearance-none pr-8"
            >
              <option value="todas">Todas as Marcas</option>
              {marcas.data?.data?.map((m: any) => (
                <option key={m.marca || m.nome} value={m.marca || m.nome}>{m.marca || m.nome}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
          </div>
        </div>
      </div>

      {/* 3. CARD PRINCIPAL: RESULTADOS DE VENDAS */}
      <div className="bg-bg-primary rounded-2xl border border-border shadow-card p-6 relative overflow-hidden flex flex-col gap-6">
        <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>

        {/* Top Header Controls inside Card */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-divider/40 pb-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={20} className="text-emerald-500" />
            <h2 className="text-sm sm:text-base font-black text-text-primary uppercase tracking-wider">
              Resultados de Vendas
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Comparativo Toggle Buttons */}
            <div className="flex items-center bg-bg-secondary p-1 rounded-xl border border-divider">
              <button
                type="button"
                onClick={() => setCompareMode('mes_anterior')}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5",
                  compareMode === 'mes_anterior'
                    ? "bg-bg-primary text-text-primary shadow-xs border border-border"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                <Calendar size={13} className="text-blue-500" /> Mês Anterior
              </button>

              <button
                type="button"
                onClick={() => setCompareMode('mesmo_mes_ano_ant')}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5",
                  compareMode === 'mesmo_mes_ano_ant'
                    ? "bg-bg-primary text-text-primary shadow-xs border border-border"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                <RotateCcw size={13} className="text-teal-500" /> Mesmo Mês Ano Ant.
              </button>

              <button
                type="button"
                onClick={() => setCompareMode('ano_acumulado')}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5",
                  compareMode === 'ano_acumulado'
                    ? "bg-brand-500 text-white shadow-xs"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                <TrendingUp size={13} /> Ano Acumulado
              </button>
            </div>

            {/* View Mode: Faturamento / Metas */}
            <div className="flex items-center bg-bg-secondary p-1 rounded-xl border border-divider">
              <button
                type="button"
                onClick={() => setViewMetric('faturamento')}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5",
                  viewMetric === 'faturamento'
                    ? "bg-bg-primary text-text-primary shadow-xs border border-border"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                <DollarSign size={13} className="text-emerald-500" /> Faturamento
              </button>

              <button
                type="button"
                onClick={() => setViewMetric('metas')}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5",
                  viewMetric === 'metas'
                    ? "bg-bg-primary text-text-primary shadow-xs border border-border"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                <Target size={13} className="text-amber-500" /> Metas
              </button>
            </div>
          </div>
        </div>

        {/* Card Body: ANO ACUMULADO */}
        {compareMode === 'ano_acumulado' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-6">
              {/* Left: Faturamento Acumulado Ano Atual */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                  <TrendingUp size={28} />
                </div>
                <div>
                  <span className="text-[11px] font-black text-text-secondary uppercase tracking-wider block">
                    Faturamento Acumulado ({currentYear})
                  </span>
                  <div className="text-2xl sm:text-3xl font-black text-text-primary font-mono tracking-tight my-0.5">
                    {formatBRL(ytdAtual)}
                  </div>
                  <span className="text-[11px] text-text-muted font-semibold block">
                    {data?.corte_label_atual || `01/Jan até ${data?.periodo_atual_label || 'Setembro / 2026'}`}
                  </span>
                </div>
              </div>

              {/* Center: Growth Circle Badge */}
              <div className="flex flex-col items-center justify-center">
                <div className={clsx(
                  "w-20 h-20 rounded-full flex flex-col items-center justify-center border-4 font-black shadow-md transition-transform hover:scale-105",
                  crescYtd >= 0
                    ? "bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400"
                    : "bg-rose-500/10 border-rose-500 text-rose-600 dark:text-rose-400"
                )}>
                  {crescYtd >= 0 ? <TrendingUp size={20} className="mb-0.5" /> : <TrendingDown size={20} className="mb-0.5" />}
                  <span className="text-sm font-extrabold">{crescYtd >= 0 ? '+' : ''}{crescYtd.toFixed(1)}%</span>
                </div>
                <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest mt-2 text-center">
                  {crescYtd >= 0 ? 'Crescimento Acumulado (YTD)' : 'Queda Acumulada (YTD)'}
                </span>
              </div>

              {/* Right: Acumulado Ano Anterior */}
              <div className="flex items-center gap-4 md:justify-end text-left md:text-right">
                <div className="order-2 md:order-1">
                  <span className="text-[11px] font-black text-text-secondary uppercase tracking-wider block">
                    Acumulado Ano Anterior ({prevYear})
                  </span>
                  <div className="text-2xl sm:text-3xl font-black text-text-primary/80 font-mono tracking-tight my-0.5">
                    {formatBRL(ytdAnterior)}
                  </div>
                  <span className="text-[11px] text-text-muted font-semibold block">
                    {data?.corte_label_anterior || `01/Jan a corte de ${prevYear}`}
                  </span>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-border text-amber-500 flex items-center justify-center shrink-0 order-1 md:order-2">
                  <Award size={28} />
                </div>
              </div>
            </div>

            {/* Bottom Banner: META DE SUPERAÇÃO DO ANO FECHADO */}
            <div className="bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/25 rounded-2xl p-4.5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xs">
              <div className="flex items-center gap-3.5">
                <div className="p-2.5 bg-emerald-500 text-white rounded-xl shadow-xs">
                  <Award size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-black text-text-primary text-xs sm:text-sm uppercase tracking-wider">
                      Meta de Superação do Ano Fechado ({prevYear})
                    </h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                      {superacaoPct.toFixed(1)}% atingido
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5 font-medium">
                    Faturamento total de {prevYear} (12 meses): <strong>{formatBRL(totalAnoAnterior12m)}</strong>
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="text-[10px] font-black text-text-secondary uppercase tracking-widest">
                  {superacaoValor >= 0 ? 'Superação Conquistada' : 'Falta para Superar'}
                </div>
                <div className={clsx(
                  "text-xl sm:text-2xl font-black font-mono mt-0.5",
                  superacaoValor >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                )}>
                  {superacaoValor >= 0 ? '+' : ''}{formatBRL(superacaoValor)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Card Body: MÊS ANTERIOR */}
        {compareMode === 'mes_anterior' && (
          <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                <DollarSign size={28} />
              </div>
              <div>
                <span className="text-[11px] font-black text-text-secondary uppercase tracking-wider block">
                  Faturamento Mês Atual
                </span>
                <div className="text-2xl sm:text-3xl font-black text-text-primary font-mono tracking-tight my-0.5">
                  {formatBRL(faturamentoAtual)}
                </div>
                <span className="text-[11px] text-text-muted font-semibold block">
                  {data?.periodo_atual_label || 'Setembro / 2026'}
                </span>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center">
              <div className={clsx(
                "w-20 h-20 rounded-full flex flex-col items-center justify-center border-4 font-black shadow-md",
                crescMesAnterior >= 0
                  ? "bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400"
                  : "bg-rose-500/10 border-rose-500 text-rose-600 dark:text-rose-400"
              )}>
                {crescMesAnterior >= 0 ? <TrendingUp size={20} className="mb-0.5" /> : <TrendingDown size={20} className="mb-0.5" />}
                <span className="text-sm font-extrabold">{crescMesAnterior >= 0 ? '+' : ''}{crescMesAnterior.toFixed(1)}%</span>
              </div>
              <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest mt-2 text-center">
                {crescMesAnterior >= 0 ? 'Crescimento vs. Mês Anterior' : 'Queda vs. Mês Anterior'}
              </span>
            </div>

            <div className="flex items-center gap-4 md:justify-end text-left md:text-right">
              <div className="order-2 md:order-1">
                <span className="text-[11px] font-black text-text-secondary uppercase tracking-wider block">
                  Faturamento Mês Anterior
                </span>
                <div className="text-2xl sm:text-3xl font-black text-text-primary/80 font-mono tracking-tight my-0.5">
                  {formatBRL(faturamentoMesAnterior)}
                </div>
                <span className="text-[11px] text-text-muted font-semibold block">
                  {data?.periodo_anterior_label || 'Agosto / 2026'}
                </span>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-border text-text-secondary flex items-center justify-center shrink-0 order-1 md:order-2">
                <BarChart3 size={28} />
              </div>
            </div>
          </div>
        )}

        {/* Card Body: MESMO MÊS ANO ANTERIOR */}
        {compareMode === 'mesmo_mes_ano_ant' && (
          <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-500 flex items-center justify-center shrink-0">
                <DollarSign size={28} />
              </div>
              <div>
                <span className="text-[11px] font-black text-text-secondary uppercase tracking-wider block">
                  Faturamento Mês Atual ({currentYear})
                </span>
                <div className="text-2xl sm:text-3xl font-black text-text-primary font-mono tracking-tight my-0.5">
                  {formatBRL(faturamentoAtual)}
                </div>
                <span className="text-[11px] text-text-muted font-semibold block">
                  {data?.periodo_atual_label || `Mês de ${currentYear}`}
                </span>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center">
              <div className={clsx(
                "w-20 h-20 rounded-full flex flex-col items-center justify-center border-4 font-black shadow-md",
                crescMesmoMesAnoAnt >= 0
                  ? "bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400"
                  : "bg-rose-500/10 border-rose-500 text-rose-600 dark:text-rose-400"
              )}>
                {crescMesmoMesAnoAnt >= 0 ? <TrendingUp size={20} className="mb-0.5" /> : <TrendingDown size={20} className="mb-0.5" />}
                <span className="text-sm font-extrabold">{crescMesmoMesAnoAnt >= 0 ? '+' : ''}{crescMesmoMesAnoAnt.toFixed(1)}%</span>
              </div>
              <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest mt-2 text-center">
                {crescMesmoMesAnoAnt >= 0 ? `Crescimento vs. Mesmo Mês (${prevYear})` : `Queda vs. Mesmo Mês (${prevYear})`}
              </span>
            </div>

            <div className="flex items-center gap-4 md:justify-end text-left md:text-right">
              <div className="order-2 md:order-1">
                <span className="text-[11px] font-black text-text-secondary uppercase tracking-wider block">
                  Mesmo Mês Ano Anterior ({prevYear})
                </span>
                <div className="text-2xl sm:text-3xl font-black text-text-primary/80 font-mono tracking-tight my-0.5">
                  {formatBRL(faturamentoMesmoMesAnoAnt)}
                </div>
                <span className="text-[11px] text-text-muted font-semibold block">
                  {data?.periodo_mesmo_mes_ano_ant_label || `Mês de ${prevYear}`}
                </span>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-border text-teal-500 flex items-center justify-center shrink-0 order-1 md:order-2">
                <RotateCcw size={28} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. 4 HIGHLIGHT CARDS (MELHOR VENDEDOR, MELHOR CLIENTE, MARCA MAIS VENDIDA, CIDADE DESTAQUE) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Melhor Vendedor */}
        <div className="bg-bg-primary rounded-2xl p-4.5 border border-border shadow-card flex items-start justify-between relative hover:border-amber-500/40 transition-all group">
          <div className="space-y-1 min-w-0 flex-1">
            <span className="text-[10px] font-black text-text-secondary uppercase tracking-wider block">
              Melhor Vendedor
            </span>
            <div className="font-black text-xs sm:text-sm text-amber-600 dark:text-amber-400 truncate uppercase" title={melhorVendedor.nome}>
              {melhorVendedor.nome}
            </div>
            <div className="text-lg font-black text-text-primary font-mono mt-1">
              {formatBRL(melhorVendedor.total)}
            </div>
            <div className="text-[10px] text-text-muted font-semibold">
              {melhorVendedor.pct_share.toFixed(1)}% do faturamento total
            </div>
          </div>
          <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-xl shrink-0 group-hover:scale-110 transition-transform">
            <Trophy size={20} />
          </div>
        </div>

        {/* Melhor Cliente */}
        <div className="bg-bg-primary rounded-2xl p-4.5 border border-border shadow-card flex items-start justify-between relative hover:border-rose-500/40 transition-all group">
          <div className="space-y-1 min-w-0 flex-1">
            <span className="text-[10px] font-black text-text-secondary uppercase tracking-wider block">
              Melhor Cliente
            </span>
            <div className="font-black text-xs sm:text-sm text-rose-600 dark:text-rose-400 truncate uppercase" title={melhorCliente.nome}>
              {melhorCliente.nome}
            </div>
            <div className="text-lg font-black text-text-primary font-mono mt-1">
              {formatBRL(melhorCliente.total)}
            </div>
            <div className="text-[10px] text-text-muted font-semibold">
              {melhorCliente.pct_share.toFixed(1)}% do faturamento
            </div>
          </div>
          <div className="p-2.5 bg-rose-500/10 text-rose-500 rounded-xl shrink-0 group-hover:scale-110 transition-transform">
            <Users size={20} />
          </div>
        </div>

        {/* Marca Mais Vendida */}
        <div className="bg-bg-primary rounded-2xl p-4.5 border border-border shadow-card flex items-start justify-between relative hover:border-cyan-500/40 transition-all group">
          <div className="space-y-1 min-w-0 flex-1">
            <span className="text-[10px] font-black text-text-secondary uppercase tracking-wider block">
              Marca Mais Vendida
            </span>
            <div className="font-black text-xs sm:text-sm text-cyan-600 dark:text-cyan-400 truncate uppercase" title={marcaMaisVendida.nome}>
              {marcaMaisVendida.nome}
            </div>
            <div className="text-lg font-black text-text-primary font-mono mt-1">
              {formatBRL(marcaMaisVendida.total)}
            </div>
            <div className="text-[10px] text-text-muted font-semibold">
              Marca líder em faturamento
            </div>
          </div>
          <div className="p-2.5 bg-cyan-500/10 text-cyan-500 rounded-xl shrink-0 group-hover:scale-110 transition-transform">
            <Tag size={20} />
          </div>
        </div>

        {/* Cidade Destaque */}
        <div className="bg-bg-primary rounded-2xl p-4.5 border border-border shadow-card flex items-start justify-between relative hover:border-emerald-500/40 transition-all group">
          <div className="space-y-1 min-w-0 flex-1">
            <span className="text-[10px] font-black text-text-secondary uppercase tracking-wider block">
              Cidade Destaque
            </span>
            <div className="font-black text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 truncate uppercase" title={cidadeDestaque.nome}>
              {cidadeDestaque.nome}
            </div>
            <div className="text-lg font-black text-text-primary font-mono mt-1">
              {formatBRL(cidadeDestaque.total)}
            </div>
            <div className="text-[10px] text-text-muted font-semibold">
              Cidade líder em faturamento
            </div>
          </div>
          <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl shrink-0 group-hover:scale-110 transition-transform">
            <MapPin size={20} />
          </div>
        </div>
      </div>

      {/* 5. 4 SECONDARY KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Quantidade de Pedidos */}
        <div className="bg-bg-primary rounded-2xl p-4.5 border border-border shadow-card flex flex-col justify-between hover:border-divider transition-all">
          <div className="flex items-center gap-2 text-[10px] font-black text-text-secondary uppercase tracking-wider mb-2">
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500"><ShoppingBag size={14} /></div>
            Quantidade de Pedidos
          </div>
          <div className="text-2xl font-black text-text-primary font-mono mb-1">{formatNum(qtdPedidos)}</div>
          <div className="text-[10px] text-text-muted font-semibold">Total de pedidos no período</div>
        </div>

        {/* Ticket Médio */}
        <div className="bg-bg-primary rounded-2xl p-4.5 border border-border shadow-card flex flex-col justify-between hover:border-divider transition-all">
          <div className="flex items-center gap-2 text-[10px] font-black text-text-secondary uppercase tracking-wider mb-2">
            <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-500"><DollarSign size={14} /></div>
            Ticket Médio
          </div>
          <div className="text-2xl font-black text-text-primary font-mono mb-1">{formatBRL(ticketMedio)}</div>
          <div className="text-[10px] text-text-muted font-semibold">Média por venda feita</div>
        </div>

        {/* Taxa de Recompra */}
        <div className="bg-bg-primary rounded-2xl p-4.5 border border-border shadow-card flex flex-col justify-between hover:border-divider transition-all">
          <div className="flex items-center gap-2 text-[10px] font-black text-text-secondary uppercase tracking-wider mb-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500"><TrendingUp size={14} /></div>
            Taxa de Recompra
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono mb-1">{taxaRecompra.toFixed(1)}%</div>
          <div className="text-[10px] text-text-muted font-semibold">Retenção de clientes na base</div>
        </div>

        {/* Clientes com Compra */}
        <div className="bg-bg-primary rounded-2xl p-4.5 border border-border shadow-card flex flex-col justify-between hover:border-divider transition-all">
          <div className="flex items-center gap-2 text-[10px] font-black text-text-secondary uppercase tracking-wider mb-2">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-500"><Users size={14} /></div>
            Clientes com Compra
          </div>
          <div className="text-2xl font-black text-text-primary font-mono mb-1">
            {clientesComCompra} <span className="text-xs font-normal text-text-muted font-sans">de {totalClientesBase || '850'}</span>
          </div>
          <div className="text-[10px] text-text-muted font-semibold">Compraram no período</div>
        </div>
      </div>

      {/* 6. GRID ROW: DESEMPENHO DOS VENDEDORES (GRÁFICO) + TOP VENDEDORES (RANKING) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Gráfico Desempenho dos Vendedores */}
        <div className="bg-bg-primary border border-border shadow-card rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4 border-b border-divider/40 pb-3">
            <h3 className="font-black text-text-primary text-xs uppercase tracking-wider flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500"><Trophy size={14} /></div>
              Desempenho dos Vendedores (Gráfico)
            </h3>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockTopSellers.slice(0, 8)} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" opacity={0.4} />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tickFormatter={(v) => String(v).length > 14 ? String(v).substring(0, 14) + '...' : v}
                  tick={{ fontSize: 10, fill: 'var(--color-text-primary)', fontWeight: 700 }} 
                  width={90} 
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-bg-tertiary)', opacity: 0.3 }} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={22}>
                  {mockTopSellers.slice(0, 8).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={barColors[index % barColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Vendedores Ranking */}
        <div className="bg-bg-primary border border-border shadow-card rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4 border-b border-divider/40 pb-3">
            <h3 className="font-black text-text-primary text-xs uppercase tracking-wider flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500"><Award size={14} /></div>
              Top Vendedores (Ranking)
            </h3>
          </div>
          <div className="space-y-1.5 overflow-y-auto max-h-[280px] pr-1">
            {vd.isLoading ? (
              <div className="h-48 flex items-center justify-center text-xs text-text-secondary">Carregando vendedores...</div>
            ) : mockTopSellers.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-xs text-text-secondary">Nenhum vendedor encontrado</div>
            ) : (
              mockTopSellers.slice(0, 10).map((v, i) => {
                const pct = faturamentoAtual > 0 ? (v.value / faturamentoAtual) * 100 : 0
                return (
                  <div key={i} className="flex items-center justify-between p-2 hover:bg-bg-secondary/60 rounded-xl transition-all duration-200 border border-transparent hover:border-divider/30">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-6 shrink-0 flex items-center justify-center">
                        <span className={clsx(
                          "text-xs font-black font-mono",
                          i === 0 ? "text-amber-500" : i === 1 ? "text-slate-400" : i === 2 ? "text-amber-700" : "text-text-muted"
                        )}>
                          #{i + 1}
                        </span>
                      </div>
                      <div className="text-xs font-black text-text-primary uppercase truncate max-w-[160px] sm:max-w-[200px]" title={v.name}>
                        {v.name}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-black text-text-primary font-mono">{formatBRL(v.value)}</div>
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">{pct.toFixed(1)}% share</div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* 7. GRID 2X2: TOP 10 MARCAS, TOP 10 GRUPOS, TOP 10 CIDADES, TOP 10 CLIENTES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top 10 Marcas */}
        <RankingCardWithToggle
          title="Top 10 Marcas"
          data={mockTopBrands}
          isLoading={marcas.isLoading}
          total={faturamentoAtual}
          icon={Tag}
          colorClass="text-cyan-500"
          badgeBg="bg-cyan-500/10"
        />

        {/* Top 10 Grupos */}
        <RankingCardWithToggle
          title="Top 10 Grupos"
          data={mockTopCategories}
          isLoading={categorias.isLoading}
          total={faturamentoAtual}
          icon={Package}
          colorClass="text-teal-500"
          badgeBg="bg-teal-500/10"
        />

        {/* Top 10 Cidades */}
        <RankingCardWithToggle
          title="Top 10 Cidades"
          data={mockTopCities}
          isLoading={cidades.isLoading}
          total={faturamentoAtual}
          icon={MapPin}
          colorClass="text-emerald-500"
          badgeBg="bg-emerald-500/10"
        />

        {/* Top 10 Clientes */}
        <RankingCardWithToggle
          title="Top 10 Clientes"
          data={mockTopClients}
          isLoading={cli.isLoading}
          total={faturamentoAtual}
          icon={Users}
          colorClass="text-rose-500"
          badgeBg="bg-rose-500/10"
        />
      </div>

      {/* 8. GRÁFICO INFERIOR: FATURAMENTO NO PERÍODO */}
      <div className="bg-bg-primary border border-border shadow-card rounded-2xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 border-b border-divider/40 pb-4">
          <div>
            <h3 className="font-black text-text-primary text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2">
              <TrendingUp size={16} className="text-emerald-500" /> Faturamento no Período
            </h3>
            <p className="text-[11px] text-text-muted mt-0.5">Evolução do faturamento das vendas faturadas</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Toggle Diário / Mensal */}
            <div className="flex items-center bg-bg-secondary p-1 rounded-xl border border-divider">
              <button
                type="button"
                onClick={() => setChartPeriodMode('diario')}
                className={clsx(
                  "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  chartPeriodMode === 'diario'
                    ? "bg-bg-primary text-text-primary shadow-xs border border-border"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                Diário
              </button>
              <button
                type="button"
                onClick={() => setChartPeriodMode('mensal')}
                className={clsx(
                  "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  chartPeriodMode === 'mensal'
                    ? "bg-brand-500 text-white shadow-xs"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                Mensal
              </button>
            </div>

            {/* Toggle Bar / Line */}
            <div className="flex items-center bg-bg-secondary p-1 rounded-xl border border-divider">
              <button
                type="button"
                onClick={() => setChartType('bar')}
                className={clsx(
                  "p-1.5 rounded-lg text-xs transition-all cursor-pointer",
                  chartType === 'bar'
                    ? "bg-bg-primary text-text-primary shadow-xs border border-border"
                    : "text-text-secondary hover:text-text-primary"
                )}
                title="Gráfico de Barras"
              >
                <BarChart3 size={14} />
              </button>
              <button
                type="button"
                onClick={() => setChartType('line')}
                className={clsx(
                  "p-1.5 rounded-lg text-xs transition-all cursor-pointer",
                  chartType === 'line'
                    ? "bg-bg-primary text-text-primary shadow-xs border border-border"
                    : "text-text-secondary hover:text-text-primary"
                )}
                title="Gráfico de Linha"
              >
                <LineChartIcon size={14} />
              </button>
            </div>
          </div>
        </div>

        <div className="h-[240px] sm:h-[300px] lg:h-[340px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'bar' ? (
              <BarChart data={faturamentoPeriodoData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.4} />
                <XAxis dataKey="data" axisLine={false} tickLine={false} tickFormatter={(v) => String(v).slice(0, 7)} tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => formatBRLCompact(v)} tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-bg-tertiary)', opacity: 0.3 }} />
                <Bar dataKey="total" name="Faturamento" radius={[6, 6, 0, 0]} maxBarSize={45}>
                  {faturamentoPeriodoData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={barColors[index % barColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            ) : (
              <LineChart data={faturamentoPeriodoData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.4} />
                <XAxis dataKey="data" axisLine={false} tickLine={false} tickFormatter={(v) => String(v).slice(0, 7)} tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => formatBRLCompact(v)} tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="total" name="Faturamento" stroke="#10B981" strokeWidth={3} dot={{ r: 5, fill: '#10B981' }} activeDot={{ r: 7 }} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  )
}
