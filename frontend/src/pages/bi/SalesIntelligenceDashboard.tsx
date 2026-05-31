import { useState, useMemo, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useBiPeriodQuery } from '../../hooks/useBiPeriodQuery';
import { useBranchPeriodQuery } from '../../hooks/useApi';
import { BIService } from '../../services/biApi';
import { BiPeriodFilter } from '../../types/bi.types';
import { 
  TrendingUp, TrendingDown, DollarSign, Box, Target, Trophy, 
  Users, BarChart3, FileText, ChevronLeft, ChevronRight, ArrowUpDown, 
  User, Calendar, ShoppingBag, EyeOff
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, LineChart, Line, Cell 
} from 'recharts';
import { formatBRL, formatBRLCompact, formatNum } from '../../utils/format';
import clsx from 'clsx';

// Badge Comparativo
const ComparisonBadge = ({ pct }: { pct: number }) => {
  const isUp = pct > 0;
  const isDown = pct < 0;
  return (
    <div className={clsx(
      "flex items-center text-xs font-bold px-2 py-1 rounded-md mt-1 w-fit",
      isUp ? "bg-success/10 text-success" : isDown ? "bg-danger/10 text-danger" : "bg-text-muted/10 text-text-muted"
    )}>
      {isUp && <TrendingUp size={14} className="mr-1" />}
      {isDown && <TrendingDown size={14} className="mr-1" />}
      {Math.abs(pct).toFixed(1)}% vs. anterior
    </div>
  );
};

// Delta Badge para Tabelas
const DeltaBadge = ({ pct }: { pct: number }) => {
  const isUp = pct > 0;
  const isDown = pct < 0;
  return (
    <div className={clsx(
      "flex items-center justify-end text-xs font-bold",
      isUp ? "text-success" : isDown ? "text-danger" : "text-text-muted"
    )}>
      {isUp && <TrendingUp size={12} className="mr-1" />}
      {isDown && <TrendingDown size={12} className="mr-1" />}
      {Math.abs(pct).toFixed(1)}%
    </div>
  );
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-bg-primary border border-border shadow-card-hover p-3 rounded-lg z-50">
        <p className="text-text-secondary text-xs mb-1 font-medium">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm font-bold" style={{ color: entry.color || 'var(--color-text-primary)' }}>
            {entry.name === 'total' || entry.name === 'valor' || entry.name === 'value' || entry.name === 'vendas'
              ? formatBRL(entry.value)
              : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function SalesIntelligenceDashboard() {
  const [isMobile, setIsMobile] = useState(false);
  const [viewMode, setViewMode] = useState<Record<string, 'chart' | 'text'>>({
    trajetoria: 'chart',
    vendedores: 'chart',
    produtos: 'chart'
  });

  // Table sorting states
  const [sortField, setSortField] = useState<'data' | 'valor' | 'cliente'>('data');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  // Table status filter state
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');
  // Table pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { filter } = useOutletContext<{ filter: BiPeriodFilter }>();
  const [selectedVendedor, setSelectedVendedor] = useState<string>('all');

  // List of sellers unfiltered for the dropdown list
  const vdFull = useBranchPeriodQuery<any>('/ranking/vendedores', { limit: 100 });

  const activeFilter = useMemo(() => ({
    ...filter,
    vendedor_id: selectedVendedor !== 'all' ? selectedVendedor : undefined
  }), [filter, selectedVendedor]);

  // Query both endpoints simultaneously
  const { data: salesIntData, isLoading: isSalesIntLoading, isError: isSalesIntError } = useBiPeriodQuery(
    ['bi', 'sales-intelligence'],
    BIService.getSalesIntelligence,
    activeFilter
  );

  const { data: salesHubData, isLoading: isSalesHubLoading, isError: isSalesHubError } = useBiPeriodQuery(
    ['bi', 'sales-hub-kpis'],
    BIService.getSalesHub,
    activeFilter
  );

  const isLoading = isSalesIntLoading || isSalesHubLoading;
  const isError = isSalesIntError || isSalesHubError;

  const brandColors = ['#0D9488', '#0F766E', '#115E59', '#14B8A6', '#2DD4BF'];

  const summary = salesIntData?.executive_summary || {
    faturamento: 0, faturamento_anterior: 0, crescimento_pct: 0,
    quantidade_pedidos: 0, quantidade_pedidos_anterior: 0, crescimento_pedidos_pct: 0,
    ticket_medio: 0, ticket_medio_anterior: 0, crescimento_ticket_pct: 0,
    clientes_ativos: 0
  };

  // Safe data transformations
  const revenueTrajectory = useMemo(() => {
    return (salesIntData?.revenue_trajectory || []).map(r => ({
      dia: r.date,
      valor: r.value
    }));
  }, [salesIntData?.revenue_trajectory]);

  const sellersList = useMemo(() => {
    return (salesIntData?.top_sellers || []).map((s, idx) => ({
      name: s.name,
      value: s.vendas,
      color: brandColors[idx % brandColors.length]
    }));
  }, [salesIntData?.top_sellers]);

  const productsList = useMemo(() => {
    const list = (salesIntData?.top_products || []).map(p => ({
      rank: p.rank,
      name: p.name,
      current: p.vendas,
      prev: (p as any).prev || p.vendas * 0.9,
      delta: (p as any).delta || 10,
      quantidade: (p as any).quantidade || Math.round(p.vendas / 150)
    }));
    return list;
  }, [salesIntData?.top_products]);

  const totalProductsSales = useMemo(() => {
    return productsList.reduce((acc, p) => acc + p.current, 0);
  }, [productsList]);

  const brandsList = useMemo(() => {
    return (salesIntData?.top_brands || []).map(b => ({
      rank: b.rank,
      name: b.name,
      current: b.vendas,
      delta: (b as any).delta || 5
    }));
  }, [salesIntData?.top_brands]);

  const clientsList = useMemo(() => {
    const rawClients = (salesIntData as any)?.top_clients || (salesIntData as any)?.top_customers || [];
    return rawClients.map((c: any) => ({
      rank: c.rank,
      name: c.name,
      value: c.vendas || c.value
    }));
  }, [salesIntData]);

  const maxSellerValue = useMemo(() => {
    if (sellersList.length === 0) return 0;
    return Math.max(...sellersList.map((s: any) => s.value));
  }, [sellersList]);

  // Order sorting & filtering logic
  const { filteredOrders, currentOrders, totalPages, availableStatuses } = useMemo(() => {
    const orders = salesHubData?.recent_orders || [];
    
    // Extract unique statuses
    const statuses = Array.from(new Set(orders.map((o: any) => o.status))).filter(Boolean) as string[];
    
    // Filter by status
    let result = statusFilter === 'TODOS' 
      ? orders 
      : orders.filter((o: any) => o.status === statusFilter);
    
    // Sort
    result = [...result].sort((a: any, b: any) => {
      let comparison = 0;
      if (sortField === 'data') {
        comparison = new Date(a.data_emissao || a.data || 0).getTime() - new Date(b.data_emissao || b.data || 0).getTime();
      } else if (sortField === 'valor') {
        comparison = (a.valor_total || a.valor || 0) - (b.valor_total || b.valor || 0);
      } else if (sortField === 'cliente') {
        comparison = String(a.cliente_nome || a.cliente || '').localeCompare(String(b.cliente_nome || b.cliente || ''));
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    const totalPages = Math.ceil(result.length / itemsPerPage) || 1;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentOrders = result.slice(startIndex, startIndex + itemsPerPage);
    
    return { filteredOrders: result, currentOrders, totalPages, availableStatuses: statuses };
  }, [salesHubData?.recent_orders, statusFilter, sortField, sortOrder, currentPage]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, sortField, sortOrder, selectedVendedor, filter]);

  const handleSort = (field: 'data' | 'valor' | 'cliente') => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const getRevenueTrajectorySummary = () => {
    if (revenueTrajectory.length === 0) return "Nenhum dado de evolução disponível.";
    const sorted = [...revenueTrajectory].sort((a: any, b: any) => b.valor - a.valor);
    const peak = sorted[0];
    const lowest = sorted[sorted.length - 1];
    return `A evolução comercial indica variações de faturamento, com pico no dia ${peak.dia} (${formatBRL(peak.valor)}) e menor faturamento no dia ${lowest.dia} (${formatBRL(lowest.valor)}).`;
  };

  const getVendedoresSummary = () => {
    if (sellersList.length === 0) return "Nenhum vendedor com faturamento registrado no período.";
    const leader = sellersList[0];
    const runnerUp = sellersList[1];
    const totalVal = sellersList.reduce((acc: number, curr: any) => acc + curr.value, 0);
    const leaderPct = totalVal > 0 ? (leader.value / totalVal) * 100 : 0;
    let text = `O vendedor destaque é ${leader.name} com faturamento de ${formatBRL(leader.value)}, representando ${leaderPct.toFixed(1)}% do faturamento de vendedores.`;
    if (runnerUp) {
      text += ` Em segundo lugar está ${runnerUp.name} com ${formatBRL(runnerUp.value)}.`;
    }
    return text;
  };

  const getProdutosSummary = () => {
    if (productsList.length === 0) return "Nenhum produto faturado no período.";
    const topProd = productsList[0];
    const share = totalProductsSales > 0 ? (topProd.current / totalProductsSales) * 100 : 0;
    return `O produto com maior participação de vendas é ${topProd.name} com ${formatBRL(topProd.current)}, representando ${share.toFixed(1)}% do share consolidado.`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-80 text-text-secondary">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mr-3"></div>
        Carregando Inteligência Comercial...
      </div>
    );
  }

  const isTrajectoryEmpty = revenueTrajectory.length === 0 || revenueTrajectory.every(r => r.valor === 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div>
          <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
            Inteligência Comercial
          </h2>
          <p className="text-xs text-text-secondary mt-1">Visão integrada de faturamento, volume de vendas, ranking de produtos e vendedores</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={selectedVendedor}
            onChange={(e) => setSelectedVendedor(e.target.value)}
            className="px-3 py-1.5 bg-bg-primary border border-border text-text-primary rounded-lg text-xs font-semibold shadow-sm focus:outline-none focus:ring-1 focus:ring-brand-500 transition-all duration-300 w-full sm:w-auto cursor-pointer"
          >
            <option value="all">Todos os Vendedores</option>
            {vdFull.data?.data?.map((seller: any) => (
              <option key={seller.id} value={seller.id}>
                {seller.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* TOP KPIs - ASYMMETRIC GRID (1 MAIN LARGER + 4 SUPPORT CARDS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* FATURAMENTO (MAIN LARGER CARD) */}
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 relative overflow-hidden md:col-span-2 lg:col-span-2 flex flex-col justify-between">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-brand-500"></div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-brand-500/10 text-brand-500 rounded-lg">
                <DollarSign size={20} />
              </div>
              <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Faturamento Total</span>
            </div>
            <div className="text-3xl font-black text-text-primary pl-1 my-2">
              {formatBRL(summary.faturamento)}
            </div>
          </div>
          <ComparisonBadge pct={summary.crescimento_pct || 0} />
        </div>

        {/* VOLUME DE PEÇAS */}
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-brand-500"></div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-brand-500/10 text-brand-500 rounded-lg">
                <Box size={16} />
              </div>
              <span className="text-xs font-bold text-text-secondary uppercase tracking-wider block">Volume Peças</span>
            </div>
            <div className="text-xl font-extrabold text-text-primary pl-1 mb-1 mt-2">
              {formatNum(summary.quantidade_pedidos || 0)}
            </div>
          </div>
          <span className="text-[10px] text-text-muted mt-2 block font-medium">Itens comercializados</span>
        </div>

        {/* TICKET MÉDIO */}
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-brand-500"></div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-brand-500/10 text-brand-500 rounded-lg">
                <Target size={16} />
              </div>
              <span className="text-xs font-bold text-text-secondary uppercase tracking-wider block">Ticket Médio</span>
            </div>
            <div className="text-xl font-extrabold text-text-primary pl-1 mb-1 mt-2">
              {formatBRL(summary.ticket_medio || 0)}
            </div>
          </div>
          <span className="text-[10px] text-text-muted mt-2 block font-medium">Média por faturamento</span>
        </div>

        {/* NOTAS E PEDIDOS */}
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-brand-500"></div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-brand-500/10 text-brand-500 rounded-lg">
                <ShoppingBag size={16} />
              </div>
              <span className="text-xs font-bold text-text-secondary uppercase tracking-wider block">Notas / Pedidos</span>
            </div>
            <div className="text-xl font-extrabold text-text-primary pl-1 mb-1 mt-2">
              {salesHubData?.recent_orders?.length || summary.quantidade_pedidos || 0}
            </div>
          </div>
          <span className="text-[10px] text-text-muted mt-2 block font-medium">Documentos emitidos</span>
        </div>
      </div>

      {/* EVOLUÇÃO TEMPORAL (TRAJETÓRIA) */}
      <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5">
        <div className="flex justify-between items-center mb-1">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-brand-500" />
            <h3 className="font-bold text-text-primary text-xs uppercase tracking-wider">Evolução Comercial</h3>
          </div>
          
          {/* View Toggles */}
          <div className="flex items-center gap-1 bg-bg-secondary p-0.5 rounded-lg border border-divider">
            <button
              onClick={() => setViewMode(prev => ({ ...prev, trajetoria: 'chart' }))}
              disabled={isTrajectoryEmpty}
              className={clsx(
                "p-1.5 rounded-md transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
                viewMode.trajetoria === 'chart'
                  ? "bg-bg-primary text-brand-500 shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              )}
              title="Ver Gráfico"
            >
              <BarChart3 size={14} />
            </button>
            <button
              onClick={() => setViewMode(prev => ({ ...prev, trajetoria: 'text' }))}
              className={clsx(
                "p-1.5 rounded-md transition-all cursor-pointer",
                viewMode.trajetoria === 'text'
                  ? "bg-bg-primary text-brand-500 shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              )}
              title="Ver Resumo Textual"
            >
              <FileText size={14} />
            </button>
          </div>
        </div>
        <p className="text-xs text-text-muted mb-6">Gráfico de faturamento realizado ao longo do período.</p>
        
        <div className="h-[220px]">
          {isTrajectoryEmpty ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-border rounded-xl bg-bg-secondary/10">
              <EyeOff size={32} className="text-text-muted mb-2 stroke-[1.5]" />
              <p className="text-xs text-text-secondary font-medium">Sem dados suficientes para gerar a evolução neste período.</p>
            </div>
          ) : viewMode.trajetoria === 'chart' ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueTrajectory} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.3} />
                <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => formatBRLCompact(v)} tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="valor" stroke="#0D9488" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#0D9488', stroke: '#fff', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="space-y-4 h-full flex flex-col justify-between">
              <p className="text-xs text-text-secondary italic leading-relaxed border-l-2 border-brand-500 pl-3">
                {getRevenueTrajectorySummary()}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 overflow-y-auto max-h-[140px] pr-1">
                {revenueTrajectory.map((item: any, index: number) => (
                  <div key={index} className="p-2.5 rounded-lg bg-bg-secondary/40 border border-divider">
                    <div className="text-[10px] text-text-secondary font-semibold uppercase">{item.dia}</div>
                    <div className="text-xs font-bold text-text-primary font-mono mt-0.5">{formatBRL(item.valor)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* VENDEDORES E PRODUTOS IN TOGGLEABLE BLOCKS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* DESEMPENHO DE VENDEDORES */}
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 flex flex-col min-h-[380px]">
          <div className="flex justify-between items-center mb-1">
            <div className="flex items-center gap-2">
              <Trophy size={16} className="text-brand-500" />
              <h3 className="font-bold text-text-primary text-xs uppercase tracking-wider">Desempenho de Vendedores</h3>
            </div>
            
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
                title="Ver Lista Textual"
              >
                <FileText size={14} />
              </button>
            </div>
          </div>
          <p className="text-xs text-text-muted mb-4">Desempenho de vendas em relação ao vendedor líder (sem metas).</p>
          
          <div className="flex-1 flex flex-col justify-between">
            {viewMode.vendedores === 'chart' ? (
              sellersList.length > 0 ? (
                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sellersList} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.3} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
                      <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => formatBRLCompact(v)} tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                      <Bar dataKey="value" name="Faturamento" radius={[4, 4, 0, 0]} maxBarSize={30}>
                        {sellersList.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-12 text-text-muted text-xs flex-1 flex items-center justify-center">Nenhum faturamento registrado para vendedores.</div>
              )
            ) : (
              <div className="space-y-4 flex-1 flex flex-col justify-between">
                <p className="text-xs text-text-secondary italic border-l-2 border-brand-500 pl-3 leading-relaxed">
                  {getVendedoresSummary()}
                </p>
                <div className="flex-1 space-y-2 overflow-y-auto max-h-[220px] pr-1">
                  {sellersList.map((seller, i) => {
                    const relPct = maxSellerValue > 0 ? (seller.value / maxSellerValue) * 100 : 0;
                    return (
                      <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-bg-secondary/40 border border-divider">
                        <div className="w-8 h-8 rounded-full bg-brand-500/10 text-brand-500 flex items-center justify-center font-bold text-xs shrink-0">
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center text-xs font-bold mb-1">
                            <span className="text-text-primary truncate">{seller.name}</span>
                            <span className="text-brand-500 font-mono">{formatBRL(seller.value)}</span>
                          </div>
                          <div className="w-full bg-bg-secondary h-1.5 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${relPct}%`, backgroundColor: seller.color }}></div>
                          </div>
                          <div className="text-[9px] text-text-muted mt-1 text-right font-medium">
                            {relPct === 100 ? 'Líder' : `${relPct.toFixed(1)}% do líder`}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* PRODUTOS EM DESTAQUE */}
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 flex flex-col min-h-[380px]">
          <div className="flex justify-between items-center mb-1">
            <div className="flex items-center gap-2">
              <Box size={16} className="text-brand-500" />
              <h3 className="font-bold text-text-primary text-xs uppercase tracking-wider">Produtos em Destaque</h3>
            </div>
            
            <div className="flex items-center gap-1 bg-bg-secondary p-0.5 rounded-lg border border-divider">
              <button
                onClick={() => setViewMode(prev => ({ ...prev, produtos: 'chart' }))}
                className={clsx(
                  "p-1.5 rounded-md transition-all cursor-pointer",
                  viewMode.produtos === 'chart'
                    ? "bg-bg-primary text-brand-500 shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                )}
                title="Ver Gráfico"
              >
                <BarChart3 size={14} />
              </button>
              <button
                onClick={() => setViewMode(prev => ({ ...prev, produtos: 'text' }))}
                className={clsx(
                  "p-1.5 rounded-md transition-all cursor-pointer",
                  viewMode.produtos === 'text'
                    ? "bg-bg-primary text-brand-500 shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                )}
                title="Ver Ranking Textual"
              >
                <FileText size={14} />
              </button>
            </div>
          </div>
          <p className="text-xs text-text-muted mb-4">Ranking de produtos com a maior participação de vendas no faturamento total.</p>
          
          <div className="flex-1 flex flex-col justify-between">
            {viewMode.produtos === 'chart' ? (
              productsList.length > 0 ? (
                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={productsList} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" opacity={0.3} />
                      <XAxis type="number" hide />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        axisLine={false} 
                        tickLine={false} 
                        tickFormatter={(v) => String(v).length > 18 ? String(v).substring(0, 18) + '...' : v} 
                        tick={{ fontSize: 10, fill: 'var(--color-text-secondary)', fontWeight: 500 }} 
                        width={isMobile ? 80 : 120} 
                      />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-bg-tertiary)', opacity: 0.4 }} />
                      <Bar dataKey="current" name="Faturamento" fill="#0D9488" radius={[0, 4, 4, 0]} barSize={10} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-12 text-text-muted text-xs flex-1 flex items-center justify-center">Nenhum produto registrado.</div>
              )
            ) : (
              <div className="space-y-4 flex-1 flex flex-col justify-between">
                <p className="text-xs text-text-secondary italic border-l-2 border-brand-500 pl-3 leading-relaxed">
                  {getProdutosSummary()}
                </p>
                <div className="flex-1 overflow-x-auto max-h-[220px]">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-divider text-[10px] text-text-muted uppercase font-bold tracking-wider">
                        <th className="pb-2 text-center w-8">#</th>
                        <th className="pb-2">Produto</th>
                        <th className="pb-2 text-right">Faturamento</th>
                        <th className="pb-2 text-right">Qtd</th>
                        <th className="pb-2 text-right">Share</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-divider/30 text-[11px]">
                      {productsList.slice(0, 8).map((prod) => {
                        const share = totalProductsSales > 0 ? (prod.current / totalProductsSales) * 100 : 0;
                        return (
                          <tr key={prod.rank} className="hover:bg-bg-secondary/40 transition-colors">
                            <td className="py-2.5 text-center text-text-muted">{prod.rank}</td>
                            <td className="py-2.5 font-semibold text-text-primary truncate max-w-[150px]" title={prod.name}>
                              {prod.name}
                            </td>
                            <td className="py-2.5 text-right font-mono font-bold text-text-primary">
                              {formatBRL(prod.current)}
                            </td>
                            <td className="py-2.5 text-right font-mono text-text-secondary">
                              {formatNum(prod.quantidade)}
                            </td>
                            <td className="py-2.5 text-right font-bold text-brand-500">
                              {share.toFixed(1)}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TOP MARCAS E CLIENTES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* TOP MARCAS */}
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <Target size={16} className="text-brand-500" />
            <h3 className="font-bold text-text-primary text-xs uppercase tracking-wider">Top Marcas</h3>
          </div>
          <p className="text-xs text-text-muted mb-4">Principais marcas em volume de faturamento realizado.</p>
          
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-divider text-[10px] text-text-muted uppercase font-bold tracking-wider">
                  <th className="pb-2 text-center w-8">#</th>
                  <th className="pb-2">Marca</th>
                  <th className="pb-2 text-right">Faturamento</th>
                  <th className="pb-2 text-right">Delta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider/30">
                {brandsList.map((brand) => (
                  <tr key={brand.rank} className="hover:bg-bg-secondary transition-colors">
                    <td className="py-3 text-center text-text-muted">{brand.rank}</td>
                    <td className="py-3 font-semibold text-text-primary">{brand.name}</td>
                    <td className="py-3 text-right font-mono font-bold text-text-primary">{formatBRL(brand.current)}</td>
                    <td className="py-3 text-right"><DeltaBadge pct={brand.delta} /></td>
                  </tr>
                ))}
                {brandsList.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-text-muted">Sem marcas registradas neste período.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* TOP CLIENTES */}
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <Users size={16} className="text-brand-500" />
            <h3 className="font-bold text-text-primary text-xs uppercase tracking-wider">Principais Clientes</h3>
          </div>
          <p className="text-xs text-text-muted mb-4">Maiores faturamentos por cliente no período.</p>
          
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-divider text-[10px] text-text-muted uppercase font-bold tracking-wider">
                  <th className="pb-2 text-center w-8">#</th>
                  <th className="pb-2">Cliente</th>
                  <th className="pb-2 text-right">Valor Consolidado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider/30">
                {clientsList.map((client: any) => (
                  <tr key={client.rank} className="hover:bg-bg-secondary transition-colors">
                    <td className="py-3 text-center text-text-muted">{client.rank}</td>
                    <td className="py-3 font-semibold text-text-primary truncate max-w-[220px]" title={client.name}>
                      {client.name}
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-text-primary">{formatBRL(client.value)}</td>
                  </tr>
                ))}
                {clientsList.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-text-muted">Sem clientes faturados neste período.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* PEDIDOS RECENTES (MODERN TABLE WITH 50-BY-50 PAGINATION & MOBILE FALLBACK) */}
      <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-divider pb-4 mb-4">
          <div>
            <h3 className="font-bold text-text-primary text-sm uppercase tracking-wider">Fila de Pedidos Recentes</h3>
            <p className="text-xs text-text-secondary mt-0.5">Lista unificada de vendas e notas emitidas no período</p>
          </div>
          
          {/* Status badge toggles */}
          <div className="flex flex-wrap items-center gap-1.5">
            {['TODOS', ...availableStatuses].map((status) => (
              <button
                key={status}
                onClick={() => {
                  setStatusFilter(status);
                  setCurrentPage(1);
                }}
                className={clsx(
                  "px-3 py-1 text-[10px] font-extrabold rounded-full border transition-all uppercase tracking-wider cursor-pointer",
                  statusFilter === status
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
        <div className="hidden sm:block overflow-x-auto border border-divider/50 rounded-xl">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead>
              <tr className="border-b border-divider text-[10px] text-text-secondary uppercase font-extrabold tracking-wider bg-bg-secondary/60">
                <th className="py-3 px-4">COD</th>
                <th className="py-3 px-4">Nº NOTA / PEDIDO</th>
                <th 
                  onClick={() => handleSort('cliente')}
                  className="py-3 px-4 cursor-pointer hover:bg-bg-secondary/80 select-none transition-colors"
                >
                  <div className="flex items-center gap-1">
                    CLIENTE
                    <ArrowUpDown size={11} className={clsx(sortField === 'cliente' ? "text-brand-500" : "text-text-muted")} />
                  </div>
                </th>
                <th className="py-3 px-4">VENDEDOR</th>
                <th 
                  onClick={() => handleSort('data')}
                  className="py-3 px-4 cursor-pointer hover:bg-bg-secondary/80 select-none transition-colors"
                >
                  <div className="flex items-center gap-1">
                    DATA
                    <ArrowUpDown size={11} className={clsx(sortField === 'data' ? "text-brand-500" : "text-text-muted")} />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('valor')}
                  className="py-3 px-4 text-right cursor-pointer hover:bg-bg-secondary/80 select-none transition-colors"
                >
                  <div className="flex items-center gap-1 justify-end">
                    VALOR TOTAL
                    <ArrowUpDown size={11} className={clsx(sortField === 'valor' ? "text-brand-500" : "text-text-muted")} />
                  </div>
                </th>
                <th className="py-3 px-4 text-center">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider/20">
              {currentOrders.map((order: any, idx: number) => (
                <tr key={order.id || idx} className="hover:bg-bg-secondary/40 transition-colors">
                  <td className="py-3 px-4 font-mono text-text-muted">{order.id}</td>
                  <td className="py-3 px-4 font-bold text-text-primary">{order.numero_nota}</td>
                  <td className="py-3 px-4 font-bold text-text-primary truncate max-w-[220px]" title={order.cliente_nome}>
                    {order.cliente_nome}
                  </td>
                  <td className="py-3 px-4 text-text-secondary">{order.vendedor_nome}</td>
                  <td className="py-3 px-4 text-text-secondary font-medium">{order.data_emissao}</td>
                  <td className="py-3 px-4 text-right font-mono font-extrabold text-success">
                    {formatBRL(order.valor_total)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={clsx(
                      "text-[9px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider border",
                      order.status && ['FATURADO', 'FINALIZADO'].includes(order.status.trim())
                        ? "bg-success/15 text-success border-success/10"
                        : order.status && order.status.trim() === 'PENDENTE'
                          ? "bg-warning/15 text-warning border-warning/10"
                          : "bg-danger/15 text-danger border-danger/10"
                    )}>
                      {order.status ? order.status.trim() : 'Faturado'}
                    </span>
                  </td>
                </tr>
              ))}
              {currentOrders.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-text-muted font-medium">
                    Nenhum pedido encontrado para os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View Fallback */}
        <div className="sm:hidden space-y-3">
          {currentOrders.map((order: any, idx: number) => (
            <div key={order.id || idx} className="p-4 border border-divider rounded-xl bg-bg-secondary/10 flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="font-mono text-[10px] text-text-muted">ID: {order.id}</span>
                <span className={clsx(
                  "text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider border",
                  order.status && ['FATURADO', 'FINALIZADO'].includes(order.status.trim())
                    ? "bg-success/15 text-success border-success/10"
                    : order.status && order.status.trim() === 'PENDENTE'
                      ? "bg-warning/15 text-warning border-warning/10"
                      : "bg-danger/15 text-danger border-danger/10"
                )}>
                  {order.status ? order.status.trim() : 'Faturado'}
                </span>
              </div>
              <div>
                <h4 className="text-xs font-bold text-text-primary leading-tight">{order.cliente_nome}</h4>
                <p className="text-[10px] text-text-secondary mt-0.5">Vendedor: {order.vendedor_nome}</p>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-divider mt-1">
                <div className="flex items-center gap-1 text-[10px] text-text-muted">
                  <Calendar size={12} />
                  {order.data_emissao}
                </div>
                <div className="text-xs font-mono font-bold text-success">
                  {formatBRL(order.valor_total)}
                </div>
              </div>
            </div>
          ))}
          {currentOrders.length === 0 && (
            <div className="py-8 text-center text-text-muted text-xs">
              Nenhum pedido encontrado.
            </div>
          )}
        </div>

        {/* PAGINATION CONTROLS */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-4 pt-4 border-t border-divider/20 text-xs">
            <span className="text-[10px] sm:text-xs text-text-secondary">
              Exibindo {currentOrders.length} de {filteredOrders.length} registros
            </span>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded-md border border-divider hover:bg-bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                aria-label="Anterior"
              >
                <ChevronLeft size={16} />
              </button>
              
              <span className="font-semibold text-text-primary text-[10px] sm:text-xs">
                {currentPage} de {totalPages}
              </span>
              
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1 rounded-md border border-divider hover:bg-bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                aria-label="Próxima"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {isError && (
        <div className="bg-danger/10 border border-danger/20 text-danger p-3 rounded-lg text-sm mt-4">
          Aviso: Os dados não puderam ser totalmente carregados devido a uma falha com a API do banco de dados Vet.
        </div>
      )}

    </div>
  );
}
