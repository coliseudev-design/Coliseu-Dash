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
  const [faturamentoPeriod, setFaturamentoPeriod] = useState<'7D' | '30D' | '90D' | 'Tudo'>('Tudo')
  const [faturamentoGroupBy, setFaturamentoGroupBy] = useState<'dia' | 'mes'>('mes')
  const [viewMode, setViewMode] = useState<Record<string, 'chart' | 'text'>>({
    vendedores: 'chart',
    marcas: 'chart',
    grupos: 'chart',
    cidades: 'chart',
    faturamento: 'chart',
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
  const cidadeLider = mockTopCities[0]?.name || '—';

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
          <PeriodFilter />
        </div>
      </div>

      {/* 2. BARRA DE FILTROS (PASSO 3) */}
      {/* Desktop Filter Bar */}
      <div className="hidden lg:flex items-center gap-4 bg-bg-primary border border-divider shadow-sm rounded-xl p-4 flex-wrap">
        <div className="flex flex-col gap-1 min-w-[200px] flex-1">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Vendedor</span>
          <select
            value={selectedVendedor}
            onChange={(e) => setSelectedVendedor(e.target.value)}
            className="px-2.5 py-1.5 bg-bg-secondary border border-divider text-text-primary rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-500 w-full cursor-pointer"
          >
            <option value="">Todos os Vendedores</option>
            {vdFull.data?.data?.map((v: any) => (
              <option key={v.id} value={v.id}>{v.nome || v.vendedor}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1 min-w-[200px] flex-1">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Marca</span>
          <select
            value={selectedMarca}
            onChange={(e) => setSelectedMarca(e.target.value)}
            className="px-2.5 py-1.5 bg-bg-secondary border border-divider text-text-primary rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-500 w-full cursor-pointer"
          >
            <option value="">Todas as Marcas</option>
            {marcasFull.data?.data?.map((m: any, idx: number) => (
              <option key={idx} value={m.nome || m.marca}>{m.nome || m.marca}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1 min-w-[200px] flex-1">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Cidade</span>
          <select
            value={selectedCidade}
            onChange={(e) => setSelectedCidade(e.target.value)}
            className="px-2.5 py-1.5 bg-bg-secondary border border-divider text-text-primary rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-500 w-full cursor-pointer"
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
            className="mt-5 px-4 py-1.5 text-xs font-bold text-danger hover:text-danger-hover border border-danger/25 hover:border-danger/45 bg-danger/5 rounded-lg cursor-pointer transition-all shrink-0"
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
                <PeriodFilter />
              </div>

              {/* Vendedor filter */}
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold text-text-secondary uppercase tracking-wider block">Vendedor</span>
                <select
                  value={selectedVendedor}
                  onChange={(e) => setSelectedVendedor(e.target.value)}
                  className="px-3 py-2 bg-bg-secondary border border-divider text-text-primary rounded-xl text-xs font-bold focus:outline-none focus:ring-1 focus:ring-brand-500 w-full cursor-pointer"
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
                  className="px-3 py-2 bg-bg-secondary border border-divider text-text-primary rounded-xl text-xs font-bold focus:outline-none focus:ring-1 focus:ring-brand-500 w-full cursor-pointer"
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
                  className="px-3 py-2 bg-bg-secondary border border-divider text-text-primary rounded-xl text-xs font-bold focus:outline-none focus:ring-1 focus:ring-brand-500 w-full cursor-pointer"
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
                className="w-full py-2 border border-divider text-text-secondary rounded-xl text-xs font-bold bg-bg-primary hover:bg-bg-secondary cursor-pointer transition-all"
              >
                Limpar Todos
              </button>
              <button
                onClick={() => setShowMobileFilters(false)}
                className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer transition-all"
              >
                Aplicar Filtros
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. PRIMEIRA LINHA SOMENTE COM CARD DE FATURAMENTO (PASSO 4) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Faturamento do Período */}
        <div className="bg-bg-primary border border-divider shadow-card rounded-xl p-6 relative overflow-hidden flex flex-col justify-between min-h-[140px]">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-brand-500"></div>
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block">Faturamento do Período</span>
            <div className="p-1.5 bg-brand-500/10 text-brand-500 rounded-lg shrink-0">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-text-primary tracking-tight">
              {formatBRL(faturamentoAtual)}
            </div>
          </div>
          <div className="space-y-1.5 mt-auto">
            <div className="flex items-center gap-1.5">
              <ComparisonBadge pct={faturamentoCrescimento} />
              <span className="text-[10px] text-text-muted font-semibold">vs. período anterior</span>
            </div>
            {ov.data?.meta_total > 0 && faturamentoAtual < ov.data.meta_total && (
              <span className="text-[9px] font-bold text-brand-600 block">
                Faltam {(((ov.data.meta_total - faturamentoAtual) / ov.data.meta_total) * 100).toFixed(1)}% para atingir a meta
              </span>
            )}
          </div>
        </div>

        {/* Card 2: Últimos 30 Dias */}
        <div className="bg-bg-primary border border-divider shadow-card rounded-xl p-6 relative overflow-hidden flex flex-col justify-between min-h-[140px]">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-brand-500"></div>
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block">Últimos 30 Dias</span>
            <div className="p-1.5 bg-brand-500/10 text-brand-500 rounded-lg shrink-0">
              <Calendar size={16} />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-text-primary tracking-tight">
              {formatBRL(faturamento30)}
            </div>
          </div>
          <div className="space-y-1.5 mt-auto">
            <div className="flex items-center gap-1.5">
              <ComparisonBadge pct={faturamento30Crescimento} />
              <span className="text-[10px] text-text-muted font-semibold">vs. 30d anteriores</span>
            </div>
            <span className="text-[9px] text-text-muted font-bold block">
              Representa {faturamentoAtual > 0 ? ((faturamento30 / faturamentoAtual) * 100).toFixed(1) : '0.0'}% do total
            </span>
          </div>
        </div>

        {/* Card 3: Últimos 60 Dias */}
        <div className="bg-bg-primary border border-divider shadow-card rounded-xl p-6 relative overflow-hidden flex flex-col justify-between min-h-[140px]">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-brand-500"></div>
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block">Últimos 60 Dias</span>
            <div className="p-1.5 bg-brand-500/10 text-brand-500 rounded-lg shrink-0">
              <Briefcase size={16} />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-text-primary tracking-tight">
              {formatBRL(faturamento60)}
            </div>
          </div>
          <div className="space-y-1.5 mt-auto">
            <div className="flex items-center gap-1.5">
              <ComparisonBadge pct={faturamento60Crescimento} />
              <span className="text-[10px] text-text-muted font-semibold">vs. 60d anteriores</span>
            </div>
            <span className="text-[9px] text-text-muted font-bold block">
              Tendência de crescimento no período
            </span>
          </div>
        </div>
      </div>

      {/* 4. SEGUNDA ÁREA COM CARDS DE DESTAQUE GRID 3x2 (PASSO 5) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card 1: Melhor Vendedor */}
        <div className="bg-bg-primary border border-divider shadow-card rounded-xl p-5 min-h-[130px] flex flex-col justify-between">
          <div className="flex justify-between items-start gap-1.5">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block">Melhor Vendedor</span>
            <div className="p-1.5 bg-brand-500/10 text-brand-500 rounded-lg shrink-0">
              <Award size={15} />
            </div>
          </div>
          {bestSeller && bestSeller.value > 0 ? (
            <div className="mt-2 space-y-1">
              <div className="text-sm font-extrabold text-brand-500 truncate max-w-[220px]">{bestSeller.name}</div>
              <div className="text-xl font-black text-text-primary">{formatBRL(bestSeller.value)}</div>
              <span className="text-[10px] text-text-muted font-bold block">{bestSeller.pct.toFixed(1)}% do faturamento total</span>
            </div>
          ) : (
            <span className="text-xs text-text-muted italic py-2">Sem vendas no período</span>
          )}
        </div>

        {/* Card 2: Melhor Cliente */}
        <div className="bg-bg-primary border border-divider shadow-card rounded-xl p-5 min-h-[130px] flex flex-col justify-between">
          <div className="flex justify-between items-start gap-1.5">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block">Melhor Cliente</span>
            <div className="p-1.5 bg-brand-500/10 text-brand-500 rounded-lg shrink-0">
              <Award size={15} />
            </div>
          </div>
          {bestClient && bestClient.value > 0 ? (
            <div className="mt-2 space-y-1">
              <div className="text-sm font-extrabold text-brand-500 truncate max-w-[220px]">{bestClient.name}</div>
              <div className="text-xl font-black text-text-primary">{formatBRL(bestClient.value)}</div>
              <span className="text-[10px] text-text-muted font-bold block">Cliente com maior faturamento</span>
            </div>
          ) : (
            <span className="text-xs text-text-muted italic py-2">Sem clientes no período</span>
          )}
        </div>

        {/* Card 3: Volume de Peças */}
        <div className="bg-bg-primary border border-divider shadow-card rounded-xl p-5 min-h-[130px] flex flex-col justify-between">
          <div className="flex justify-between items-start gap-1.5">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block">Volume de Peças</span>
            <div className="p-1.5 bg-brand-500/10 text-brand-500 rounded-lg shrink-0">
              <Box size={15} />
            </div>
          </div>
          <div className="mt-2 space-y-1">
            <div className="text-xl font-black text-text-primary">{formatNum(qtdPedidos)}</div>
            <span className="text-[10px] text-text-muted font-bold block">Total de peças faturadas</span>
          </div>
        </div>

        {/* Card 4: Ticket Médio */}
        <div className="bg-bg-primary border border-divider shadow-card rounded-xl p-5 min-h-[130px] flex flex-col justify-between">
          <div className="flex justify-between items-start gap-1.5">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block">Ticket Médio</span>
            <div className="p-1.5 bg-brand-500/10 text-brand-500 rounded-lg shrink-0">
              <Target size={15} />
            </div>
          </div>
          <div className="mt-2 space-y-1">
            <div className="text-xl font-black text-text-primary">{formatBRL(ticketMedio)}</div>
            <span className="text-[10px] text-text-muted font-bold block">Média por venda/nota</span>
          </div>
        </div>

        {/* Card 5: Taxa de Conversão */}
        <div className="bg-bg-primary border border-divider shadow-card rounded-xl p-5 min-h-[130px] flex flex-col justify-between">
          <div className="flex justify-between items-start gap-1.5">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block">Taxa de Conversão</span>
            <div className="p-1.5 bg-brand-500/10 text-brand-500 rounded-lg shrink-0">
              <TrendingUp size={15} />
            </div>
          </div>
          <div className="mt-2 space-y-1">
            <div className="text-xl font-black text-text-primary">{taxaConversao.toFixed(1)}%</div>
            <span className="text-[10px] text-text-muted font-bold block">Conversão de vendas no período</span>
          </div>
        </div>

        {/* Card 6: Clientes com Compra */}
        <div className="bg-bg-primary border border-divider shadow-card rounded-xl p-5 min-h-[130px] flex flex-col justify-between">
          <div className="flex justify-between items-start gap-1.5">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block">Clientes com Compra</span>
            <div className="p-1.5 bg-brand-500/10 text-brand-500 rounded-lg shrink-0">
              <Users size={15} />
            </div>
          </div>
          <div className="mt-2 space-y-1">
            <div className="text-xl font-black text-text-primary">{formatNum(clientesAtivos)}</div>
            <span className="text-[10px] text-text-muted font-bold block">Clientes ativos no período</span>
          </div>
        </div>
      </div>

      {/* 5. SEÇÃO DE RANKINGS ANTES DOS GRÁFICOS (PASSO 7) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 1. Ranking de Vendedores */}
        <div className="bg-bg-primary border border-divider shadow-card rounded-xl p-5 flex flex-col min-h-[360px]">
          <div className="flex items-center gap-1.5 border-b border-divider/20 pb-3 mb-4">
            <Award size={16} className="text-brand-500" />
            <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">Top 10 Vendedores</h4>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[280px] text-xs space-y-2 pr-1 scrollbar-none">
            {mockTopSellers.slice(0, 10).map((s: any, idx: number) => {
              const rank = idx + 1;
              const share = totalSellersVal > 0 ? (s.value / totalSellersVal) * 100 : 0;
              return (
                <div key={idx} className="flex justify-between items-center py-2 border-b border-divider/5 hover:bg-bg-secondary/40 px-2 rounded-lg transition-colors">
                  <span className="text-text-secondary truncate max-w-[140px] font-medium" title={s.name}>
                    <span className="font-bold text-brand-500 mr-2 font-mono">#{rank}</span>
                    {s.name}
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

        {/* 2. Ranking de Marcas */}
        <div className="bg-bg-primary border border-divider shadow-card rounded-xl p-5 flex flex-col min-h-[360px]">
          <div className="flex items-center gap-1.5 border-b border-divider/20 pb-3 mb-4">
            <Tag size={16} className="text-brand-500" />
            <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">Top 15 Marcas</h4>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[280px] text-xs space-y-2 pr-1 scrollbar-none">
            {mockTopBrands.slice(0, 15).map((m: any, idx: number) => {
              const rank = idx + 1;
              const share = totalBrandsVal > 0 ? (m.value / totalBrandsVal) * 100 : 0;
              return (
                <div key={idx} className="flex justify-between items-center py-2 border-b border-divider/5 hover:bg-bg-secondary/40 px-2 rounded-lg transition-colors">
                  <span className="text-text-secondary truncate max-w-[140px] font-medium" title={m.name}>
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
        </div>

        {/* 3. Ranking de Grupos */}
        <div className="bg-bg-primary border border-divider shadow-card rounded-xl p-5 flex flex-col min-h-[360px]">
          <div className="flex items-center gap-1.5 border-b border-divider/20 pb-3 mb-4">
            <Box size={16} className="text-brand-500" />
            <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">Top 15 Grupos</h4>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[280px] text-xs space-y-2 pr-1 scrollbar-none">
            {mockTopGroups.slice(0, 15).map((g: any, idx: number) => {
              const rank = idx + 1;
              const share = totalGroupsVal > 0 ? (g.value / totalGroupsVal) * 100 : 0;
              return (
                <div key={idx} className="flex justify-between items-center py-2 border-b border-divider/5 hover:bg-bg-secondary/40 px-2 rounded-lg transition-colors">
                  <span className="text-text-secondary truncate max-w-[140px] font-medium" title={g.name}>
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
        </div>

        {/* 4. Ranking de Cidades */}
        <div className="bg-bg-primary border border-divider shadow-card rounded-xl p-5 flex flex-col min-h-[360px]">
          <div className="flex items-center gap-1.5 border-b border-divider/20 pb-3 mb-4">
            <Map size={16} className="text-brand-500" />
            <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">Top 15 Cidades</h4>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[280px] text-xs space-y-2 pr-1 scrollbar-none">
            {mockTopCities.slice(0, 15).map((c: any, idx: number) => {
              const rank = idx + 1;
              const share = totalCitiesVal > 0 ? (c.value / totalCitiesVal) * 100 : 0;
              return (
                <div key={idx} className="flex justify-between items-center py-2 border-b border-divider/5 hover:bg-bg-secondary/40 px-2 rounded-lg transition-colors">
                  <span className="text-text-secondary truncate max-w-[140px] font-medium" title={c.name}>
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
        </div>

        {/* 5. Ranking de Clientes */}
        <div className="bg-bg-primary border border-divider shadow-card rounded-xl p-5 flex flex-col min-h-[360px] lg:col-span-2">
          <div className="flex items-center gap-1.5 border-b border-divider/20 pb-3 mb-4">
            <Users size={16} className="text-brand-500" />
            <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">Top 15 Clientes</h4>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[280px] text-xs space-y-2 pr-1 scrollbar-none">
            {mockTopClients.slice(0, 15).map((c: any, idx: number) => {
              const share = totalClientsVal > 0 ? (c.value / totalClientsVal) * 100 : 0;
              return (
                <div key={idx} className="flex justify-between items-center py-2 border-b border-divider/5 hover:bg-bg-secondary/40 px-2 rounded-lg transition-colors">
                  <span className="text-text-secondary truncate max-w-[280px] font-medium" title={c.name}>
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
        </div>
      </div>

      {/* 6. SEÇÃO DE GRÁFICOS (PASSO 8) */}
      <div className="w-full bg-bg-primary border border-divider shadow-card rounded-xl p-5 mt-6">
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
