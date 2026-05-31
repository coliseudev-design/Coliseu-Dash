import { useMemo, useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie
} from 'recharts'
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingBag, 
  Users, Award, Map, Target, Briefcase, Box, AlertCircle,
  FileText, BarChart3
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
  const [isMobile, setIsMobile] = useState(false);
  const [faturamentoPeriod, setFaturamentoPeriod] = useState<'7D' | '30D' | '90D' | 'Tudo'>('Tudo')
  const [faturamentoGroupBy, setFaturamentoGroupBy] = useState<'dia' | 'mes'>('mes')
  const [viewMode, setViewMode] = useState<Record<string, 'chart' | 'text'>>({
    vendedores: 'chart',
    marcas: 'chart',
    grupos: 'chart',
    cidades: 'chart',
    faturamento: 'chart',
  })

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const ov = useBranchPeriodQuery<any>('/estatisticas/overview')
  const kpisData = useBranchPeriodQuery<any>('/estatisticas/kpis')
  const fatMes = useBranchPeriodQuery<any>('/vendas/faturadas')
  const vd = useBranchPeriodQuery<any>('/ranking/vendedores')
  const prod = useBranchPeriodQuery<any>('/ranking/produtos')
  const cli = useBranchPeriodQuery<any>('/ranking/clientes')
  const marcas = useBranchPeriodQuery<any>('/ranking/marcas')
  const cidades = useBranchPeriodQuery<any>('/ranking/cidades', { limit: 15 })
  const grupos = useBranchPeriodQuery<any>('/ranking/categorias')

  const period = usePeriodStore((s) => s.period)
  
  // Real data mapping
  const faturamentoAtual = ov.data?.mes?.total || 0;
  const qtdPedidos = kpisData.data?.vendas?.qtd_pedidos || ov.data?.mes?.qtd || 0;
  const ticketMedio = kpisData.data?.vendas?.ticket_medio || (qtdPedidos > 0 ? faturamentoAtual / qtdPedidos : 0);
  const clientesAtivos = kpisData.data?.kpis?.clientes_ativos || 0;
  const totalClientes = kpisData.data?.kpis?.total_clientes || 0;
  const taxaConversao = kpisData.data?.kpis?.taxa_conversao_pct || 0;
  
  const mockFaturamentoAnterior = ov.data?.anterior?.total || 0;

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

  const filteredFaturamentoData = useMemo(() => {
    if (faturamentoPeriod === '7D') {
      return faturamentoPeriodoData.slice(-7);
    }
    if (faturamentoPeriod === '30D') {
      return faturamentoPeriodoData.slice(-30);
    }
    if (faturamentoPeriod === '90D') {
      return faturamentoPeriodoData.slice(-90);
    }
    return faturamentoPeriodoData;
  }, [faturamentoPeriodoData, faturamentoPeriod]);

  const groupedFaturamentoData = useMemo(() => {
    if (faturamentoGroupBy === 'dia') {
      return filteredFaturamentoData.map((item: any) => {
        let label = item.data;
        if (label && label.includes('-')) {
          const parts = label.split('-');
          if (parts.length >= 3) {
            label = `${parts[2]}/${parts[1]}`;
          }
        }
        return {
          ...item,
          label
        };
      });
    } else {
      const groups: Record<string, { key: string; label: string; total: number }> = {};
      
      filteredFaturamentoData.forEach((item: any) => {
        let monthKey = '';
        let monthLabel = '';
        
        if (item.data && item.data.includes('-')) {
          const parts = item.data.split('-');
          if (parts.length >= 2) {
            const year = parts[0];
            const month = parts[1];
            monthKey = `${year}-${month}`;
            
            const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
            const monthIdx = parseInt(month, 10) - 1;
            const shortYear = year.slice(2);
            if (monthIdx >= 0 && monthIdx < 12) {
              monthLabel = `${monthNames[monthIdx]}/${shortYear}`;
            } else {
              monthLabel = `${month}/${year}`;
            }
          } else {
            monthKey = item.data;
            monthLabel = item.data;
          }
        } else {
          monthKey = item.data;
          monthLabel = item.data;
        }
        
        if (!groups[monthKey]) {
          groups[monthKey] = {
            key: monthKey,
            label: monthLabel,
            total: 0
          };
        }
        groups[monthKey].total += item.total || 0;
      });
      
      return Object.values(groups)
        .sort((a, b) => a.key.localeCompare(b.key))
        .map(g => ({
          data: g.key,
          label: g.label,
          total: g.total
        }));
    }
  }, [filteredFaturamentoData, faturamentoGroupBy]);

  const maxPeriodVal = useMemo(() => {
    if (groupedFaturamentoData.length === 0) return 1;
    return Math.max(...groupedFaturamentoData.map((item: any) => item.total), 1);
  }, [groupedFaturamentoData]);

  const mockTopSellers = vd.data?.data?.map((s: any) => ({ name: s.nome || s.vendedor, value: s.total || s.total_vendas })) || [];

  const mockTopBrands = marcas.data?.data?.map((m: any) => ({ name: m.nome || m.marca, value: m.total })) || [];

  const mockTopGroups = grupos.data?.data?.map((g: any) => ({ name: g.nome || g.grupo || g.categoria, value: g.total })) || [];

  const mockTopProducts = prod.data?.data?.map((p: any) => ({ name: p.nome || p.produto, value: p.total })) || [];

  // Real Top Cities from the ranking API
  const mockTopCities = cidades.data?.data?.map((c: any) => ({ name: c.nome, value: c.total })) || [];

  const mockTopClients = cli.data?.data?.map((c: any, i: number) => ({ rank: i + 1, name: c.nome, value: c.total })) || [];

  const bestSeller = useMemo(() => {
    if (mockTopSellers.length === 0) return null;
    const first = mockTopSellers[0];
    const pct = faturamentoAtual > 0 ? (first.value / faturamentoAtual) * 100 : 0;
    return {
      name: first.name,
      value: first.value,
      pct: pct
    };
  }, [mockTopSellers, faturamentoAtual]);

  const totalVendedores = vd.data?.data?.length || 0;
  const mediaPorVendedor = totalVendedores > 0 ? faturamentoAtual / totalVendedores : 0;
  const cidadeLider = mockTopCities[0]?.name || '—';


  const barColors = [
    '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', 
  ];

  const getFaturamentoSummary = () => {
    if (groupedFaturamentoData.length === 0) return "Nenhum dado de faturamento disponível no período."
    const sorted = [...groupedFaturamentoData].sort((a: any, b: any) => b.total - a.total)
    const peak = sorted[0]
    const lowest = sorted[sorted.length - 1]
    const formatName = faturamentoGroupBy === 'mes' ? 'mensal' : 'diário';
    return `O faturamento ${formatName} demonstra variação no período de consulta, registrando um pico de faturamento em ${peak.label} no valor de ${formatBRL(peak.total)}, e o menor faturamento em ${lowest.label} no valor de ${formatBRL(lowest.total)}.`
  }

  const getVendedoresSummary = () => {
    if (mockTopSellers.length === 0) return "Nenhum dado de consultores disponível no período."
    const leader = mockTopSellers[0]
    const runnerUp = mockTopSellers[1]
    const totalVal = mockTopSellers.reduce((acc: number, curr: any) => acc + curr.value, 0)
    const leaderPct = totalVal > 0 ? (leader.value / totalVal) * 100 : 0
    
    let text = `O consultor destaque de vendas é ${leader.name} com faturamento acumulado de ${formatBRL(leader.value)}, representando ${leaderPct.toFixed(1)}% das vendas do grupo.`
    if (runnerUp) {
      text += ` Na sequência, destaca-se ${runnerUp.name} com vendas de ${formatBRL(runnerUp.value)}.`
    }
    return text
  }

  const getMarcasSummary = () => {
    if (mockTopBrands.length === 0) return "Nenhum dado de marcas disponível no período."
    const leader = mockTopBrands[0]
    const runnerUp = mockTopBrands[1]
    const totalVal = mockTopBrands.reduce((acc: number, curr: any) => acc + curr.value, 0)
    const leaderPct = totalVal > 0 ? (leader.value / totalVal) * 100 : 0
    
    let text = `A marca líder de vendas é ${leader.name} com receita de ${formatBRL(leader.value)}, correspondendo a ${leaderPct.toFixed(1)}% do faturamento de marcas.`
    if (runnerUp) {
      text += ` A marca ${runnerUp.name} ocupa a segunda posição registrando ${formatBRL(runnerUp.value)}.`
    }
    return text
  }

  const getGruposSummary = () => {
    if (mockTopGroups.length === 0) return "Nenhum dado de categorias/grupos disponível."
    const leader = mockTopGroups[0]
    const runnerUp = mockTopGroups[1]
    const totalVal = mockTopGroups.reduce((acc: number, curr: any) => acc + curr.value, 0)
    const leaderPct = totalVal > 0 ? (leader.value / totalVal) * 100 : 0
    
    let text = `O grupo/categoria de produtos líder em volume financeiro é ${leader.name} com ${formatBRL(leader.value)}, concentrando ${leaderPct.toFixed(1)}% do giro total.`
    if (runnerUp) {
      text += ` O grupo ${runnerUp.name} fica em segundo com faturamento de ${formatBRL(runnerUp.value)}.`
    }
    return text
  }

  const getCidadesSummary = () => {
    if (mockTopCities.length === 0) return "Nenhum dado de cidades disponível no período."
    const leader = mockTopCities[0]
    const runnerUp = mockTopCities[1]
    const totalVal = mockTopCities.reduce((acc: number, curr: any) => acc + curr.value, 0)
    const leaderPct = totalVal > 0 ? (leader.value / totalVal) * 100 : 0
    
    let text = `O faturamento regional é liderado pela cidade de ${leader.name} com vendas de ${formatBRL(leader.value)}, representando ${leaderPct.toFixed(1)}% da receita regional.`
    if (runnerUp) {
      text += ` A cidade de ${runnerUp.name} se posiciona logo em seguida com faturamento de ${formatBRL(runnerUp.value)}.`
    }
    return text
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Inteligência de Negócios</h2>
          <p className="text-sm text-text-secondary mt-1">Visão Estratégica e análise de performance do sistema Siscom Vet</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-3">
          <PeriodFilter />
        </div>
      </div>

      {/* TIER 1: FATURAMENTO & CLIENTES ATIVOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-bg-primary rounded-xl p-5 border border-divider shadow-card flex flex-col justify-center items-center text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-brand-500"></div>
          <span className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Faturamento Mês Atual (Vet)</span>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">🔥</span>
            <span className="text-3xl font-extrabold text-text-primary">{formatBRL(faturamentoAtual)}</span>
          </div>
          <ComparisonBadge pct={faturamentoCrescimento} />
        </div>

        <div className="bg-bg-primary rounded-xl p-5 border border-divider shadow-card flex flex-col justify-center items-center text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-brand-500"></div>
          <span className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Melhor Vendedor do Período</span>
          {bestSeller && bestSeller.value > 0 ? (
            <div className="w-full flex flex-col items-center">
              <span className="text-lg font-bold text-brand-500 truncate max-w-[220px] mb-1">{bestSeller.name}</span>
              <span className="text-2xl font-extrabold text-text-primary mb-1">{formatBRL(bestSeller.value)}</span>
              <div className="w-full max-w-[200px] bg-bg-secondary rounded-full h-1.5 mt-1 overflow-hidden">
                <div className="bg-brand-500 h-1.5 rounded-full" style={{ width: `${bestSeller.pct}%` }}></div>
              </div>
              <span className="text-[10px] font-bold text-text-secondary mt-1">
                {bestSeller.pct.toFixed(1)}% do faturamento total
              </span>
            </div>
          ) : (
            <div className="text-text-muted text-xs italic py-4">Sem vendas no período</div>
          )}
        </div>

        <div className="bg-bg-primary rounded-xl p-5 border border-divider shadow-card flex flex-col justify-center items-center text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-text-muted/30"></div>
          <span className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Faturamento Mês Anterior (Vet)</span>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-3xl font-extrabold text-text-primary">{formatBRL(mockFaturamentoAnterior)}</span>
          </div>
          <div className="text-xs font-medium text-text-secondary px-2 py-1 bg-bg-secondary rounded-md">Referência</div>
        </div>
      </div>

      {/* OPERATIONAL KPIS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: 'Volume de Peças', value: formatNum(qtdPedidos), icon: Box, color: 'text-brand-500', bg: 'bg-brand-50/80 dark:bg-brand-500/10' },
          { label: 'Ticket Médio', value: formatBRL(ticketMedio), icon: Target, color: 'text-brand-600', bg: 'bg-brand-50/80 dark:bg-brand-500/10' },
          { label: 'Taxa de Conversão', value: `${taxaConversao.toFixed(1)}%`, icon: TrendingUp, color: 'text-brand-500', bg: 'bg-brand-50/80 dark:bg-brand-500/10' },
          { label: 'Clientes com Compra', value: formatNum(clientesAtivos), icon: Users, color: 'text-brand-600', bg: 'bg-brand-50/80 dark:bg-brand-500/10' },
          { label: 'Cidade Líder', value: cidadeLider, icon: Map, color: 'text-brand-500', bg: 'bg-brand-50/80 dark:bg-brand-500/10' }
        ].map((kpi, idx) => (
          <div key={idx} className="bg-bg-primary rounded-xl p-4 border border-divider shadow-card flex items-center gap-4">
            <div className={clsx('p-3 rounded-lg', kpi.bg, kpi.color)}>
              <kpi.icon size={20} />
            </div>
            <div>
              <div className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">{kpi.label}</div>
              <div className="text-lg font-bold text-text-primary truncate max-w-[120px] sm:max-w-none">{kpi.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* TIER 4: GRÁFICO PRINCIPAL */}
      <div className="w-full bg-bg-primary border border-divider shadow-card rounded-xl p-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
          <h3 className="font-bold text-text-primary text-xs uppercase tracking-wider">Faturamento no Período</h3>
          
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            {/* Agrupamento: Diário / Mensal */}
            <div className="flex items-center gap-1 bg-bg-secondary p-0.5 rounded-lg border border-divider">
              <button
                onClick={() => setFaturamentoGroupBy('dia')}
                className={clsx(
                  "px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer",
                  faturamentoGroupBy === 'dia'
                    ? "bg-bg-primary text-brand-500 shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                Diário
              </button>
              <button
                onClick={() => setFaturamentoGroupBy('mes')}
                className={clsx(
                  "px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer",
                  faturamentoGroupBy === 'mes'
                    ? "bg-bg-primary text-brand-500 shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                Mensal
              </button>
            </div>

            {/* Quick Period Selector */}
            <div className="flex items-center gap-1 bg-bg-secondary p-0.5 rounded-lg border border-divider">
              {(['7D', '30D', '90D', 'Tudo'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setFaturamentoPeriod(range)}
                  className={clsx(
                    "px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer",
                    faturamentoPeriod === range
                      ? "bg-bg-primary text-brand-500 shadow-sm"
                      : "text-text-secondary hover:text-text-primary"
                  )}
                >
                  {range}
                </button>
              ))}
            </div>

            {/* Chaveador de Visualização */}
            <div className="flex items-center gap-1 bg-bg-secondary p-0.5 rounded-lg border border-divider">
              <button
                onClick={() => setViewMode(prev => ({ ...prev, faturamento: 'chart' }))}
                className={clsx(
                  "p-1.5 rounded-md transition-all cursor-pointer",
                  viewMode.faturamento === 'chart'
                    ? "bg-bg-primary text-brand-500 shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                )}
                title="Ver Gráfico"
              >
                <BarChart3 size={14} />
              </button>
              <button
                onClick={() => setViewMode(prev => ({ ...prev, faturamento: 'text' }))}
                className={clsx(
                  "p-1.5 rounded-md transition-all cursor-pointer",
                  viewMode.faturamento === 'text'
                    ? "bg-bg-primary text-brand-500 shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                )}
                title="Ver Resumo Textual"
              >
                <FileText size={14} />
              </button>
            </div>
          </div>
        </div>
        
        <div className="h-[280px]">
          {viewMode.faturamento === 'chart' ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={groupedFaturamentoData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.5} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => formatBRLCompact(v)} tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-bg-tertiary)', opacity: 0.4 }} />
                <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={40}>
                  {groupedFaturamentoData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={barColors[index % barColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="space-y-3 h-full flex flex-col">
              <p className="text-xs text-text-secondary italic leading-relaxed border-l-2 border-brand-500 pl-3">
                {getFaturamentoSummary()}
              </p>
              <div className="flex-1 overflow-y-auto pr-1 space-y-2">
                {groupedFaturamentoData.map((item: any, index: number) => {
                  const isPeak = item.total === maxPeriodVal;
                  const pct = maxPeriodVal > 0 ? (item.total / maxPeriodVal) * 100 : 0;
                  return (
                    <div
                      key={index}
                      className={clsx(
                        "flex flex-col p-3 rounded-xl border transition-all hover:bg-bg-secondary/40",
                        isPeak ? "border-brand-500/40 bg-brand-500/[0.02]" : "border-divider bg-bg-secondary/20"
                      )}
                    >
                      <div className="flex justify-between items-center mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-text-primary uppercase tracking-wide">{item.label}</span>
                          {isPeak && (
                            <span className="text-[9px] font-extrabold text-brand-600 bg-brand-500/10 px-2 py-0.5 rounded-full leading-none flex items-center gap-1 shadow-sm">
                              Pico 👑
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-bold text-text-primary font-mono">{formatBRL(item.total)}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-bg-secondary h-1.5 rounded-full overflow-hidden">
                          <div
                            className={clsx(
                              "h-full rounded-full transition-all duration-500",
                              isPeak ? "bg-brand-500" : "bg-brand-400"
                            )}
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                        <span className="text-[9px] font-extrabold text-text-secondary leading-none shrink-0 font-mono">
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>


      {/* ROW 5: VENDEDORES */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 bg-bg-primary border border-divider shadow-card rounded-xl p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-text-primary text-xs uppercase tracking-wider">Vendedores (Top 10)</h3>
            
            {/* Chaveador de Visualização */}
            <div className="flex items-center gap-1 bg-bg-secondary p-0.5 rounded-lg border border-divider">
              <button
                onClick={() => setViewMode(prev => ({ ...prev, vendedores: 'chart' }))}
                className={clsx(
                  "p-1.5 rounded-md transition-all cursor-pointer",
                  viewMode.vendedores === 'chart'
                    ? "bg-bg-primary text-brand-500 shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                )}
                title="Ver Gráfico"
              >
                <BarChart3 size={14} />
              </button>
              <button
                onClick={() => setViewMode(prev => ({ ...prev, vendedores: 'text' }))}
                className={clsx(
                  "p-1.5 rounded-md transition-all cursor-pointer",
                  viewMode.vendedores === 'text'
                    ? "bg-bg-primary text-brand-500 shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                )}
                title="Ver Dados/Texto"
              >
                <FileText size={14} />
              </button>
            </div>
          </div>
          
          <div className="h-[260px]">
            {viewMode.vendedores === 'chart' ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockTopSellers.slice(1)} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" opacity={0.5} />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false} 
                    tickFormatter={(v) => String(v).length > 12 ? String(v).substring(0, 12) + '...' : v}
                    tick={{ fontSize: 11, fill: 'var(--color-text-primary)', fontWeight: 600 }} 
                    width={isMobile ? 80 : 120} 
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-bg-tertiary)', opacity: 0.4 }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={20}>
                    {mockTopSellers.slice(1).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={barColors[index % barColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[260px] overflow-y-auto pr-1 space-y-2">
                {mockTopSellers.slice(1).map((seller: any, index: number) => {
                  const pct = faturamentoAtual > 0 ? (seller.value / faturamentoAtual) * 100 : 0
                  const rank = index + 2
                  return (
                    <div
                      key={index}
                      className="flex flex-col p-3 rounded-xl border border-divider bg-bg-secondary/20 transition-all hover:bg-bg-secondary/40"
                    >
                      <div className="flex justify-between items-center mb-1.5">
                        <div className="flex items-center gap-2">
                          {rank === 1 && <span className="text-lg shrink-0">🥇</span>}
                          {rank === 2 && <span className="text-lg shrink-0">🥈</span>}
                          {rank === 3 && <span className="text-lg shrink-0">🥉</span>}
                          {rank > 3 && (
                            <span className="text-[10px] font-extrabold text-text-muted bg-bg-secondary border border-divider w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                              {rank}
                            </span>
                          )}
                          <span className="text-xs font-bold text-text-primary truncate max-w-[150px] sm:max-w-none">{seller.name}</span>
                        </div>
                        <span className="text-xs font-bold text-text-primary font-mono">{formatBRL(seller.value)}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-bg-secondary h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-brand-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                        <span className="text-[9px] font-extrabold text-brand-500 bg-brand-500/10 px-1.5 py-0.5 rounded-full shrink-0 leading-none">
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
        
        <div className="lg:col-span-1 bg-bg-primary border border-divider shadow-card rounded-xl p-5 flex flex-col justify-center space-y-2">
          <div className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">Desempenho da Equipe</div>
          <div className="text-brand-500 font-extrabold text-sm mb-1 truncate">Vendedores Ativos: {totalVendedores}</div>
          <div className="text-xl font-extrabold text-text-primary">{formatBRL(mediaPorVendedor)}</div>
          <div className="text-[10px] text-text-secondary mt-1">
            Média por vendedor no período
          </div>
        </div>
      </div>

      {/* ROW 6: MARCAS */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 bg-bg-primary border border-divider shadow-card rounded-xl p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-text-primary text-xs uppercase tracking-wider">Marcas (Top 15)</h3>
            
            {/* Chaveador de Visualização */}
            <div className="flex items-center gap-1 bg-bg-secondary p-0.5 rounded-lg border border-divider">
              <button
                onClick={() => setViewMode(prev => ({ ...prev, marcas: 'chart' }))}
                className={clsx(
                  "p-1.5 rounded-md transition-all cursor-pointer",
                  viewMode.marcas === 'chart'
                    ? "bg-bg-primary text-brand-500 shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                )}
                title="Ver Gráfico"
              >
                <BarChart3 size={14} />
              </button>
              <button
                onClick={() => setViewMode(prev => ({ ...prev, marcas: 'text' }))}
                className={clsx(
                  "p-1.5 rounded-md transition-all cursor-pointer",
                  viewMode.marcas === 'text'
                    ? "bg-bg-primary text-brand-500 shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                )}
                title="Ver Dados/Texto"
              >
                <FileText size={14} />
              </button>
            </div>
          </div>
          
          <div className="h-[260px]">
            {viewMode.marcas === 'chart' ? (
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
                    width={isMobile ? 80 : 120} 
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-bg-tertiary)', opacity: 0.4 }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={20}>
                    {mockTopBrands.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={barColors[(index + 3) % barColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[260px] overflow-y-auto pr-1 space-y-2">
                {mockTopBrands.map((brand: any, index: number) => {
                  const pct = faturamentoAtual > 0 ? (brand.value / faturamentoAtual) * 100 : 0
                  const rank = index + 1
                  return (
                    <div
                      key={index}
                      className="flex flex-col p-3 rounded-xl border border-divider bg-bg-secondary/20 transition-all hover:bg-bg-secondary/40"
                    >
                      <div className="flex justify-between items-center mb-1.5">
                        <div className="flex items-center gap-2">
                          {rank === 1 && <span className="text-lg shrink-0">🥇</span>}
                          {rank === 2 && <span className="text-lg shrink-0">🥈</span>}
                          {rank === 3 && <span className="text-lg shrink-0">🥉</span>}
                          {rank > 3 && (
                            <span className="text-[10px] font-extrabold text-text-muted bg-bg-secondary border border-divider w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                              {rank}
                            </span>
                          )}
                          <span className="text-xs font-bold text-text-primary truncate max-w-[150px] sm:max-w-none">{brand.name}</span>
                        </div>
                        <span className="text-xs font-bold text-text-primary font-mono">{formatBRL(brand.value)}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-bg-secondary h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-brand-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                        <span className="text-[9px] font-extrabold text-brand-500 bg-brand-500/10 px-1.5 py-0.5 rounded-full shrink-0 leading-none">
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
        
        <div className="lg:col-span-1 bg-bg-primary border border-divider shadow-card rounded-xl p-5 flex flex-col justify-center space-y-2">
          <div className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">Maior Marca</div>
          <div className="text-brand-500 font-extrabold text-sm mb-1 truncate">{mockTopBrands.length > 0 ? mockTopBrands[0].name : '-'}</div>
          <div className="text-xl font-extrabold text-text-primary">{formatBRL(mockTopBrands.length > 0 ? mockTopBrands[0].value : 0)}</div>
          <div className="text-[10px] text-text-secondary mt-1">
            Participação: {faturamentoAtual > 0 && mockTopBrands.length > 0 ? ((mockTopBrands[0].value / faturamentoAtual) * 100).toFixed(1) : 0}%
          </div>
        </div>
      </div>

      {/* ROW 7: GRUPOS */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 bg-bg-primary border border-divider shadow-card rounded-xl p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-text-primary text-xs uppercase tracking-wider">Grupos / Categorias (Top 15)</h3>
            
            {/* Chaveador de Visualização */}
            <div className="flex items-center gap-1 bg-bg-secondary p-0.5 rounded-lg border border-divider">
              <button
                onClick={() => setViewMode(prev => ({ ...prev, grupos: 'chart' }))}
                className={clsx(
                  "p-1.5 rounded-md transition-all cursor-pointer",
                  viewMode.grupos === 'chart'
                    ? "bg-bg-primary text-brand-500 shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                )}
                title="Ver Gráfico"
              >
                <BarChart3 size={14} />
              </button>
              <button
                onClick={() => setViewMode(prev => ({ ...prev, grupos: 'text' }))}
                className={clsx(
                  "p-1.5 rounded-md transition-all cursor-pointer",
                  viewMode.grupos === 'text'
                    ? "bg-bg-primary text-brand-500 shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                )}
                title="Ver Dados/Texto"
              >
                <FileText size={14} />
              </button>
            </div>
          </div>
          
          <div className="h-[260px]">
            {viewMode.grupos === 'chart' ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockTopGroups} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" opacity={0.5} />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false} 
                    tickFormatter={(v) => String(v).length > 15 ? String(v).substring(0, 15) + '...' : v}
                    tick={{ fontSize: 11, fill: 'var(--color-text-primary)', fontWeight: 600 }} 
                    width={isMobile ? 80 : 120} 
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-bg-tertiary)', opacity: 0.4 }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={20}>
                    {mockTopGroups.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={barColors[(index + 5) % barColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[260px] overflow-y-auto pr-1 space-y-2">
                {mockTopGroups.map((grupo: any, index: number) => {
                  const pct = faturamentoAtual > 0 ? (grupo.value / faturamentoAtual) * 100 : 0
                  const rank = index + 1
                  return (
                    <div
                      key={index}
                      className="flex flex-col p-3 rounded-xl border border-divider bg-bg-secondary/20 transition-all hover:bg-bg-secondary/40"
                    >
                      <div className="flex justify-between items-center mb-1.5">
                        <div className="flex items-center gap-2">
                          {rank === 1 && <span className="text-lg shrink-0">🥇</span>}
                          {rank === 2 && <span className="text-lg shrink-0">🥈</span>}
                          {rank === 3 && <span className="text-lg shrink-0">🥉</span>}
                          {rank > 3 && (
                            <span className="text-[10px] font-extrabold text-text-muted bg-bg-secondary border border-divider w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                              {rank}
                            </span>
                          )}
                          <span className="text-xs font-bold text-text-primary truncate max-w-[150px] sm:max-w-none">{grupo.name}</span>
                        </div>
                        <span className="text-xs font-bold text-text-primary font-mono">{formatBRL(grupo.value)}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-bg-secondary h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-brand-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                        <span className="text-[9px] font-extrabold text-brand-500 bg-brand-500/10 px-1.5 py-0.5 rounded-full shrink-0 leading-none">
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
        
        <div className="lg:col-span-1 bg-bg-primary border border-divider shadow-card rounded-xl p-5 flex flex-col justify-center space-y-2">
          <div className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">Grupo Destaque</div>
          <div className="text-brand-500 font-extrabold text-sm mb-1 truncate">{mockTopGroups.length > 0 ? mockTopGroups[0].name : '-'}</div>
          <div className="text-xl font-extrabold text-text-primary">{formatBRL(mockTopGroups.length > 0 ? mockTopGroups[0].value : 0)}</div>
          <div className="text-[10px] text-text-secondary mt-1">
            Participação: {faturamentoAtual > 0 && mockTopGroups.length > 0 ? ((mockTopGroups[0].value / faturamentoAtual) * 100).toFixed(1) : 0}%
          </div>
        </div>
      </div>

      {/* ROW 8: CIDADES */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 bg-bg-primary border border-divider shadow-card rounded-xl p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-text-primary text-xs uppercase tracking-wider">Cidades (Top 15)</h3>
            
            {/* Chaveador de Visualização */}
            <div className="flex items-center gap-1 bg-bg-secondary p-0.5 rounded-lg border border-divider">
              <button
                onClick={() => setViewMode(prev => ({ ...prev, cidades: 'chart' }))}
                className={clsx(
                  "p-1.5 rounded-md transition-all cursor-pointer",
                  viewMode.cidades === 'chart'
                    ? "bg-bg-primary text-brand-500 shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                )}
                title="Ver Gráfico"
              >
                <BarChart3 size={14} />
              </button>
              <button
                onClick={() => setViewMode(prev => ({ ...prev, cidades: 'text' }))}
                className={clsx(
                  "p-1.5 rounded-md transition-all cursor-pointer",
                  viewMode.cidades === 'text'
                    ? "bg-bg-primary text-brand-500 shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                )}
                title="Ver Dados/Texto"
              >
                <FileText size={14} />
              </button>
            </div>
          </div>
          
          <div className="h-[280px]">
            {viewMode.cidades === 'chart' ? (
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
                    width={isMobile ? 80 : 120} 
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-bg-tertiary)', opacity: 0.4 }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16}>
                    {mockTopCities.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={barColors[index % barColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] overflow-y-auto pr-1 space-y-2">
                {mockTopCities.map((city: any, index: number) => {
                  const pct = faturamentoAtual > 0 ? (city.value / faturamentoAtual) * 100 : 0
                  const rank = index + 1
                  return (
                    <div
                      key={index}
                      className="flex flex-col p-3 rounded-xl border border-divider bg-bg-secondary/20 transition-all hover:bg-bg-secondary/40"
                    >
                      <div className="flex justify-between items-center mb-1.5">
                        <div className="flex items-center gap-2">
                          {rank === 1 && <span className="text-lg shrink-0">🥇</span>}
                          {rank === 2 && <span className="text-lg shrink-0">🥈</span>}
                          {rank === 3 && <span className="text-lg shrink-0">🥉</span>}
                          {rank > 3 && (
                            <span className="text-[10px] font-extrabold text-text-muted bg-bg-secondary border border-divider w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                              {rank}
                            </span>
                          )}
                          <span className="text-xs font-bold text-text-primary truncate max-w-[150px] sm:max-w-none">{city.name}</span>
                        </div>
                        <span className="text-xs font-bold text-text-primary font-mono">{formatBRL(city.value)}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-bg-secondary h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-brand-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                        <span className="text-[9px] font-extrabold text-brand-500 bg-brand-500/10 px-1.5 py-0.5 rounded-full shrink-0 leading-none">
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
        
        <div className="lg:col-span-1 bg-bg-primary border border-divider shadow-card rounded-xl p-5 flex flex-col justify-center space-y-2">
          <div className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">Cidade Destaque</div>
          <div className="text-brand-500 font-extrabold text-sm mb-1 truncate">
            {mockTopCities.length > 0 ? mockTopCities[0].name : '—'}
          </div>
          <div className="text-xl font-extrabold text-text-primary">
            {mockTopCities.length > 0 ? formatBRL(mockTopCities[0].value) : formatBRL(0)}
          </div>
          <div className="text-xs text-text-muted mt-1">
            Participação: {faturamentoAtual > 0 && mockTopCities.length > 0 ? ((mockTopCities[0].value / faturamentoAtual) * 100).toFixed(1) : '0.0'}%
          </div>
        </div>
      </div>

      {/* ROW 9: CLIENTES */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 bg-bg-primary border border-divider shadow-card rounded-xl p-5 flex flex-col">
          <div className="flex justify-between items-center mb-4 border-b border-divider pb-2">
            <h3 className="font-bold text-text-primary text-xs uppercase tracking-wider">Top 15 Clientes</h3>
          </div>
          <div className="flex-1 overflow-y-auto pr-2 max-h-[300px]">
            <div className="space-y-2">
              {mockTopClients.map((client: any) => (
                <div key={client.rank} className="flex items-center justify-between p-2.5 rounded-lg bg-bg-secondary/20 hover:bg-bg-secondary transition-all border border-transparent hover:border-divider">
                  <div className="flex items-center gap-4">
                    <div className="w-6 text-text-muted font-bold text-xs">{String(client.rank).padStart(2, '0')}</div>
                    <div className="font-bold text-text-primary text-xs">{client.name}</div>
                  </div>
                  <div className="font-bold text-text-primary font-mono text-xs">{formatBRL(client.value)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="lg:col-span-1 bg-bg-primary border border-divider shadow-card rounded-xl p-5 flex flex-col justify-center space-y-2">
          <div className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">Cliente Destaque</div>
          <div className="text-brand-500 font-extrabold text-sm mb-1 truncate">{mockTopClients.length > 0 ? mockTopClients[0].name : '-'}</div>
          <div className="text-xl font-extrabold text-text-primary">{formatBRL(mockTopClients.length > 0 ? mockTopClients[0].value : 0)}</div>
        </div>
      </div>

    </div>
  )
}
