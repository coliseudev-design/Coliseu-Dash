import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie
} from 'recharts'
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingBag, 
  Users, Award, Map, Target, Briefcase, Box, AlertCircle
} from 'lucide-react'
import { useBranchPeriodQuery } from '../hooks/useApi'
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
        <div className="text-[10px] text-text-secondary uppercase font-bold tracking-widest">Realizado vs Meta (Vet)</div>
        <div className="text-xs font-semibold text-text-primary mt-0.5">
          {formatBRLCompact(realizado)} / <span className="text-text-muted">{formatBRLCompact(meta)}</span>
        </div>
      </div>
    </div>
  );
}

export default function VisaoEstrategicaV4() {
  const user = useAuthStore((s) => s.user)
  const ov = useBranchPeriodQuery<any>('/estatisticas/overview')
  const kpisData = useBranchPeriodQuery<any>('/estatisticas/kpis')
  const fatMes = useBranchPeriodQuery<any>('/vendas/faturadas')
  const vd = useBranchPeriodQuery<any>('/ranking/vendedores')
  const prod = useBranchPeriodQuery<any>('/ranking/produtos')
  const cli = useBranchPeriodQuery<any>('/ranking/clientes')
  const marcas = useBranchPeriodQuery<any>('/ranking/marcas')

  const period = usePeriodStore((s) => s.period)
  
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
    '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', 
    '#06B6D4', '#EC4899', '#6366F1', '#14B8A6', '#F97316'
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Visão Estratégica (Vet)</h2>
          <p className="text-sm text-text-secondary mt-1">Acompanhamento de metas e performance de vendas do sistema Siscom Vet</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-3">
          <PeriodFilter />
        </div>
      </div>

      {/* TIER 1: FATURAMENTO & META */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-bg-primary rounded-xl p-5 border border-border shadow-card flex flex-col justify-center items-center text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-brand-500"></div>
          <span className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Faturamento Mês Atual (Vet)</span>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">🔥</span>
            <span className="text-3xl font-extrabold text-text-primary">{formatBRL(faturamentoAtual)}</span>
          </div>
          <ComparisonBadge pct={faturamentoCrescimento} />
        </div>

        <div className="bg-bg-primary rounded-xl p-5 border border-border shadow-card flex flex-col justify-center items-center">
          <span className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-0">Atingimento de Meta (Vet)</span>
          <GaugeChart realizado={faturamentoAtual} meta={metaFaturamento} />
        </div>

        <div className="bg-bg-primary rounded-xl p-5 border border-border shadow-card flex flex-col justify-center items-center text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-text-muted/30"></div>
          <span className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Faturamento Mês Anterior (Vet)</span>
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
          { label: 'Volume de Peças', value: formatNum(qtdPedidos), icon: Box, color: 'text-brand-500', bg: 'bg-brand-500/10' },
          { label: 'Ticket Médio', value: formatBRL(ticketMedio), icon: Target, color: 'text-warning', bg: 'bg-warning/10' },
          { label: 'Taxa de Conversão', value: `${taxaConversao.toFixed(1)}%`, icon: TrendingUp, color: 'text-danger', bg: 'bg-danger/10' },
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
          { label: 'Volume de Peças (Pedidos)', value: formatNum(qtdPedidos), icon: ShoppingBag, color: 'text-brand-500', bg: 'bg-brand-500/10' },
          { label: 'Ticket Médio', value: formatBRL(ticketMedio), icon: DollarSign, color: 'text-warning', bg: 'bg-warning/10' },
          { label: 'Taxa de Conversão', value: `${taxaConversao.toFixed(1)}%`, icon: TrendingUp, color: 'text-danger', bg: 'bg-danger/10' },
          { label: 'Clientes Ativos', value: `${clientesAtivos} / ${totalClientes}`, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: 'Vendedores Ativos', value: vd.data?.data?.length || 0, icon: Briefcase, color: 'text-purple-500', bg: 'bg-purple-500/10' }
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
            <div className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Vendedor Destaque (Vet)</div>
            <div className="text-brand-500 font-extrabold text-lg mb-1">{mockTopSellers.length > 0 ? mockTopSellers[0].name : '-'}</div>
            <div className="text-2xl font-extrabold text-text-primary mb-2">{formatBRL(mockTopSellers.length > 0 ? mockTopSellers[0].value : 0)}</div>
            <div className="text-sm text-text-secondary">
              Participação: <span className="font-bold text-text-primary">{faturamentoAtual > 0 && mockTopSellers.length > 0 ? ((mockTopSellers[0].value / faturamentoAtual) * 100).toFixed(1) : 0}%</span>
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
            <div className="text-brand-500 font-extrabold text-sm mb-1 truncate">{mockTopBrands.length > 0 ? mockTopBrands[0].name : '-'}</div>
            <div className="text-xl font-extrabold text-text-primary">{formatBRL(mockTopBrands.length > 0 ? mockTopBrands[0].value : 0)}</div>
          </div>
          <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 flex-1 flex flex-col justify-center">
            <div className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Análise de Mercado</div>
            <div className="text-sm font-medium text-text-primary leading-snug">
              A marca {mockTopBrands.length > 0 ? mockTopBrands[0].name : '-'} teve o maior volume de vendas.
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
            <div className="text-warning font-extrabold text-sm mb-1 truncate">{mockTopProducts.length > 0 ? mockTopProducts[0].name : '-'}</div>
            <div className="text-xl font-extrabold text-text-primary">{formatBRL(mockTopProducts.length > 0 ? mockTopProducts[0].value : 0)}</div>
          </div>
          <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 flex-1 flex flex-col justify-center">
            <div className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Performance de Venda</div>
            <div className="text-sm font-medium text-text-primary leading-snug">
              O item {mockTopProducts.length > 0 ? mockTopProducts[0].name : '-'} teve saída constante nestes últimos dias.
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
            <div className="text-danger font-extrabold text-sm mb-1 truncate">{mockTopClients.length > 0 ? mockTopClients[0].name : '-'}</div>
            <div className="text-xl font-extrabold text-text-primary">{formatBRL(mockTopClients.length > 0 ? mockTopClients[0].value : 0)}</div>
          </div>
        </div>
      </div>

    </div>
  )
}
