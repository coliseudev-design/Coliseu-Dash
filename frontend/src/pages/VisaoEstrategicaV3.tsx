import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie
} from 'recharts'
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingBag, 
  Users, Award, Map, Target, Briefcase, Box, AlertCircle
} from 'lucide-react'
import { usePeriodQuery } from '../hooks/useApi'
import { useAuthStore } from '../store/authStore'
import PeriodFilter from '../components/PeriodFilter'
import { usePeriodStore } from '../store/periodStore'
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
  
  const ov = usePeriodQuery<any>('/estatisticas/overview')
  const fatMes = usePeriodQuery<any>('/vendas/faturadas')
  const vd = usePeriodQuery<any>('/ranking/vendedores')
  const prod = usePeriodQuery<any>('/ranking/produtos')
  const cli = usePeriodQuery<any>('/ranking/clientes')
  const marcas = usePeriodQuery<any>('/ranking/marcas')

  const period = usePeriodStore((s) => s.period)
  const faturamentoAtual = ov.data?.mes?.total || 240116.50;

  // Mock data dynamic config
  let mockFaturamentoAnterior = 223838.93;
  let metaFaturamento = ov.data?.meta_total || 280000;

  if (period === 'today' || period === 'yesterday') {
    mockFaturamentoAnterior = 9500.50;
    metaFaturamento = 12000;
  } else if (period === 'last7') {
    mockFaturamentoAnterior = 76500.00;
    metaFaturamento = 90000;
  } else if (period === 'thisMonth') {
    mockFaturamentoAnterior = 223838.93;
    metaFaturamento = 280000;
  } else if (period === 'lastMonth') {
    mockFaturamentoAnterior = 210500.00;
    metaFaturamento = 250000;
  } else if (period === 'last12m') {
    mockFaturamentoAnterior = 1850000.00;
    metaFaturamento = 2500000;
  } else if (period === 'custom') {
    mockFaturamentoAnterior = faturamentoAtual * 0.85;
    metaFaturamento = faturamentoAtual > 0 ? faturamentoAtual * 1.2 : 50000;
  }

  const faturamentoCrescimento = ((faturamentoAtual - mockFaturamentoAnterior) / mockFaturamentoAnterior) * 100;

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

  const mockTopSellers = vd.data?.data?.map((s: any) => ({ name: s.vendedor, value: s.total_vendas })) || [];

  const mockTopBrands = marcas.data?.data?.map((m: any) => ({ name: m.nome, value: m.total })) || [];

  const mockTopProducts = prod.data?.data?.map((p: any) => ({ name: p.nome, value: p.total })) || [];

  const mockTopCities = [
    { name: 'DOURADOS - MS', value: 103432.05 },
    { name: 'CAMPO GRANDE - MS', value: 85000.00 },
    { name: 'MARACAJU - MS', value: 65000.00 },
    { name: 'PONTA PORÃ - MS', value: 45000.00 },
    { name: 'NAVIRAÍ - MS', value: 35000.00 },
    { name: 'TRÊS LAGOAS - MS', value: 25000.00 },
    { name: 'RIO BRILHANTE - MS', value: 15000.00 },
    { name: 'SIDROLÂNDIA - MS', value: 12000.00 },
    { name: 'NOVA ANDRADINA - MS', value: 8000.00 },
    { name: 'AMAMBAI - MS', value: 5000.00 },
  ];

  const mockTopClients = cli.data?.data?.map((c: any, i: number) => ({ rank: i + 1, name: c.nome, value: c.total })) || [];

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
        <div className="bg-bg-primary rounded-xl p-5 border border-border shadow-card flex flex-col justify-center items-center text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-brand-500"></div>
          <span className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Faturamento Mês Atual</span>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">🔥</span>
            <span className="text-3xl font-extrabold text-text-primary">{formatBRL(faturamentoAtual)}</span>
          </div>
          <ComparisonBadge pct={faturamentoCrescimento} />
        </div>

        <div className="bg-bg-primary rounded-xl p-5 border border-border shadow-card flex flex-col justify-center items-center">
          <span className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-0">Atingimento de Meta</span>
          <GaugeChart realizado={faturamentoAtual} meta={metaFaturamento} />
        </div>

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
          { label: 'Metas Atingidas', value: '15,3', icon: Award, color: 'text-brand-400', bg: 'bg-brand-400/10' },
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
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 bg-bg-primary border border-border shadow-card rounded-xl p-5">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-text-primary text-sm uppercase tracking-wider">Faturamento no Período</h3>
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
               {/* Mini chart visual representation */}
               {[40, 20, 60, 30, 80, 50, 90, 70, 100, 60, 40].map((h, i) => (
                  <div key={i} className="w-full bg-brand-500/80 rounded-t-sm" style={{ height: `${h}%` }}></div>
               ))}
            </div>
          </div>
        </div>
      </div>

      {/* ROW 5: VENDEDORES */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 bg-bg-primary border border-border shadow-card rounded-xl p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-text-primary text-sm uppercase tracking-wider">Vendedores (Top 10)</h3>
          </div>
          <div className="h-[260px]">
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
            <div className="text-brand-500 font-extrabold text-lg mb-1">FABIOLA</div>
            <div className="text-2xl font-extrabold text-text-primary mb-2">{formatBRL(89600.75)}</div>
            <div className="text-sm text-text-secondary">
              Participação: <span className="font-bold text-text-primary">35.8%</span>
            </div>
            <div className="text-sm text-text-secondary mt-1">
              Ticket Médio: <span className="font-bold text-text-primary">R$ 1.542,00</span>
            </div>
          </div>
        </div>
      </div>

      {/* ROW 6: MARCAS */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 bg-bg-primary border border-border shadow-card rounded-xl p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-text-primary text-sm uppercase tracking-wider">Marcas (Top 15)</h3>
          </div>
          <div className="h-[260px]">
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
            <div className="text-brand-500 font-extrabold text-sm mb-1 truncate">AR COMPRESSOR ETAA ME</div>
            <div className="text-xl font-extrabold text-text-primary">{formatBRL(20590.70)}</div>
            <div className="text-xs text-text-muted mt-1">Margem: 42.5%</div>
          </div>
          <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 flex-1 flex flex-col justify-center">
            <div className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Análise de Mercado</div>
            <div className="text-sm font-medium text-text-primary leading-snug">
              A marca TVH COMPRESSORES teve um pico de vendas no momento em 15% comparado ao mês passado.
            </div>
            <div className="text-[10px] text-text-muted mt-2">
              Os dados indicam que o setor florestal e mineração alavancaram esses pedidos.
            </div>
          </div>
        </div>
      </div>

      {/* ROW 7: PRODUTOS */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 bg-bg-primary border border-border shadow-card rounded-xl p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-text-primary text-sm uppercase tracking-wider">Produtos (Top 15)</h3>
          </div>
          <div className="h-[260px]">
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
            <div className="text-warning font-extrabold text-sm mb-1 truncate">COMP NAVAL 10MM X 3,50 M</div>
            <div className="text-xl font-extrabold text-text-primary">{formatBRL(15106.10)}</div>
            <div className="text-xs text-text-muted mt-1">Giro: Alto</div>
          </div>
          <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 flex-1 flex flex-col justify-center">
            <div className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Performance de Venda</div>
            <div className="text-sm font-medium text-text-primary leading-snug">
              O item COMP NAVAL 10MM teve saída constante nestes últimos dias, com um ticket médio de R$ 3,5.
            </div>
            <div className="text-[10px] text-text-muted mt-2">
              A demanda se mantem alta, sendo um item chave ABC A.
            </div>
          </div>
        </div>
      </div>

      {/* ROW 8: CIDADES */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 bg-bg-primary border border-border shadow-card rounded-xl p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-text-primary text-sm uppercase tracking-wider">Cidades (Top 15)</h3>
          </div>
          <div className="h-[280px]">
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
                   <Cell fill="#8B5CF6" />
                   <Cell fill="#8B5CF6" />
                   <Cell fill="#8B5CF6" />
                   <Cell fill="#8B5CF6" />
                   <Cell fill="#8B5CF6" />
                   <Cell fill="#8B5CF6" />
                   <Cell fill="#8B5CF6" />
                   <Cell fill="#8B5CF6" />
                   <Cell fill="#8B5CF6" />
                   <Cell fill="#8B5CF6" />
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

      {/* ROW 9: CLIENTES */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 bg-bg-primary border border-border shadow-card rounded-xl p-5 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-text-primary text-sm uppercase tracking-wider">Top 15 Clientes</h3>
          </div>
          <div className="flex-1 overflow-y-auto pr-2">
            <div className="space-y-2">
              {mockTopClients.map((client) => (
                <div key={client.rank} className="flex items-center justify-between p-3 rounded-lg hover:bg-bg-secondary transition-colors border border-transparent hover:border-divider">
                  <div className="flex items-center gap-4">
                    <div className="w-6 text-text-muted font-bold text-xs">{String(client.rank).padStart(2, '0')}</div>
                    <div className="font-bold text-text-primary text-sm">{client.name}</div>
                  </div>
                  <div className="font-bold text-text-primary font-mono text-sm">{formatBRL(client.value)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 flex-1 flex flex-col justify-center">
            <div className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Cliente Destaque</div>
            <div className="text-danger font-extrabold text-sm mb-1 truncate">AO CONSUMIDOR</div>
            <div className="text-xl font-extrabold text-text-primary">{formatBRL(45281.41)}</div>
            <div className="text-xs text-text-muted mt-1">Ticket: Médio</div>
          </div>
          <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 flex-1 flex flex-col justify-center">
            <div className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Perfil do Cliente</div>
            <div className="text-sm font-medium text-text-primary leading-snug">
              O cliente AO CONSUMIDOR é o principal gerador de receita no período.
            </div>
            <div className="text-[10px] text-text-muted mt-2">
              Geralmente corresponde a clientes pulverizados de balcão ou pequenas vendas.
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
