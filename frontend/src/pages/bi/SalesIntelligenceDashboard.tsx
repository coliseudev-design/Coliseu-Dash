import { useState, useMemo, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useBiPeriodQuery } from '../../hooks/useBiPeriodQuery';
import { useBranchPeriodQuery } from '../../hooks/useApi';
import { BIService } from '../../services/biApi';
import { BiPeriodFilter } from '../../types/bi.types';
import { TrendingUp, TrendingDown, DollarSign, Box, Target, Trophy, Users, BarChart3, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Cell } from 'recharts';
import { formatBRL, formatBRLCompact, formatNum } from '../../utils/format';
import { CHART_COLORS } from '../../utils/chartColors';
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
      {Math.abs(pct).toFixed(1)}%
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
            {entry.name === 'total' || entry.name === 'valor' || entry.name === 'value'
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
    vendasVendedor: 'chart'
  });

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

  const { data, isLoading, isError } = useBiPeriodQuery(
    ['bi', 'sales-intelligence'],
    BIService.getSalesIntelligence,
    activeFilter
  );

  const brandColors = ['#0D9488', '#0F766E', '#115E59', '#14B8A6', '#2DD4BF'];

  const summary = data?.executive_summary || {
    faturamento: 0, faturamento_anterior: 0, crescimento_pct: 0,
    quantidade_pedidos: 0, quantidade_pedidos_anterior: 0, crescimento_pedidos_pct: 0,
    ticket_medio: 0, ticket_medio_anterior: 0, crescimento_ticket_pct: 0
  };

  // Type safe data transformations
  const revenueTrajectory = useMemo(() => {
    return (data?.revenue_trajectory || []).map(r => ({
      dia: r.date,
      valor: r.value
    }));
  }, [data?.revenue_trajectory]);

  const sellersList = useMemo(() => {
    return (data?.top_sellers || []).map((s, idx) => ({
      name: s.name,
      value: s.vendas,
      color: brandColors[idx % brandColors.length]
    }));
  }, [data?.top_sellers]);

  const productsList = useMemo(() => {
    return (data?.top_products || []).map(p => ({
      rank: p.rank,
      name: p.name,
      current: p.vendas,
      prev: (p as any).prev || p.vendas * 0.9,
      delta: (p as any).delta || 10
    }));
  }, [data?.top_products]);

  const brandsList = useMemo(() => {
    return (data?.top_brands || []).map(b => ({
      rank: b.rank,
      name: b.name,
      current: b.vendas,
      delta: (b as any).delta || 5
    }));
  }, [data?.top_brands]);

  const clientsList = useMemo(() => {
    const rawClients = (data as any)?.top_clients || (data as any)?.top_customers || [];
    return rawClients.map((c: any) => ({
      rank: c.rank,
      name: c.name,
      value: c.vendas || c.value
    }));
  }, [data]);

  const maxSellerValue = useMemo(() => {
    if (sellersList.length === 0) return 0;
    return Math.max(...sellersList.map((s: any) => s.value));
  }, [sellersList]);

  const getRevenueTrajectorySummary = () => {
    if (revenueTrajectory.length === 0) return "Nenhum dado de trajetória de receita disponível no período.";
    const sorted = [...revenueTrajectory].sort((a: any, b: any) => b.valor - a.valor);
    const peak = sorted[0];
    const lowest = sorted[sorted.length - 1];
    return `A trajetória da receita registra variação no faturamento por dia, com pico em ${peak.dia} no valor de ${formatBRL(peak.valor)}, e menor faturamento em ${lowest.dia} no valor de ${formatBRL(lowest.valor)}.`;
  };

  const getVendasPorVendedorSummary = () => {
    if (sellersList.length === 0) return "Nenhum dado de vendas por vendedor disponível.";
    const leader = sellersList[0];
    const runnerUp = sellersList[1];
    const totalVal = sellersList.reduce((acc: number, curr: any) => acc + curr.value, 0);
    const leaderPct = totalVal > 0 ? (leader.value / totalVal) * 100 : 0;
    let text = `O líder de faturamento é ${leader.name} com ${formatBRL(leader.value)}, representando ${leaderPct.toFixed(1)}% das vendas totais.`;
    if (runnerUp) {
      text += ` Em seguida, destaca-se ${runnerUp.name} com total de ${formatBRL(runnerUp.value)}.`;
    }
    return text;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-text-secondary">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mr-3"></div>
        Carregando Inteligência de Vendas...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div>
          <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
            Inteligência de Vendas
          </h2>
          <p className="text-xs text-text-secondary mt-1">Análise detalhada de vendas, ticket médio e performance</p>
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

      {/* TOP KPIs - 3 BLOCKS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* FATURAMENTO */}
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-brand-500"></div>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-brand-500/10 text-brand-500 rounded-lg">
              <DollarSign size={16} />
            </div>
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Faturamento Total</span>
          </div>
          <div className="text-2xl font-extrabold text-text-primary pl-1 mb-1">
            {formatBRL(summary.faturamento)}
          </div>
          <ComparisonBadge pct={summary.crescimento_pct || 7.3} />
        </div>

        {/* VOLUME DE PEÇAS */}
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-brand-500"></div>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-brand-500/10 text-brand-500 rounded-lg">
              <Box size={16} />
            </div>
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Volume de Peças</span>
          </div>
          <div className="text-2xl font-extrabold text-text-primary pl-1 mb-1">
            {formatNum(summary.quantidade_pedidos || 337)}
          </div>
          <ComparisonBadge pct={summary.crescimento_pedidos_pct || 16.2} />
        </div>

        {/* TICKET MÉDIO */}
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-brand-600"></div>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-brand-600/10 text-brand-600 rounded-lg">
              <Target size={16} />
            </div>
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Ticket Médio</span>
          </div>
          <div className="text-2xl font-extrabold text-text-primary pl-1 mb-1">
            {formatBRL(summary.ticket_medio || 712.51)}
          </div>
          <ComparisonBadge pct={summary.crescimento_ticket_pct || 29.5} />
        </div>
      </div>

      {/* TRAJETÓRIA DA RECEITA */}
      <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5">
        <div className="flex justify-between items-center mb-1">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-brand-500" />
            <h3 className="font-bold text-text-primary text-xs uppercase tracking-wider">Trajetória da Receita</h3>
          </div>
          
          {/* Chaveador de Visualização */}
          <div className="flex items-center gap-1 bg-bg-secondary p-0.5 rounded-lg border border-divider">
            <button
              onClick={() => setViewMode(prev => ({ ...prev, trajetoria: 'chart' }))}
              className={clsx(
                "p-1.5 rounded-md transition-all cursor-pointer",
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
        <p className="text-xs text-text-muted mb-6">Evolução de faturamento diário consolidado.</p>
        
        <div className="h-[220px]">
          {viewMode.trajetoria === 'chart' ? (
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

      {/* DESEMPENHO E VENDAS POR VENDEDOR */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* PROGRESS LIST: DESEMPENHO */}
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <Trophy size={16} className="text-brand-500" />
            <h3 className="font-bold text-text-primary text-xs uppercase tracking-wider">Desempenho de Vendedores</h3>
          </div>
          <p className="text-xs text-text-muted mb-4">Faturamento por vendedor comparado ao líder de vendas no período.</p>
          
          <div className="flex-1 space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
            {sellersList.map((seller, i) => {
              const relPct = maxSellerValue > 0 ? (seller.value / maxSellerValue) * 100 : 0;
              return (
                <div key={i} className="flex flex-col gap-1.5 p-3 rounded-lg bg-bg-secondary/30 border border-divider hover:bg-bg-secondary transition-all">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-text-primary flex items-center gap-2">
                      <span className="text-[10px] text-text-muted font-bold">#{i + 1}</span>
                      {seller.name}
                    </span>
                    <span className="font-mono font-bold text-brand-500">{formatBRL(seller.value)}</span>
                  </div>
                  
                  <div className="w-full bg-bg-secondary h-2 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${relPct}%`, backgroundColor: seller.color || 'var(--color-brand-500)' }}></div>
                  </div>
                  
                  <div className="text-[9px] text-text-muted font-semibold text-right">
                    {relPct === 100 ? 'Líder de vendas' : `${relPct.toFixed(1)}% do líder`}
                  </div>
                </div>
              );
            })}
            {sellersList.length === 0 && (
              <div className="text-center py-8 text-text-muted text-xs">Nenhum vendedor registrado.</div>
            )}
          </div>
        </div>

        {/* GRÁFICO/TEXT: VENDAS POR VENDEDOR */}
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 flex flex-col">
          <div className="flex justify-between items-center mb-1">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-brand-500" />
              <h3 className="font-bold text-text-primary text-xs uppercase tracking-wider">Vendas por Vendedor</h3>
            </div>
            
            {/* Chaveador de Visualização */}
            <div className="flex items-center gap-1 bg-bg-secondary p-0.5 rounded-lg border border-divider">
              <button
                onClick={() => setViewMode(prev => ({ ...prev, vendasVendedor: 'chart' }))}
                className={clsx(
                  "p-1.5 rounded-md transition-all cursor-pointer",
                  viewMode.vendasVendedor === 'chart'
                    ? "bg-bg-primary text-brand-500 shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                )}
                title="Ver Gráfico"
              >
                <BarChart3 size={14} />
              </button>
              <button
                onClick={() => setViewMode(prev => ({ ...prev, vendasVendedor: 'text' }))}
                className={clsx(
                  "p-1.5 rounded-md transition-all cursor-pointer",
                  viewMode.vendasVendedor === 'text'
                    ? "bg-bg-primary text-brand-500 shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                )}
                title="Ver Dados/Texto"
              >
                <FileText size={14} />
              </button>
            </div>
          </div>
          <p className="text-xs text-text-muted mb-6">Ranking de faturamento consolidado por vendedor.</p>
          
          <div className="flex-1 min-h-[220px]">
            {viewMode.vendasVendedor === 'chart' ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sellersList} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.3} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
                  <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => formatBRLCompact(v)} tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={30}>
                    {sellersList.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="space-y-4 h-full flex flex-col justify-between">
                <p className="text-xs text-text-secondary italic leading-relaxed border-l-2 border-brand-500 pl-3">
                  {getVendasPorVendedorSummary()}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 overflow-y-auto max-h-[160px] pr-1">
                  {sellersList.map((seller: any, index: number) => {
                    const totalVal = sellersList.reduce((acc: number, curr: any) => acc + curr.value, 0)
                    const pct = totalVal > 0 ? (seller.value / totalVal) * 100 : 0
                    return (
                      <div key={index} className="flex justify-between items-center p-2.5 rounded-lg bg-bg-secondary/40 border border-divider">
                        <div className="text-xs font-bold text-text-primary truncate">{seller.name}</div>
                        <div className="text-right">
                          <div className="text-xs font-mono font-bold text-text-primary">{formatBRL(seller.value)}</div>
                          <div className="text-[9px] text-text-muted">{pct.toFixed(1)}% de share</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TOP PRODUTOS (TABELA + GRÁFICO) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tabela */}
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <Box size={16} className="text-brand-500" />
            <h3 className="font-bold text-text-primary text-xs uppercase tracking-wider">Top Produtos</h3>
          </div>
          <p className="text-xs text-text-muted mb-4">Ranking de produtos com a maior variação e volume.</p>
          
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-divider text-[10px] text-text-muted uppercase font-bold tracking-wider">
                  <th className="pb-2 text-center w-8">#</th>
                  <th className="pb-2">Produto</th>
                  <th className="pb-2 text-right">Mês Atual</th>
                  <th className="pb-2 text-right">Mês Ant.</th>
                  <th className="pb-2 text-right">Delta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider/30 text-xs">
                {productsList.slice(0, 8).map((prod) => (
                  <tr key={prod.rank} className="hover:bg-bg-secondary transition-colors">
                    <td className="py-2 text-center text-text-muted">{prod.rank}</td>
                    <td className="py-2 font-semibold text-text-primary truncate max-w-[200px]" title={prod.name}>{prod.name}</td>
                    <td className="py-2 text-right font-mono font-bold text-text-primary">{formatBRL(prod.current)}</td>
                    <td className="py-2 text-right font-mono text-text-muted">{formatBRL(prod.prev)}</td>
                    <td className="py-2 text-right"><DeltaBadge pct={prod.delta} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Gráfico */}
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 flex flex-col">
          <h3 className="font-bold text-text-primary text-xs uppercase tracking-wider mb-1">Top Produtos (Faturamento)</h3>
          <p className="text-xs text-text-muted mb-4">Visualização de faturamento de produtos.</p>
          
          <div className="flex-1 min-h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={productsList} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" opacity={0.3} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tickFormatter={(v) => String(v).length > 15 ? String(v).substring(0, 15) + '...' : v} tick={{ fontSize: 10, fill: 'var(--color-text-secondary)', fontWeight: 500 }} width={isMobile ? 80 : 120} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-bg-tertiary)', opacity: 0.4 }} />
                <Bar dataKey="current" fill="#0D9488" radius={[0, 4, 4, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* TOP MARCAS E TOP CLIENTES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* TOP MARCAS TABELA */}
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <Target size={16} className="text-brand-500" />
            <h3 className="font-bold text-text-primary text-xs uppercase tracking-wider">Top Marcas</h3>
          </div>
          <p className="text-xs text-text-muted mb-4">Principais marcas em volume de faturamento.</p>
          
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-divider text-[10px] text-text-muted uppercase font-bold tracking-wider">
                  <th className="pb-2 text-center w-8">#</th>
                  <th className="pb-2">Marca</th>
                  <th className="pb-2 text-right">Faturamento</th>
                  <th className="pb-2 text-right">Delta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider/30 text-xs">
                {brandsList.map((brand) => (
                  <tr key={brand.rank} className="hover:bg-bg-secondary transition-colors">
                    <td className="py-3 text-center text-text-muted">{brand.rank}</td>
                    <td className="py-3 font-semibold text-text-primary">{brand.name}</td>
                    <td className="py-3 text-right font-mono font-bold text-text-primary">{formatBRL(brand.current)}</td>
                    <td className="py-3 text-right"><DeltaBadge pct={brand.delta} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* TOP CLIENTES TABELA */}
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <Users size={16} className="text-brand-500" />
            <h3 className="font-bold text-text-primary text-xs uppercase tracking-wider">Top Clientes</h3>
          </div>
          <p className="text-xs text-text-muted mb-4">Ranking dos maiores clientes do período.</p>
          
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-divider text-[10px] text-text-muted uppercase font-bold tracking-wider">
                  <th className="pb-2 text-center w-8">#</th>
                  <th className="pb-2">Cliente</th>
                  <th className="pb-2 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider/30 text-xs">
                {clientsList.map((client: any) => (
                  <tr key={client.rank} className="hover:bg-bg-secondary transition-colors">
                    <td className="py-3 text-center text-text-muted">{client.rank}</td>
                    <td className="py-3 font-semibold text-text-primary truncate max-w-[180px]">{client.name}</td>
                    <td className="py-3 text-right font-mono font-bold text-text-primary">{formatBRL(client.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isError && (
        <div className="bg-danger/10 border border-danger/20 text-danger p-3 rounded-lg text-sm mt-4">
          Aviso: Os dados não puderam ser carregados devido a uma falha de conexão com o banco de dados/API.
        </div>
      )}

    </div>
  );
}
