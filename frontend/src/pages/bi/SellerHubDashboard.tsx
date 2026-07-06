import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext, useParams, useNavigate } from 'react-router-dom';
import { useBiPeriodQuery } from '../../hooks/useBiPeriodQuery';
import { useBranchPeriodQuery } from '../../hooks/useApi';
import { BIService } from '../../services/biApi';
import { BiPeriodFilter } from '../../types/bi.types';
import { 
  Trophy, Users, Box, Award, DollarSign, TrendingUp, TrendingDown, 
  Calendar, MapPin, FileText, ChevronLeft, ChevronRight, Activity,
  BarChart3, ArrowUpDown, Clock, Search, EyeOff, Tag, PieChart as PieIcon, List,
  Target
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, PieChart, Pie, Cell
} from 'recharts';
import { formatBRL, formatNum, formatBRLCompact } from '../../utils/format';
import clsx from 'clsx';

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
    );
  }
  return null;
};

const formatPeriod = (s?: string, e?: string) => {
  if (!s || !e) return '';
  if (s === e) return s;
  return `${s} a ${e}`;
};

const COLORS = ['#0D9488', '#0F766E', '#115E59', '#134E4A', '#14B8A6', '#2DD4BF', '#5EEAD4', '#99F6E4', '#CCFBF1', '#F0FDFA'];

export default function SellerHubDashboard() {
  const { filter: globalFilter } = useOutletContext<{ filter: BiPeriodFilter }>();
  const { sellerId } = useParams();
  const navigate = useNavigate();

  // Fetch list of sellers dynamically
  const vdFull = useBranchPeriodQuery<any>('/ranking/vendedores', { limit: 100 });

  // Local Filter state matching mock
  const [selectedVendedor, setSelectedVendedor] = useState<string>('');
  
  // Toggles for charts & rankings
  const [viewMode, setViewMode] = useState<Record<string, 'chart' | 'text'>>({
    historico: 'chart',
    diaSemana: 'chart',
    evolucao12m: 'chart'
  });

  const [rankingViews, setRankingViews] = useState<Record<string, 'list' | 'bar'>>({
    clientes: 'list',
    grupos: 'list',
    produtos: 'list'
  });

  const [activeRankingTab, setActiveRankingTab] = useState<'clientes' | 'grupos' | 'produtos'>('clientes');
  const containerRef = React.useRef<HTMLDivElement>(null);

  const scrollToTab = (tab: 'clientes' | 'grupos' | 'produtos') => {
    if (containerRef.current) {
      const el = containerRef.current;
      const index = tab === 'clientes' ? 0 : tab === 'grupos' ? 1 : 2;
      el.scrollTo({
        left: el.clientWidth * index,
        behavior: 'smooth'
      });
      setActiveRankingTab(tab);
    }
  };

  const handleScroll = () => {
    if (containerRef.current) {
      const el = containerRef.current;
      const index = Math.round(el.scrollLeft / el.clientWidth);
      const tabs = ['clientes', 'grupos', 'produtos'] as const;
      if (tabs[index] && activeRankingTab !== tabs[index]) {
        setActiveRankingTab(tabs[index]);
      }
    }
  };

  const [mobileActiveRanking, setMobileActiveRanking] = useState<string>('clientes');
  const [evolucaoPeriodType, setEvolucaoPeriodType] = useState<'months' | 'days'>('months');

  // Table filtering and sorting states
  const [clientQuery, setClientQuery] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('TODOS');
  const [invoiceSortField, setInvoiceSortField] = useState<'numero' | 'data' | 'valor'>('data');
  const [invoiceSortOrder, setInvoiceSortOrder] = useState<'asc' | 'desc'>('desc');
  const [visibleInvoicesCount, setVisibleInvoicesCount] = useState(50);

  // Set default seller when list loaded
  useEffect(() => {
    if (sellerId) {
      setSelectedVendedor(sellerId);
    } else if (vdFull.data?.data && vdFull.data.data.length > 0 && !selectedVendedor) {
      setSelectedVendedor(String(vdFull.data.data[0].id));
    }
  }, [vdFull.data, selectedVendedor, sellerId]);

  const activeFilter = useMemo(() => ({
    ...globalFilter,
    vendedor_id: selectedVendedor || undefined
  }), [globalFilter, selectedVendedor]);

  const selectedSellerName = useMemo(() => {
    if (!selectedVendedor || !vdFull.data?.data) return '';
    const seller = vdFull.data.data.find((v: any) => String(v.id) === String(selectedVendedor));
    return seller ? seller.nome : '';
  }, [selectedVendedor, vdFull.data]);

  const { data, isLoading, isError } = useBiPeriodQuery<any>(
    ['bi', 'seller-summary', activeFilter],
    async (f) => {
      const response = await BIService.getSellerSummary(f);
      return response;
    },
    activeFilter
  );

  // Reset pagination limit when selected vendor, query, or filters change
  useEffect(() => {
    setVisibleInvoicesCount(50);
  }, [selectedVendedor, globalFilter, clientQuery, invoiceStatusFilter]);

  // Safe metrics extraction
  const faturamento = data?.faturamento || 0;
  const faturamentoAnterior = data?.faturamento_anterior || 0;
  const ticketMedio = data?.ticket_medio || 0;
  const notasEmitidas = data?.notas_emitidas || 0;
  const clientesNovos = data?.clientes_novos || 0;
  const clientesAtivos = data?.clientes_ativos || 0;
  const novosPct = data?.novos_pct || 0;
  const antigosPct = data?.antigos_pct || 100;
  const cidadeTop = data?.cidade_top || 'N/A';
  const cidadeTopValor = data?.cidade_top_valor || 0;
  const crescimentoPct = data?.crescimento_pct || 0;
  const melhorMes = data?.melhor_mes_12m || { mes: 'N/A', valor: 0 };

  const topMarcas = data?.top_marcas || [];
  const topClientes = data?.top_clientes || [];
  const topGrupos = data?.top_grupos || [];
  const topProdutos = data?.top_produtos || [];
  
  const principalCliente = topClientes.length > 0 ? topClientes[0] : null;
  
  const historicoVendas = data?.historico_vendas || [];
  const vendasPorDiaSemana = data?.vendas_por_dia_semana || [];
  const invoicesList = data?.notas_fiscais || [];

  const dateRangeLabel = useMemo(() => {
    if (!data?.start_date) return '';
    const isTodayFilter = globalFilter.period === 'today' || globalFilter.period === 'hoje';
    if (isTodayFilter) {
      return `Último dia com informações: ${data.start_date}`;
    }
    return formatPeriod(data.start_date, data.end_date);
  }, [data?.start_date, data?.end_date, globalFilter.period]);

  const maxBrandValue = useMemo(() => {
    if (topMarcas.length === 0) return 0;
    return Math.max(...topMarcas.map((m: any) => m.value));
  }, [topMarcas]);

  // Calculate total values for percentage share display in rankings
  const totalMarcasVal = useMemo(() => topMarcas.reduce((acc: number, curr: any) => acc + curr.value, 0), [topMarcas]);
  const totalClientesVal = useMemo(() => topClientes.reduce((acc: number, curr: any) => acc + curr.value, 0), [topClientes]);
  const totalGruposVal = useMemo(() => topGrupos.reduce((acc: number, curr: any) => acc + curr.value, 0), [topGrupos]);
  const totalProdutosVal = useMemo(() => topProdutos.reduce((acc: number, curr: any) => acc + curr.value, 0), [topProdutos]);

  // Filter Invoices by search and status
  const filteredInvoices = useMemo(() => {
    let result = invoicesList;
    
    // Search by client or note number
    if (clientQuery.trim()) {
      const query = clientQuery.toLowerCase();
      result = result.filter((inv: any) => 
        String(inv.cliente || '').toLowerCase().includes(query) ||
        String(inv.numero_nota || '').toLowerCase().includes(query)
      );
    }
    
    // Filter by status
    if (invoiceStatusFilter !== 'TODOS') {
      result = result.filter((inv: any) => 
        String(inv.status || '').trim().toUpperCase() === invoiceStatusFilter.toUpperCase()
      );
    }
    
    return result;
  }, [invoicesList, clientQuery, invoiceStatusFilter]);

  // Sort Invoices
  const sortedInvoices = useMemo(() => {
    const list = [...filteredInvoices];
    return list.sort((a: any, b: any) => {
      let comparison = 0;
      if (invoiceSortField === 'numero') {
        comparison = String(a.numero_nota || '').localeCompare(String(b.numero_nota || ''));
      } else if (invoiceSortField === 'data') {
        const parseDate = (dStr: string) => {
          if (!dStr) return 0;
          const parts = dStr.split('/');
          if (parts.length === 3) {
            // dd/mm/yyyy -> timestamp
            return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0])).getTime();
          }
          return new Date(dStr).getTime();
        };
        comparison = parseDate(a.data) - parseDate(b.data);
      } else if (invoiceSortField === 'valor') {
        comparison = (a.valor || 0) - (b.valor || 0);
      }
      return invoiceSortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredInvoices, invoiceSortField, invoiceSortOrder]);

  // Extract unique statuses for filter pills
  const availableInvoiceStatuses = useMemo<string[]>(() => {
    const statuses = invoicesList.map((inv: any) => String(inv.status || '').trim().toUpperCase()).filter(Boolean);
    return Array.from(new Set(statuses)) as string[];
  }, [invoicesList]);

  // Limit visible invoices to visibleInvoicesCount
  const currentInvoices = useMemo(() => {
    return sortedInvoices.slice(0, visibleInvoicesCount);
  }, [sortedInvoices, visibleInvoicesCount]);

  const handleInvoiceSort = (field: 'numero' | 'data' | 'valor') => {
    if (invoiceSortField === field) {
      setInvoiceSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setInvoiceSortField(field);
      setInvoiceSortOrder('desc');
    }
  };

  const getHistoricoVendasSummary = () => {
    if (historicoVendas.length === 0) return "Sem histórico de faturamento neste período.";
    const sorted = [...historicoVendas].sort((a: any, b: any) => b.valor - a.valor);
    const peak = sorted[0];
    const lowest = sorted[sorted.length - 1];
    return `O faturamento diário consolidado registrou seu pico no dia ${peak.dia} no valor de ${formatBRL(peak.valor)}, e o menor valor no dia ${lowest.dia} no valor de ${formatBRL(lowest.valor)}.`;
  };

  const getVendasDiaSemanaSummary = () => {
    if (vendasPorDiaSemana.length === 0) return "Sem faturamento registrado por dia da semana.";
    const sorted = [...vendasPorDiaSemana].sort((a: any, b: any) => b.valor - a.valor);
    const peak = sorted[0];
    const totalVal = vendasPorDiaSemana.reduce((acc: number, curr: any) => acc + curr.valor, 0);
    const peakPct = totalVal > 0 ? (peak.valor / totalVal) * 100 : 0;
    return `O dia de maior faturamento na semana é ${peak.dia} com faturamento acumulado de ${formatBRL(peak.valor)}, representando ${peakPct.toFixed(1)}% do faturamento semanal total.`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 text-text-secondary">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500 mr-3"></div>
        Carregando Hub do Vendedor...
      </div>
    );
  }

  const isHistoricoEmpty = historicoVendas.length === 0 || historicoVendas.every((v: any) => v.valor === 0);


  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* FILTER BAR ROW */}
      <div className="bg-bg-primary border border-divider shadow-card rounded-2xl p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-text-primary flex flex-wrap items-center gap-x-2 gap-y-1">
            <Activity className="text-brand-500" size={24} />
            <span>{selectedSellerName || 'Hub do Vendedor'}</span>
            {data?.start_date && (
              <span className="text-xs md:text-sm font-bold text-text-secondary whitespace-nowrap">
                ({dateRangeLabel})
              </span>
            )}
          </h2>
        </div>
        
        <div className="flex flex-wrap items-end gap-3 w-full lg:w-auto">
          {sellerId ? (
            <button
              onClick={() => navigate('/comercial/equipe')}
              className="px-4 py-2.5 bg-bg-secondary hover:bg-bg-tertiary border border-divider text-text-primary rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <ChevronLeft size={16} />
              Voltar para Equipe
            </button>
          ) : (
            <div className="flex flex-col gap-1 w-full sm:w-60 md:w-64 flex-1 sm:flex-initial">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Vendedor</span>
              <select
                value={selectedVendedor}
                onChange={(e) => setSelectedVendedor(e.target.value)}
                className="h-12 px-4 bg-bg-secondary border border-divider text-text-primary rounded-2xl text-sm md:text-base font-bold focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all duration-300 w-full cursor-pointer shadow-sm"
              >
                <option value="">Selecione um vendedor...</option>
                {vdFull.data?.data?.map((v: any) => (
                  <option key={v.id} value={v.id}>{v.nome}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* HIGHLIGHTED FATURAMENTO & METAS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Faturamento Comparison Card */}
        <div className="lg:col-span-8 bg-bg-primary border border-divider shadow-card rounded-2xl p-6 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 hover:shadow-card-hover transition-all duration-300">
          {/* Left teal border decoration */}
          <div className="absolute top-0 bottom-0 left-0 w-[6px] bg-brand-500"></div>

          {/* Current Faturamento Card Content */}
          <div className="flex items-center gap-5 flex-1 w-full">
            <div className="p-4 bg-brand-500/10 text-brand-500 rounded-2xl shrink-0 shadow-sm">
              <DollarSign size={32} className="stroke-[2.5]" />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold text-text-secondary uppercase tracking-widest block">Faturamento Atual</span>
              <div className="text-2xl sm:text-3xl md:text-4xl font-black text-text-primary tracking-tight leading-none">
                {formatBRL(faturamento)}
              </div>
              <span className="text-xs text-text-muted font-medium block">Período selecionado</span>
            </div>
          </div>

          {/* Center: Comparison Arrow & Percentage Inline */}
          <div className="flex flex-col items-center justify-center shrink-0 py-3 px-5 rounded-2xl bg-bg-secondary border border-divider shadow-sm w-full md:w-auto">
            <span className={clsx(
              "text-sm font-black flex items-center gap-1.5",
              crescimentoPct >= 0 ? "text-success" : "text-danger"
            )}>
              {crescimentoPct >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
              {crescimentoPct >= 0 ? "+" : ""}{crescimentoPct.toFixed(1)}%
            </span>
            <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider mt-0.5">vs. mês anterior</span>
          </div>

          {/* Previous Month Faturamento Card Content */}
          <div className="flex items-center gap-5 flex-1 md:justify-end text-left md:text-right w-full">
            <div className="space-y-1 md:order-1 order-2 flex-1 md:flex-initial">
              <span className="text-xs font-bold text-text-secondary uppercase tracking-widest block">Faturamento Anterior</span>
              <div className="text-xl sm:text-2xl font-extrabold text-text-primary tracking-tight leading-none">
                {formatBRL(faturamentoAnterior)}
              </div>
              <span className="text-xs text-text-muted font-medium block">Mês completo anterior</span>
            </div>
            <div className="p-3.5 bg-text-muted/10 text-text-muted rounded-2xl shrink-0 md:order-2 order-1 shadow-sm">
              <DollarSign size={24} />
            </div>
          </div>
        </div>

        {/* Metas Velocímetro Card */}
        <div className="lg:col-span-4 bg-bg-primary border border-divider shadow-card rounded-2xl p-5 flex flex-col justify-between hover:shadow-card-hover transition-all duration-300 relative overflow-hidden">
          <div className="absolute top-0 bottom-0 left-0 w-[4px] bg-emerald-500"></div>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1 bg-emerald-500/10 text-emerald-500 rounded-lg">
              <Target size={16} />
            </div>
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Atingimento de Meta</span>
          </div>

          {(() => {
            const metaValor = 150000.00;
            const metaAtingimentoPct = Math.min(100, Math.round((faturamento / metaValor) * 100)) || 0;
            const angle = (metaAtingimentoPct / 100) * 180;
            const needleAngle = 180 - angle;
            const needleRad = (needleAngle * Math.PI) / 180;
            const radius = 35;
            const needleX = 50 + radius * Math.cos(needleRad);
            const needleY = 50 - radius * Math.sin(needleRad);

            return (
              <div className="flex items-center justify-between gap-4 py-1">
                {/* SVG Velocímetro */}
                <div className="relative w-32 h-20 shrink-0">
                  <svg viewBox="0 0 100 55" className="w-full h-full">
                    {/* Background arc */}
                    <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="var(--color-bg-tertiary)" strokeWidth="8" strokeLinecap="round" />
                    {/* Value arc */}
                    <path 
                      d="M 10 50 A 40 40 0 0 1 90 50" 
                      fill="none" 
                      stroke={metaAtingimentoPct >= 100 ? "#10B981" : "#0D9488"} 
                      strokeWidth="8" 
                      strokeLinecap="round" 
                      strokeDasharray={`${(metaAtingimentoPct / 100) * 125.6} 125.6`} 
                    />
                    {/* Needle */}
                    <line x1="50" y1="50" x2={needleX} y2={needleY} stroke="var(--color-text-primary)" strokeWidth="2.5" strokeLinecap="round" />
                    <circle cx="50" cy="50" r="3.5" fill="var(--color-text-primary)" />
                  </svg>
                  <div className="absolute bottom-0 left-0 right-0 text-center">
                    <span className="text-lg font-black text-text-primary">{metaAtingimentoPct}%</span>
                  </div>
                </div>

                <div className="space-y-1 text-right">
                  <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block">Objetivo</span>
                  <div className="text-base font-extrabold text-text-primary leading-none">{formatBRL(metaValor)}</div>
                  <span className="text-[10px] text-text-muted font-semibold block mt-1">Falta: {formatBRL(Math.max(0, metaValor - faturamento))}</span>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* 6 OPERATIONAL KPI CARDS - GRID IN SMALLER SIZES (3 CARDS PER ROW ON DESKTOP, 2 ON TABLET, 1 ON MOBILE) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card 1: Ticket Médio */}
        <div className="bg-bg-primary border border-divider/60 shadow-card hover:shadow-card-hover rounded-2xl p-6 flex items-center gap-4 transition-all duration-300 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-brand-500"></div>
          <div className="p-3.5 bg-brand-500/10 text-brand-500 rounded-2xl shrink-0">
            <Trophy size={26} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider block">Ticket Médio</span>
            <div className="text-xl font-black text-text-primary tracking-tight truncate mt-1">
              {formatBRL(ticketMedio)}
            </div>
            <span className="text-xs text-text-muted font-semibold block mt-0.5">Média por venda</span>
          </div>
        </div>

        {/* Card 2: Notas Emitidas */}
        <div className="bg-bg-primary border border-divider/60 shadow-card hover:shadow-card-hover rounded-2xl p-6 flex items-center gap-4 transition-all duration-300 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-brand-500"></div>
          <div className="p-3.5 bg-brand-500/10 text-brand-500 rounded-2xl shrink-0">
            <FileText size={26} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider block">Notas Emitidas</span>
            <div className="text-xl font-black text-text-primary tracking-tight truncate mt-1">
              {formatNum(notasEmitidas)}
            </div>
            <span className="text-xs text-text-muted font-semibold block mt-0.5">Total documentos</span>
          </div>
        </div>

        {/* Card 3: Clientes Atendidos */}
        <div className="bg-bg-primary border border-divider/60 shadow-card hover:shadow-card-hover rounded-2xl p-6 flex items-center gap-4 transition-all duration-300 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-brand-500"></div>
          <div className="p-3.5 bg-brand-500/10 text-brand-500 rounded-2xl shrink-0">
            <Users size={26} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider block">Clientes Atendidos</span>
            <div className="text-xl font-black text-text-primary tracking-tight truncate mt-1">
              {clientesAtivos}
            </div>
            <span className="text-xs text-text-muted font-semibold block mt-0.5">
              {notasEmitidas} {notasEmitidas === 1 ? 'pedido' : 'pedidos'} de {clientesAtivos} {clientesAtivos === 1 ? 'cliente' : 'clientes'}
            </span>
          </div>
        </div>

        {/* Card 4: Cidade Top */}
        <div className="bg-bg-primary border border-divider/60 shadow-card hover:shadow-card-hover rounded-2xl p-6 flex items-center gap-4 transition-all duration-300 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-brand-500"></div>
          <div className="p-3.5 bg-brand-500/10 text-brand-500 rounded-2xl shrink-0">
            <MapPin size={26} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider block">Cidade Top</span>
            <div className="text-xl font-black text-text-primary tracking-tight truncate mt-1" title={cidadeTop}>
              {cidadeTop}
            </div>
            <span className="text-xs font-bold text-brand-500 block mt-0.5">
              {formatBRLCompact(cidadeTopValor)} faturados
            </span>
          </div>
        </div>

        {/* Card 5: Principal Cliente */}
        <div className="bg-bg-primary border border-divider/60 shadow-card hover:shadow-card-hover rounded-2xl p-6 flex items-center gap-4 transition-all duration-300 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-brand-500"></div>
          <div className="p-3.5 bg-brand-500/10 text-brand-500 rounded-2xl shrink-0">
            <Award size={26} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider block">Principal Cliente</span>
            <div className="text-xl font-black text-text-primary tracking-tight truncate mt-1" title={principalCliente ? principalCliente.name : 'N/A'}>
              {principalCliente ? principalCliente.name : 'N/A'}
            </div>
            <span className="text-xs font-bold text-brand-500 block mt-0.5">
              {principalCliente ? formatBRLCompact(principalCliente.value) : 'Sem vendas'} faturados
            </span>
          </div>
        </div>

        {/* Card 6: Melhor Mês */}
        <div className="bg-bg-primary border border-divider/60 shadow-card hover:shadow-card-hover rounded-2xl p-6 flex items-center gap-4 transition-all duration-300 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-brand-500"></div>
          <div className="p-3.5 bg-brand-500/10 text-brand-500 rounded-2xl shrink-0">
            <Calendar size={26} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider block">Melhor Mês (12m)</span>
            <div className="text-xl font-black text-brand-500 tracking-tight truncate mt-1">
              {melhorMes && melhorMes.valor > 0 ? formatBRLCompact(melhorMes.valor) : 'Sem vendas'}
            </div>
            <span className="text-xs font-bold text-text-primary block mt-0.5">
              {melhorMes && melhorMes.mes !== 'N/A' ? melhorMes.mes : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* SECTION: DESEMPENHO POR MARCA (SUBIDO PARA ANTES DOS TOP RANKINGS) */}
      <div className="bg-bg-primary border border-divider shadow-card rounded-2xl p-6">
        <div className="border-b border-divider/20 pb-3 mb-5">
          <h3 className="text-base font-extrabold text-text-primary uppercase tracking-wider">Desempenho por Marca</h3>
          <p className="text-xs text-text-secondary mt-0.5">Distribuição e representação de faturamento realizado por marca</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
          {topMarcas.slice(0, 8).map((m: any, index: number) => {
            const brandPct = totalMarcasVal > 0 ? (m.value / totalMarcasVal) * 100 : 0;
            const isLeader = index === 0;

            return (
              <div 
                key={m.rank} 
                className={clsx(
                  "border rounded-2xl p-5 flex flex-col justify-between hover:shadow-card-hover transition-all duration-300 relative overflow-hidden",
                  isLeader 
                    ? "border-brand-500/80 bg-brand-500/[0.02] shadow-sm"
                    : "border-divider/50 bg-bg-secondary/10"
                )}
              >
                {isLeader && (
                  <div className="absolute top-0 right-0 bg-brand-500 text-white text-[9px] font-black uppercase px-2.5 py-0.5 rounded-bl-xl tracking-wider">
                    Líder
                  </div>
                )}
                
                <div className="flex justify-between items-start gap-1">
                  <span className="text-xs font-bold text-text-primary uppercase truncate max-w-[80%]" title={m.name}>
                    {m.name}
                  </span>
                  <span className="text-xs font-black text-brand-500">
                    {brandPct.toFixed(1)}%
                  </span>
                </div>
                
                <div className="w-full bg-bg-secondary h-3.5 rounded-full mt-3 overflow-hidden">
                  <div className="bg-brand-500 h-full rounded-full transition-all duration-500" style={{ width: `${brandPct}%` }}></div>
                </div>

                <div className="flex justify-between items-center text-xs text-text-secondary font-medium mt-4 leading-none">
                  <span>Realizado: <span className="font-extrabold text-text-primary">{formatBRLCompact(m.value)}</span></span>
                </div>
              </div>
            );
          })}
          {topMarcas.length === 0 && (
            <div className="col-span-full text-center py-8 text-text-muted text-xs font-semibold">
              Nenhuma marca registrada para este vendedor no período.
            </div>
          )}
        </div>
      </div>

      {/* Unified Tabbed Rankings Card (Desktop Tab Bar + Mobile Swipe Slider) */}
      <div className="bg-bg-primary border border-divider shadow-card rounded-2xl p-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center border-b border-divider/20 pb-4 mb-5 gap-4">
          <div>
            <h3 className="text-base font-extrabold text-text-primary uppercase tracking-wider">Rankings de Desempenho</h3>
            <p className="text-xs text-text-secondary mt-0.5">Visão consolidada de faturamento por Cliente, Grupo e Produto</p>
          </div>
          <div className="flex bg-bg-secondary p-0.5 rounded-xl border border-divider shadow-sm shrink-0 w-full sm:w-auto overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden [WebkitOverflowScrolling:touch]">
            <button
              onClick={() => scrollToTab('clientes')}
              className={clsx(
                "px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 flex-1 sm:flex-initial whitespace-nowrap",
                activeRankingTab === 'clientes'
                  ? "bg-brand-500 text-white shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              )}
            >
              <Users size={14} />
              Clientes
            </button>
            <button
              onClick={() => scrollToTab('grupos')}
              className={clsx(
                "px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 flex-1 sm:flex-initial whitespace-nowrap",
                activeRankingTab === 'grupos'
                  ? "bg-brand-500 text-white shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              )}
            >
              <Box size={14} />
              Grupos
            </button>
            <button
              onClick={() => scrollToTab('produtos')}
              className={clsx(
                "px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 flex-1 sm:flex-initial whitespace-nowrap",
                activeRankingTab === 'produtos'
                  ? "bg-brand-500 text-white shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              )}
            >
              <Trophy size={14} />
              Produtos
            </button>
          </div>
        </div>

        <div className="overflow-hidden w-full">
          <div 
            ref={containerRef} 
            onScroll={handleScroll} 
            className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] md:overflow-hidden"
          >
            {/* Panel 1: Clientes */}
            <div className="w-full shrink-0 snap-start flex flex-col min-h-[340px]">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Top 10 Clientes</span>
                <button
                  onClick={() => setRankingViews(prev => ({ ...prev, clientes: prev.clientes === 'list' ? 'bar' : 'list' }))}
                  className="p-1.5 bg-bg-secondary hover:bg-bg-secondary/80 text-text-secondary hover:text-text-primary rounded-lg border border-divider transition-all cursor-pointer shadow-sm text-[11px] font-bold px-3 flex items-center gap-1.5"
                >
                  {rankingViews.clientes === 'list' ? <BarChart3 size={13} /> : <List size={13} />}
                  {rankingViews.clientes === 'list' ? "Gráfico" : "Lista"}
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto max-h-[300px] text-xs pr-1">
                {rankingViews.clientes === 'list' ? (
                  <div className="space-y-0.5">
                    {topClientes.map((c: any) => {
                      const share = totalClientesVal > 0 ? (c.value / totalClientesVal) * 100 : 0;
                      return (
                        <div key={c.rank} className="flex justify-between items-center py-2 border-b border-divider/5 hover:bg-bg-secondary/50 px-2 rounded-lg transition-colors">
                          <span className="text-text-secondary truncate font-medium text-xs flex-1 min-w-0 mr-2" title={c.name}>
                            <span className="font-extrabold text-brand-500 mr-2 font-mono">#{c.rank}</span>
                            {c.name}
                          </span>
                          <div className="text-right shrink-0 flex items-center gap-1.5">
                            <span className="font-extrabold text-text-primary font-mono text-xs">{formatBRLCompact(c.value)}</span>
                            <span className="text-[10px] text-danger font-bold">({share.toFixed(1)}%)</span>
                          </div>
                        </div>
                      );
                    })}
                    {topClientes.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center text-center p-6">
                        <EyeOff size={24} className="text-text-muted mb-1 stroke-[1.5]" />
                        <span className="text-xs text-text-muted font-bold">Nenhum cliente faturado.</span>
                      </div>
                    )}
                  </div>
                ) : (
                  topClientes.length > 0 ? (
                    <div className="h-[280px] w-full flex items-center justify-center py-2 pr-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={topClientes.slice(0, 5)}
                          layout="vertical"
                          margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                        >
                          <XAxis type="number" hide />
                          <YAxis 
                            dataKey="name" 
                            type="category" 
                            width={90} 
                            tick={{ fontSize: 9, fill: 'currentColor' }} 
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="value" fill="#0D9488" radius={[0, 4, 4, 0]}>
                            {topClientes.slice(0, 5).map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6">
                      <EyeOff size={24} className="text-text-muted mb-1 stroke-[1.5]" />
                      <span className="text-xs text-text-muted font-bold">Sem dados no período.</span>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Panel 2: Grupos */}
            <div className="w-full shrink-0 snap-start flex flex-col min-h-[340px]">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Top 10 Grupos</span>
                <button
                  onClick={() => setRankingViews(prev => ({ ...prev, grupos: prev.grupos === 'list' ? 'bar' : 'list' }))}
                  className="p-1.5 bg-bg-secondary hover:bg-bg-secondary/80 text-text-secondary hover:text-text-primary rounded-lg border border-divider transition-all cursor-pointer shadow-sm text-[11px] font-bold px-3 flex items-center gap-1.5"
                >
                  {rankingViews.grupos === 'list' ? <BarChart3 size={13} /> : <List size={13} />}
                  {rankingViews.grupos === 'list' ? "Gráfico" : "Lista"}
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto max-h-[300px] text-xs pr-1">
                {rankingViews.grupos === 'list' ? (
                  <div className="space-y-0.5">
                    {topGrupos.map((g: any) => {
                      const share = totalGruposVal > 0 ? (g.value / totalGruposVal) * 100 : 0;
                      return (
                        <div key={g.rank} className="flex justify-between items-center py-2 border-b border-divider/5 hover:bg-bg-secondary/50 px-2 rounded-lg transition-colors">
                          <span className="text-text-secondary truncate font-medium text-xs flex-1 min-w-0 mr-2" title={g.name}>
                            <span className="font-extrabold text-brand-500 mr-2 font-mono">#{g.rank}</span>
                            {g.name}
                          </span>
                          <div className="text-right shrink-0 flex items-center gap-1.5">
                            <span className="font-extrabold text-text-primary font-mono text-xs">{formatBRLCompact(g.value)}</span>
                            <span className="text-[10px] text-danger font-bold">({share.toFixed(1)}%)</span>
                          </div>
                        </div>
                      );
                    })}
                    {topGrupos.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center text-center p-6">
                        <EyeOff size={24} className="text-text-muted mb-1 stroke-[1.5]" />
                        <span className="text-xs text-text-muted font-bold">Nenhum grupo faturado.</span>
                      </div>
                    )}
                  </div>
                ) : (
                  topGrupos.length > 0 ? (
                    <div className="h-[280px] w-full flex items-center justify-center py-2 pr-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={topGrupos.slice(0, 5)}
                          layout="vertical"
                          margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                        >
                          <XAxis type="number" hide />
                          <YAxis 
                            dataKey="name" 
                            type="category" 
                            width={90} 
                            tick={{ fontSize: 9, fill: 'currentColor' }} 
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="value" fill="#0D9488" radius={[0, 4, 4, 0]}>
                            {topGrupos.slice(0, 5).map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6">
                      <EyeOff size={24} className="text-text-muted mb-1 stroke-[1.5]" />
                      <span className="text-xs text-text-muted font-bold">Sem dados no período.</span>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Panel 3: Produtos */}
            <div className="w-full shrink-0 snap-start flex flex-col min-h-[340px]">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Top 10 Produtos</span>
                <button
                  onClick={() => setRankingViews(prev => ({ ...prev, produtos: prev.produtos === 'list' ? 'bar' : 'list' }))}
                  className="p-1.5 bg-bg-secondary hover:bg-bg-secondary/80 text-text-secondary hover:text-text-primary rounded-lg border border-divider transition-all cursor-pointer shadow-sm text-[11px] font-bold px-3 flex items-center gap-1.5"
                >
                  {rankingViews.produtos === 'list' ? <BarChart3 size={13} /> : <List size={13} />}
                  {rankingViews.produtos === 'list' ? "Gráfico" : "Lista"}
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto max-h-[300px] text-xs pr-1">
                {rankingViews.produtos === 'list' ? (
                  <div className="space-y-0.5">
                    {topProdutos.map((p: any) => {
                      const share = totalProdutosVal > 0 ? (p.value / totalProdutosVal) * 100 : 0;
                      return (
                        <div key={p.rank} className="flex justify-between items-center py-2 border-b border-divider/5 hover:bg-bg-secondary/50 px-2 rounded-lg transition-colors">
                          <span className="text-text-secondary truncate font-medium text-xs flex-1 min-w-0 mr-2" title={p.name}>
                            <span className="font-extrabold text-brand-500 mr-2 font-mono">#{p.rank}</span>
                            {p.name}
                          </span>
                          <div className="text-right shrink-0 flex items-center gap-1.5">
                            <span className="font-extrabold text-text-primary font-mono text-xs">{formatBRLCompact(p.value)}</span>
                            <span className="text-[10px] text-danger font-bold">({share.toFixed(1)}%)</span>
                          </div>
                        </div>
                      );
                    })}
                    {topProdutos.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center text-center p-6">
                        <EyeOff size={24} className="text-text-muted mb-1 stroke-[1.5]" />
                        <span className="text-xs text-text-muted font-bold">Nenhum produto faturado.</span>
                      </div>
                    )}
                  </div>
                ) : (
                  topProdutos.length > 0 ? (
                    <div className="h-[280px] w-full flex items-center justify-center py-2 pr-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={topProdutos.slice(0, 5)}
                          layout="vertical"
                          margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                        >
                          <XAxis type="number" hide />
                          <YAxis 
                            dataKey="name" 
                            type="category" 
                            width={90} 
                            tick={{ fontSize: 9, fill: 'currentColor' }} 
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="value" fill="#0D9488" radius={[0, 4, 4, 0]}>
                            {topProdutos.slice(0, 5).map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6">
                      <EyeOff size={24} className="text-text-muted mb-1 stroke-[1.5]" />
                      <span className="text-xs text-text-muted font-bold">Sem dados no período.</span>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION: EVOLUÇÃO DO FATURAMENTO (MENSAL VS DIÁRIO GRÁFICO E VALORES TOGGLE) */}
      <div className="bg-bg-primary border border-divider shadow-card rounded-2xl p-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center border-b border-divider/20 pb-4 mb-5 gap-4">
          <div>
            <h3 className="text-base font-extrabold text-text-primary uppercase tracking-wider">
              {evolucaoPeriodType === 'months' ? "Evolução do Faturamento (Últimos 12 Meses)" : "Evolução do Faturamento (Diário)"}
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              {evolucaoPeriodType === 'months' 
                ? "Histórico mensal de faturamento líquido realizado pelo vendedor selecionado" 
                : "Histórico diário detalhado de faturamento realizado no período selecionado"}
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
            <div className="flex bg-bg-secondary p-0.5 rounded-xl border border-divider shadow-sm shrink-0">
              <button
                onClick={() => setEvolucaoPeriodType('months')}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer",
                  evolucaoPeriodType === 'months'
                    ? "bg-brand-500 text-white shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                Mensal
              </button>
              <button
                onClick={() => setEvolucaoPeriodType('days')}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer",
                  evolucaoPeriodType === 'days'
                    ? "bg-brand-500 text-white shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                Diário
              </button>
            </div>

            <button
              onClick={() => setViewMode(prev => ({ ...prev, evolucao12m: prev.evolucao12m === 'chart' ? 'text' : 'chart' }))}
              className="px-4 py-2 bg-bg-secondary hover:bg-bg-secondary/80 text-text-secondary hover:text-text-primary rounded-xl border border-divider transition-all cursor-pointer shadow-sm text-xs font-bold flex items-center gap-1.5 shrink-0 justify-center"
            >
              {viewMode.evolucao12m === 'chart' ? <List size={14} /> : <BarChart3 size={14} />}
              {viewMode.evolucao12m === 'chart' ? "Visualizar em Valores" : "Visualizar em Gráfico"}
            </button>
          </div>
        </div>

        {viewMode.evolucao12m === 'chart' ? (
          (evolucaoPeriodType === 'months' ? data?.evolucao_12m : historicoVendas) && (evolucaoPeriodType === 'months' ? data.evolucao_12m.length > 0 : historicoVendas.length > 0) ? (
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={evolucaoPeriodType === 'months' ? data.evolucao_12m : historicoVendas} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorEvol" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0D9488" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#0D9488" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(var(--color-divider), 0.15)" vertical={false} />
                  <XAxis dataKey={evolucaoPeriodType === 'months' ? "mes" : "dia"} tick={{ fontSize: 10, fill: 'currentColor' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'currentColor' }} axisLine={false} tickLine={false} tickFormatter={(v) => formatBRLCompact(v)} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="valor" name={evolucaoPeriodType === 'months' ? "Faturamento Líquido" : "Faturamento Diário"} stroke="#0D9488" strokeWidth={2.5} fillOpacity={1} fill="url(#colorEvol)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="py-12 text-center text-text-muted text-xs font-semibold">
              {evolucaoPeriodType === 'months' ? "Nenhum histórico disponível para os últimos 12 meses." : "Nenhum histórico diário disponível no período."}
            </div>
          )
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {(evolucaoPeriodType === 'months' ? data?.evolucao_12m : historicoVendas)?.map((e: any, index: number) => (
              <div key={index} className="p-4 border border-divider/40 bg-bg-secondary/10 rounded-2xl flex flex-col justify-between hover:border-divider/70 transition-all duration-300 shadow-sm">
                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block">
                  {evolucaoPeriodType === 'months' ? e.mes : e.dia}
                </span>
                <span className="text-sm font-black text-text-primary mt-1.5">{formatBRL(e.valor)}</span>
              </div>
            ))}
            {(!(evolucaoPeriodType === 'months' ? data?.evolucao_12m : historicoVendas) || (evolucaoPeriodType === 'months' ? data.evolucao_12m.length === 0 : historicoVendas.length === 0)) && (
              <div className="col-span-full text-center py-8 text-text-muted text-xs font-semibold">
                Nenhum valor disponível.
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION: NOTAS FISCAIS DO VENDEDOR (PAGINATION 50-BY-50, SEARCH BY CLIENT & COLUMN SORTING) */}
      <div className="bg-bg-primary border border-divider shadow-card rounded-2xl p-6 flex flex-col">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-divider pb-4 mb-5 gap-4">
          <div>
            <h3 className="text-base font-extrabold text-text-primary uppercase tracking-wider">Notas Fiscais do Vendedor</h3>
            <p className="text-xs text-text-secondary mt-0.5">Fila de notas faturadas no período consultado</p>
          </div>
          <span className="text-[10px] font-extrabold text-text-muted uppercase bg-bg-secondary px-3.5 py-1.5 rounded-full border border-divider/10 shrink-0 shadow-sm">
            {filteredInvoices.length} encontrados / {invoicesList.length} total
          </span>
        </div>

        {/* Filter Inputs (Client Search + Status Filter Pills) */}
        <div className="flex flex-col md:flex-row gap-4 mb-5 items-stretch md:items-center">
          {/* Client & Nota Search */}
          <div className="relative flex-1 max-w-md">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-text-muted">
              <Search size={15} />
            </span>
            <input
              type="text"
              placeholder="Buscar por cliente ou nº nota..."
              value={clientQuery}
              onChange={(e) => setClientQuery(e.target.value)}
              className="w-full pl-10 pr-4 h-11 bg-bg-secondary border border-divider text-text-primary text-xs rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all duration-300"
            />
          </div>

          {/* Status filter pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] text-text-secondary font-black uppercase tracking-wider mr-1 flex items-center gap-1">
              <Tag size={13} className="text-brand-500" />
              Filtrar Status:
            </span>
            {['TODOS', ...availableInvoiceStatuses].map((status) => (
              <button
                key={status}
                onClick={() => setInvoiceStatusFilter(status)}
                className={clsx(
                  "px-3.5 py-1.5 text-[10px] font-black rounded-full border transition-all uppercase tracking-wider cursor-pointer shadow-sm",
                  invoiceStatusFilter === status
                    ? "bg-brand-500 text-white border-brand-500"
                    : "bg-bg-secondary text-text-secondary border-divider hover:text-text-primary"
                )}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Desktop Table View (>= 900px) */}
        <div className="hidden min-[900px]:block overflow-x-auto w-full border border-divider/50 rounded-2xl shadow-sm">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead>
              <tr className="border-b border-divider text-[10px] text-text-secondary uppercase font-black tracking-wider bg-bg-secondary/60">
                <th className="py-3.5 px-5 font-mono text-[9px]">COD</th>
                <th 
                  onClick={() => handleInvoiceSort('numero')}
                  className="py-3.5 px-5 cursor-pointer hover:bg-bg-secondary/80 select-none transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    Nº NOTA
                    <ArrowUpDown size={12} className={clsx(invoiceSortField === 'numero' ? "text-brand-500" : "text-text-muted/65")} />
                  </div>
                </th>
                <th className="py-3.5 px-5">CLIENTE</th>
                <th 
                  onClick={() => handleInvoiceSort('data')}
                  className="py-3.5 px-5 cursor-pointer hover:bg-bg-secondary/80 select-none transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    DATA
                    <ArrowUpDown size={12} className={clsx(invoiceSortField === 'data' ? "text-brand-500" : "text-text-muted/65")} />
                  </div>
                </th>
                <th 
                  onClick={() => handleInvoiceSort('valor')}
                  className="py-3.5 px-5 text-right cursor-pointer hover:bg-bg-secondary/80 select-none transition-colors"
                >
                  <div className="flex items-center gap-1.5 justify-end">
                    VALOR TOTAL
                    <ArrowUpDown size={12} className={clsx(invoiceSortField === 'valor' ? "text-brand-500" : "text-text-muted/65")} />
                  </div>
                </th>
                <th className="py-3.5 px-5 text-center">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider/20">
              {currentInvoices.map((inv: any, i: number) => (
                <tr key={inv.cod || i} className="hover:bg-bg-secondary/40 transition-colors">
                  <td className="py-3.5 px-5 font-mono text-text-muted">{inv.cod}</td>
                  <td className="py-3.5 px-5 text-brand-500 font-extrabold">{inv.numero_nota}</td>
                  <td className="py-3.5 px-5 text-text-primary font-bold truncate max-w-[280px]" title={inv.cliente}>
                    {inv.cliente}
                  </td>
                  <td className="py-3.5 px-5 text-text-secondary font-medium">{inv.data}</td>
                  <td className="py-3.5 px-5 text-right font-mono font-extrabold text-success">
                    {formatBRL(inv.valor)}
                  </td>
                  <td className="py-3.5 px-5 text-center">
                    <span className={clsx(
                      "text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border",
                      inv.status && ['FATURADO', 'FINALIZADO'].includes(inv.status.trim()) 
                        ? 'bg-success/15 text-success border-success/10' 
                        : 'bg-text-muted/10 text-text-muted border-divider/10'
                    )}>
                      {inv.status ? inv.status.trim() : 'Normal'}
                    </span>
                  </td>
                </tr>
              ))}
              {currentInvoices.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-text-muted font-bold">
                    Nenhuma nota fiscal emitida para os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile/Tablet Card View Fallback (< 900px) */}
        <div className="min-[900px]:hidden space-y-3.5">
          {currentInvoices.map((inv: any, i: number) => (
            <div key={inv.cod || i} className="p-5 border border-divider/60 rounded-2xl bg-bg-secondary/15 flex flex-col gap-3 hover:border-divider transition-all duration-300 shadow-sm">
              <div className="flex justify-between items-center">
                <span className="font-mono text-[10px] text-text-muted font-bold">COD: {inv.cod}</span>
                <span className={clsx(
                  "text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border",
                  inv.status && ['FATURADO', 'FINALIZADO'].includes(inv.status.trim()) 
                    ? 'bg-success/15 text-success border-success/10' 
                    : 'bg-text-muted/10 text-text-muted border-divider/10'
                )}>
                  {inv.status ? inv.status.trim() : 'Normal'}
                </span>
              </div>
              <div>
                <h4 className="text-sm font-bold text-text-primary leading-snug">{inv.cliente}</h4>
                <p className="text-xs text-text-secondary mt-1">Nota: <span className="font-bold text-brand-500">{inv.numero_nota}</span></p>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-divider/20 mt-1">
                <div className="flex items-center gap-1.5 text-xs text-text-secondary font-medium">
                  <Calendar size={14} className="text-text-muted" />
                  {inv.data}
                </div>
                <div className="text-sm font-mono font-extrabold text-success">
                  {formatBRL(inv.valor)}
                </div>
              </div>
            </div>
          ))}
          {currentInvoices.length === 0 && (
            <div className="py-8 text-center text-text-muted text-xs font-semibold">
              Nenhuma nota fiscal encontrada.
            </div>
          )}
        </div>

        {/* PAGINATION PANEL - CARREGAR MAIS */}
        <div className="flex flex-col sm:flex-row justify-between items-center mt-5 pt-4 border-t border-divider/20 text-xs gap-3">
          <span className="text-[11px] text-text-secondary font-medium">
            Mostrando {Math.min(visibleInvoicesCount, sortedInvoices.length)} de {sortedInvoices.length} notas faturadas
          </span>
          
          {visibleInvoicesCount < sortedInvoices.length && (
            <button
              onClick={() => setVisibleInvoicesCount(prev => prev + 50)}
              className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold transition-all duration-200 shadow-sm flex items-center gap-1.5 cursor-pointer scale-100 hover:scale-[1.02] active:scale-[0.98]"
            >
              Carregar Mais (+50)
            </button>
          )}
        </div>
      </div>

      {isError && (
        <div className="bg-danger/10 border border-danger/25 text-danger p-4 rounded-2xl text-xs font-bold shadow-sm">
          Erro de comunicação: Não foi possível sincronizar os dados do vendedor. Verifique a conexão com a API do banco de dados Vet.
        </div>
      )}
    </div>
  );
}

