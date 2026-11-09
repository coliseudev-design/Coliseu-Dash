import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { usePeriodStore, periodToParams } from '../../store/periodStore';
import { useBranchParam } from '../../contexts/BranchContext';
import PeriodFilter from '../../components/PeriodFilter';
import { useBiPeriodQuery } from '../../hooks/useBiPeriodQuery';
import { useBranchPeriodQuery } from '../../hooks/useApi';
import { BIService } from '../../services/biApi';
import { BiPeriodFilter } from '../../types/bi.types';
import { 
  Trophy, Users, User, Box, Award, DollarSign, TrendingUp, TrendingDown, 
  Calendar, MapPin, FileText, ChevronLeft, ChevronRight, Activity,
  BarChart3, ArrowUpDown, Clock, Search, EyeOff, Tag, PieChart as PieIcon, List,
  Target, ChevronDown, CheckSquare, Square, ShoppingBag, ArrowUpRight
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, Cell
} from 'recharts';
import { formatBRL, formatNum, formatBRLCompact, formatGrowthPct } from '../../utils/format';
import clsx from 'clsx';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-bg-primary border border-border shadow-card-hover p-3 rounded-xl z-50 min-w-[150px]">
        <p className="text-text-secondary text-xs mb-1 font-bold uppercase tracking-wider">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm font-black text-text-primary">
            {entry.name === 'total' || entry.name === 'valor' || entry.name === 'value' || String(entry.name).includes('Faturamento')
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
  const periodState = usePeriodStore();
  const branchParam = useBranchParam();
  const globalFilter = useMemo<any>(() => ({
    ...periodToParams(periodState),
    ...branchParam
  }), [periodState, branchParam]);
  const { sellerId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isInsideComercial = location.pathname.includes('/comercial');

  // Fetch list of sellers dynamically
  const vdFull = useBranchPeriodQuery<any>('/ranking/vendedores', { limit: 100 });

  // Local Filter state
  const [selectedVendedor, setSelectedVendedor] = useState<string>('');
  const [selectedCidade, setSelectedCidade] = useState<string>('todas');
  const [selectedMarca, setSelectedMarca] = useState<string>('todas');

  const cidadesDropdown = useBranchPeriodQuery<any>('/ranking/cidades', { limit: 100 });
  const marcasDropdown = useBranchPeriodQuery<any>('/ranking/marcas', { limit: 100 });
  
  // Toggles & Filters
  const [somenteMarcasComMetas, setSomenteMarcasComMetas] = useState(false);
  const [evolucaoPeriodType, setEvolucaoPeriodType] = useState<'months' | 'days'>('months');
  const [evolucaoViewMode, setEvolucaoViewMode] = useState<'chart' | 'values'>('chart');

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
    vendedor_id: selectedVendedor || undefined,
    cidade: selectedCidade !== 'todas' && selectedCidade !== 'all' ? selectedCidade : undefined,
    marca: selectedMarca !== 'todas' && selectedMarca !== 'all' ? selectedMarca : undefined
  }), [globalFilter, selectedVendedor, selectedCidade, selectedMarca]);

  const { data, isLoading, isError } = useBiPeriodQuery<any>(
    ['bi', 'seller-summary', activeFilter],
    async (f) => {
      const response = await BIService.getSellerSummary(f);
      return response;
    },
    activeFilter
  );

  const selectedSellerName = useMemo(() => {
    if (data?.vendedor_nome) return data.vendedor_nome;
    if (!selectedVendedor || !vdFull.data?.data) return '';
    const seller = vdFull.data.data.find((v: any) => String(v.id) === String(selectedVendedor));
    return seller ? seller.nome : '';
  }, [selectedVendedor, vdFull.data, data?.vendedor_nome]);

  // Safe metrics extraction
  const faturamento = data?.faturamento || 0;
  const faturamentoAnterior = data?.faturamento_anterior || 0;
  const ticketMedio = data?.ticket_medio || 0;
  const notasEmitidas = data?.notas_emitidas || 0;
  const clientesAtivos = data?.clientes_ativos || 0;
  const clientesNaCarteira = data?.clientes_na_carteira || 0;
  const coberturaCarteira = data?.cobertura_carteira || (clientesNaCarteira > 0 ? ((clientesAtivos / clientesNaCarteira) * 100).toFixed(1) : '0.0');
  const cidadeTop = data?.cidade_top || 'N/A';
  const cidadeTopValor = data?.cidade_top_valor || 0;
  const crescimentoPct = data?.crescimento_pct || 0;
  const melhorMes = data?.melhor_mes_12m || { mes: 'N/A', valor: 0 };
  const metaVendedor = data?.meta_vendedor || 50000;
  const metaAtingimentoPct = metaVendedor > 0 ? (faturamento / metaVendedor) * 100 : 0;

  const topMarcas = data?.top_marcas || [];
  const topClientes = data?.top_clientes || [];
  const topGrupos = data?.top_grupos || [];
  const topProdutos = data?.top_produtos || [];
  
  const principalCliente = topClientes.length > 0 ? topClientes[0] : null;

  const historicoVendas = data?.historico_vendas || [];
  const invoicesList = data?.notas_fiscais || [];

  // Calculate highest brand value for relative progress bars
  const maxBrandVal = useMemo(() => {
    if (topMarcas.length === 0) return 1;
    return Math.max(...topMarcas.map((m: any) => m.value || 0)) || 1;
  }, [topMarcas]);

  // Highest client, group, product values for rank item background meters
  const maxClientVal = useMemo(() => Math.max(...topClientes.map((c: any) => c.value || 0), 1), [topClientes]);
  const maxGroupVal = useMemo(() => Math.max(...topGrupos.map((g: any) => g.value || 0), 1), [topGrupos]);
  const maxProductVal = useMemo(() => Math.max(...topProdutos.map((p: any) => p.value || 0), 1), [topProdutos]);

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    let result = invoicesList;
    if (clientQuery.trim()) {
      const q = clientQuery.toLowerCase();
      result = result.filter((inv: any) => 
        String(inv.cliente || '').toLowerCase().includes(q) ||
        String(inv.numero_nota || '').toLowerCase().includes(q)
      );
    }
    if (invoiceStatusFilter !== 'TODOS') {
      result = result.filter((inv: any) => 
        String(inv.status || '').trim().toUpperCase() === invoiceStatusFilter.toUpperCase()
      );
    }
    return result;
  }, [invoicesList, clientQuery, invoiceStatusFilter]);

  const sortedInvoices = useMemo(() => {
    return [...filteredInvoices].sort((a: any, b: any) => {
      if (invoiceSortField === 'numero') {
        return invoiceSortOrder === 'asc' 
          ? String(a.numero_nota || '').localeCompare(String(b.numero_nota || ''))
          : String(b.numero_nota || '').localeCompare(String(a.numero_nota || ''));
      }
      if (invoiceSortField === 'valor') {
        return invoiceSortOrder === 'asc' ? (a.valor || 0) - (b.valor || 0) : (b.valor || 0) - (a.valor || 0);
      }
      return invoiceSortOrder === 'asc' 
        ? String(a.data || '').localeCompare(String(b.data || ''))
        : String(b.data || '').localeCompare(String(a.data || ''));
    });
  }, [filteredInvoices, invoiceSortField, invoiceSortOrder]);

  const currentInvoices = useMemo(() => sortedInvoices.slice(0, visibleInvoicesCount), [sortedInvoices, visibleInvoicesCount]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 text-text-secondary">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500 mr-3"></div>
        Carregando Hub do Vendedor...
      </div>
    );
  }

  return (
    <div className="space-y-3.5 pb-10 animate-in fade-in duration-300 min-w-0">
      
      {/* 1. BARRA ÚNICA COMPACTA DE FILTROS: PERÍODO + VENDEDOR + CIDADE + MARCA */}
      <div className="bi-filter-bar">
        {!isInsideComercial && (
          <PeriodFilter />
        )}

        <div className="flex flex-wrap items-center gap-2 flex-1 sm:flex-initial justify-end ml-auto min-w-0">
          {/* Vendedor */}
          <div className="relative flex-1 sm:flex-initial min-w-[175px] max-w-[240px]">
            <select
              aria-label="Selecionar Vendedor"
              value={selectedVendedor}
              onChange={(e) => setSelectedVendedor(e.target.value)}
              className="bi-select w-full appearance-none pr-7 truncate"
            >
              <option value="">Vendedor: Todos / Selecione</option>
              {vdFull.data?.data?.map((v: any) => (
                <option key={v.id} value={v.id}>{v.nome}</option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
          </div>

          {/* Cidade */}
          <div className="relative flex-1 sm:flex-initial min-w-[155px] max-w-[220px]">
            <select
              aria-label="Selecionar Cidade"
              value={selectedCidade}
              onChange={(e) => setSelectedCidade(e.target.value)}
              className="bi-select w-full appearance-none pr-7 truncate uppercase"
            >
              <option value="todas">Cidade: Todas</option>
              {cidadesDropdown.data?.data?.map((c: any) => (
                <option key={c.nome || c.cidade} value={c.nome || c.cidade}>{c.nome || c.cidade}</option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
          </div>

          {/* Marca */}
          <div className="relative flex-1 sm:flex-initial min-w-[155px] max-w-[220px]">
            <select
              aria-label="Selecionar Marca"
              value={selectedMarca}
              onChange={(e) => setSelectedMarca(e.target.value)}
              className="bi-select w-full appearance-none pr-7 truncate uppercase"
            >
              <option value="todas">Marca: Todas</option>
              {marcasDropdown.data?.data?.map((m: any) => (
                <option key={m.nome || m.marca} value={m.nome || m.marca}>{m.nome || m.marca}</option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
          </div>
        </div>
      </div>

      {/* 2. CARD DESTACADO: PROGRESSO DA META MENSAL */}
      <div className="bg-emerald-500/10 dark:bg-emerald-950/20 border border-emerald-500/30 rounded-2xl p-4 sm:p-4.5 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-3.5">
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Target size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block">
              Progresso da Meta Mensal
            </span>
            <div className="text-sm sm:text-base font-black text-text-primary mt-0.5 flex flex-wrap items-baseline gap-x-1.5 tabular-nums">
              <span className="text-emerald-600 dark:text-emerald-400 font-mono">{formatBRL(faturamento)}</span>
              <span className="text-xs font-semibold text-text-secondary">realizados de</span>
              <span className="text-text-secondary font-mono">{formatBRL(metaVendedor)}</span>
            </div>
            <div className="w-full max-w-md h-2 bg-emerald-500/20 rounded-full mt-2 overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all duration-700" 
                style={{ width: `${Math.min(100, Math.max(0, metaAtingimentoPct))}%` }}
              />
            </div>
          </div>
        </div>

        <div className="md:text-right shrink-0">
          <div className="font-black text-emerald-600 dark:text-emerald-400 tracking-tight font-mono bi-kpi-hero">
            {formatGrowthPct(metaAtingimentoPct, 1, false)}
          </div>
          <span className="text-[10px] font-black text-text-secondary uppercase tracking-wider block mt-0.5">
            Atingimento
          </span>
        </div>
      </div>

      {/* 3. CARD: FATURAMENTO ATUAL VS FATURAMENTO ANTERIOR */}
      <div className="bg-bg-primary border border-border shadow-card rounded-2xl p-4 sm:p-5 relative overflow-hidden flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-emerald-500"></div>

        {/* Faturamento Atual */}
        <div className="flex items-center gap-3.5 flex-1 min-w-0 pl-2">
          <div className="w-11 h-11 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center shrink-0 shadow-xs">
            <DollarSign size={22} className="stroke-[2.5]" />
          </div>
          <div className="space-y-0.5 min-w-0">
            <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest block">Faturamento Atual</span>
            <div className="font-black text-text-primary tracking-tight font-mono bi-kpi-hero">
              {formatBRL(faturamento)}
            </div>
            <span className="text-[11px] text-text-secondary font-medium block">Período selecionado</span>
          </div>
        </div>

        {/* Badge Variação Seguro (Sem Estourar c/ Percentuais Extremos) */}
        <div
          title={`${crescimentoPct >= 0 ? '+' : ''}${crescimentoPct.toFixed(2)}%`}
          className="flex flex-col items-center justify-center shrink-0 py-2 px-4 rounded-xl bg-bg-secondary border border-border shadow-xs self-start lg:self-center"
        >
          <span className={clsx(
            "text-xs font-black flex items-center gap-1 tabular-nums whitespace-nowrap",
            crescimentoPct >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
          )}>
            {crescimentoPct >= 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
            {formatGrowthPct(crescimentoPct, 1)}
          </span>
          <span className="text-[9px] text-text-secondary font-bold uppercase tracking-wider mt-0.5 whitespace-nowrap">vs. período anterior</span>
        </div>

        {/* Faturamento Anterior */}
        <div className="flex items-center gap-3.5 flex-1 lg:justify-end text-left lg:text-right min-w-0">
          <div className="space-y-0.5 lg:order-1 order-2 min-w-0">
            <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest block">Faturamento Anterior</span>
            <div className="font-black text-text-primary tracking-tight font-mono bi-kpi-value">
              {formatBRL(faturamentoAnterior)}
            </div>
            <span className="text-[11px] text-text-secondary font-medium block">Período anterior equivalente</span>
          </div>
          <div className="w-11 h-11 bg-bg-secondary border border-border text-text-secondary rounded-xl flex items-center justify-center shrink-0 lg:order-2 order-1 shadow-xs">
            <DollarSign size={20} />
          </div>
        </div>
      </div>

      {/* 4. GRID DE 8 CARDS DE KPIS EXECUTIVOS (AUTO-ADAPTÁVEIS SEM CORTE) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        {/* Card 1: Ticket Médio */}
        <div className="bg-bg-primary border border-border shadow-card rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[10px] font-black text-text-secondary uppercase tracking-wider truncate">Ticket Médio</span>
            <div className="w-7 h-7 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center justify-center shrink-0">
              <Trophy size={15} />
            </div>
          </div>
          <div className="font-black text-text-primary font-mono bi-kpi-value">
            {formatBRL(ticketMedio)}
          </div>
          <span className="text-[10px] text-text-secondary font-medium block mt-1 truncate">Média por venda</span>
        </div>

        {/* Card 2: Notas Emitidas */}
        <div className="bg-bg-primary border border-border shadow-card rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[10px] font-black text-text-secondary uppercase tracking-wider truncate">Notas Emitidas</span>
            <div className="w-7 h-7 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center justify-center shrink-0">
              <FileText size={15} />
            </div>
          </div>
          <div className="font-black text-text-primary font-mono bi-kpi-value">
            {formatNum(notasEmitidas)}
          </div>
          <span className="text-[10px] text-text-secondary font-medium block mt-1 truncate">Total documentos</span>
        </div>

        {/* Card 3: Clientes Atendidos */}
        <div className="bg-bg-primary border border-border shadow-card rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[10px] font-black text-text-secondary uppercase tracking-wider truncate">Clientes Atendidos</span>
            <div className="w-7 h-7 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center justify-center shrink-0">
              <Users size={15} />
            </div>
          </div>
          <div className="font-black text-text-primary font-mono bi-kpi-value">
            {formatNum(clientesAtivos)}
          </div>
          <span className="text-[10px] text-text-secondary font-medium block mt-1 truncate">
            {formatNum(notasEmitidas)} ped. de {formatNum(clientesAtivos)} cli
          </span>
        </div>

        {/* Card 4: Cidade Top */}
        <div className="bg-bg-primary border border-border shadow-card rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[10px] font-black text-text-secondary uppercase tracking-wider truncate">Cidade Top</span>
            <div className="w-7 h-7 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center justify-center shrink-0">
              <MapPin size={15} />
            </div>
          </div>
          <div className="text-xs sm:text-[13px] font-black text-text-primary truncate uppercase mb-0.5" title={cidadeTop}>
            {cidadeTop}
          </div>
          <div className="font-black text-emerald-600 dark:text-emerald-400 font-mono bi-kpi-value">
            {formatBRL(cidadeTopValor)}
          </div>
        </div>

        {/* Card 5: Principal Cliente */}
        <div className="bg-bg-primary border border-border shadow-card rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[10px] font-black text-text-secondary uppercase tracking-wider truncate">Principal Cliente</span>
            <div className="w-7 h-7 bg-rose-500/10 text-rose-500 rounded-lg flex items-center justify-center shrink-0">
              <Award size={15} />
            </div>
          </div>
          <div className="text-xs sm:text-[13px] font-black text-text-primary truncate uppercase mb-0.5" title={principalCliente?.name || 'N/A'}>
            {principalCliente ? principalCliente.name : 'N/A'}
          </div>
          <div className="font-black text-rose-600 dark:text-rose-400 font-mono bi-kpi-value">
            {principalCliente ? formatBRL(principalCliente.value) : 'R$ 0,00'}
          </div>
        </div>

        {/* Card 6: Melhor Mês */}
        <div className="bg-bg-primary border border-border shadow-card rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[10px] font-black text-text-secondary uppercase tracking-wider truncate">Melhor Mês (12m)</span>
            <div className="w-7 h-7 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-lg flex items-center justify-center shrink-0">
              <Calendar size={15} />
            </div>
          </div>
          <div className="font-black text-emerald-600 dark:text-emerald-400 font-mono bi-kpi-value">
            {melhorMes && melhorMes.valor > 0 ? formatBRL(melhorMes.valor) : 'Sem vendas'}
          </div>
          <span className="text-[10px] text-text-secondary font-bold block mt-1 truncate">
            {melhorMes && melhorMes.mes !== 'N/A' ? melhorMes.mes : 'N/A'}
          </span>
        </div>

        {/* Card 7: Clientes na Carteira */}
        <div className="bg-bg-primary border border-border shadow-card rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[10px] font-black text-text-secondary uppercase tracking-wider truncate">Clientes na Carteira</span>
            <div className="w-7 h-7 bg-blue-500/10 text-blue-500 rounded-lg flex items-center justify-center shrink-0">
              <Users size={15} />
            </div>
          </div>
          <div className="font-black text-text-primary font-mono bi-kpi-value">
            {formatNum(clientesNaCarteira)}
          </div>
          <span className="text-[10px] text-text-secondary font-medium block mt-1 truncate">Clientes cadastrados</span>
        </div>

        {/* Card 8: Cobertura de Carteira */}
        <div className="bg-bg-primary border border-border shadow-card rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[10px] font-black text-text-secondary uppercase tracking-wider truncate">Cobertura de Carteira</span>
            <div className="w-7 h-7 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center justify-center shrink-0">
              <Activity size={15} />
            </div>
          </div>
          <div className="font-black text-emerald-600 dark:text-emerald-400 font-mono bi-kpi-value">
            {coberturaCarteira}%
          </div>
          <span className="text-[10px] text-text-secondary font-medium block mt-1 truncate">Vendidos vs. Carteira</span>
        </div>
      </div>

      {/* 6. SEÇÃO: DESEMPENHO POR MARCA */}
      <div className="bg-bg-primary border border-border shadow-card rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-divider/40 pb-4 mb-5 gap-3">
          <div>
            <h3 className="text-sm font-black text-text-primary uppercase tracking-wider">Desempenho por Marca</h3>
            <p className="text-xs text-text-secondary font-medium mt-0.5">Distribuição e representação de faturamento realizado por marca</p>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-text-secondary hover:text-text-primary transition-colors">
            <input
              type="checkbox"
              checked={somenteMarcasComMetas}
              onChange={(e) => setSomenteMarcasComMetas(e.target.checked)}
              className="rounded border-border text-brand-500 focus:ring-brand-500 cursor-pointer w-4 h-4"
            />
            <span className="uppercase text-[11px] font-bold">Somente marcas com metas</span>
          </label>
        </div>

        {/* Grid de Marcas (4 colunas no desktop) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {topMarcas.slice(0, 12).map((m: any, idx: number) => {
            const share = m.share !== undefined ? m.share : (maxBrandVal > 0 ? (m.value / maxBrandVal) * 100 : 0);
            const isLider = idx === 0;
            const barWidthPct = maxBrandVal > 0 ? Math.min(100, Math.max(4, (m.value / maxBrandVal) * 100)) : 0;

            return (
              <div 
                key={m.name || idx}
                className="bg-bg-secondary/40 hover:bg-bg-secondary border border-border/60 hover:border-border rounded-xl p-4 flex flex-col justify-between transition-all duration-200 shadow-2xs"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h4 className="text-xs font-black text-text-primary uppercase truncate" title={m.name}>
                    {m.name}
                  </h4>
                  <span className={clsx(
                    "text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0",
                    isLider 
                      ? "bg-sky-500/15 text-sky-600 dark:text-sky-400 font-extrabold" 
                      : "bg-bg-primary text-text-secondary border border-border"
                  )}>
                    {isLider ? `LÍDER ${share.toFixed(1)}%` : `${share.toFixed(1)}%`}
                  </span>
                </div>

                <div className="mt-1">
                  <span className="text-[11px] text-text-secondary font-medium block">
                    Realizado: <strong className="text-text-primary font-mono">{formatBRL(m.value)}</strong>
                  </span>
                  {/* Barra de progresso azul */}
                  <div className="w-full h-1.5 bg-bg-tertiary rounded-full mt-2 overflow-hidden">
                    <div 
                      className="h-full bg-sky-500 rounded-full transition-all duration-500" 
                      style={{ width: `${barWidthPct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
          {topMarcas.length === 0 && (
            <div className="col-span-full py-8 text-center text-text-secondary text-xs font-semibold">
              Nenhuma marca registrada para este vendedor no período.
            </div>
          )}
        </div>
      </div>

      {/* 7. SEÇÃO DE RANKINGS (3 COLUNAS: TOP 10 CLIENTES, TOP 10 GRUPOS, TOP 10 PRODUTOS) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Coluna 1: TOP 10 CLIENTES */}
        <div className="bg-bg-primary border border-border shadow-card rounded-2xl p-5 flex flex-col">
          <div className="flex justify-between items-center border-b border-divider/40 pb-3 mb-4">
            <h3 className="text-xs font-black text-text-primary uppercase tracking-wider flex items-center gap-2">
              <Users size={16} className="text-brand-500" />
              Top 10 Clientes
            </h3>
            <div className="p-1 rounded-lg bg-bg-secondary text-text-secondary">
              <FileText size={14} />
            </div>
          </div>

          <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[380px] pr-1">
            {topClientes.slice(0, 10).map((c: any, index: number) => {
              const rank = index + 1;
              const barWidth = maxClientVal > 0 ? (c.value / maxClientVal) * 100 : 0;
              const share = c.share !== undefined ? c.share : (faturamento > 0 ? (c.value / faturamento) * 100 : 0);

              return (
                <div key={c.name || index} className="relative flex justify-between items-center py-2 px-3 rounded-xl overflow-hidden group hover:bg-bg-secondary transition-all">
                  <div 
                    className="absolute left-0 top-0 bottom-0 bg-brand-500/10 group-hover:bg-brand-500/15 transition-all duration-500" 
                    style={{ width: `${barWidth}%` }} 
                  />
                  <div className="relative z-10 flex items-center gap-2 min-w-0 mr-2 flex-1">
                    <span className="font-mono text-xs font-black text-text-secondary min-w-[20px]">#{rank}</span>
                    <span className="text-xs font-bold text-text-primary truncate uppercase" title={c.name}>{c.name}</span>
                  </div>
                  <div className="relative z-10 text-right shrink-0 flex items-center gap-1.5 font-mono text-xs">
                    <span className="font-black text-text-primary">{formatBRL(c.value)}</span>
                    <span className="text-[10px] text-text-secondary">({share.toFixed(1)}%)</span>
                  </div>
                </div>
              );
            })}
            {topClientes.length === 0 && (
              <div className="py-8 text-center text-text-secondary text-xs font-semibold">Sem clientes no período</div>
            )}
          </div>
        </div>

        {/* Coluna 2: TOP 10 GRUPOS */}
        <div className="bg-bg-primary border border-border shadow-card rounded-2xl p-5 flex flex-col">
          <div className="flex justify-between items-center border-b border-divider/40 pb-3 mb-4">
            <h3 className="text-xs font-black text-text-primary uppercase tracking-wider flex items-center gap-2">
              <Box size={16} className="text-brand-500" />
              Top 10 Grupos
            </h3>
            <div className="p-1 rounded-lg bg-bg-secondary text-text-secondary">
              <FileText size={14} />
            </div>
          </div>

          <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[380px] pr-1">
            {topGrupos.slice(0, 10).map((g: any, index: number) => {
              const rank = index + 1;
              const barWidth = maxGroupVal > 0 ? (g.value / maxGroupVal) * 100 : 0;
              const share = g.share !== undefined ? g.share : (faturamento > 0 ? (g.value / faturamento) * 100 : 0);

              return (
                <div key={g.name || index} className="relative flex justify-between items-center py-2 px-3 rounded-xl overflow-hidden group hover:bg-bg-secondary transition-all">
                  <div 
                    className="absolute left-0 top-0 bottom-0 bg-brand-500/10 group-hover:bg-brand-500/15 transition-all duration-500" 
                    style={{ width: `${barWidth}%` }} 
                  />
                  <div className="relative z-10 flex items-center gap-2 min-w-0 mr-2 flex-1">
                    <span className="font-mono text-xs font-black text-text-secondary min-w-[20px]">#{rank}</span>
                    <span className="text-xs font-bold text-text-primary truncate uppercase" title={g.name}>{g.name}</span>
                  </div>
                  <div className="relative z-10 text-right shrink-0 flex items-center gap-1.5 font-mono text-xs">
                    <span className="font-black text-text-primary">{formatBRL(g.value)}</span>
                    <span className="text-[10px] text-text-secondary">({share.toFixed(1)}%)</span>
                  </div>
                </div>
              );
            })}
            {topGrupos.length === 0 && (
              <div className="py-8 text-center text-text-secondary text-xs font-semibold">Sem grupos no período</div>
            )}
          </div>
        </div>

        {/* Coluna 3: TOP 10 PRODUTOS */}
        <div className="bg-bg-primary border border-border shadow-card rounded-2xl p-5 flex flex-col">
          <div className="flex justify-between items-center border-b border-divider/40 pb-3 mb-4">
            <h3 className="text-xs font-black text-text-primary uppercase tracking-wider flex items-center gap-2">
              <ShoppingBag size={16} className="text-brand-500" />
              Top 10 Produtos
            </h3>
            <div className="p-1 rounded-lg bg-bg-secondary text-text-secondary">
              <FileText size={14} />
            </div>
          </div>

          <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[380px] pr-1">
            {topProdutos.slice(0, 10).map((p: any, index: number) => {
              const rank = index + 1;
              const barWidth = maxProductVal > 0 ? (p.value / maxProductVal) * 100 : 0;
              const share = p.share !== undefined ? p.share : (faturamento > 0 ? (p.value / faturamento) * 100 : 0);

              return (
                <div key={p.name || index} className="relative flex justify-between items-center py-2 px-3 rounded-xl overflow-hidden group hover:bg-bg-secondary transition-all">
                  <div 
                    className="absolute left-0 top-0 bottom-0 bg-brand-500/10 group-hover:bg-brand-500/15 transition-all duration-500" 
                    style={{ width: `${barWidth}%` }} 
                  />
                  <div className="relative z-10 flex items-center gap-2 min-w-0 mr-2 flex-1">
                    <span className="font-mono text-xs font-black text-text-secondary min-w-[20px]">#{rank}</span>
                    <span className="text-xs font-bold text-text-primary truncate uppercase" title={p.name}>{p.name}</span>
                  </div>
                  <div className="relative z-10 text-right shrink-0 flex items-center gap-1.5 font-mono text-xs">
                    <span className="font-black text-text-primary">{formatBRL(p.value)}</span>
                    <span className="text-[10px] text-text-secondary">({share.toFixed(1)}%)</span>
                  </div>
                </div>
              );
            })}
            {topProdutos.length === 0 && (
              <div className="py-8 text-center text-text-secondary text-xs font-semibold">Sem produtos no período</div>
            )}
          </div>
        </div>

      </div>

      {/* 8. SEÇÃO: EVOLUÇÃO DO FATURAMENTO (ÚLTIMOS 12 MESES) */}
      <div className="bg-bg-primary border border-border shadow-card rounded-2xl p-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center border-b border-divider/40 pb-4 mb-5 gap-4">
          <div>
            <h3 className="text-sm sm:text-base font-black text-text-primary uppercase tracking-wider">
              {evolucaoPeriodType === 'months' ? "Evolução do Faturamento (Últimos 12 Meses)" : "Evolução do Faturamento (Diário)"}
            </h3>
            <p className="text-xs text-text-secondary font-medium mt-0.5">
              {evolucaoPeriodType === 'months' 
                ? "Histórico mensal de faturamento líquido realizado pelo vendedor selecionado" 
                : "Histórico diário detalhado de faturamento realizado no período selecionado"}
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Mensal / Diário */}
            <div className="flex bg-bg-secondary p-1 rounded-xl border border-divider">
              <button
                type="button"
                onClick={() => setEvolucaoPeriodType('months')}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer",
                  evolucaoPeriodType === 'months'
                    ? "bg-brand-500 text-white shadow-xs"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                Mensal
              </button>
              <button
                type="button"
                onClick={() => setEvolucaoPeriodType('days')}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer",
                  evolucaoPeriodType === 'days'
                    ? "bg-brand-500 text-white shadow-xs"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                Diário
              </button>
            </div>

            {/* Visualizar em Valores */}
            <button
              type="button"
              onClick={() => setEvolucaoViewMode(v => v === 'chart' ? 'values' : 'chart')}
              className="px-3.5 py-2 bg-bg-secondary hover:bg-bg-tertiary text-text-primary rounded-xl border border-border transition-all cursor-pointer shadow-xs text-xs font-bold inline-flex items-center gap-1.5"
            >
              {evolucaoViewMode === 'chart' ? <List size={14} className="text-brand-500" /> : <BarChart3 size={14} className="text-brand-500" />}
              {evolucaoViewMode === 'chart' ? "Visualizar em Valores" : "Visualizar em Gráfico"}
            </button>
          </div>
        </div>

        {evolucaoViewMode === 'chart' ? (
          (evolucaoPeriodType === 'months' ? data?.evolucao_12m : historicoVendas) && (evolucaoPeriodType === 'months' ? data.evolucao_12m.length > 0 : historicoVendas.length > 0) ? (
            <div className="h-[280px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart 
                  data={evolucaoPeriodType === 'months' ? data.evolucao_12m : historicoVendas} 
                  margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="colorSellerEvol" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} vertical={false} />
                  <XAxis 
                    dataKey={evolucaoPeriodType === 'months' ? "mes" : "dia"} 
                    tick={{ fontSize: 10, fill: 'var(--color-text-secondary)', fontWeight: 600 }} 
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: 'var(--color-text-secondary)', fontWeight: 600 }} 
                    axisLine={false} 
                    tickLine={false} 
                    tickFormatter={(v) => formatBRLCompact(v)} 
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="valor" 
                    name="Faturamento Líquido" 
                    stroke="#10B981" 
                    strokeWidth={2.5} 
                    fillOpacity={1} 
                    fill="url(#colorSellerEvol)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="py-12 text-center text-text-secondary text-xs font-semibold">
              Nenhum histórico disponível para os últimos 12 meses.
            </div>
          )
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {(evolucaoPeriodType === 'months' ? data?.evolucao_12m : historicoVendas)?.map((e: any, index: number) => (
              <div key={index} className="p-3.5 border border-border/60 bg-bg-secondary/40 rounded-xl flex flex-col justify-between hover:border-border transition-all">
                <span className="text-[10px] font-black text-text-secondary uppercase tracking-wider block">
                  {evolucaoPeriodType === 'months' ? e.mes : e.dia}
                </span>
                <span className="text-sm font-black text-text-primary mt-1 font-mono">{formatBRL(e.valor)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 9. SEÇÃO: NOTAS FISCAIS DO VENDEDOR (LISTA AUDITADA) */}
      <div className="bg-bg-primary border border-border shadow-card rounded-2xl p-6 flex flex-col">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-divider/40 pb-4 mb-5 gap-3">
          <div>
            <h3 className="text-sm font-black text-text-primary uppercase tracking-wider">Notas Fiscais do Vendedor</h3>
            <p className="text-xs text-text-secondary font-medium mt-0.5">Fila de notas faturadas no período consultado</p>
          </div>
          <span className="text-[10px] font-black text-text-secondary uppercase bg-bg-secondary px-3 py-1.5 rounded-full border border-border shrink-0 shadow-2xs">
            {filteredInvoices.length} encontrados / {invoicesList.length} total
          </span>
        </div>

        {/* Busca e Filtro de Status */}
        <div className="flex flex-col md:flex-row gap-3 mb-4 items-stretch md:items-center">
          <div className="relative flex-1 max-w-md">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-text-secondary">
              <Search size={15} />
            </span>
            <input
              type="text"
              placeholder="Buscar por cliente ou nº nota..."
              value={clientQuery}
              onChange={(e) => setClientQuery(e.target.value)}
              className="w-full pl-10 pr-4 h-10 bg-bg-secondary border border-border text-text-primary text-xs rounded-xl shadow-2xs focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {['TODOS', 'FATURADO', 'FINALIZADO', 'CANCELADO'].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setInvoiceStatusFilter(status)}
                className={clsx(
                  "px-3 py-1.5 text-[10px] font-black rounded-lg border transition-all uppercase tracking-wider cursor-pointer shadow-2xs",
                  invoiceStatusFilter === status
                    ? "bg-brand-500 text-white border-brand-500"
                    : "bg-bg-secondary text-text-secondary border-border hover:text-text-primary"
                )}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Tabela de Notas */}
        <div className="overflow-x-auto w-full border border-border rounded-xl shadow-2xs">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead>
              <tr className="border-b border-border text-[10px] text-text-secondary uppercase font-black tracking-wider bg-bg-secondary/60">
                <th className="py-3 px-4 font-mono text-[9px]">COD</th>
                <th 
                  onClick={() => {
                    setInvoiceSortField('numero');
                    setInvoiceSortOrder(o => o === 'asc' ? 'desc' : 'asc');
                  }}
                  className="py-3 px-4 cursor-pointer hover:bg-bg-secondary/80 select-none transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    Nº NOTA
                    <ArrowUpDown size={12} className={clsx(invoiceSortField === 'numero' ? "text-brand-500" : "text-text-secondary/50")} />
                  </div>
                </th>
                <th className="py-3 px-4">CLIENTE</th>
                <th 
                  onClick={() => {
                    setInvoiceSortField('data');
                    setInvoiceSortOrder(o => o === 'asc' ? 'desc' : 'asc');
                  }}
                  className="py-3 px-4 cursor-pointer hover:bg-bg-secondary/80 select-none transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    DATA
                    <ArrowUpDown size={12} className={clsx(invoiceSortField === 'data' ? "text-brand-500" : "text-text-secondary/50")} />
                  </div>
                </th>
                <th 
                  onClick={() => {
                    setInvoiceSortField('valor');
                    setInvoiceSortOrder(o => o === 'asc' ? 'desc' : 'asc');
                  }}
                  className="py-3 px-4 text-right cursor-pointer hover:bg-bg-secondary/80 select-none transition-colors"
                >
                  <div className="flex items-center gap-1.5 justify-end">
                    VALOR TOTAL
                    <ArrowUpDown size={12} className={clsx(invoiceSortField === 'valor' ? "text-brand-500" : "text-text-secondary/50")} />
                  </div>
                </th>
                <th className="py-3 px-4 text-center">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {currentInvoices.map((inv: any, i: number) => (
                <tr key={inv.cod || i} className="hover:bg-bg-secondary/40 transition-colors">
                  <td className="py-3 px-4 font-mono text-text-secondary">{inv.cod}</td>
                  <td className="py-3 px-4 text-brand-500 font-extrabold">{inv.numero_nota}</td>
                  <td className="py-3 px-4 text-text-primary font-bold truncate max-w-[260px]" title={inv.cliente}>
                    {inv.cliente}
                  </td>
                  <td className="py-3 px-4 text-text-secondary font-medium">{inv.data}</td>
                  <td className="py-3 px-4 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                    {formatBRL(inv.valor)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={clsx(
                      "text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border",
                      inv.status && ['FATURADO', 'FINALIZADO'].includes(inv.status.trim()) 
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                        : 'bg-text-secondary/10 text-text-secondary border-border'
                    )}>
                      {inv.status ? inv.status.trim() : 'Normal'}
                    </span>
                  </td>
                </tr>
              ))}
              {currentInvoices.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-text-secondary font-bold">
                    Nenhuma nota fiscal emitida para os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {visibleInvoicesCount < sortedInvoices.length && (
          <div className="flex justify-center mt-4 pt-3 border-t border-divider/20">
            <button
              type="button"
              onClick={() => setVisibleInvoicesCount(v => v + 50)}
              className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              Carregar Mais (+50)
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
