import { useState, useEffect, useMemo, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useBiPeriodQuery } from '../../hooks/useBiPeriodQuery';
import { BIService } from '../../services/biApi';
import { BiPeriodFilter } from '../../types/bi.types';
import { 
  User, Calendar, Loader2, Search, ChevronLeft, MapPin, Phone, Mail, 
  Award, AlertTriangle, TrendingUp, TrendingDown, DollarSign, ShoppingBag, 
  Tag, Clock, Activity, ShieldAlert, Award as Trophy, Key
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatBRL, formatNum } from '../../utils/format';
import clsx from 'clsx';

interface SearchResult {
  id: number;
  nome: string;
  cnpj: string;
}

export default function Radar360Dashboard() {
  const { filter } = useOutletContext<{ filter: BiPeriodFilter }>();
  const [customerId, setCustomerId] = useState<number | null>(null);
  
  // Search state
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Local filter states
  const [selectedPeriod, setSelectedPeriod] = useState<'todos' | 'mes' | '3meses' | 'custom'>('todos');
  const [startDateInput, setStartDateInput] = useState('');
  const [endDateInput, setEndDateInput] = useState('');

  // Handle click outside to close search dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search query
  useEffect(() => {
    const searchTimer = setTimeout(async () => {
      if (searchInput.length >= 3) {
        setIsSearching(true);
        try {
          const results = await BIService.searchCustomers(searchInput);
          setSearchResults(results as SearchResult[]);
          setShowSearchDropdown(true);
        } catch (error) {
          console.error("Search failed", error);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
        setShowSearchDropdown(false);
      }
    }, 300);

    return () => clearTimeout(searchTimer);
  }, [searchInput]);

  // Construct query filter parameters based on local inputs
  const queryFilter = useMemo<BiPeriodFilter>(() => {
    const base = { ...filter };
    if (selectedPeriod === 'todos') {
      base.period = 'custom';
      base.start_date = '1970-01-01';
      base.end_date = new Date().toISOString().split('T')[0];
    } else if (selectedPeriod === 'mes') {
      base.period = 'thisMonth';
    } else if (selectedPeriod === '3meses') {
      base.period = 'last90';
    } else if (selectedPeriod === 'custom' && startDateInput && endDateInput) {
      base.period = 'custom';
      base.start_date = startDateInput;
      base.end_date = endDateInput;
    }
    return base;
  }, [filter, selectedPeriod, startDateInput, endDateInput]);

  // Main dynamic query for customer data
  const { data, isLoading, isError } = useBiPeriodQuery(
    ['bi', 'radar360', customerId, queryFilter],
    () => customerId ? BIService.getRadar360(customerId, queryFilter) : Promise.resolve(null),
    queryFilter,
    { enabled: !!customerId }
  );

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatCurrencyCompact = (val: number) => {
    if (val >= 1000000) return `R$ ${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `R$ ${(val / 1000).toFixed(1)} mil`;
    return formatCurrency(val);
  };

  // Find month with min and max sales volume
  const seasonalityMetrics = useMemo(() => {
    if (!data?.seasonality || data.seasonality.length === 0) return { maxMonth: '-', minMonth: '-' };
    const sorted = [...data.seasonality].sort((a: any, b: any) => b.valor - a.valor);
    const validSales = sorted.filter((s: any) => s.valor > 0);
    return {
      maxMonth: validSales.length > 0 ? validSales[0].mes : '-',
      minMonth: validSales.length > 0 ? validSales[validSales.length - 1].mes : '-'
    };
  }, [data?.seasonality]);

  // Handle selected customer
  const handleSelectCustomer = (c: SearchResult) => {
    setCustomerId(c.id);
    setSearchInput('');
    setShowSearchDropdown(false);
  };

  return (
    <div aria-label="Radar 360 Dashboard" className="space-y-6 animate-in fade-in duration-300 pb-10">
      
      {/* ── HEADER NAVIGATION & SEARCH BAR ────────────────────────────────── */}
      <div className="bg-bg-primary border border-border rounded-xl p-3 px-4 flex flex-col md:flex-row items-center justify-between shadow-sm gap-4">
        <div className="flex items-center gap-3">
          {customerId && (
            <button
              onClick={() => setCustomerId(null)}
              className="p-1.5 hover:bg-bg-secondary rounded-lg transition-colors border border-border text-text-secondary hover:text-text-primary cursor-pointer"
              title="Voltar para busca"
            >
              <ChevronLeft size={16} />
            </button>
          )}
          <div>
            <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
              Radar 360
              <span className="text-[9px] font-bold bg-brand-500/10 text-brand-600 dark:text-brand-400 px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                Interface 360 do Cliente
              </span>
            </h2>
          </div>
        </div>

        {/* Predictive Search Bar Input */}
        <div className="relative w-full md:w-80" ref={dropdownRef}>
          <div className="flex items-center bg-bg-secondary border border-border rounded-xl p-1.5 px-3 shadow-inner group">
            <Search className="text-text-secondary/70 mr-2" size={14} />
            <input
              type="text"
              placeholder="Buscar nome do cliente..."
              className="bg-transparent border-none focus:outline-none w-full text-xs text-text-primary placeholder-text-muted"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onFocus={() => { if (searchResults.length > 0) setShowSearchDropdown(true); }}
            />
            {isSearching && <Loader2 size={12} className="animate-spin text-text-secondary" />}
          </div>

          {/* Suggestions Dropdown */}
          {showSearchDropdown && searchResults.length > 0 && (
            <div className="absolute top-full right-0 left-0 mt-2 bg-bg-primary border border-border shadow-lg rounded-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              <ul className="max-h-60 overflow-y-auto p-1.5 space-y-0.5">
                {searchResults.map((c) => (
                  <li
                    key={c.id}
                    onClick={() => handleSelectCustomer(c)}
                    className="p-2.5 rounded-lg hover:bg-bg-secondary cursor-pointer transition-colors flex items-center justify-between text-xs border border-transparent hover:border-divider"
                  >
                    <div>
                      <div className="font-bold text-text-primary">{c.nome}</div>
                      <div className="text-[10px] text-text-secondary">{c.cnpj}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* ── AGUARDANDO CLIENTE ────────────────────────────────────────────── */}
      {!customerId ? (
        <div className="bg-bg-primary border border-border shadow-card rounded-2xl p-16 flex flex-col items-center justify-center text-center animate-in fade-in duration-300">
          <div className="w-16 h-16 bg-brand-500/10 rounded-full flex items-center justify-center text-brand-500 mb-4 animate-pulse">
            <User size={32} />
          </div>
          <h3 className="text-lg font-bold text-text-primary mb-2">Busque um Cliente no Campo Superior</h3>
          <p className="text-xs text-text-secondary max-w-sm">
            Digite pelo menos 3 caracteres do nome ou CNPJ do cliente para extrair o perfil reativo 360.
          </p>
        </div>
      ) : isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-brand-500">
          <Loader2 size={40} className="animate-spin mb-4" />
          <p className="text-sm font-semibold text-text-primary">Extraindo DNA do Cliente...</p>
        </div>
      ) : isError ? (
        <div className="bg-danger/10 border border-danger/20 text-danger p-6 rounded-2xl text-center text-xs font-semibold">
          Erro ao processar as informações do cliente. Verifique sua conexão e tente novamente.
        </div>
      ) : data ? (
        <div className="space-y-6 animate-in fade-in duration-300">

          {/* ── SEÇÃO 1: CABEÇALHO DO PERFIL DO CLIENTE (MOCKUP ORIGINAL) ─── */}
          <div className="bg-bg-primary border border-border shadow-card rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-brand-500" />
            
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              {/* Informações Básicas */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-[#10B981] flex items-center justify-center text-white text-xl font-black shadow-md border-2 border-white/10 select-none">
                  {data.dna?.nome?.charAt(0).toUpperCase() || 'P'}
                </div>
                <div>
                  <h2 className="text-lg font-black text-text-primary flex items-center gap-2 flex-wrap">
                    {data.dna?.nome || 'Cliente Desconhecido'}
                    <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider select-none">
                      {data.dna?.status || 'ATIVO'}
                    </span>
                  </h2>
                  <div className="text-[11px] text-text-secondary font-semibold mt-1">
                    <span>{data.dna?.documento || 'CNPJ Não Cadastrado'}</span>
                    <span className="mx-2 text-divider">|</span>
                    <span>Cliente desde {data.dna?.data_cadastro ? new Date(data.dna.data_cadastro).toLocaleDateString('pt-BR') : 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Badges de Destaque */}
              <div className="flex items-center gap-3 w-full lg:w-auto">
                {/* Tempo de Cliente */}
                <div className="flex-1 lg:flex-initial bg-bg-secondary border border-border rounded-xl p-3 px-4 flex items-center gap-2.5 shadow-sm">
                  <div className="p-1.5 bg-blue-500/10 text-blue-500 rounded-lg"><Key size={14} /></div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider">Tempo de Cliente</span>
                    <span className="text-xs font-bold text-text-primary">1 ano e 1 mês</span>
                  </div>
                </div>

                {/* Dias Sem Comprar */}
                <div className="flex-1 lg:flex-initial bg-red-500/[0.02] border border-red-500/20 rounded-xl p-3 px-4 flex items-center gap-2.5 shadow-sm relative">
                  <div className="p-1.5 bg-red-500/10 text-red-500 rounded-lg"><AlertTriangle size={14} /></div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-red-500 uppercase tracking-wider">Dias Sem Comprar</span>
                    <span className="text-lg font-black text-red-500 leading-none mt-0.5">{data.risk_assessment?.dias_sem_comprar || 0}</span>
                    <span className="text-[9px] text-red-500/70 font-semibold mt-0.5">Última Compra: {data.risk_assessment?.ultima_compra ? new Date(data.risk_assessment.ultima_compra).toLocaleDateString('pt-BR') : 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Rodapé do Perfil com Contato */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-divider/40 mt-6 pt-5 text-xs text-text-secondary">
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-text-muted" />
                <span className="font-bold text-text-primary">Localidade:</span>
                <span>{data.dna?.cidade || 'Dourados'}/{data.dna?.estado || 'MS'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-text-muted" />
                <span className="font-bold text-text-primary">Celular:</span>
                <span>67 98123-7265</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={14} className="text-text-muted" />
                <span className="font-bold text-text-primary">E-mail:</span>
                <span className="truncate">valter@paiol.com.br</span>
              </div>
            </div>
          </div>

          {/* ── SEÇÃO 2: ABAS E FILTROS DE PERÍODO ───────────────────────────── */}
          <div className="bg-bg-primary border border-border shadow-card rounded-2xl p-3 px-4 flex flex-wrap items-center justify-between gap-4">
            {/* Abas */}
            <div className="flex items-center gap-2 bg-bg-secondary p-1 rounded-xl border border-divider">
              <button
                onClick={() => setSelectedPeriod('todos')}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer select-none",
                  selectedPeriod === 'todos' ? "bg-brand-500 text-white shadow-sm" : "text-text-secondary hover:text-text-primary"
                )}
              >
                Todos
              </button>
              <button
                onClick={() => setSelectedPeriod('mes')}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer select-none",
                  selectedPeriod === 'mes' ? "bg-brand-500 text-white shadow-sm" : "text-text-secondary hover:text-text-primary"
                )}
              >
                Mês Atual
              </button>
              <button
                onClick={() => setSelectedPeriod('3meses')}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer select-none",
                  selectedPeriod === '3meses' ? "bg-brand-500 text-white shadow-sm" : "text-text-secondary hover:text-text-primary"
                )}
              >
                3 Meses
              </button>
              <button
                onClick={() => setSelectedPeriod('custom')}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer select-none",
                  selectedPeriod === 'custom' ? "bg-brand-500 text-white shadow-sm" : "text-text-secondary hover:text-text-primary"
                )}
              >
                Personalizado
              </button>
            </div>

            {/* Inputs de Data (Visíveis apenas quando "Custom" está ativo) */}
            {selectedPeriod === 'custom' && (
              <div className="flex items-center gap-2 animate-in slide-in-from-left-2 duration-150">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-text-muted">DE:</span>
                  <input
                    type="date"
                    value={startDateInput}
                    onChange={(e) => setStartDateInput(e.target.value)}
                    className="bg-bg-secondary border border-border rounded-lg px-2.5 py-1 text-xs text-text-primary outline-none focus:border-brand-500"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-text-muted">ATÉ:</span>
                  <input
                    type="date"
                    value={endDateInput}
                    onChange={(e) => setEndDateInput(e.target.value)}
                    className="bg-bg-secondary border border-border rounded-lg px-2.5 py-1 text-xs text-text-primary outline-none focus:border-brand-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ── SEÇÃO 3: GRADE DE PRODUTIVIDADE E COMPORTAMENTO (4 CARDS) ───── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Card 1: Participação de Vendas */}
            <div className="bg-bg-primary border border-border shadow-card rounded-2xl p-5 flex flex-col justify-between hover:border-brand-500/20 transition-colors">
              <div>
                <div className="text-[9px] font-black text-text-muted uppercase tracking-wider border-b border-divider/30 pb-2 mb-3">
                  Mais Vendas (Faturamento)
                </div>
                <div className="space-y-2 mt-2">
                  <div className="flex justify-between items-center text-xs font-bold text-text-primary">
                    <span>{data.affinity?.vendedor_estrela || 'N/A'}</span>
                    <span className="bg-brand-500/10 text-brand-600 dark:text-brand-400 px-1.5 py-0.5 rounded text-[10px]">{data.affinity?.vendedor_share || 100}%</span>
                  </div>
                  <div className="w-full bg-bg-secondary h-1.5 rounded-full overflow-hidden">
                    <div className="bg-brand-500 h-full rounded-full" style={{ width: `${data.affinity?.vendedor_share || 100}%` }} />
                  </div>
                </div>
              </div>
              <div className="text-[9px] text-text-secondary/70 font-semibold mt-4">
                Vendedores no período: {data.affinity?.vendedores_periodo?.join(', ') || 'N/A'}
              </div>
            </div>

            {/* Card 2: Score RFM */}
            <div className="bg-bg-primary border border-border shadow-card rounded-2xl p-5 flex flex-col justify-between hover:border-brand-500/20 transition-colors">
              <div>
                <div className="flex justify-between items-center border-b border-divider/30 pb-2 mb-3">
                  <span className="text-[9px] font-black text-text-muted uppercase tracking-wider">Score RFM</span>
                  <span className="bg-amber-500 text-white text-[8px] font-black uppercase px-1 rounded select-none">Histórico</span>
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-black text-brand-500 tracking-tight">{data.rfm?.score || '144'}</span>
                  <span className="text-[10px] font-extrabold text-[#10B981]">Excelente</span>
                </div>
                
                {/* RFM Bars */}
                <div className="space-y-1.5 mt-4 text-[10px] font-bold text-text-secondary">
                  <div className="flex justify-between">
                    <span>Recência (Dias sem Compra)</span>
                    <span className="font-mono text-text-primary">{data.rfm?.recency || 5}/5</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Freqüência (Total Compras)</span>
                    <span className="font-mono text-text-primary">{data.rfm?.frequency || 4}/5</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Valor (Total Gasto)</span>
                    <span className="font-mono text-text-primary">{data.rfm?.monetary || 4}/5</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Segmento e Potencial */}
            <div className="bg-bg-primary border border-border shadow-card rounded-2xl p-5 flex flex-col justify-between hover:border-brand-500/20 transition-colors">
              <div>
                <div className="text-[9px] font-black text-text-muted uppercase tracking-wider border-b border-divider/30 pb-2 mb-3">
                  Segmento & Potencial
                </div>
                <div className="space-y-3 mt-2 text-xs text-text-secondary">
                  <div className="flex justify-between">
                    <span>vs Média Segmento</span>
                    <span className="text-[#10B981] font-black">{data.potential?.vs_media || '+10% Acima'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Freqüência Compra</span>
                    <span className="font-bold text-text-primary">{data.potential?.freq_compra || 'A cada 25 dias'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Faturamento / Dia</span>
                    <span className="font-bold text-text-primary">{formatBRL(data.potential?.fat_dia || 0)}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 mt-4">
                {data.potential?.categorias?.map((tag: string) => (
                  <span key={tag} className="text-[8px] font-black bg-bg-secondary border border-border rounded px-1.5 py-0.5 text-text-secondary uppercase select-none">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Card 4: Risco */}
            <div className="bg-red-500/[0.01] border border-red-500/10 shadow-card rounded-2xl p-5 flex flex-col justify-between hover:border-red-500/35 transition-all">
              <div>
                <div className="flex justify-between items-center border-b border-red-500/10 pb-2 mb-3">
                  <span className="text-[9px] font-black text-red-500 uppercase tracking-wider">Risco</span>
                  <span className="bg-red-500 text-white text-[8px] font-black uppercase px-1 rounded select-none">Alerta</span>
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-black text-red-500 tracking-tight">{data.risk_assessment?.risco_churn_pct || 95}%</span>
                </div>
                <p className="text-[10px] text-red-500/80 font-bold mt-2 leading-snug">
                  Sem compras há mais de {data.risk_assessment?.dias_sem_comprar || 30} dias.
                </p>
              </div>
              <div className="flex flex-wrap gap-1 mt-4">
                <span className="text-[8px] font-black bg-red-500/10 border border-red-500/20 rounded px-1.5 py-0.5 text-red-600 uppercase select-none cursor-pointer hover:bg-red-500/20">
                  Fazer contato
                </span>
                <span className="text-[8px] font-black bg-red-500/10 border border-red-500/20 rounded px-1.5 py-0.5 text-red-600 uppercase select-none cursor-pointer hover:bg-red-500/20">
                  Oferecer desconto
                </span>
              </div>
            </div>

          </div>

          {/* ── SEÇÃO 4: CARD GRANDE DE KPIs GERAIS ──────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* LTV */}
            <div className="bg-bg-primary border border-border shadow-card rounded-2xl p-5 hover:border-brand-500/20 transition-colors">
              <div className="text-[9px] font-black text-text-muted uppercase tracking-wider border-b border-divider/30 pb-2 mb-3">
                Faturamento Vitalício (LTV)
              </div>
              <div className="text-xl font-black text-text-primary tracking-tight mt-2">
                {formatCurrency(data.dna?.ltv || 0)}
              </div>
              <div className="text-[9px] text-text-secondary/70 font-semibold mt-1">
                Faturamento Total acumulado do cliente
              </div>
            </div>

            {/* Ticket Medio */}
            <div className="bg-bg-primary border border-border shadow-card rounded-2xl p-5 hover:border-brand-500/20 transition-colors">
              <div className="text-[9px] font-black text-text-muted uppercase tracking-wider border-b border-divider/30 pb-2 mb-3">
                Ticket Médio Histórico
              </div>
              <div className="text-xl font-black text-text-primary tracking-tight mt-2">
                {formatCurrency(data.behavior?.ticket_medio_historico || 0)}
              </div>
              <div className="text-[9px] text-text-secondary/70 font-semibold mt-1">
                Média de valor faturado por nota
              </div>
            </div>

            {/* Compras Totais */}
            <div className="bg-bg-primary border border-border shadow-card rounded-2xl p-5 hover:border-brand-500/20 transition-colors">
              <div className="text-[9px] font-black text-text-muted uppercase tracking-wider border-b border-divider/30 pb-2 mb-3">
                Compras Totais
              </div>
              <div className="text-xl font-black text-text-primary tracking-tight mt-2 flex items-baseline gap-1">
                {data.dna?.ltv > 0 ? Math.max(1, Math.round(data.dna.ltv / (data.behavior?.ticket_medio_historico || 1000))) : 0}
                <span className="text-xs text-text-secondary font-medium">compras</span>
              </div>
              <div className="text-[9px] text-text-secondary/70 font-semibold mt-1">
                Volume de Notas Fiscais emitidas
              </div>
            </div>
          </div>

          {/* ── SEÇÃO 5: SAZONALIDADE DE COMPRAS (RECHARTS CHART) ───────────── */}
          <div className="bg-bg-primary border border-border shadow-card rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-divider/30 pb-4 mb-4 gap-2">
              <h3 className="font-bold text-text-primary text-sm uppercase tracking-wider">
                Sazonalidade de Compras (Distribuição Mensal)
              </h3>
              <div className="flex items-center gap-3 text-[10px] font-bold text-text-secondary">
                <div className="flex items-center gap-1">
                  <span className="text-text-muted">Mês com Maior Volume:</span>
                  <span className="text-[#10B981]">{seasonalityMetrics.maxMonth}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-text-muted">Mês com Menor Volume:</span>
                  <span className="text-red-500">{seasonalityMetrics.minMonth}</span>
                </div>
              </div>
            </div>

            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.seasonality} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.4} />
                  <XAxis 
                    dataKey="mes" 
                    stroke="var(--text-muted)" 
                    fontSize={10} 
                    fontFamily="Outfit, sans-serif" 
                    fontWeight={600} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    stroke="var(--text-muted)" 
                    fontSize={10} 
                    fontFamily="Outfit, sans-serif" 
                    fontWeight={600} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(val) => `R$ ${val >= 1000 ? `${(val/1000).toFixed(0)}k` : val}`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', borderRadius: '12px' }}
                    labelStyle={{ color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '11px' }}
                    itemStyle={{ color: 'var(--brand-500)', fontWeight: '600', fontSize: '11px' }}
                    formatter={(value: any) => [formatCurrency(value), 'Volume']}
                  />
                  <Bar 
                    dataKey="valor" 
                    fill="url(#colorVal)" 
                    radius={[6, 6, 0, 0]}
                    maxBarSize={30}
                  >
                    <defs>
                      <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0.2}/>
                      </linearGradient>
                    </defs>
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="text-[9px] text-text-muted mt-4 pl-1 italic">
              * O gráfico representa a distribuição cronológica acumulada de vendas nos meses de Janeiro a Dezembro.
            </div>
          </div>

          {/* ── SEÇÃO 6: TOP LISTAS (PRODUTOS, CATEGORIAS, MARCAS) ───────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Top Produtos */}
            <div className="bg-bg-primary border border-border shadow-card rounded-2xl overflow-hidden flex flex-col">
              <div className="p-4 border-b border-divider/30 bg-bg-secondary/20">
                <h3 className="text-xs font-black text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <ShoppingBag size={14} className="text-brand-500" /> Top Produtos
                </h3>
              </div>
              <div className="p-3 divide-y divide-divider/20 overflow-y-auto max-h-96">
                {data.top_products?.map((prod: any, idx: number) => (
                  <div key={idx} className="py-2.5 flex flex-col gap-1.5">
                    <div className="flex justify-between items-start text-xs">
                      <div className="flex items-start gap-2 max-w-[70%]">
                        <span className="w-5 h-5 rounded-md bg-bg-secondary border border-border flex items-center justify-center font-bold text-text-secondary text-[10px] flex-shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-text-primary truncate" title={prod.nome}>{prod.nome}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-text-primary">{formatCurrencyCompact(prod.total)}</div>
                        <div className="text-[9px] text-text-muted font-bold">Qtd: {prod.qtde} un.</div>
                      </div>
                    </div>
                    {/* Share Bar */}
                    <div className="flex items-center gap-2">
                      <div className="w-full bg-bg-secondary h-1.5 rounded-full overflow-hidden">
                        <div className="bg-blue-500 h-full rounded-full" style={{ width: `${prod.pct}%` }} />
                      </div>
                      <span className="text-[9px] text-text-secondary font-bold font-mono min-w-[30px] text-right">{prod.pct}%</span>
                    </div>
                  </div>
                ))}
                {(!data.top_products || data.top_products.length === 0) && (
                  <div className="text-center py-8 text-text-muted text-xs">Nenhum produto faturado no período.</div>
                )}
              </div>
            </div>

            {/* Top Categorias */}
            <div className="bg-bg-primary border border-border shadow-card rounded-2xl overflow-hidden flex flex-col">
              <div className="p-4 border-b border-divider/30 bg-bg-secondary/20">
                <h3 className="text-xs font-black text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <Tag size={14} className="text-brand-500" /> Top Grupos
                </h3>
              </div>
              <div className="p-3 divide-y divide-divider/20 overflow-y-auto max-h-96">
                {data.top_categories?.map((cat: any, idx: number) => (
                  <div key={idx} className="py-2.5 flex flex-col gap-1.5">
                    <div className="flex justify-between items-start text-xs">
                      <div className="flex items-start gap-2 max-w-[70%]">
                        <span className="w-5 h-5 rounded-md bg-bg-secondary border border-border flex items-center justify-center font-bold text-text-secondary text-[10px] flex-shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-text-primary truncate" title={cat.nome}>{cat.nome}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-text-primary">{formatCurrencyCompact(cat.total)}</div>
                        <div className="text-[9px] text-text-muted font-bold">Qtd: {cat.qtde} un.</div>
                      </div>
                    </div>
                    {/* Share Bar */}
                    <div className="flex items-center gap-2">
                      <div className="w-full bg-bg-secondary h-1.5 rounded-full overflow-hidden">
                        <div className="bg-brand-500 h-full rounded-full" style={{ width: `${cat.pct}%` }} />
                      </div>
                      <span className="text-[9px] text-text-secondary font-bold font-mono min-w-[30px] text-right">{cat.pct}%</span>
                    </div>
                  </div>
                ))}
                {(!data.top_categories || data.top_categories.length === 0) && (
                  <div className="text-center py-8 text-text-muted text-xs">Nenhuma categoria faturada no período.</div>
                )}
              </div>
            </div>

            {/* Top Marcas */}
            <div className="bg-bg-primary border border-border shadow-card rounded-2xl overflow-hidden flex flex-col">
              <div className="p-4 border-b border-divider/30 bg-bg-secondary/20">
                <h3 className="text-xs font-black text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <Award size={14} className="text-brand-500" /> Top Marcas
                </h3>
              </div>
              <div className="p-3 divide-y divide-divider/20 overflow-y-auto max-h-96">
                {data.top_brands?.map((brand: any, idx: number) => (
                  <div key={idx} className="py-2.5 flex flex-col gap-1.5">
                    <div className="flex justify-between items-start text-xs">
                      <div className="flex items-start gap-2 max-w-[70%]">
                        <span className="w-5 h-5 rounded-md bg-bg-secondary border border-border flex items-center justify-center font-bold text-text-secondary text-[10px] flex-shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-text-primary truncate" title={brand.nome}>{brand.nome}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-text-primary">{formatCurrencyCompact(brand.total)}</div>
                        <div className="text-[9px] text-text-muted font-bold">Qtd: {brand.qtde} un.</div>
                      </div>
                    </div>
                    {/* Share Bar */}
                    <div className="flex items-center gap-2">
                      <div className="w-full bg-bg-secondary h-1.5 rounded-full overflow-hidden">
                        <div className="bg-amber-500 h-full rounded-full" style={{ width: `${brand.pct}%` }} />
                      </div>
                      <span className="text-[9px] text-text-secondary font-bold font-mono min-w-[30px] text-right">{brand.pct}%</span>
                    </div>
                  </div>
                ))}
                {(!data.top_brands || data.top_brands.length === 0) && (
                  <div className="text-center py-8 text-text-muted text-xs">Nenhuma marca faturada no período.</div>
                )}
              </div>
            </div>

          </div>

          {/* ── SEÇÃO 7: ÚLTIMOS PEDIDOS TABLE ───────────────────────────────── */}
          <div className="bg-bg-primary border border-border shadow-card rounded-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-divider/30 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center">
                  <Calendar size={16} className="text-brand-500 mr-2" /> Últimos Pedidos
                </h3>
                <span className="text-[10px] text-text-secondary font-semibold">Últimas 10 compras do cliente</span>
              </div>
              <button 
                onClick={() => alert('Função Histórico Completo disponível em breve.')}
                className="text-[10px] font-black uppercase tracking-wider bg-bg-secondary hover:bg-divider border border-border rounded-xl px-3 py-2 text-text-primary shadow-sm hover:shadow transition-all cursor-pointer"
              >
                Ver Histórico Completo
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead>
                  <tr className="bg-bg-secondary/40 text-[9px] text-text-muted uppercase font-bold tracking-wider border-b border-divider/40">
                    <th className="px-6 py-3.5">Nota/Pedido</th>
                    <th className="px-6 py-3.5">Vendedor</th>
                    <th className="px-6 py-3.5 text-right">Valor Total</th>
                    <th className="px-6 py-3.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-divider/20">
                  {data.order_history?.map((order: any) => (
                    <tr key={order.id} className="hover:bg-bg-secondary/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-text-primary">Nota/Pedido: #{order.numero_nota || order.id}</div>
                        <div className="text-[10px] text-text-muted font-bold">Emissão: {order.data_emissao}</div>
                      </td>
                      <td className="px-6 py-4 font-bold text-text-secondary">{order.vendedor_nome || '-'}</td>
                      <td className="px-6 py-4 text-right font-black text-text-primary">{formatCurrency(order.valor_total)}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={clsx(
                          "px-2 py-1 rounded-md text-[9px] font-bold border",
                          order.status === 'FATURADO' || order.status === 'FINALIZADO' 
                            ? "bg-green-500/10 text-green-600 border-green-500/20"
                            : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                        )}>
                          {order.status || 'FINALIZADO'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(!data.order_history || data.order_history.length === 0) && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-text-muted">Nenhum pedido registrado no período.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      ) : null}
    </div>
  );
}
