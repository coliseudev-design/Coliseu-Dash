import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie
} from 'recharts'
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingBag, 
  Users, Award, Map, Target, Briefcase, Box
} from 'lucide-react'
import { usePeriodQuery } from '../hooks/useApi'
import { useAuthStore } from '../store/authStore'
import PeriodFilter from '../components/PeriodFilter'
import { formatBRL, formatBRLCompact, formatNum } from '../utils/format'
import { CHART_COLORS } from '../utils/chartColors'
import clsx from 'clsx'

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-bg-primary border border-border shadow-card-hover p-3 rounded-lg">
        <p className="text-text-secondary text-xs mb-1 font-medium">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm font-bold text-text-primary">
            {entry.name === 'total' || entry.name === 'valor' || entry.name.includes('Faturamento')
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
  
  // Usaremos o overview e faturamento para popular a tela realística
  const ov = usePeriodQuery<any>('/estatisticas/overview')
  const fatMes = usePeriodQuery<any>('/vendas/faturadas')

  // Mock data for elements not yet in standard API
  const mockFaturamentoAnterior = 223838.93;
  const faturamentoAtual = ov.data?.mes?.total || 240116.50;
  const faturamentoCrescimento = ((faturamentoAtual - mockFaturamentoAnterior) / mockFaturamentoAnterior) * 100;

  // Calculate mock meta if not provided by API
  const metaFaturamento = ov.data?.meta_total || (faturamentoAtual > 0 ? faturamentoAtual * 1.2 : 100000);

  // Use real data from fatMes (which is daily data for the period)
  const faturamentoPeriodoData = fatMes.data?.data && fatMes.data.data.length > 0 
    ? fatMes.data.data 
    : [
        { data: '01/08', total: 15600 },
        { data: '02/08', total: 14200 },
        { data: '03/08', total: 18000 },
        { data: '04/08', total: 17500 },
        { data: '05/08', total: 19800 },
        { data: '06/08', total: 21000 },
        { data: '07/08', total: 22383 },
        { data: '08/08', total: 18000 },
      ];

  const mockTopSellers = [
    { name: 'FABIOLA', value: 89600 },
    { name: 'JOAO', value: 75000 },
    { name: 'MARIA', value: 68000 },
    { name: 'CARLOS', value: 54000 },
    { name: 'ANA', value: 42000 },
  ];

  const mockTopBrands = ov.data?.top_marcas?.map((m: any) => ({ name: m.marca, value: m.total })) || [
    { name: 'SAMSUNG', value: 45000 },
    { name: 'APPLE', value: 38000 },
    { name: 'LG', value: 25000 },
    { name: 'MOTOROLA', value: 18000 },
    { name: 'XIAOMI', value: 15000 },
  ];

  const barColors = [
    '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', 
    '#06B6D4', '#EC4899', '#6366F1', '#14B8A6', '#F97316'
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Visão Estratégica</h2>
          <p className="text-sm text-text-secondary mt-1">Acompanhamento de metas e performance de vendas</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-3">
          <PeriodFilter />
        </div>
      </div>

      {/* TIER 1: FATURAMENTO & META */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Faturamento Atual */}
        <div className="bg-bg-primary rounded-xl p-5 border border-border shadow-card flex flex-col justify-center items-center text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-brand-500"></div>
          <span className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Faturamento Mês Atual</span>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">🔥</span>
            <span className="text-3xl font-extrabold text-text-primary">{formatBRL(faturamentoAtual)}</span>
          </div>
          <ComparisonBadge pct={faturamentoCrescimento} />
        </div>

        {/* Gauge Meta */}
        <div className="bg-bg-primary rounded-xl p-5 border border-border shadow-card flex flex-col justify-center items-center">
          <span className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-0">Atingimento de Meta</span>
          <GaugeChart realizado={faturamentoAtual} meta={metaFaturamento} />
        </div>

        {/* Faturamento Anterior */}
        <div className="bg-bg-primary rounded-xl p-5 border border-border shadow-card flex flex-col justify-center items-center text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-text-muted/30"></div>
          <span className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Faturamento Mês Anterior</span>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-3xl font-extrabold text-text-primary">{formatBRL(mockFaturamentoAnterior)}</span>
          </div>
          <div className="text-xs font-medium text-text-secondary px-2 py-1 bg-bg-secondary rounded-md">Referência</div>
        </div>
      </div>

      {/* TIER 2: KPIS PRIMÁRIOS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Vendas Totais', value: formatBRL(faturamentoAtual), icon: DollarSign, color: 'text-success', bg: 'bg-success/10' },
          { label: 'Volume de Peças', value: formatNum(ov.data?.mes?.qtd || 337), icon: Box, color: 'text-brand-500', bg: 'bg-brand-500/10' },
          { label: 'Ticket Médio', value: formatBRL((ov.data?.mes?.total || 0) / (ov.data?.mes?.qtd || 1) || 712.51), icon: Target, color: 'text-warning', bg: 'bg-warning/10' },
          { label: 'Taxa de Conversão', value: '4,6%', icon: TrendingUp, color: 'text-danger', bg: 'bg-danger/10' },
        ].map((kpi, idx) => (
          <div key={idx} className="bg-bg-primary rounded-xl p-4 border border-border shadow-card flex items-center gap-4">
            <div className={clsx('p-3 rounded-lg', kpi.bg, kpi.color)}>
              <kpi.icon size={20} />
            </div>
            <div>
              <div className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">{kpi.label}</div>
              <div className="text-lg font-bold text-text-primary">{kpi.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* TIER 3: KPIS SECUNDÁRIOS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Metas Atingidas', value: '15', icon: Award, color: 'text-brand-400', bg: 'bg-brand-400/10' },
          { label: 'Clientes Ativos', value: '384 / 6995', icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: 'Vendedores Ativos', value: '106', icon: Briefcase, color: 'text-purple-500', bg: 'bg-purple-500/10' },
          { label: 'Lojas Atendidas', value: '56', icon: Map, color: 'text-orange-500', bg: 'bg-orange-500/10' },
        ].map((kpi, idx) => (
          <div key={idx} className="bg-bg-primary rounded-xl p-4 border border-border shadow-card flex items-center gap-4">
            <div className={clsx('p-3 rounded-lg', kpi.bg, kpi.color)}>
              <kpi.icon size={20} />
            </div>
            <div>
              <div className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">{kpi.label}</div>
              <div className="text-lg font-bold text-text-primary">{kpi.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* TIER 4: GRÁFICO PRINCIPAL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-bg-primary border border-border shadow-card rounded-xl p-5">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-text-primary text-sm uppercase tracking-wider">Faturamento Diário no Período</h3>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={faturamentoPeriodoData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.5} />
                <XAxis dataKey="data" axisLine={false} tickLine={false} tickFormatter={(v) => String(v).slice(0, 5)} tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => formatBRLCompact(v)} tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-bg-tertiary)', opacity: 0.4 }} />
                <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={40}>
                  {faturamentoPeriodoData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS.primary} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 flex flex-col justify-center space-y-6">
          <div className="p-4 bg-bg-secondary rounded-xl border border-divider">
            <div className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">Maior Mês</div>
            <div className="text-brand-500 font-bold">Jul/25</div>
            <div className="text-xl font-extrabold text-text-primary">{formatBRL(223838.93)}</div>
          </div>
          
          <div className="p-4 bg-bg-secondary rounded-xl border border-divider">
            <div className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">Média Diária (Mês Atual)</div>
            <div className="text-success font-bold">Hoje</div>
            <div className="text-xl font-extrabold text-text-primary">{formatBRL(faturamentoAtual / 30)}</div>
          </div>
        </div>
      </div>

      {/* TIER 5: RANKINGS HORIZONTAIS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Vendedores */}
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-text-primary text-sm uppercase tracking-wider">Vendedores (Top 5)</h3>
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockTopSellers} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" opacity={0.5} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-text-primary)', fontWeight: 600 }} width={80} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-bg-tertiary)', opacity: 0.4 }} />
                <Bar dataKey="value" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} barSize={20}>
                  {mockTopSellers.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={barColors[index % barColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Marcas */}
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-text-primary text-sm uppercase tracking-wider">Marcas (Top 5)</h3>
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockTopBrands} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" opacity={0.5} />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tickFormatter={(v) => String(v).length > 12 ? String(v).substring(0, 12) + '...' : v}
                  tick={{ fontSize: 11, fill: 'var(--color-text-primary)', fontWeight: 600 }} 
                  width={100} 
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-bg-tertiary)', opacity: 0.4 }} />
                <Bar dataKey="value" fill={CHART_COLORS.secondary} radius={[0, 4, 4, 0]} barSize={20}>
                  {mockTopBrands.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={barColors[(index + 5) % barColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

    </div>
  )
}
