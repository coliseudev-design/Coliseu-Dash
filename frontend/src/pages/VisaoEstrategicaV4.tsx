import { useMemo, useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell
} from 'recharts'
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingBag, 
  Users, Award, Map, Target, Briefcase, Box, AlertCircle,
  FileText, BarChart3, Calendar, Tag, MapPin, X
} from 'lucide-react'
import { useBranchPeriodQuery } from '../hooks/useApi'
import PeriodFilter from '../components/PeriodFilter'
import { usePeriodStore, PERIOD_OPTIONS } from '../store/periodStore'
import { formatBRL, formatBRLCompact, formatNum } from '../utils/format'
import { CHART_COLORS, CHART_PALETTE } from '../utils/chartColors'
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
      "flex items-center text-[10px] sm:text-xs font-extrabold px-2 py-0.5 rounded-md leading-none shadow-sm shrink-0",
      isUp ? "bg-success/15 text-success" : isDown ? "bg-danger/15 text-danger" : "bg-text-muted/15 text-text-muted"
    )}>
      {isUp && <TrendingUp size={12} className="mr-1" />}
      {isDown && <TrendingDown size={12} className="mr-1" />}
      {Math.abs(pct).toFixed(1)}%
    </div>
  );
}

export default function VisaoEstrategicaV4() {
  const [isMobile, setIsMobile] = useState(false);
  const [faturamentoGroupBy, setFaturamentoGroupBy] = useState<'dia' | 'mes'>('mes')
  const [viewMode, setViewMode] = useState<Record<string, 'chart' | 'text'>>({
    faturamento: 'chart',
  })
  const [rankingViews, setRankingViews] = useState<Record<string, 'list' | 'bar'>>({
    marcas: 'list',
    grupos: 'list',
    cidades: 'list',
    clientes: 'list'
  })

  // Filter States
  const [selectedMarca, setSelectedMarca] = useState<string>('');
  const [selectedVendedor, setSelectedVendedor] = useState<string>('');
  const [selectedCidade, setSelectedCidade] = useState<string>('');
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch full filters lists
  const vdFull = useBranchPeriodQuery<any>('/ranking/vendedores', { limit: 100 });
  const marcasFull = useBranchPeriodQuery<any>('/ranking/marcas', { limit: 100 });
  const cidadesFull = useBranchPeriodQuery<any>('/ranking/cidades', { limit: 100 });

  // Query parameter merging
  const extraParams = useMemo(() => ({
    vendedor_id: selectedVendedor || undefined
  }), [selectedVendedor]);

  // Main page data queries
  const ov = useBranchPeriodQuery<any>('/estatisticas/overview', extraParams);
  const ov30 = useBranchPeriodQuery<any>('/estatisticas/overview', { period: 'last30', ...extraParams });
  const ov60 = useBranchPeriodQuery<any>('/estatisticas/overview', { period: 'last60', ...extraParams });

  const kpisData = useBranchPeriodQuery<any>('/estatisticas/kpis', extraParams);
  const fatMes = useBranchPeriodQuery<any>('/vendas/faturadas', extraParams);
  const vd = useBranchPeriodQuery<any>('/ranking/vendedores', extraParams);
  const prod = useBranchPeriodQuery<any>('/ranking/produtos', extraParams);
  const cli = useBranchPeriodQuery<any>('/ranking/clientes', extraParams);
  const marcas = useBranchPeriodQuery<any>('/ranking/marcas', extraParams);
  const cidades = useBranchPeriodQuery<any>('/ranking/cidades', { limit: 15, ...extraParams });
  const grupos = useBranchPeriodQuery<any>('/ranking/categorias', extraParams);

  const period = usePeriodStore((s) => s.period);
  
  // Faturamento values calculations
  const faturamentoAtual = ov.data?.mes?.total || 0;
  const mockFaturamentoAnterior = ov.data?.anterior?.total || 0;
  const faturamentoCrescimento = mockFaturamentoAnterior > 0 ? ((faturamentoAtual - mockFaturamentoAnterior) / mockFaturamentoAnterior) * 100 : 0;

  const faturamento30 = ov30.data?.mes?.total || 0;
  const faturamento30Anterior = ov30.data?.anterior?.total || 0;
  const faturamento30Crescimento = faturamento30Anterior > 0 ? ((faturamento30 - faturamento30Anterior) / faturamento30Anterior) * 100 : 0;

  const faturamento60 = ov60.data?.mes?.total || 0;
  const faturamento60Anterior = ov60.data?.anterior?.total || 0;
  const faturamento60Crescimento = faturamento60Anterior > 0 ? ((faturamento60 - faturamento60Anterior) / faturamento60Anterior) * 100 : 0;

  // Operational metrics
  const qtdPedidos = kpisData.data?.vendas?.qtd_pedidos || ov.data?.mes?.qtd || 0;
  const ticketMedio = kpisData.data?.vendas?.ticket_medio || (qtdPedidos > 0 ? faturamentoAtual / qtdPedidos : 0);
  const clientesAtivos = kpisData.data?.kpis?.clientes_ativos || 0;
  const taxaConversao = kpisData.data?.kpis?.taxa_conversao_pct || 0;
  
  // Local lists filtering by Selected Marca & Selected Cidade
  const mockTopSellers = useMemo(() => {
    return vd.data?.data?.map((s: any) => ({ name: s.nome || s.vendedor, value: s.total || s.total_vendas })) || [];
  }, [vd.data]);

  const mockTopBrands = useMemo(() => {
    let list = marcas.data?.data?.map((m: any) => ({ name: m.nome || m.marca, value: m.total })) || [];
    if (selectedMarca) {
      list = list.filter((m: any) => m.name.toLowerCase() === selectedMarca.toLowerCase());
    }
    return list;
  }, [marcas.data, selectedMarca]);

  const mockTopGroups = useMemo(() => {
    return grupos.data?.data?.map((g: any) => ({ name: g.nome || g.grupo || g.categoria, value: g.total })) || [];
  }, [grupos.data]);

  const mockTopCities = useMemo(() => {
    let list = cidades.data?.data?.map((c: any) => ({ name: c.nome, value: c.total })) || [];
    if (selectedCidade) {
      list = list.filter((c: any) => c.name.toLowerCase() === selectedCidade.toLowerCase());
    }
    return list;
  }, [cidades.data, selectedCidade]);

  const mockTopClients = useMemo(() => {
    return cli.data?.data?.map((c: any, i: number) => ({ rank: i + 1, name: c.nome, value: c.total })) || [];
  }, [cli.data]);

  // Totals for share calculations
  const totalSellersVal = useMemo(() => mockTopSellers.reduce((acc: number, curr: any) => acc + curr.value, 0), [mockTopSellers]);
  const totalBrandsVal = useMemo(() => mockTopBrands.reduce((acc: number, curr: any) => acc + curr.value, 0), [mockTopBrands]);
  const totalGroupsVal = useMemo(() => mockTopGroups.reduce((acc: number, curr: any) => acc + curr.value, 0), [mockTopGroups]);
  const totalCitiesVal = useMemo(() => mockTopCities.reduce((acc: number, curr: any) => acc + curr.value, 0), [mockTopCities]);
  const totalClientsVal = useMemo(() => mockTopClients.reduce((acc: number, curr: any) => acc + curr.value, 0), [mockTopClients]);

  // Strategic KPIs cards
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

  const bestClient = useMemo(() => {
    if (mockTopClients.length === 0) return null;
    const first = mockTopClients[0];
    const pct = faturamentoAtual > 0 ? (first.value / faturamentoAtual) * 100 : 0;
    return {
      name: first.name,
      value: first.value,
      pct: pct
    };
  }, [mockTopClients, faturamentoAtual]);

  const totalVendedores = vd.data?.data?.length || 0;
  const mediaPorVendedor = totalVendedores > 0 ? faturamentoAtual / totalVendedores : 0;
  
  const cidadeLiderObj = useMemo(() => {
    if (mockTopCities.length === 0) return null;
    return mockTopCities[0];
  }, [mockTopCities]);

  const bestBrand = useMemo(() => {
    if (mockTopBrands.length === 0) return null;
    return mockTopBrands[0];
  }, [mockTopBrands]);

  // Faturamento chart processing
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

  const groupedFaturamentoData = useMemo(() => {
    if (faturamentoGroupBy === 'dia') {
      return faturamentoPeriodoData.map((item: any) => {
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
      
      faturamentoPeriodoData.forEach((item: any) => {
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
  }, [faturamentoPeriodoData, faturamentoGroupBy]);

  const maxPeriodVal = useMemo(() => {
    if (groupedFaturamentoData.length === 0) return 1;
    return Math.max(...groupedFaturamentoData.map((item: any) => item.total), 1);
  }, [groupedFaturamentoData]);

  const barColors = [
    '#0D9488', '#0F766E', '#14B8A6', '#2DD4BF', '#5EEAD4',
  ];

  const getFaturamentoSummary = () => {
    if (groupedFaturamentoData.length === 0) return "Nenhum dado de faturamento disponível no período."
    const sorted = [...groupedFaturamentoData].sort((a: any, b: any) => b.total - a.total)
    const peak = sorted[0]
    const lowest = sorted[sorted.length - 1]
    const formatName = faturamentoGroupBy === 'mes' ? 'mensal' : 'diário';
    return `O faturamento ${formatName} demonstra variação no período de consulta, registrando um pico de faturamento em ${peak.label} no valor de ${formatBRL(peak.total)}, e o menor faturamento em ${lowest.label} no valor de ${formatBRL(lowest.total)}.`
  }

  const isError = ov.isError || kpisData.isError || fatMes.isError;
  const isLoading = ov.isLoading || kpisData.isLoading || fatMes.isLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 text-text-secondary">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500 mr-3"></div>
        Carregando Visão Estratégica...
      </div>
    )
  }

  if (isError) {
    return (
      <div className="bg-danger/10 border border-danger/25 text-danger p-5 rounded-xl text-sm font-semibold max-w-xl mx-auto mt-10 shadow-sm flex flex-col items-center gap-3">
        <AlertCircle size={32} />
        <span>Não foi possível carregar os dados da Visão Estratégica. Verifique sua conexão.</span>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 1. CABEÇALHO DA PÁGINA (PASSO 2) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-divider/40 pb-5">
        <div>
          <h2 className="text-2xl font-black text-text-primary tracking-tight">Visão Estratégica</h2>
          <p className="text-xs text-text-secondary mt-1">Análise estratégica de vendas, clientes, cidades, marcas e vendedores no período selecionado.</p>
        </div>
        <div className="hidden lg:flex items-center gap-3">
          <PeriodFilter excludePeriods={['yesterday']} />
        </div>
      </div>

      {/* 2. BARRA DE FILTROS (PASSO 3) */}
      {/* Desktop Filter Bar */}
      <div className="hidden lg:flex items-center gap-4 bg-bg-primary border border-divider shadow-sm rounded-2xl p-5 flex-wrap">
        <div className="flex flex-col gap-1.5 min-w-[220px] flex-1">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider pl-1">Vendedor</span>
          <select
            value={selectedVendedor}
            onChange={(e) => setSelectedVendedor(e.target.value)}
            className="h-12 px-4 bg-bg-secondary border border-divider text-text-primary rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all duration-300 w-full cursor-pointer shadow-sm"
          >
            <option value="">Todos os Vendedores</option>
            {vdFull.data?.data?.map((v: any) => (
              <option key={v.id} value={v.id}>{v.nome || v.vendedor}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5 min-w-[220px] flex-1">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider pl-1">Marca</span>
          <select
            value={selectedMarca}
            onChange={(e) => setSelectedMarca(e.target.value)}
            className="h-12 px-4 bg-bg-secondary border border-divider text-text-primary rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all duration-300 w-full cursor-pointer shadow-sm"
          >
            <option value="">Todas as Marcas</option>
            {marcasFull.data?.data?.map((m: any, idx: number) => (
              <option key={idx} value={m.nome || m.marca}>{m.nome || m.marca}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5 min-w-[220px] flex-1">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider pl-1">Cidade</span>
          <select
            value={selectedCidade}
            onChange={(e) => setSelectedCidade(e.target.value)}
            className="h-12 px-4 bg-bg-secondary border border-divider text-text-primary rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all duration-300 w-full cursor-pointer shadow-sm"
          >
            <option value="">Todas as Cidades</option>
            {cidadesFull.data?.data?.map((c: any, idx: number) => (
              <option key={idx} value={c.nome}>{c.nome}</option>
            ))}
          </select>
        </div>

        {(selectedVendedor || selectedMarca || selectedCidade) && (
          <button
            onClick={() => {
              setSelectedVendedor('')
              setSelectedMarca('')
              setSelectedCidade('')
            }}
            className="mt-5 h-12 px-6 text-xs font-black uppercase tracking-wider text-danger hover:text-white border border-danger hover:bg-danger bg-transparent rounded-2xl cursor-pointer transition-all duration-200 shrink-0 shadow-sm flex items-center justify-center"
          >
            Limpar Filtros
          </button>
        )}
      </div>

      {/* Mobile Sticky Bar trigger */}
      <div className="lg:hidden flex items-center justify-between gap-3 bg-bg-primary border border-divider shadow-sm rounded-xl p-3">
        <div className="flex-1 min-w-0">
          <span className="text-[9px] font-bold text-text-muted uppercase block">Período Selecionado</span>
          <span className="text-xs font-bold text-text-primary truncate block">
            {period === 'custom' ? 'Personalizado' : PERIOD_OPTIONS.find(o => o.key === period)?.label || 'Mês atual'}
          </span>
        </div>
        <button
          onClick={() => setShowMobileFilters(true)}
          className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
        >
          Filtros
        </button>
      </div>

      {/* Mobile Drawer Filter Modal */}
      {showMobileFilters && (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-[320px] bg-bg-primary h-full shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300">
            <div className="p-5 flex-1 overflow-y-auto space-y-5">
              <div className="flex justify-between items-center border-b border-divider pb-3">
                <h4 className="font-extrabold text-sm text-text-primary uppercase tracking-wider">Filtros da Guia</h4>
                <button
                  onClick={() => setShowMobileFilters(false)}
                  className="text-text-muted hover:text-text-primary"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Period Filter container */}
              <div className="space-y-2">
                <span className="text-[10px] font-extrabold text-text-secondary uppercase tracking-wider block">Período</span>
                <PeriodFilter excludePeriods={['yesterday']} />
              </div>

              {/* Vendedor filter */}
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold text-text-secondary uppercase tracking-wider block">Vendedor</span>
                <select
                  value={selectedVendedor}
                  onChange={(e) => setSelectedVendedor(e.target.value)}
                  className="h-12 px-4 bg-bg-secondary border border-divider text-text-primary rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500 w-full cursor-pointer shadow-sm"
                >
                  <option value="">Todos os Vendedores</option>
                  {vdFull.data?.data?.map((v: any) => (
                    <option key={v.id} value={v.id}>{v.nome || v.vendedor}</option>
                  ))}
                </select>
              </div>

              {/* Marca filter */}
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold text-text-secondary uppercase tracking-wider block">Marca</span>
                <select
                  value={selectedMarca}
                  onChange={(e) => setSelectedMarca(e.target.value)}
                  className="h-12 px-4 bg-bg-secondary border border-divider text-text-primary rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500 w-full cursor-pointer shadow-sm"
                >
                  <option value="">Todas as Marcas</option>
                  {marcasFull.data?.data?.map((m: any, idx: number) => (
                    <option key={idx} value={m.nome || m.marca}>{m.nome || m.marca}</option>
                  ))}
                </select>
              </div>

              {/* Cidade filter */}
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold text-text-secondary uppercase tracking-wider block">Cidade</span>
                <select
                  value={selectedCidade}
                  onChange={(e) => setSelectedCidade(e.target.value)}
                  className="h-12 px-4 bg-bg-secondary border border-divider text-text-primary rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500 w-full cursor-pointer shadow-sm"
                >
                  <option value="">Todas as Cidades</option>
                  {cidadesFull.data?.data?.map((c: any, idx: number) => (
                    <option key={idx} value={c.nome}>{c.nome}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-4 border-t border-divider bg-bg-secondary/40 flex flex-col gap-2">
              <button
                onClick={() => {
                  setSelectedVendedor('')
                  setSelectedMarca('')
                  setSelectedCidade('')
                  setShowMobileFilters(false)
                }}
                className="w-full h-12 border border-divider text-text-secondary rounded-2xl text-xs font-bold bg-bg-primary hover:bg-bg-secondary cursor-pointer transition-all flex items-center justify-center"
              >
                Limpar Todos
              </button>
              <button
                onClick={() => setShowMobileFilters(false)}
                className="w-full h-12 bg-brand-500 hover:bg-brand-600 text-white rounded-2xl text-xs font-bold shadow-sm cursor-pointer transition-all flex items-center justify-center"
              >
                Aplicar Filtros
              </button>
            </div>
          </div>
        </div>
      )}
        {/* 3. PRIMEIRA LINHA SOMENTE COM CARD DE FATURAMENTO DESTACADO (PASSO 4 REDESIGN) */}
      <div className="bg-bg-primary border border-divider shadow-card rounded-2xl p-6 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 hover:shadow-card-hover transition-all duration-300">
        {/* Left brand border decoration */}
        <div className="absolute top-0 bottom-0 left-0 w-[6px] bg-brand-500"></div>

        {/* Current Faturamento Card Content */}
        <div className="flex items-center gap-5 flex-1 w-full">
          <div className="p-4 bg-brand-500/10 text-brand-500 rounded-2xl shrink-0 shadow-sm">
            <DollarSign size={32} className="stroke-[2.5]" />
          </div>
          <div className="space-y-1">
            <span className="text-xs font-bold text-text-secondary uppercase tracking-widest block">Faturamento do Período</span>
            <div className="text-2xl sm:text-3xl md:text-4xl font-black text-text-primary tracking-tight leading-none">
              {formatBRL(faturamentoAtual)}
            </div>
            <span className="text-xs text-text-muted font-medium block">Período selecionado</span>
          </div>
        </div>

        {/* Center: Comparison Arrow & Percentage Inline */}
        <div className="flex flex-col items-center justify-center shrink-0 py-3 px-5 rounded-2xl bg-bg-secondary border border-divider shadow-sm w-full md:w-auto">
          <span className={clsx(
            "text-sm font-black flex items-center gap-1.5",
            faturamentoCrescimento >= 0 ? "text-blue-500" : "text-danger"
          )}>
            {faturamentoCrescimento >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
            {faturamentoCrescimento >= 0 ? "+" : ""}{faturamentoCrescimento.toFixed(1)}%
          </span>
          <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider mt-0.5">vs. mês anterior</span>
        </div>

        {/* Previous Month Faturamento Card Content */}
        <div className="flex items-center gap-5 flex-1 md:justify-end text-left md:text-right w-full">
          <div className="space-y-1 md:order-1 order-2 flex-1 md:flex-initial">
            <span className="text-xs font-bold text-text-secondary uppercase tracking-widest block">Faturamento Anterior</span>
            <div className="text-xl sm:text-2xl font-extrabold text-text-primary tracking-tight leading-none">
              {formatBRL(mockFaturamentoAnterior)}
            </div>
            <span className="text-xs text-text-muted font-medium block">Mês completo anterior</span>
          </div>
          <div className="p-3.5 bg-text-muted/10 text-text-muted rounded-2xl shrink-0 md:order-2 order-1 shadow-sm">
            <DollarSign size={24} />
          </div>
        </div>
      </div>

      {/* 4. SEGUNDA ÁREA COM CARDS DE DESTAQUE GRID 4 EM CADA LINHA (PASSO 5 REDESIGN) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Melhor Vendedor */}
        <div className="bg-bg-primary border border-divider shadow-card rounded-2xl p-5 min-h-[130px] flex flex-col justify-between relative overflow-hidden transition-all duration-300 hover:shadow-card-hover">
          <div className="flex justify-between items-start gap-1.5">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block">Melhor Vendedor</span>
            <div className="p-1.5 bg-brand-500/10 text-brand-500 rounded-lg shrink-0">
              <Award size={15} />
            </div>
          </div>
          {bestSeller && bestSeller.value > 0 ? (
            <div className="mt-2 space-y-1">
              <div className="text-xs font-extrabold text-brand-500 truncate max-w-[180px]">{bestSeller.name}</div>
              <div className="text-lg font-black text-text-primary leading-none mt-1">{formatBRL(bestSeller.value)}</div>
              <span className="text-[10px] text-text-muted font-bold block">{bestSeller.pct.toFixed(1)}% do faturamento total</span>
            </div>
          ) : (
            <span className="text-xs text-text-muted italic py-2">Sem vendas no período</span>
          )}
        </div>

        {/* Card 2: Melhor Cliente */}
        <div className="bg-bg-primary border border-divider shadow-card rounded-2xl p-5 min-h-[130px] flex flex-col justify-between relative overflow-hidden transition-all duration-300 hover:shadow-card-hover">
          <div className="flex justify-between items-start gap-1.5">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block">Melhor Cliente</span>
            <div className="p-1.5 bg-brand-500/10 text-brand-500 rounded-lg shrink-0">
              <Award size={15} />
            </div>
          </div>
          {bestClient && bestClient.value > 0 ? (
            <div className="mt-2 space-y-1">
              <div className="text-xs font-extrabold text-brand-500 truncate max-w-[180px]">{bestClient.name}</div>
              <div className="text-lg font-black text-text-primary leading-none mt-1">{formatBRL(bestClient.value)}</div>
              <span className="text-[10px] text-text-muted font-bold block">Cliente com maior faturamento</span>
            </div>
          ) : (
            <span className="text-xs text-text-muted italic py-2">Sem clientes no período</span>
          )}
        </div>

        {/* Card 3: Marca Mais Vendida */}
        <div className="bg-bg-primary border border-divider shadow-card rounded-2xl p-5 min-h-[130px] flex flex-col justify-between relative overflow-hidden transition-all duration-300 hover:shadow-card-hover">
          <div className="flex justify-between items-start gap-1.5">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block">Marca Mais Vendida</span>
            <div className="p-1.5 bg-brand-500/10 text-brand-500 rounded-lg shrink-0">
              <Tag size={15} />
            </div>
          </div>
          {bestBrand && bestBrand.value > 0 ? (
            <div className="mt-2 space-y-1">
              <div className="text-xs font-extrabold text-brand-500 truncate max-w-[180px]">{bestBrand.name}</div>
              <div className="text-lg font-black text-text-primary leading-none mt-1">{formatBRL(bestBrand.value)}</div>
              <span className="text-[10px] text-text-muted font-bold block">Marca líder em faturamento</span>
            </div>
          ) : (
            <span className="text-xs text-text-muted italic py-2">Sem marcas no período</span>
          )}
        </div>

        {/* Card 4: Cidade Destaque */}
        <div className="bg-bg-primary border border-divider shadow-card rounded-2xl p-5 min-h-[130px] flex flex-col justify-between relative overflow-hidden transition-all duration-300 hover:shadow-card-hover">
          <div className="flex justify-between items-start gap-1.5">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block">Cidade Destaque</span>
            <div className="p-1.5 bg-brand-500/10 text-brand-500 rounded-lg shrink-0">
              <MapPin size={15} />
            </div>
          </div>
          {cidadeLiderObj && cidadeLiderObj.value > 0 ? (
            <div className="mt-2 space-y-1">
              <div className="text-xs font-extrabold text-brand-500 truncate max-w-[180px]">{cidadeLiderObj.name}</div>
              <div className="text-lg font-black text-text-primary leading-none mt-1">{formatBRL(cidadeLiderObj.value)}</div>
              <span className="text-[10px] text-text-muted font-bold block">Cidade líder em faturamento</span>
            </div>
          ) : (
            <span className="text-xs text-text-muted italic py-2">Sem cidades no período</span>
          )}
        </div>

        {/* Card 5: Volume de Peças */}
        <div className="bg-bg-primary border border-divider shadow-card rounded-2xl p-5 min-h-[130px] flex flex-col justify-between relative overflow-hidden transition-all duration-300 hover:shadow-card-hover">
          <div className="flex justify-between items-start gap-1.5">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block">Volume de Peças</span>
            <div className="p-1.5 bg-brand-500/10 text-brand-500 rounded-lg shrink-0">
              <Box size={15} />
            </div>
          </div>
          <div className="mt-2 space-y-1">
            <div className="text-lg font-black text-text-primary leading-none mt-1">{formatNum(qtdPedidos)}</div>
            <span className="text-[10px] text-text-muted font-bold block mt-2">Total de peças faturadas</span>
          </div>
        </div>

        {/* Card 6: Ticket Médio */}
        <div className="bg-bg-primary border border-divider shadow-card rounded-2xl p-5 min-h-[130px] flex flex-col justify-between relative overflow-hidden transition-all duration-300 hover:shadow-card-hover">
          <div className="flex justify-between items-start gap-1.5">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block">Ticket Médio</span>
            <div className="p-1.5 bg-brand-500/10 text-brand-500 rounded-lg shrink-0">
              <Target size={15} />
            </div>
          </div>
          <div className="mt-2 space-y-1">
            <div className="text-lg font-black text-text-primary leading-none mt-1">{formatBRL(ticketMedio)}</div>
            <span className="text-[10px] text-text-muted font-bold block mt-2">Média por venda/nota</span>
          </div>
        </div>

        {/* Card 7: Taxa de Conversão */}
        <div className="bg-bg-primary border border-divider shadow-card rounded-2xl p-5 min-h-[130px] flex flex-col justify-between relative overflow-hidden transition-all duration-300 hover:shadow-card-hover">
          <div className="flex justify-between items-start gap-1.5">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block">Taxa de Conversão</span>
            <div className="p-1.5 bg-brand-500/10 text-brand-500 rounded-lg shrink-0">
              <TrendingUp size={15} />
            </div>
          </div>
          <div className="mt-2 space-y-1">
            <div className="text-lg font-black text-text-primary leading-none mt-1">{taxaConversao.toFixed(1)}%</div>
            <span className="text-[10px] text-text-muted font-bold block mt-2">Conversão de vendas no período</span>
          </div>
        </div>

        {/* Card 8: Clientes com Compra */}
        <div className="bg-bg-primary border border-divider shadow-card rounded-2xl p-5 min-h-[130px] flex flex-col justify-between relative overflow-hidden transition-all duration-300 hover:shadow-card-hover">
          <div className="flex justify-between items-start gap-1.5">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block">Clientes com Compra</span>
            <div className="p-1.5 bg-brand-500/10 text-brand-500 rounded-lg shrink-0">
              <Users size={15} />
            </div>
          </div>
          <div className="mt-2 space-y-1">
            <div className="text-lg font-black text-text-primary leading-none mt-1">{formatNum(clientesAtivos)}</div>
            <span className="text-[10px] text-text-muted font-bold block mt-2">Clientes ativos no período</span>
          </div>
        </div>
      </div>

      {/* 4.5. DESEMPENHO DOS VENDEDORES - GRÁFICO E RANKING COM MEDALHAS LADO A LADO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Gráfico de Vendedores em Barra */}
        <div className="bg-bg-primary border border-divider shadow-card rounded-2xl p-5 flex flex-col min-h-[380px]">
          <div className="flex items-center gap-1.5 border-b border-divider/20 pb-3 mb-4">
            <BarChart3 size={16} className="text-brand-500" />
            <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">Desempenho dos Vendedores (Gráfico)</h4>
          </div>
          <div className="flex-1 w-full h-[280px]">
            {mockTopSellers.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={mockTopSellers.slice(0, 10)}
                  layout="vertical"
                  margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                >
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={100} 
                    tick={{ fontSize: 9, fill: 'var(--color-text-secondary)' }} 
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" fill="#0D9488" radius={[0, 4, 4, 0]}>
                    {mockTopSellers.slice(0, 10).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={CHART_PALETTE[index % CHART_PALETTE.length] || '#0D9488'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <AlertCircle size={24} className="text-text-muted mb-1 stroke-[1.5]" />
                <span className="text-xs text-text-muted font-medium">Sem dados para exibir o gráfico.</span>
              </div>
            )}
          </div>
        </div>

        {/* Ranking de Vendedores com Medalhas */}
        <div className="bg-bg-primary border border-divider shadow-card rounded-2xl p-5 flex flex-col min-h-[380px]">
          <div className="flex items-center gap-1.5 border-b border-divider/20 pb-3 mb-4">
            <Award size={16} className="text-brand-500" />
            <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">Top Vendedores (Ranking)</h4>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[290px] text-xs space-y-2 pr-1 scrollbar-none">
            {mockTopSellers.slice(0, 15).map((s: any, idx: number) => {
              const rank = idx + 1;
              const share = totalSellersVal > 0 ? (s.value / totalSellersVal) * 100 : 0;
              
              // Define medal indicator
              let medalNode = null;
              if (rank === 1) {
                medalNode = (
                  <span className="w-5 h-5 rounded-full bg-yellow-400 text-yellow-950 flex items-center justify-center font-bold text-[10px] shadow-sm shrink-0">
                    🥇
                  </span>
                );
              } else if (rank === 2) {
                medalNode = (
                  <span className="w-5 h-5 rounded-full bg-slate-300 text-slate-900 flex items-center justify-center font-bold text-[10px] shadow-sm shrink-0">
                    🥈
                  </span>
                );
              } else if (rank === 3) {
                medalNode = (
                  <span className="w-5 h-5 rounded-full bg-orange-300 text-orange-950 flex items-center justify-center font-bold text-[10px] shadow-sm shrink-0">
                    🥉
                  </span>
                );
              } else {
                medalNode = (
                  <span className="w-5 h-5 rounded-full bg-bg-secondary text-text-secondary flex items-center justify-center font-bold text-[9px] border border-divider shrink-0 font-mono">
                    #{rank}
                  </span>
                );
              }

              return (
                <div key={idx} className="flex justify-between items-center py-2 border-b border-divider/5 hover:bg-bg-secondary/40 px-2 rounded-lg transition-colors gap-3">
                  <span className="text-text-secondary truncate font-medium flex items-center gap-2 flex-1 min-w-0" title={s.name}>
                    {medalNode}
                    <span className="truncate">{s.name}</span>
                  </span>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-text-primary block font-mono">{formatBRLCompact(s.value)}</span>
                    <span className="text-[10px] text-text-muted block font-semibold">{share.toFixed(1)}% share</span>
                  </div>
                </div>
              );
            })}
            {mockTopSellers.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <AlertCircle size={24} className="text-text-muted mb-1 stroke-[1.5]" />
                <span className="text-xs text-text-muted font-medium">Nenhum vendedor registrado.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. SEÇÃO DE RANKINGS RESTANTES (TOP 15 COM GRÁFICOS INTERNOS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* 1. Ranking de Marcas */}
        <div className="bg-bg-primary border border-divider shadow-card rounded-2xl p-5 flex flex-col min-h-[360px] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-brand-500"></div>
          <div className="flex justify-between items-center border-b border-divider/20 pb-3 mb-4 gap-4">
            <div className="flex items-center gap-1.5">
              <Tag size={16} className="text-brand-500" />
              <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">Top 15 Marcas</h4>
            </div>
            <button
              onClick={() => setRankingViews(prev => ({ ...prev, marcas: prev.marcas === 'list' ? 'bar' : 'list' }))}
              className="px-2.5 py-1.5 bg-bg-secondary hover:bg-bg-secondary/80 text-text-secondary hover:text-text-primary rounded-xl border border-divider transition-all cursor-pointer shadow-sm text-[10px] font-bold flex items-center gap-1 shrink-0"
            >
              {rankingViews.marcas === 'list' ? <BarChart3 size={12} /> : <FileText size={12} />}
              {rankingViews.marcas === 'list' ? "Gráfico" : "Lista"}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[290px] text-xs pr-1 scrollbar-none">
            {rankingViews.marcas === 'list' ? (
              <div className="space-y-2">
                {mockTopBrands.slice(0, 15).map((m: any, idx: number) => {
                  const rank = idx + 1;
                  const share = totalBrandsVal > 0 ? (m.value / totalBrandsVal) * 100 : 0;
                  return (
                    <div key={idx} className="flex justify-between items-center py-2 border-b border-divider/5 hover:bg-bg-secondary/40 px-2 rounded-lg transition-colors">
                      <span className="text-text-secondary truncate max-w-[200px] font-medium" title={m.name}>
                        <span className="font-bold text-brand-500 mr-2 font-mono">#{rank}</span>
                        {m.name}
                      </span>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-text-primary block font-mono">{formatBRLCompact(m.value)}</span>
                        <span className="text-[10px] text-text-muted block font-semibold">{share.toFixed(1)}% share</span>
                      </div>
                    </div>
                  );
                })}
                {mockTopBrands.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4">
                    <AlertCircle size={24} className="text-text-muted mb-1 stroke-[1.5]" />
                    <span className="text-xs text-text-muted font-medium">Nenhuma marca registrada.</span>
                  </div>
                )}
              </div>
            ) : (
              mockTopBrands.length > 0 ? (
                <div className="h-[250px] w-full flex items-center justify-center py-2 pr-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={mockTopBrands.slice(0, 7)}
                      layout="vertical"
                      margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                    >
                      <XAxis type="number" hide />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={90} 
                        tick={{ fontSize: 9, fill: 'var(--color-text-secondary)' }} 
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" fill="#0D9488" radius={[0, 4, 4, 0]}>
                        {mockTopBrands.slice(0, 7).map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={CHART_PALETTE[index % CHART_PALETTE.length] || '#0D9488'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                  <AlertCircle size={24} className="text-text-muted mb-1 stroke-[1.5]" />
                  <span className="text-xs text-text-muted font-medium">Sem dados para exibir o gráfico.</span>
                </div>
              )
            )}
          </div>
        </div>

        {/* 2. Ranking de Grupos */}
        <div className="bg-bg-primary border border-divider shadow-card rounded-2xl p-5 flex flex-col min-h-[360px] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-brand-500"></div>
          <div className="flex justify-between items-center border-b border-divider/20 pb-3 mb-4 gap-4">
            <div className="flex items-center gap-1.5">
              <Box size={16} className="text-brand-500" />
              <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">Top 15 Grupos</h4>
            </div>
            <button
              onClick={() => setRankingViews(prev => ({ ...prev, grupos: prev.grupos === 'list' ? 'bar' : 'list' }))}
              className="px-2.5 py-1.5 bg-bg-secondary hover:bg-bg-secondary/80 text-text-secondary hover:text-text-primary rounded-xl border border-divider transition-all cursor-pointer shadow-sm text-[10px] font-bold flex items-center gap-1 shrink-0"
            >
              {rankingViews.grupos === 'list' ? <BarChart3 size={12} /> : <FileText size={12} />}
              {rankingViews.grupos === 'list' ? "Gráfico" : "Lista"}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[290px] text-xs pr-1 scrollbar-none">
            {rankingViews.grupos === 'list' ? (
              <div className="space-y-2">
                {mockTopGroups.slice(0, 15).map((g: any, idx: number) => {
                  const rank = idx + 1;
                  const share = totalGroupsVal > 0 ? (g.value / totalGroupsVal) * 100 : 0;
                  return (
                    <div key={idx} className="flex justify-between items-center py-2 border-b border-divider/5 hover:bg-bg-secondary/40 px-2 rounded-lg transition-colors">
                      <span className="text-text-secondary truncate max-w-[200px] font-medium" title={g.name}>
                        <span className="font-bold text-brand-500 mr-2 font-mono">#{rank}</span>
                        {g.name}
                      </span>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-text-primary block font-mono">{formatBRLCompact(g.value)}</span>
                        <span className="text-[10px] text-text-muted block font-semibold">{share.toFixed(1)}% share</span>
                      </div>
                    </div>
                  );
                })}
                {mockTopGroups.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4">
                    <AlertCircle size={24} className="text-text-muted mb-1 stroke-[1.5]" />
                    <span className="text-xs text-text-muted font-medium">Nenhum grupo registrado.</span>
                  </div>
                )}
              </div>
            ) : (
              mockTopGroups.length > 0 ? (
                <div className="h-[250px] w-full flex items-center justify-center py-2 pr-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={mockTopGroups.slice(0, 7)}
                      layout="vertical"
                      margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                    >
                      <XAxis type="number" hide />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={90} 
                        tick={{ fontSize: 9, fill: 'var(--color-text-secondary)' }} 
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" fill="#0D9488" radius={[0, 4, 4, 0]}>
                        {mockTopGroups.slice(0, 7).map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={CHART_PALETTE[index % CHART_PALETTE.length] || '#0D9488'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                  <AlertCircle size={24} className="text-text-muted mb-1 stroke-[1.5]" />
                  <span className="text-xs text-text-muted font-medium">Sem dados para exibir o gráfico.</span>
                </div>
              )
            )}
          </div>
        </div>

        {/* 3. Ranking de Cidades */}
        <div className="bg-bg-primary border border-divider shadow-card rounded-2xl p-5 flex flex-col min-h-[360px] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-brand-500"></div>
          <div className="flex justify-between items-center border-b border-divider/20 pb-3 mb-4 gap-4">
            <div className="flex items-center gap-1.5">
              <Map size={16} className="text-brand-500" />
              <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">Top 15 Cidades</h4>
            </div>
            <button
              onClick={() => setRankingViews(prev => ({ ...prev, cidades: prev.cidades === 'list' ? 'bar' : 'list' }))}
              className="px-2.5 py-1.5 bg-bg-secondary hover:bg-bg-secondary/80 text-text-secondary hover:text-text-primary rounded-xl border border-divider transition-all cursor-pointer shadow-sm text-[10px] font-bold flex items-center gap-1 shrink-0"
            >
              {rankingViews.cidades === 'list' ? <BarChart3 size={12} /> : <FileText size={12} />}
              {rankingViews.cidades === 'list' ? "Gráfico" : "Lista"}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[290px] text-xs pr-1 scrollbar-none">
            {rankingViews.cidades === 'list' ? (
              <div className="space-y-2">
                {mockTopCities.slice(0, 15).map((c: any, idx: number) => {
                  const rank = idx + 1;
                  const share = totalCitiesVal > 0 ? (c.value / totalCitiesVal) * 100 : 0;
                  return (
                    <div key={idx} className="flex justify-between items-center py-2 border-b border-divider/5 hover:bg-bg-secondary/40 px-2 rounded-lg transition-colors">
                      <span className="text-text-secondary truncate max-w-[200px] font-medium" title={c.name}>
                        <span className="font-bold text-brand-500 mr-2 font-mono">#{rank}</span>
                        {c.name}
                      </span>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-text-primary block font-mono">{formatBRLCompact(c.value)}</span>
                        <span className="text-[10px] text-text-muted block font-semibold">{share.toFixed(1)}% share</span>
                      </div>
                    </div>
                  );
                })}
                {mockTopCities.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4">
                    <AlertCircle size={24} className="text-text-muted mb-1 stroke-[1.5]" />
                    <span className="text-xs text-text-muted font-medium">Nenhuma cidade registrada.</span>
                  </div>
                )}
              </div>
            ) : (
              mockTopCities.length > 0 ? (
                <div className="h-[250px] w-full flex items-center justify-center py-2 pr-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={mockTopCities.slice(0, 7)}
                      layout="vertical"
                      margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                    >
                      <XAxis type="number" hide />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={90} 
                        tick={{ fontSize: 9, fill: 'var(--color-text-secondary)' }} 
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" fill="#0D9488" radius={[0, 4, 4, 0]}>
                        {mockTopCities.slice(0, 7).map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={CHART_PALETTE[index % CHART_PALETTE.length] || '#0D9488'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                  <AlertCircle size={24} className="text-text-muted mb-1 stroke-[1.5]" />
                  <span className="text-xs text-text-muted font-medium">Sem dados para exibir o gráfico.</span>
                </div>
              )
            )}
          </div>
        </div>

        {/* 4. Ranking de Clientes */}
        <div className="bg-bg-primary border border-divider shadow-card rounded-2xl p-5 flex flex-col min-h-[360px] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-brand-500"></div>
          <div className="flex justify-between items-center border-b border-divider/20 pb-3 mb-4 gap-4">
            <div className="flex items-center gap-1.5">
              <Users size={16} className="text-brand-500" />
              <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">Top 15 Clientes</h4>
            </div>
            <button
              onClick={() => setRankingViews(prev => ({ ...prev, clientes: prev.clientes === 'list' ? 'bar' : 'list' }))}
              className="px-2.5 py-1.5 bg-bg-secondary hover:bg-bg-secondary/80 text-text-secondary hover:text-text-primary rounded-xl border border-divider transition-all cursor-pointer shadow-sm text-[10px] font-bold flex items-center gap-1 shrink-0"
            >
              {rankingViews.clientes === 'list' ? <BarChart3 size={12} /> : <FileText size={12} />}
              {rankingViews.clientes === 'list' ? "Gráfico" : "Lista"}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[290px] text-xs pr-1 scrollbar-none">
            {rankingViews.clientes === 'list' ? (
              <div className="space-y-2">
                {mockTopClients.slice(0, 15).map((c: any, idx: number) => {
                  const share = totalClientsVal > 0 ? (c.value / totalClientsVal) * 100 : 0;
                  return (
                    <div key={idx} className="flex justify-between items-center py-2 border-b border-divider/5 hover:bg-bg-secondary/40 px-2 rounded-lg transition-colors">
                      <span className="text-text-secondary truncate max-w-[200px] font-medium" title={c.name}>
                        <span className="font-bold text-brand-500 mr-2 font-mono">#{c.rank}</span>
                        {c.name}
                      </span>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-text-primary block font-mono">{formatBRLCompact(c.value)}</span>
                        <span className="text-[10px] text-text-muted block font-semibold">{share.toFixed(1)}% share</span>
                      </div>
                    </div>
                  );
                })}
                {mockTopClients.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4">
                    <AlertCircle size={24} className="text-text-muted mb-1 stroke-[1.5]" />
                    <span className="text-xs text-text-muted font-medium">Nenhum cliente registrado.</span>
                  </div>
                )}
              </div>
            ) : (
              mockTopClients.length > 0 ? (
                <div className="h-[250px] w-full flex items-center justify-center py-2 pr-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={mockTopClients.slice(0, 7)}
                      layout="vertical"
                      margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                    >
                      <XAxis type="number" hide />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={90} 
                        tick={{ fontSize: 9, fill: 'var(--color-text-secondary)' }} 
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" fill="#0D9488" radius={[0, 4, 4, 0]}>
                        {mockTopClients.slice(0, 7).map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={CHART_PALETTE[index % CHART_PALETTE.length] || '#0D9488'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                  <AlertCircle size={24} className="text-text-muted mb-1 stroke-[1.5]" />
                  <span className="text-xs text-text-muted font-medium">Sem dados para exibir o gráfico.</span>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* 6. SEÇÃO DE GRÁFICOS (PASSO 8 REDESIGN) */}
      <div className="w-full bg-bg-primary border border-divider shadow-card rounded-2xl p-6 mt-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
          <div>
            <h3 className="font-extrabold text-text-primary text-xs uppercase tracking-wider">Faturamento no Período</h3>
            <p className="text-[10px] text-text-secondary mt-0.5">Histórico consolidado do faturamento líquido no período</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            {/* Agrupamento: Diário / Mensal */}
            <div className="flex items-center gap-1 bg-bg-secondary p-0.5 rounded-xl border border-divider">
              <button
                onClick={() => setFaturamentoGroupBy('dia')}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer",
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
                  "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer",
                  faturamentoGroupBy === 'mes'
                    ? "bg-bg-primary text-brand-500 shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                Mensal
              </button>
            </div>

            {/* Chaveador de Visualização */}
            <div className="flex items-center gap-1 bg-bg-secondary p-0.5 rounded-xl border border-divider">
              <button
                onClick={() => setViewMode(prev => ({ ...prev, faturamento: 'chart' }))}
                className={clsx(
                  "p-2 rounded-lg transition-all cursor-pointer",
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
                  "p-2 rounded-lg transition-all cursor-pointer",
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
        
        <div className="h-[240px] sm:h-[300px] lg:h-[380px] w-full">
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

    </div>
  )
}
