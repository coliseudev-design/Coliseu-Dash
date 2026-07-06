import { useState, useEffect, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie
} from 'recharts'
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingBag, 
  Users, Award, Map, Target, Briefcase, Box, AlertCircle,
  Sliders, X, Trophy, ChevronDown, LayoutDashboard
} from 'lucide-react'
import { useBranchPeriodQuery } from '../hooks/useApi'
import { useAuthStore } from '../store/authStore'
import PeriodFilter from '../components/PeriodFilter'
import { usePeriodStore, PERIOD_OPTIONS } from '../store/periodStore'
import { useBranch } from '../contexts/BranchContext'
import { formatBRL, formatBRLCompact, formatNum } from '../utils/format'
import { CHART_COLORS } from '../utils/chartColors'
import clsx from 'clsx'

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-bg-primary border border-border shadow-card-hover p-3 rounded-lg z-50">
        <p className="text-text-secondary text-xs mb-1 font-medium">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm font-bold text-text-primary">
            {entry.name === 'total' || entry.name === 'valor' || entry.name === 'value' || entry.name.includes('Faturamento')
              ? formatBRL(entry.value)
              : entry.value}
          </p>
        ))}
      </div>
    )
  }
  return null
}

const ComparisonBadge = ({ pct }: { pct: number }) => {
  const isUp = pct > 0;
  const isDown = pct < 0;
  return (
    <div className={clsx(
      "flex items-center text-xs font-bold px-2 py-1 rounded-md",
      isUp ? "bg-success/10 text-success" : isDown ? "bg-danger/10 text-danger" : "bg-text-muted/10 text-text-muted"
    )}>
      {isUp && <TrendingUp size={14} className="mr-1" />}
      {isDown && <TrendingDown size={14} className="mr-1" />}
      {Math.abs(pct).toFixed(1)}%
    </div>
  );
}

// Gauge Chart Component using PieChart
const GaugeChart = ({ realizado, meta }: { realizado: number, meta: number }) => {
  const atingimento = meta > 0 ? (realizado / meta) * 100 : 0;
  const value = Math.min(atingimento, 100);
  const data = [
    { name: 'Atingido', value: value, color: CHART_COLORS.primary },
    { name: 'Restante', value: 100 - value, color: 'var(--color-bg-tertiary)' }
  ];
  
  return (
    <div className="w-full flex flex-col items-center">
      <div className="relative h-32 w-full mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="100%"
              startAngle={180}
              endAngle={0}
              innerRadius={60}
              outerRadius={80}
              paddingAngle={0}
              dataKey="value"
              stroke="none"
              cornerRadius={4}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
          <span className="text-3xl font-extrabold text-text-primary tracking-tight">{atingimento.toFixed(1)}%</span>
        </div>
      </div>
      <div className="text-center mt-3">
        <div className="text-[10px] text-text-secondary uppercase font-bold tracking-widest">Realizado vs Meta</div>
        <div className="text-xs font-semibold text-text-primary mt-0.5">
          {formatBRLCompact(realizado)} / <span className="text-text-muted">{formatBRLCompact(meta)}</span>
        </div>
      </div>
    </div>
  );
}

export default function VisaoEstrategicaV3() {
  const user = useAuthStore((s) => s.user)
  const ov = useBranchPeriodQuery<any>('/estatisticas/overview')
  const kpisData = useBranchPeriodQuery<any>('/estatisticas/kpis')
  const fatMes = useBranchPeriodQuery<any>('/vendas/faturadas')
  const vd = useBranchPeriodQuery<any>('/ranking/vendedores')
  const prod = useBranchPeriodQuery<any>('/ranking/produtos')
  const cli = useBranchPeriodQuery<any>('/ranking/clientes')
  const marcas = useBranchPeriodQuery<any>('/ranking/marcas')

  const period = usePeriodStore((s) => s.period)
  const setPeriod = usePeriodStore((s) => s.setPeriod)
  const setCustomRange = usePeriodStore((s) => s.setCustomRange)
  const globalStartDate = usePeriodStore((s) => s.startDate)
  const globalEndDate = usePeriodStore((s) => s.endDate)

  const { filiais, selectedBranch, setSelectedBranch } = useBranch()

  // ─── Mobile Layout States ──────────────────────────────────────────────────
  const [isMobile, setIsMobile] = useState(false)
  const [activeTab, setActiveTab] = useState<'estatisticas' | 'receitas' | 'vendedores' | 'cidades'>('estatisticas')
  const [showFiltersSheet, setShowFiltersSheet] = useState(false)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  
  // Real data mapping
  const faturamentoAtual = ov.data?.mes?.total || 0;
  const qtdPedidos = kpisData.data?.vendas?.qtd_pedidos || ov.data?.mes?.qtd || 0;
  const ticketMedio = kpisData.data?.vendas?.ticket_medio || (qtdPedidos > 0 ? faturamentoAtual / qtdPedidos : 0);
  const clientesAtivos = kpisData.data?.kpis?.clientes_ativos || 0;
  const totalClientes = kpisData.data?.kpis?.total_clientes || 0;
  const taxaConversao = kpisData.data?.kpis?.taxa_conversao_pct || 0;
  
  const mockFaturamentoAnterior = ov.data?.anterior?.total || 0;
  const metaFaturamento = ov.data?.meta_total || faturamentoAtual * 1.2;

  const faturamentoCrescimento = mockFaturamentoAnterior > 0 ? ((faturamentoAtual - mockFaturamentoAnterior) / mockFaturamentoAnterior) * 100 : 0;

  const faturamentoPeriodoData = fatMes.data?.data && fatMes.data.data.length > 0 
    ? fatMes.data.data 
    : [
        { data: 'Jan', total: 156000 },
        { data: 'Fev', total: 142000 },
        { data: 'Mar', total: 180000 },
        { data: 'Abr', total: 175000 },
        { data: 'Mai', total: 198000 },
        { data: 'Jun', total: 210000 },
        { data: 'Jul', total: 223838 },
        { data: 'Ago', total: 240116 },
      ];

  const mockTopSellers = vd.data?.data?.map((s: any) => ({ name: s.nome || s.vendedor, value: s.total || s.total_vendas })) || [];

  const mockTopBrands = marcas.data?.data?.map((m: any) => ({ name: m.nome || m.marca, value: m.total })) || [];

  const mockTopProducts = prod.data?.data?.map((p: any) => ({ name: p.nome || p.produto, value: p.total })) || [];

  // Currently no /ranking/cidades exists, so we derive from top clients if possible or use empty
  const mockTopCities = cli.data?.data?.map((c: any) => ({ name: c.cidade || 'NÃO INFORMADA', value: c.total })) || [];

  const mockTopClients = cli.data?.data?.map((c: any, i: number) => ({ rank: i + 1, name: c.nome, value: c.total })) || [];

  const barColors = [
    '#3B82F6', '#10B981', '#06B6D4', '#F59E0B', '#EF4444', 
    '#0D9488', '#EC4899', '#6366F1', '#14B8A6', '#F97316'
  ];

  return (
    <div className={clsx("space-y-6", isMobile ? "pb-28" : "pb-6")} aria-label="Visão Estratégica">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Visão Estratégica</h2>
        </div>
        <div className="hidden md:flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-3">
          <PeriodFilter />
        </div>
      </div>

      {/* TIER 1: FATURAMENTO & META */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {(!isMobile || activeTab === 'estatisticas') && (
          <div className="bg-bg-primary rounded-xl p-5 border border-border shadow-card flex flex-col justify-center items-center text-center relative overflow-hidden animate-in fade-in duration-300">
            <div className="absolute top-0 left-0 w-full h-1 bg-brand-500"></div>
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Faturamento Mês Atual</span>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">🔥</span>
              <span className="text-xl sm:text-2xl md:text-3xl font-extrabold text-text-primary">{formatBRL(faturamentoAtual)}</span>
            </div>
            <ComparisonBadge pct={faturamentoCrescimento} />
          </div>
        )}

        {(!isMobile || activeTab === 'estatisticas') && (
          <div className="bg-bg-primary rounded-xl p-5 border border-border shadow-card flex flex-col justify-center items-center animate-in fade-in duration-300">
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-0">Atingimento de Meta</span>
            <GaugeChart realizado={faturamentoAtual} meta={metaFaturamento} />
          </div>
        )}

        {(!isMobile || activeTab === 'estatisticas') && (
          <div className="bg-bg-primary rounded-xl p-5 border border-border shadow-card flex flex-col justify-center items-center text-center relative overflow-hidden animate-in fade-in duration-300">
            <div className="absolute top-0 left-0 w-full h-1 bg-text-muted/30"></div>
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Faturamento Mês Anterior</span>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl sm:text-2xl md:text-3xl font-extrabold text-text-primary">{formatBRL(mockFaturamentoAnterior)}</span>
            </div>
            <div className="text-xs font-medium text-text-secondary px-2 py-1 bg-bg-secondary rounded-md">Referência</div>
          </div>
        )}
      </div>

      {/* TIER 2: KPIS PRIMÁRIOS */}
      {(!isMobile || activeTab === 'estatisticas') && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Vendas Totais', value: formatBRL(faturamentoAtual), icon: DollarSign, color: 'text-success', bg: 'bg-success/10' },
              { label: 'Volume de Peças', value: formatNum(qtdPedidos), icon: Box, color: 'text-brand-500', bg: 'bg-brand-500/10' },
              { label: 'Ticket Médio', value: formatBRL(ticketMedio), icon: Target, color: 'text-warning', bg: 'bg-warning/10' },
              { label: 'Taxa de Conversão', value: `${taxaConversao.toFixed(1)}%`, icon: TrendingUp, color: 'text-danger', bg: 'bg-danger/10' },
            ].map((kpi, idx) => (
              <div key={idx} className="bg-bg-primary rounded-xl p-3 border border-border shadow-card flex items-center gap-3">
                <div className={clsx('p-2 rounded-lg', kpi.bg, kpi.color)}>
                  <kpi.icon size={20} />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">{kpi.label}</div>
                  <div className="text-xs sm:text-base font-bold text-text-primary truncate" title={String(kpi.value)}>{kpi.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* TIER 3: KPIS SECUNDÁRIOS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Volume de Peças (Pedidos)', value: formatNum(qtdPedidos), icon: ShoppingBag, color: 'text-brand-500', bg: 'bg-brand-500/10' },
              { label: 'Ticket Médio', value: formatBRL(ticketMedio), icon: DollarSign, color: 'text-warning', bg: 'bg-warning/10' },
              { label: 'Taxa de Conversão', value: `${taxaConversao.toFixed(1)}%`, icon: TrendingUp, color: 'text-danger', bg: 'bg-danger/10' },
              { label: 'Clientes Ativos', value: `${clientesAtivos} / ${totalClientes}`, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
              { label: 'Vendedores Ativos', value: vd.data?.data?.length || 0, icon: Briefcase, color: 'text-cyan-500', bg: 'bg-cyan-500/10' }
            ].map((kpi, idx) => (
              <div key={idx} className="bg-bg-primary rounded-xl p-3 border border-border shadow-card flex items-center gap-3">
                <div className={clsx('p-2 rounded-lg', kpi.bg, kpi.color)}>
                  <kpi.icon size={20} />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">{kpi.label}</div>
                  <div className="text-xs sm:text-base font-bold text-text-primary truncate" title={String(kpi.value)}>{kpi.value}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* TIER 4: GRÁFICO PRINCIPAL */}
      {(!isMobile || activeTab === 'receitas') && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 animate-in fade-in duration-300">
          <div className="lg:col-span-3 bg-bg-primary border border-border shadow-card rounded-xl p-5">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-text-primary text-sm uppercase tracking-wider">Faturamento no Período</h3>
            </div>
            <div className="h-[200px] sm:h-[260px] lg:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={faturamentoPeriodoData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.5} />
                  <XAxis dataKey="data" axisLine={false} tickLine={false} tickFormatter={(v) => String(v).slice(0, 5)} tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} />
                  <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => formatBRLCompact(v)} tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-bg-tertiary)', opacity: 0.4 }} />
                  <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={40}>
                    {faturamentoPeriodoData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={barColors[index % barColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="lg:col-span-1 bg-bg-primary border border-border shadow-card rounded-xl p-5 flex flex-col justify-center space-y-4">
            <div className="p-4 bg-bg-secondary rounded-xl border border-divider">
              <div className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">Maior Mês</div>
              <div className="text-brand-500 font-bold">Ago/25</div>
              <div className="text-xl font-extrabold text-text-primary">{formatBRL(faturamentoAtual)}</div>
            </div>
            
            <div className="p-4 bg-bg-secondary rounded-xl border border-divider flex-1 flex flex-col">
              <div className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">Faturamento Diário</div>
              <div className="text-success font-bold text-xs mb-2">Média Hoje: {formatBRL(faturamentoAtual / 30)}</div>
              <div className="flex-1 flex items-end justify-between gap-1 pt-2">
                 {[40, 20, 60, 30, 80, 50, 90, 70, 100, 60, 40].map((h, i) => (
                    <div key={i} className="w-full bg-brand-500/80 rounded-t-sm" style={{ height: `${h}%` }}></div>
                 ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ROW 5: VENDEDORES */}
      {(!isMobile || activeTab === 'vendedores') && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-3 bg-bg-primary border border-border shadow-card rounded-xl p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-text-primary text-sm uppercase tracking-wider">Vendedores (Top 10)</h3>
              </div>
              <div className="h-[200px] sm:h-[260px] lg:h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mockTopSellers} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" opacity={0.5} />
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      axisLine={false} 
                      tickLine={false} 
                      tickFormatter={(v) => String(v).length > 12 ? String(v).substring(0, 12) + '...' : v}
                      tick={{ fontSize: 11, fill: 'var(--color-text-primary)', fontWeight: 600 }} 
                      width={80} 
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-bg-tertiary)', opacity: 0.4 }} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={20}>
                      {mockTopSellers.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={barColors[index % barColors.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="lg:col-span-1 bg-bg-primary border border-border shadow-card rounded-xl p-5 flex flex-col justify-center space-y-4">
              <div className="p-4 bg-bg-secondary rounded-xl border border-divider h-full flex flex-col justify-center">
                <div className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Vendedor Destaque</div>
                <div className="text-brand-500 font-extrabold text-lg mb-1">{mockTopSellers.length > 0 ? mockTopSellers[0].name : '-'}</div>
                <div className="text-2xl font-extrabold text-text-primary mb-2">{formatBRL(mockTopSellers.length > 0 ? mockTopSellers[0].value : 0)}</div>
                <div className="text-sm text-text-secondary">
                  Participação: <span className="font-bold text-text-primary">{faturamentoAtual > 0 && mockTopSellers.length > 0 ? ((mockTopSellers[0].value / faturamentoAtual) * 100).toFixed(1) : 0}%</span>
                </div>
                <div className="text-sm text-text-secondary mt-1">
                  Ticket Médio: <span className="font-bold text-text-primary">-</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ROW 6: MARCAS & ROW 7: PRODUTOS */}
      {(!isMobile || activeTab === 'receitas') && (
        <>
          {/* ROW 6: MARCAS */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 animate-in fade-in duration-300 mb-6">
            <div className="lg:col-span-3 bg-bg-primary border border-border shadow-card rounded-xl p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-text-primary text-sm uppercase tracking-wider">Marcas (Top 15)</h3>
              </div>
              <div className="h-[200px] sm:h-[260px] lg:h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mockTopBrands} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" opacity={0.5} />
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      axisLine={false} 
                      tickLine={false} 
                      tickFormatter={(v) => String(v).length > 15 ? String(v).substring(0, 15) + '...' : v}
                      tick={{ fontSize: 11, fill: 'var(--color-text-primary)', fontWeight: 600 }} 
                      width={120} 
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-bg-tertiary)', opacity: 0.4 }} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={20}>
                      {mockTopBrands.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={barColors[(index + 3) % barColors.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="lg:col-span-1 flex flex-col gap-4">
              <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 flex-1 flex flex-col justify-center">
                <div className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Maior Venda (Lucro)</div>
                <div className="text-brand-500 font-extrabold text-sm mb-1 truncate">{mockTopBrands.length > 0 ? mockTopBrands[0].name : '-'}</div>
                <div className="text-xl font-extrabold text-text-primary">{formatBRL(mockTopBrands.length > 0 ? mockTopBrands[0].value : 0)}</div>
                <div className="text-xs text-text-muted mt-1">Margem: -</div>
              </div>
              <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 flex-1 flex flex-col justify-center">
                <div className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Análise de Mercado</div>
                <div className="text-sm font-medium text-text-primary leading-snug">
                  A marca {mockTopBrands.length > 0 ? mockTopBrands[0].name : '-'} teve o maior volume de vendas.
                </div>
                <div className="text-[10px] text-text-muted mt-2">
                  Destaque do período atual.
                </div>
              </div>
            </div>
          </div>

          {/* ROW 7: PRODUTOS */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 animate-in fade-in duration-300">
            <div className="lg:col-span-3 bg-bg-primary border border-border shadow-card rounded-xl p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-text-primary text-sm uppercase tracking-wider">Produtos (Top 15)</h3>
              </div>
              <div className="h-[200px] sm:h-[260px] lg:h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mockTopProducts} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" opacity={0.5} />
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      axisLine={false} 
                      tickLine={false} 
                      tickFormatter={(v) => String(v).length > 18 ? String(v).substring(0, 18) + '...' : v}
                      tick={{ fontSize: 11, fill: 'var(--color-text-primary)', fontWeight: 600 }} 
                      width={140} 
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-bg-tertiary)', opacity: 0.4 }} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={20}>
                      {mockTopProducts.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={barColors[(index + 5) % barColors.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="lg:col-span-1 flex flex-col gap-4">
              <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 flex-1 flex flex-col justify-center">
                <div className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Produto Destaque</div>
                <div className="text-warning font-extrabold text-sm mb-1 truncate">{mockTopProducts.length > 0 ? mockTopProducts[0].name : '-'}</div>
                <div className="text-xl font-extrabold text-text-primary">{formatBRL(mockTopProducts.length > 0 ? mockTopProducts[0].value : 0)}</div>
                <div className="text-xs text-text-muted mt-1">Giro: Alto</div>
              </div>
              <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 flex-1 flex flex-col justify-center">
                <div className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Performance de Venda</div>
                <div className="text-sm font-medium text-text-primary leading-snug">
                  O item {mockTopProducts.length > 0 ? mockTopProducts[0].name : '-'} teve saída constante nestes últimos dias.
                </div>
                <div className="text-[10px] text-text-muted mt-2">
                  A demanda se mantém alta.
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ROW 8: CIDADES */}
      {(!isMobile || activeTab === 'cidades') && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 animate-in fade-in duration-300">
          <div className="lg:col-span-3 bg-bg-primary border border-border shadow-card rounded-xl p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-text-primary text-sm uppercase tracking-wider">Cidades (Top 15)</h3>
            </div>
            <div className="h-[200px] sm:h-[260px] lg:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockTopCities} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" opacity={0.5} />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false} 
                    tickFormatter={(v) => String(v).length > 15 ? String(v).substring(0, 15) + '...' : v}
                    tick={{ fontSize: 11, fill: 'var(--color-text-primary)', fontWeight: 600 }} 
                    width={120} 
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-bg-tertiary)', opacity: 0.4 }} />
                  <Bar dataKey="value" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} barSize={16}>
                     <Cell fill="#06B6D4" />
                     <Cell fill="#06B6D4" />
                     <Cell fill="#06B6D4" />
                     <Cell fill="#06B6D4" />
                     <Cell fill="#06B6D4" />
                     <Cell fill="#06B6D4" />
                     <Cell fill="#06B6D4" />
                     <Cell fill="#06B6D4" />
                     <Cell fill="#06B6D4" />
                     <Cell fill="#06B6D4" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="lg:col-span-1 flex flex-col gap-4">
            <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 flex-1 flex flex-col justify-center">
              <div className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Cidade Destaque</div>
              <div className="text-brand-500 font-extrabold text-sm mb-1 truncate">DOURADOS</div>
              <div className="text-xl font-extrabold text-text-primary">{formatBRL(103432.05)}</div>
              <div className="text-xs text-text-muted mt-1">Participação: 45.6%</div>
            </div>
            <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 flex-1 flex flex-col justify-center">
              <div className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Alcance Regional</div>
              <div className="text-sm font-medium text-text-primary leading-snug">
                A cidade de DOURADOS concentra a maioria das faturas da região sul, com 45,6% do faturamento total.
              </div>
              <div className="text-[10px] text-text-muted mt-2">
                As regiões do interior se destacam pelas compras no agronegócio.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ROW 9: CLIENTES */}
      {(!isMobile || activeTab === 'estatisticas') && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 animate-in fade-in duration-300">
          <div className="lg:col-span-3 bg-bg-primary border border-border shadow-card rounded-xl p-5 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-text-primary text-sm uppercase tracking-wider">Top 15 Clientes</h3>
            </div>
            <div className="flex-1 overflow-y-auto pr-2">
              <div className="space-y-2">
                {mockTopClients.map((client) => (
                  <div key={client.rank} className="flex items-center justify-between p-3 rounded-lg hover:bg-bg-secondary transition-colors border border-transparent hover:border-divider">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-6 text-text-muted font-bold text-xs">{String(client.rank).padStart(2, '0')}</div>
                      <div className="font-bold text-text-primary text-sm truncate" title={client.name}>{client.name}</div>
                    </div>
                    <div className="font-bold text-text-primary font-mono text-sm shrink-0">{formatBRL(client.value)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="lg:col-span-1 flex flex-col gap-4">
            <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 flex-1 flex flex-col justify-center">
              <div className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Cliente Destaque</div>
              <div className="text-danger font-extrabold text-sm mb-1 truncate">{mockTopClients.length > 0 ? mockTopClients[0].name : '-'}</div>
              <div className="text-xl font-extrabold text-text-primary">{formatBRL(mockTopClients.length > 0 ? mockTopClients[0].value : 0)}</div>
              <div className="text-xs text-text-muted mt-1">Ticket: Médio</div>
            </div>
            <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 flex-1 flex flex-col justify-center">
              <div className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Perfil do Cliente</div>
              <div className="text-sm font-medium text-text-primary leading-snug">
                O cliente {mockTopClients.length > 0 ? mockTopClients[0].name : '-'} é o principal gerador de receita no período.
              </div>
              <div className="text-[10px] text-text-muted mt-2">
                Destaque do período atual.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MOBILE STICKY BOTTOM NAVIGATION ──────────────────────────────── */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800/80 py-2 px-4 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] select-none">
          <div className="flex items-center justify-around w-full max-w-md mx-auto">
            {/* Tab Estatísticas */}
            <button
              onClick={() => setActiveTab('estatisticas')}
              className={clsx(
                "flex flex-col items-center justify-center py-1 flex-1 cursor-pointer transition-all",
                activeTab === 'estatisticas' ? "text-[#00a896]" : "text-slate-400 dark:text-slate-500"
              )}
            >
              <LayoutDashboard size={18} />
              <span className="text-[8px] font-bold uppercase tracking-wider mt-1">ESTATÍSTICAS</span>
            </button>

            {/* Tab Receitas */}
            <button
              onClick={() => setActiveTab('receitas')}
              className={clsx(
                "flex flex-col items-center justify-center py-1 flex-1 cursor-pointer transition-all",
                activeTab === 'receitas' ? "text-[#00a896]" : "text-slate-400 dark:text-slate-500"
              )}
            >
              <TrendingUp size={18} />
              <span className="text-[8px] font-bold uppercase tracking-wider mt-1">RECEITAS</span>
            </button>

            {/* Tab Vendedores */}
            <button
              onClick={() => setActiveTab('vendedores')}
              className={clsx(
                "flex flex-col items-center justify-center py-1 flex-1 cursor-pointer transition-all",
                activeTab === 'vendedores' ? "text-[#00a896]" : "text-slate-400 dark:text-slate-500"
              )}
            >
              <Trophy size={18} />
              <span className="text-[8px] font-bold uppercase tracking-wider mt-1">VENDEDORES</span>
            </button>

            {/* Tab Cidades */}
            <button
              onClick={() => setActiveTab('cidades')}
              className={clsx(
                "flex flex-col items-center justify-center py-1 flex-1 cursor-pointer transition-all",
                activeTab === 'cidades' ? "text-[#00a896]" : "text-slate-400 dark:text-slate-500"
              )}
            >
              <Map size={18} />
              <span className="text-[8px] font-bold uppercase tracking-wider mt-1">CIDADES</span>
            </button>

            {/* Tab Filtros (Trigger Bottom Sheet) */}
            <button
              onClick={() => setShowFiltersSheet(true)}
              className="flex flex-col items-center justify-center py-1 flex-1 cursor-pointer transition-all text-slate-400 dark:text-slate-500 relative"
            >
              {(selectedBranch !== 'todas' || period !== 'thisMonth') && (
                <span className="absolute top-1 right-6 w-2 h-2 rounded-full bg-emerald-500 border border-white" />
              )}
              <Sliders size={18} />
              <span className="text-[8px] font-bold uppercase tracking-wider mt-1">FILTROS</span>
            </button>
          </div>
        </div>
      )}

      {/* ── MOBILE FILTERS BOTTOM SHEET ──────────────────────────────────── */}
      {isMobile && showFiltersSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center select-none animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setShowFiltersSheet(false)}
          />
          {/* Bottom Sheet Drawer */}
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl p-6 shadow-2xl z-10 animate-in slide-in-from-bottom duration-300 max-h-[85vh] overflow-y-auto flex flex-col pb-8">
            {/* Handle bar */}
            <div className="w-12 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-5 shrink-0" />

            <div className="flex justify-between items-center mb-6 shrink-0">
              <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">
                Filtrar Painel
              </h3>
              <button
                onClick={() => setShowFiltersSheet(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-6 flex-1">
              {/* Seletor de Período */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2.5 pl-1">
                  Período
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {PERIOD_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => {
                        if (opt.key === 'custom') {
                          if (!globalStartDate || !globalEndDate) {
                            const today = new Date().toISOString().slice(0, 10)
                            const monthAgo = new Date()
                            monthAgo.setDate(monthAgo.getDate() - 30)
                            setCustomRange(monthAgo.toISOString().slice(0, 10), today)
                          }
                          setPeriod('custom')
                        } else {
                          setPeriod(opt.key)
                        }
                      }}
                      className={clsx(
                        "py-2 px-3 rounded-xl text-xs font-bold text-center border transition-all cursor-pointer",
                        period === opt.key
                          ? "bg-[#00a896] text-white border-transparent shadow-sm"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-100 dark:border-slate-800/80 hover:bg-slate-100"
                      )}
                    >
                      {opt.label === 'Mês anterior' ? 'Mês Anterior' : opt.label === 'Mês atual' ? 'Mês Atual' : opt.label}
                    </button>
                  ))}
                </div>

                {/* Custom Month/Year Dropdown selectors */}
                {period === 'custom' && (
                  <div className="mt-3 grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/60 animate-in slide-in-from-top-1 duration-200">
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">De:</span>
                      <input
                        type="date"
                        className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-500 w-full cursor-pointer"
                        value={globalStartDate || ''}
                        onChange={(e) => setCustomRange(e.target.value, globalEndDate || e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">Até:</span>
                      <input
                        type="date"
                        className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-500 w-full cursor-pointer"
                        value={globalEndDate || ''}
                        onChange={(e) => setCustomRange(globalStartDate || e.target.value, e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Filial Selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">
                  Filial
                </label>
                <div className="relative">
                  <select
                    value={selectedBranch}
                    onChange={(e) => {
                      const val = e.target.value
                      setSelectedBranch(val === 'todas' ? 'todas' : parseInt(val, 10))
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800 dark:text-white outline-none appearance-none focus:border-[#00a896] transition-colors cursor-pointer font-bold"
                  >
                    <option value="todas">Todas as Filiais</option>
                    {filiais.map((f) => (
                      <option key={f.depto_id} value={f.depto_id}>
                        {f.nome}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="mt-8 shrink-0">
              <button
                onClick={() => setShowFiltersSheet(false)}
                className="w-full py-3.5 bg-[#00a896] hover:bg-[#008f80] text-white font-bold rounded-2xl text-xs shadow-md transition-all active:scale-[0.98] cursor-pointer"
              >
                Aplicar Filtros
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
