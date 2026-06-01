import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useBiPeriodQuery } from '../../hooks/useBiPeriodQuery';
import { useBranchPeriodQuery } from '../../hooks/useApi';
import { BIService } from '../../services/biApi';
import { BiPeriodFilter } from '../../types/bi.types';
import { 
  Trophy, Users, Box, Award, DollarSign, TrendingUp, TrendingDown, 
  Calendar, MapPin, FileText, ChevronLeft, ChevronRight, Activity,
  BarChart3, ArrowUpDown, Clock, Search, EyeOff, Tag
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip 
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

export default function SellerHubDashboard() {
  const { filter: globalFilter } = useOutletContext<{ filter: BiPeriodFilter }>();

  // Fetch list of sellers dynamically
  const vdFull = useBranchPeriodQuery<any>('/ranking/vendedores', { limit: 100 });

  // Local Filter state matching mock
  const [selectedVendedor, setSelectedVendedor] = useState<string>('');
  
  // Toggles for charts
  const [viewMode, setViewMode] = useState<Record<string, 'chart' | 'text'>>({
    historico: 'chart',
    diaSemana: 'chart'
  });

  // Table filtering and sorting states
  const [clientQuery, setClientQuery] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('TODOS');
  const [invoiceSortField, setInvoiceSortField] = useState<'numero' | 'data' | 'valor'>('data');
  const [invoiceSortOrder, setInvoiceSortOrder] = useState<'asc' | 'desc'>('desc');
  const [visibleInvoicesCount, setVisibleInvoicesCount] = useState(50);

  // Set default seller when list loaded
  useEffect(() => {
    if (vdFull.data?.data && vdFull.data.data.length > 0 && !selectedVendedor) {
      setSelectedVendedor(String(vdFull.data.data[0].id));
    }
  }, [vdFull.data, selectedVendedor]);

  const activeFilter = useMemo(() => ({
    ...globalFilter,
    vendedor_id: selectedVendedor || undefined
  }), [globalFilter, selectedVendedor]);

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
    <div className="space-y-4 animate-in fade-in duration-300">
      
      {/* FILTER BAR ROW */}
      <div className="bg-bg-primary border border-divider shadow-card rounded-xl p-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-text-primary flex items-center gap-2">
            <Activity className="text-brand-500" size={22} />
            Hub do Vendedor
          </h2>
          <p className="text-[11px] sm:text-xs text-text-secondary">Consulta consolidada de faturamento e desempenho comercial realizado</p>
        </div>
        
        <div className="flex flex-wrap items-end gap-3 w-full lg:w-auto">
          <div className="flex flex-col gap-1 min-w-[240px] flex-1 sm:flex-initial">
            <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider">Vendedor</span>
            <select
              value={selectedVendedor}
              onChange={(e) => setSelectedVendedor(e.target.value)}
              className="px-2.5 py-1.5 bg-bg-secondary border border-divider text-text-primary rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-500 transition-all duration-300 w-full cursor-pointer"
            >
              <option value="">Selecione um vendedor...</option>
              {vdFull.data?.data?.map((v: any) => (
                <option key={v.id} value={v.id}>{v.nome}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* HIGHLIGHTED FATURAMENTO ROW (SINGLE LINE, UNIQUE PREMIUM LOOK, COMPARING CURRENT & PREVIOUS) */}
      <div className="bg-bg-primary border border-divider shadow-card rounded-xl p-5 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Top/Left green stripe decoration */}
        <div className="absolute top-0 bottom-0 left-0 w-[4px] bg-brand-500"></div>

        {/* Current Faturamento Card Content */}
        <div className="flex items-center gap-4 flex-1">
          <div className="p-3 bg-brand-500/10 text-brand-500 rounded-lg shrink-0">
            <DollarSign size={26} />
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block">Faturamento Atual</span>
            <div className="text-2xl font-black text-text-primary tracking-tight">
              {formatBRL(faturamento)}
            </div>
            <span className="text-[10px] text-text-muted font-medium block">Período selecionado</span>
          </div>
        </div>

        {/* Center: Comparison Arrow */}
        <div className="flex flex-col items-center justify-center shrink-0 py-2 md:py-0 px-4 border-y md:border-y-0 md:border-x border-divider/40">
          <div className={clsx(
            "w-11 h-11 rounded-full flex items-center justify-center shadow-sm border transition-all duration-300",
            crescimentoPct >= 0 
              ? "bg-success/15 border-success/20 text-success" 
              : "bg-danger/15 border-danger/20 text-danger"
          )}>
            {crescimentoPct >= 0 ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
          </div>
          <span className={clsx(
            "text-xs font-black mt-1.5 tracking-tight",
            crescimentoPct >= 0 ? "text-success" : "text-danger"
          )}>
            {crescimentoPct >= 0 ? "+" : ""}{crescimentoPct.toFixed(1)}% vs. anterior
          </span>
        </div>

        {/* Previous Month Faturamento Card Content */}
        <div className="flex items-center gap-4 flex-1 md:justify-end text-left md:text-right">
          <div className="space-y-0.5 md:order-1 order-2">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block">Faturamento Mês Anterior</span>
            <div className="text-xl font-bold text-text-primary tracking-tight">
              {formatBRL(faturamentoAnterior)}
            </div>
            <span className="text-[10px] text-text-muted font-medium block">Mês completo anterior</span>
          </div>
          <div className="p-3 bg-text-muted/10 text-text-muted rounded-lg shrink-0 md:order-2 order-1">
            <DollarSign size={22} />
          </div>
        </div>
      </div>

      {/* 6 OPERATIONAL KPI CARDS - GRID IN SMALLER SIZES */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: Ticket Médio */}
        <div className="bg-bg-primary border border-divider shadow-card hover:shadow-card-hover rounded-xl p-3.5 flex items-center gap-3 transition-all duration-300 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-brand-500"></div>
          <div className="p-2 bg-brand-500/10 text-brand-500 rounded-lg shrink-0">
            <Trophy size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[9px] font-bold text-text-secondary uppercase tracking-wider block leading-none">Ticket Médio</span>
            <div className="text-xs font-black text-text-primary tracking-tight truncate mt-1">
              {formatBRL(ticketMedio)}
            </div>
            <span className="text-[8px] text-text-muted font-medium block mt-0.5 leading-none">Média por venda</span>
          </div>
        </div>

        {/* Card 2: Notas Emitidas */}
        <div className="bg-bg-primary border border-divider shadow-card hover:shadow-card-hover rounded-xl p-3.5 flex items-center gap-3 transition-all duration-300 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-brand-500"></div>
          <div className="p-2 bg-brand-500/10 text-brand-500 rounded-lg shrink-0">
            <FileText size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[9px] font-bold text-text-secondary uppercase tracking-wider block leading-none">Notas Emitidas</span>
            <div className="text-xs font-black text-text-primary tracking-tight truncate mt-1">
              {formatNum(notasEmitidas)}
            </div>
            <span className="text-[8px] text-text-muted font-medium block mt-0.5 leading-none">Total documentos</span>
          </div>
        </div>

        {/* Card 3: Clientes Atendidos */}
        <div className="bg-bg-primary border border-divider shadow-card hover:shadow-card-hover rounded-xl p-3.5 flex items-center gap-3 transition-all duration-300 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-brand-500"></div>
          <div className="p-2 bg-brand-500/10 text-brand-500 rounded-lg shrink-0">
            <Users size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[9px] font-bold text-text-secondary uppercase tracking-wider block leading-none">Clientes Atendidos</span>
            <div className="text-xs font-black text-text-primary tracking-tight truncate mt-1">
              {clientesNovos}
            </div>
            <div className="flex justify-between items-center text-[7.5px] text-text-muted font-bold mt-0.5 leading-none">
              <span className="text-success">Novos: {novosPct.toFixed(0)}%</span>
            </div>
          </div>
        </div>

        {/* Card 4: Cidade Top */}
        <div className="bg-bg-primary border border-divider shadow-card hover:shadow-card-hover rounded-xl p-3.5 flex items-center gap-3 transition-all duration-300 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-brand-500"></div>
          <div className="p-2 bg-brand-500/10 text-brand-500 rounded-lg shrink-0">
            <MapPin size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[9px] font-bold text-text-secondary uppercase tracking-wider block leading-none">Cidade Top</span>
            <div className="text-xs font-black text-text-primary tracking-tight truncate mt-1" title={cidadeTop}>
              {cidadeTop}
            </div>
            <span className="text-[8px] font-extrabold text-brand-500 block mt-0.5 leading-none">
              {formatBRLCompact(cidadeTopValor)}
            </span>
          </div>
        </div>

        {/* Card 5: Principal Cliente */}
        <div className="bg-bg-primary border border-divider shadow-card hover:shadow-card-hover rounded-xl p-3.5 flex items-center gap-3 transition-all duration-300 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-brand-500"></div>
          <div className="p-2 bg-brand-500/10 text-brand-500 rounded-lg shrink-0">
            <Award size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[9px] font-bold text-text-secondary uppercase tracking-wider block leading-none">Principal Cliente</span>
            <div className="text-xs font-black text-text-primary tracking-tight truncate mt-1" title={principalCliente ? principalCliente.name : 'N/A'}>
              {principalCliente ? principalCliente.name : 'N/A'}
            </div>
            <span className="text-[8px] font-extrabold text-brand-500 block mt-0.5 leading-none">
              {principalCliente ? formatBRLCompact(principalCliente.value) : 'Sem vendas'}
            </span>
          </div>
        </div>

        {/* Card 6: Melhor Mês */}
        <div className="bg-bg-primary border border-divider shadow-card hover:shadow-card-hover rounded-xl p-3.5 flex items-center gap-3 transition-all duration-300 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-brand-500"></div>
          <div className="p-2 bg-brand-500/10 text-brand-500 rounded-lg shrink-0">
            <Calendar size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[9px] font-bold text-text-secondary uppercase tracking-wider block leading-none">Melhor Mês (12m)</span>
            <div className="text-xs font-black text-text-primary tracking-tight truncate mt-1">
              {melhorMes && melhorMes.mes !== 'N/A' ? melhorMes.mes : 'N/A'}
            </div>
            <span className="text-[8px] font-extrabold text-brand-500 block mt-0.5 leading-none">
              {melhorMes && melhorMes.valor > 0 ? formatBRLCompact(melhorMes.valor) : 'Sem vendas'}
            </span>
          </div>
        </div>
      </div>

      {/* 4 TOP LISTS / RANKINGS - COMPACTED AND CLEAN WITH STATE EMPTY FALLBACKS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Top Marcas */}
        <div className="bg-bg-primary border border-divider shadow-card rounded-xl p-4 flex flex-col min-h-[300px]">
          <div className="flex items-center gap-1.5 border-b border-divider/20 pb-1.5 mb-2">
            <Award size={15} className="text-brand-500" />
            <h4 className="text-[10px] font-bold text-text-primary uppercase tracking-wider">Top 15 Marcas</h4>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[320px] text-xs space-y-0.5 pr-1">
            {topMarcas.map((m: any) => {
              const share = totalMarcasVal > 0 ? (m.value / totalMarcasVal) * 100 : 0;
              return (
                <div key={m.rank} className="flex justify-between items-center py-0.5 border-b border-divider/5 hover:bg-bg-secondary/50 px-1.5 rounded transition-colors">
                  <span className="text-text-secondary truncate font-medium text-xs max-w-[120px]" title={m.name}>
                    <span className="font-bold text-brand-500 mr-1.5 font-mono">#{m.rank}</span>
                    {m.name}
                  </span>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-text-primary font-mono text-xs block">{formatBRLCompact(m.value)}</span>
                    <span className="text-[9.5px] text-text-muted font-bold block leading-none">{share.toFixed(1)}% share</span>
                  </div>
                </div>
              );
            })}
            {topMarcas.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <EyeOff size={24} className="text-text-muted mb-1 stroke-[1.5]" />
                <span className="text-xs text-text-muted font-medium">Nenhuma marca registrada.</span>
              </div>
            )}
          </div>
        </div>

        {/* Top Clientes */}
        <div className="bg-bg-primary border border-divider shadow-card rounded-xl p-4 flex flex-col min-h-[300px]">
          <div className="flex items-center gap-1.5 border-b border-divider/20 pb-1.5 mb-2">
            <Users size={15} className="text-brand-500" />
            <h4 className="text-[10px] font-bold text-text-primary uppercase tracking-wider">Top 10 Clientes</h4>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[320px] text-xs space-y-0.5 pr-1">
            {topClientes.map((c: any) => {
              const share = totalClientesVal > 0 ? (c.value / totalClientesVal) * 100 : 0;
              return (
                <div key={c.rank} className="flex justify-between items-center py-0.5 border-b border-divider/5 hover:bg-bg-secondary/50 px-1.5 rounded transition-colors">
                  <span className="text-text-secondary truncate font-medium text-xs max-w-[120px]" title={c.name}>
                    <span className="font-bold text-brand-500 mr-1.5 font-mono">#{c.rank}</span>
                    {c.name}
                  </span>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-text-primary font-mono text-xs block">{formatBRLCompact(c.value)}</span>
                    <span className="text-[9.5px] text-text-muted font-bold block leading-none">{share.toFixed(1)}% share</span>
                  </div>
                </div>
              );
            })}
            {topClientes.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <EyeOff size={24} className="text-text-muted mb-1 stroke-[1.5]" />
                <span className="text-xs text-text-muted font-medium">Nenhum cliente faturado.</span>
              </div>
            )}
          </div>
        </div>

        {/* Top Grupos */}
        <div className="bg-bg-primary border border-divider shadow-card rounded-xl p-4 flex flex-col min-h-[300px]">
          <div className="flex items-center gap-1.5 border-b border-divider/20 pb-1.5 mb-2">
            <Box size={15} className="text-brand-500" />
            <h4 className="text-[10px] font-bold text-text-primary uppercase tracking-wider">Top 10 Grupos</h4>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[320px] text-xs space-y-0.5 pr-1">
            {topGrupos.map((g: any) => {
              const share = totalGruposVal > 0 ? (g.value / totalGruposVal) * 100 : 0;
              return (
                <div key={g.rank} className="flex justify-between items-center py-0.5 border-b border-divider/5 hover:bg-bg-secondary/50 px-1.5 rounded transition-colors">
                  <span className="text-text-secondary truncate font-medium text-xs max-w-[120px]" title={g.name}>
                    <span className="font-bold text-brand-500 mr-1.5 font-mono">#{g.rank}</span>
                    {g.name}
                  </span>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-text-primary font-mono text-xs block">{formatBRLCompact(g.value)}</span>
                    <span className="text-[9.5px] text-text-muted font-bold block leading-none">{share.toFixed(1)}% share</span>
                  </div>
                </div>
              );
            })}
            {topGrupos.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <EyeOff size={24} className="text-text-muted mb-1 stroke-[1.5]" />
                <span className="text-xs text-text-muted font-medium">Nenhum grupo faturado.</span>
              </div>
            )}
          </div>
        </div>

        {/* Top Produtos */}
        <div className="bg-bg-primary border border-divider shadow-card rounded-xl p-4 flex flex-col min-h-[300px]">
          <div className="flex items-center gap-1.5 border-b border-divider/20 pb-1.5 mb-2">
            <Trophy size={15} className="text-brand-500" />
            <h4 className="text-[10px] font-bold text-text-primary uppercase tracking-wider">Top 10 Produtos</h4>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[320px] text-xs space-y-0.5 pr-1">
            {topProdutos.map((p: any) => {
              const share = totalProdutosVal > 0 ? (p.value / totalProdutosVal) * 100 : 0;
              return (
                <div key={p.rank} className="flex justify-between items-center py-0.5 border-b border-divider/5 hover:bg-bg-secondary/50 px-1.5 rounded transition-colors">
                  <span className="text-text-secondary truncate font-medium text-xs max-w-[120px]" title={p.name}>
                    <span className="font-bold text-brand-500 mr-1.5 font-mono">#{p.rank}</span>
                    {p.name}
                  </span>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-text-primary font-mono text-xs block">{formatBRLCompact(p.value)}</span>
                    <span className="text-[9.5px] text-text-muted font-bold block leading-none">{share.toFixed(1)}% share</span>
                  </div>
                </div>
              );
            })}
            {topProdutos.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <EyeOff size={24} className="text-text-muted mb-1 stroke-[1.5]" />
                <span className="text-xs text-text-muted font-medium">Nenhum produto faturado.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION: DESEMPENHO POR MARCA (RELATIVE TO LEADER BRAND) */}
      <div className="bg-bg-primary border border-divider shadow-card rounded-xl p-5">
        <div className="border-b border-divider/20 pb-3 mb-4">
          <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">Desempenho por Marca</h3>
          <p className="text-[11px] text-text-secondary mt-0.5">Distribuição e representação de faturamento realizado por marca (sem metas)</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {topMarcas.slice(0, 8).map((m: any) => {
            const relPct = maxBrandValue > 0 ? (m.value / maxBrandValue) * 100 : 0;

            return (
              <div key={m.rank} className="border border-divider/20 rounded-lg p-3.5 bg-bg-secondary/20 flex flex-col justify-between hover:border-divider transition-all duration-300">
                <div className="flex justify-between items-start gap-1">
                  <span className="text-[10px] font-extrabold text-text-primary uppercase truncate max-w-[80%]" title={m.name}>
                    {m.name}
                  </span>
                  <span className="text-[10px] font-bold text-brand-500">
                    {relPct.toFixed(1)}%
                  </span>
                </div>
                
                <div className="w-full bg-bg-secondary h-1.5 rounded-full mt-2.5 overflow-hidden">
                  <div className="bg-brand-500 h-full rounded-full" style={{ width: `${relPct}%` }}></div>
                </div>

                <div className="flex justify-between items-center text-[10px] text-text-secondary font-medium mt-3 leading-none">
                  <span>Realizado: <span className="font-bold text-text-primary">{formatBRLCompact(m.value)}</span></span>
                  <span className="text-text-muted/75 font-semibold">{relPct === 100 ? 'Líder' : 'do líder'}</span>
                </div>
              </div>
            );
          })}
          {topMarcas.length === 0 && (
            <div className="col-span-4 text-center py-6 text-text-muted text-xs">
              Nenhuma marca registrada para este vendedor no período.
            </div>
          )}
        </div>
      </div>

      {/* SECTION: CHARTS WITH HEIGHT DYNAMICALLY CONTROLLED (280px-360px desktop, 220px-280px mobile) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Histórico de Vendas (Altura Controlada) */}
        <div className="bg-bg-primary border border-divider shadow-card rounded-xl p-5 flex flex-col justify-between">
          <div className="border-b border-divider/20 pb-3 mb-4 flex justify-between items-center">
            <div>
              <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">Histórico de Vendas</h3>
              <p className="text-[11px] text-text-secondary mt-0.5">Evolução diária de faturamento do vendedor</p>
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-bg-secondary p-0.5 rounded-lg border border-divider">
              <button
                onClick={() => setViewMode(prev => ({ ...prev, historico: 'chart' }))}
                disabled={isHistoricoEmpty}
                className={clsx(
                  "p-1.5 rounded-md transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
                  viewMode.historico === 'chart'
                    ? "bg-bg-primary text-brand-500 shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                )}
                title="Ver Gráfico"
              >
                <BarChart3 size={14} />
              </button>
              <button
                onClick={() => setViewMode(prev => ({ ...prev, historico: 'text' }))}
                className={clsx(
                  "p-1.5 rounded-md transition-all cursor-pointer",
                  viewMode.historico === 'text'
                    ? "bg-bg-primary text-brand-500 shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                )}
                title="Ver Resumo Textual"
              >
                <FileText size={14} />
              </button>
            </div>
          </div>

          <div className="h-[220px] sm:h-[300px] lg:h-[360px] w-full flex-1">
            {isHistoricoEmpty ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-border rounded-xl bg-bg-secondary/10">
                <EyeOff size={32} className="text-text-muted mb-2 stroke-[1.5]" />
                <p className="text-xs text-text-secondary font-medium">Sem faturamento registrado para este vendedor no período.</p>
              </div>
            ) : viewMode.historico === 'chart' ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historicoVendas} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorFaturamento" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0D9488" stopOpacity={0.35}/>
                      <stop offset="95%" stopColor="#0D9488" stopOpacity={0.01}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-divider)" opacity={0.3} />
                  <XAxis 
                    dataKey="dia" 
                    axisLine={{ stroke: 'var(--color-border)' }} 
                    tickLine={false}
                    tick={{ fontSize: 9, fill: 'var(--color-text-secondary)', fontWeight: 500 }} 
                  />
                  <YAxis 
                    tickFormatter={(v) => formatBRLCompact(v)}
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 9, fill: 'var(--color-text-secondary)', fontWeight: 500 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="valor" 
                    name="Faturamento"
                    stroke="#0D9488" 
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorFaturamento)"
                    dot={{ r: 2.5, stroke: '#0D9488', strokeWidth: 1, fill: '#FFFFFF' }}
                    activeDot={{ r: 4.5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="space-y-4 h-full flex flex-col justify-between overflow-y-auto">
                <p className="text-xs text-text-secondary italic leading-relaxed border-l-2 border-brand-500 pl-3">
                  {getHistoricoVendasSummary()}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pr-1 max-h-[140px] overflow-y-auto">
                  {historicoVendas.map((item: any, index: number) => (
                    <div key={index} className="p-2 rounded-lg bg-bg-secondary/40 border border-divider">
                      <div className="text-[10px] text-text-secondary font-semibold uppercase">{item.dia}</div>
                      <div className="text-xs font-bold text-text-primary font-mono mt-0.5">{formatBRL(item.valor)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Vendas por Dia da Semana & Resumo de Atividade (2 colunas internas, Altura Controlada) */}
        <div className="bg-bg-primary border border-divider shadow-card rounded-xl p-5 flex flex-col justify-between">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
            
            {/* Weekdays bar chart */}
            <div className="flex flex-col h-full justify-between">
              <div className="border-b border-divider/20 pb-2 mb-3 flex justify-between items-center">
                <h4 className="text-[10px] font-bold text-text-primary uppercase tracking-wider">Dia da Semana</h4>
                
                {/* View Mode Toggle */}
                <div className="flex items-center gap-1 bg-bg-secondary p-0.5 rounded-lg border border-divider">
                  <button
                    onClick={() => setViewMode(prev => ({ ...prev, diaSemana: 'chart' }))}
                    className={clsx(
                      "p-1.5 rounded-md transition-all cursor-pointer",
                      viewMode.diaSemana === 'chart'
                        ? "bg-bg-primary text-brand-500 shadow-sm"
                        : "text-text-secondary hover:text-text-primary"
                    )}
                    title="Ver Gráfico"
                  >
                    <BarChart3 size={14} />
                  </button>
                  <button
                    onClick={() => setViewMode(prev => ({ ...prev, diaSemana: 'text' }))}
                    className={clsx(
                      "p-1.5 rounded-md transition-all cursor-pointer",
                      viewMode.diaSemana === 'text'
                        ? "bg-bg-primary text-brand-500 shadow-sm"
                        : "text-text-secondary hover:text-text-primary"
                    )}
                    title="Ver Resumo Textual"
                  >
                    <FileText size={14} />
                  </button>
                </div>
              </div>
              
              <div className="h-[180px] sm:h-[220px] w-full flex-1">
                {viewMode.diaSemana === 'chart' ? (
                  vendasPorDiaSemana.some((v: any) => v.valor > 0) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={vendasPorDiaSemana} layout="vertical" margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-divider)" opacity={0.2} />
                        <XAxis type="number" hide />
                        <YAxis 
                          dataKey="dia" 
                          type="category" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 9, fill: 'var(--color-text-secondary)', fontWeight: 600 }} 
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="valor" name="Total" fill="#0D9488" radius={[0, 3, 3, 0]} barSize={8} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-text-muted text-xs">
                      Sem faturamento registrado.
                    </div>
                  )
                ) : (
                  <div className="space-y-3 h-full flex flex-col justify-between overflow-y-auto">
                    <p className="text-xs text-text-secondary italic leading-relaxed border-l-2 border-brand-500 pl-3">
                      {getVendasDiaSemanaSummary()}
                    </p>
                    <div className="space-y-1.5 pr-1 max-h-[140px] overflow-y-auto">
                      {vendasPorDiaSemana.map((item: any, index: number) => {
                        const totalVal = vendasPorDiaSemana.reduce((acc: number, curr: any) => acc + curr.valor, 0);
                        const pct = totalVal > 0 ? (item.valor / totalVal) * 100 : 0;
                        return (
                          <div key={index} className="flex justify-between items-center p-2 rounded-lg bg-bg-secondary/40 border border-divider">
                            <span className="text-xs font-semibold text-text-primary">{item.dia}</span>
                            <div className="text-right">
                              <span className="text-xs font-mono font-bold text-text-primary block">{formatBRL(item.valor)}</span>
                              <span className="text-[9px] text-text-muted">{pct.toFixed(1)}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Resumo de Atividade (Heatmap Replacement) */}
            <div className="flex flex-col h-full bg-bg-secondary/20 border border-divider/40 rounded-xl p-4 justify-between">
              <div className="border-b border-divider pb-2 mb-3">
                <h4 className="text-[10px] font-extrabold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <Clock size={12} className="text-brand-500" />
                  Resumo de Atividade
                </h4>
              </div>
              
              <div className="flex-1 flex flex-col justify-between space-y-2">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-bg-primary border border-divider/60 rounded-xl shadow-sm">
                    <span className="text-[9px] text-text-secondary uppercase tracking-wider block font-semibold">Total Emitido</span>
                    <span className="text-md font-extrabold text-text-primary mt-0.5 block">{notasEmitidas} notas</span>
                  </div>
                  <div className="p-2 bg-bg-primary border border-divider/60 rounded-xl shadow-sm">
                    <span className="text-[9px] text-text-secondary uppercase tracking-wider block font-semibold">Ticket Médio</span>
                    <span className="text-md font-extrabold text-text-primary mt-0.5 block truncate">{formatBRLCompact(ticketMedio)}</span>
                  </div>
                </div>

                {/* Best sales day */}
                <div className="p-2 bg-bg-primary border border-divider/60 rounded-xl shadow-sm">
                  <span className="text-[9px] text-text-secondary uppercase tracking-wider font-semibold block mb-1">Melhor Dia do Período</span>
                  {vendasPorDiaSemana.length > 0 ? (
                    (() => {
                      const sorted = [...vendasPorDiaSemana].sort((a: any, b: any) => b.valor - a.valor);
                      const peak = sorted[0];
                      return (
                        <div className="flex justify-between items-center text-xs font-bold">
                          <span className="text-text-primary">{peak.dia}</span>
                          <span className="text-brand-500 font-mono">{formatBRL(peak.valor)}</span>
                        </div>
                      );
                    })()
                  ) : (
                    <span className="text-xs text-text-muted">Nenhum registro.</span>
                  )}
                </div>

                {/* Recent trajectory indicator */}
                <div className="p-2 bg-bg-primary border border-divider/60 rounded-xl shadow-sm">
                  <span className="text-[9px] text-text-secondary uppercase tracking-wider font-semibold block mb-1">Evolução Recente</span>
                  <p className="text-[10px] text-text-secondary leading-normal">
                    {historicoVendas.length > 0 
                      ? `Registros indicam média diária de ${formatBRLCompact(historicoVendas.reduce((acc: number, curr: any) => acc + curr.valor, 0) / historicoVendas.length)}.`
                      : "Sem histórico de evolução disponível."
                    }
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* SECTION: NOTAS FISCAIS DO VENDEDOR (PAGINATION 50-BY-50, SEARCH BY CLIENT & COLUMN SORTING) */}
      <div className="bg-bg-primary border border-divider shadow-card rounded-xl p-5 flex flex-col">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-divider pb-4 mb-4 gap-4">
          <div>
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">Notas Fiscais do Vendedor</h3>
            <p className="text-[11px] text-text-secondary mt-0.5">Fila de notas faturadas no período consultado</p>
          </div>
          <span className="text-[10px] font-bold text-text-muted uppercase bg-bg-secondary px-2.5 py-1 rounded-full border border-divider/10 shrink-0">
            {filteredInvoices.length} encontrados / {invoicesList.length} total
          </span>
        </div>

        {/* Filter Inputs (Client Search + Status Filter Pills) */}
        <div className="flex flex-col md:flex-row gap-4 mb-4 items-stretch md:items-center">
          {/* Client & Nota Search */}
          <div className="relative flex-1 max-w-md">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-text-muted">
              <Search size={14} />
            </span>
            <input
              type="text"
              placeholder="Buscar por cliente ou nº nota..."
              value={clientQuery}
              onChange={(e) => setClientQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-bg-secondary border border-divider text-text-primary text-xs rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-brand-500 transition-all duration-300"
            />
          </div>

          {/* Status filter pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider mr-1.5 flex items-center gap-1">
              <Tag size={12} className="text-brand-500" />
              Filtrar Status:
            </span>
            {['TODOS', ...availableInvoiceStatuses].map((status) => (
              <button
                key={status}
                onClick={() => setInvoiceStatusFilter(status)}
                className={clsx(
                  "px-2.5 py-1 text-[10px] font-extrabold rounded-full border transition-all uppercase tracking-wider cursor-pointer",
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

        {/* Desktop Table View */}
        <div className="hidden sm:block overflow-x-auto w-full border border-divider/50 rounded-xl">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead>
              <tr className="border-b border-divider text-[10px] text-text-secondary uppercase font-extrabold tracking-wider bg-bg-secondary/60">
                <th className="py-3 px-4 font-mono text-[9px]">COD</th>
                <th 
                  onClick={() => handleInvoiceSort('numero')}
                  className="py-3 px-4 cursor-pointer hover:bg-bg-secondary/80 select-none transition-colors"
                >
                  <div className="flex items-center gap-1">
                    Nº NOTA
                    <ArrowUpDown size={11} className={clsx(invoiceSortField === 'numero' ? "text-brand-500" : "text-text-muted/65")} />
                  </div>
                </th>
                <th className="py-3 px-4">CLIENTE</th>
                <th 
                  onClick={() => handleInvoiceSort('data')}
                  className="py-3 px-4 cursor-pointer hover:bg-bg-secondary/80 select-none transition-colors"
                >
                  <div className="flex items-center gap-1">
                    DATA
                    <ArrowUpDown size={11} className={clsx(invoiceSortField === 'data' ? "text-brand-500" : "text-text-muted/65")} />
                  </div>
                </th>
                <th 
                  onClick={() => handleInvoiceSort('valor')}
                  className="py-3 px-4 text-right cursor-pointer hover:bg-bg-secondary/80 select-none transition-colors"
                >
                  <div className="flex items-center gap-1 justify-end">
                    VALOR TOTAL
                    <ArrowUpDown size={11} className={clsx(invoiceSortField === 'valor' ? "text-brand-500" : "text-text-muted/65")} />
                  </div>
                </th>
                <th className="py-3 px-4 text-center">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider/20">
              {currentInvoices.map((inv: any, i: number) => (
                <tr key={inv.cod || i} className="hover:bg-bg-secondary/40 transition-colors">
                  <td className="py-3.5 px-4 font-mono text-text-muted">{inv.cod}</td>
                  <td className="py-3.5 px-4 text-brand-500 font-bold">{inv.numero_nota}</td>
                  <td className="py-3.5 px-4 text-text-primary font-bold truncate max-w-[280px]" title={inv.cliente}>
                    {inv.cliente}
                  </td>
                  <td className="py-3.5 px-4 text-text-secondary font-medium">{inv.data}</td>
                  <td className="py-3.5 px-4 text-right font-mono font-extrabold text-success">
                    {formatBRL(inv.valor)}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className={clsx(
                      "text-[9px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider border",
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
                  <td colSpan={6} className="py-8 text-center text-text-muted font-medium">
                    Nenhuma nota fiscal emitida para os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View Fallback */}
        <div className="sm:hidden space-y-3">
          {currentInvoices.map((inv: any, i: number) => (
            <div key={inv.cod || i} className="p-4 border border-divider rounded-xl bg-bg-secondary/10 flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="font-mono text-[10px] text-text-muted">COD: {inv.cod}</span>
                <span className={clsx(
                  "text-[9px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider border",
                  inv.status && ['FATURADO', 'FINALIZADO'].includes(inv.status.trim()) 
                    ? 'bg-success/15 text-success border-success/10' 
                    : 'bg-text-muted/10 text-text-muted border-divider/10'
                )}>
                  {inv.status ? inv.status.trim() : 'Normal'}
                </span>
              </div>
              <div>
                <h4 className="text-xs font-bold text-text-primary leading-tight">{inv.cliente}</h4>
                <p className="text-[10px] text-text-secondary mt-0.5">Nota: {inv.numero_nota}</p>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-divider mt-1">
                <div className="flex items-center gap-1 text-[10px] text-text-muted">
                  <Calendar size={12} />
                  {inv.data}
                </div>
                <div className="text-xs font-mono font-bold text-success">
                  {formatBRL(inv.valor)}
                </div>
              </div>
            </div>
          ))}
          {currentInvoices.length === 0 && (
            <div className="py-8 text-center text-text-muted text-xs">
              Nenhuma nota fiscal encontrada.
            </div>
          )}
        </div>

        {/* PAGINATION PANEL - CARREGAR MAIS */}
        <div className="flex flex-col sm:flex-row justify-between items-center mt-4 pt-4 border-t border-divider/20 text-xs gap-3">
          <span className="text-[11px] text-text-secondary">
            Mostrando {Math.min(visibleInvoicesCount, sortedInvoices.length)} de {sortedInvoices.length} notas faturadas
          </span>
          
          {visibleInvoicesCount < sortedInvoices.length && (
            <button
              onClick={() => setVisibleInvoicesCount(prev => prev + 50)}
              className="px-6 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-bold transition-all duration-200 shadow-sm flex items-center gap-1.5 cursor-pointer scale-100 hover:scale-[1.02] active:scale-[0.98]"
            >
              Carregar Mais (+50)
            </button>
          )}
        </div>
      </div>

      {isError && (
        <div className="bg-danger/10 border border-danger/25 text-danger p-3 rounded-lg text-xs font-semibold">
          Erro de comunicação: Não foi possível sincronizar os dados do vendedor. Verifique a conexão com a API do banco de dados Vet.
        </div>
      )}

    </div>
  );
}
