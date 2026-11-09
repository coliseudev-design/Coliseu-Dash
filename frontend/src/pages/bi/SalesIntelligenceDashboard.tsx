import { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell
} from 'recharts';
import {
  TrendingUp, TrendingDown, DollarSign,
  Users, Award, MapPin, Trophy, ChevronDown,
  Calendar, RotateCcw, Target, BarChart3,
  ShoppingBag, Tag
} from 'lucide-react';
import { useBranchPeriodQuery } from '../../hooks/useApi';
import PeriodFilter from '../../components/PeriodFilter';
import { formatBRL, formatNum, formatGrowthPct } from '../../utils/format';
import FaturamentoPeriodoCard from '../../components/bi/FaturamentoPeriodoCard';
import clsx from 'clsx';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-bg-primary border border-border shadow-card-hover p-3 rounded-xl z-50 min-w-[160px]">
        <p className="text-text-secondary text-xs mb-1.5 font-bold uppercase tracking-wider">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-3 text-xs font-bold text-text-primary">
            <span style={{ color: entry.color || entry.fill }}>{entry.name || 'Valor'}:</span>
            <span className="font-mono">
              {typeof entry.value === 'number' && entry.value > 100
                ? formatBRL(entry.value)
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

interface RankingCardProps {
  title: string;
  data: { name: string; value: number }[];
  isLoading: boolean;
  total: number;
  icon: React.ElementType;
  colorClass: string;
  badgeBg: string;
}

function RankingCardWithToggle({
  title,
  data,
  isLoading,
  total,
  icon: Icon,
  colorClass,
  badgeBg
}: RankingCardProps) {
  const [viewType, setViewType] = useState<'list' | 'chart'>('list');

  return (
    <div className="bg-bg-primary border border-border shadow-card rounded-2xl p-5 flex flex-col h-full animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-4 border-b border-divider/40 pb-3">
        <h3 className="font-black text-text-primary text-xs uppercase tracking-wider flex items-center gap-2">
          <div className={clsx("p-1.5 rounded-lg", badgeBg, colorClass)}>
            <Icon size={14} />
          </div>
          {title}
        </h3>
        
        {/* Toggle Gráfico / Lista */}
        <button
          type="button"
          onClick={() => setViewType(v => v === 'list' ? 'chart' : 'list')}
          className="text-[11px] font-bold text-text-secondary hover:text-text-primary px-2.5 py-1 bg-bg-secondary hover:bg-bg-tertiary border border-border rounded-lg transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
        >
          {viewType === 'list' ? (
            <>
              <BarChart3 size={13} className="text-brand-500" /> Gráfico
            </>
          ) : (
            <>
              <SlidersHorizontal size={13} className="text-brand-500" /> Lista
            </>
          )}
        </button>
      </div>

      <div className="flex-1 min-h-[260px] flex flex-col justify-center">
        {isLoading ? (
          <div className="h-48 flex items-center justify-center text-xs text-text-secondary">Carregando dados...</div>
        ) : data.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-xs text-text-secondary">Sem dados registrados</div>
        ) : viewType === 'list' ? (
          <div className="space-y-1.5 overflow-y-auto max-h-[280px] pr-1">
            {data.slice(0, 10).map((item, i) => {
              const pct = total > 0 ? (item.value / total) * 100 : 0;
              return (
                <div key={i} className="flex items-center justify-between p-2 hover:bg-bg-secondary/60 rounded-xl transition-all duration-200 border border-transparent hover:border-divider/30">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-6 shrink-0 flex items-center justify-center">
                      <span className={clsx(
                        "text-xs font-black font-mono",
                        i === 0 ? "text-amber-500" : i === 1 ? "text-slate-400" : i === 2 ? "text-amber-700" : "text-text-muted"
                      )}>
                        #{i + 1}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-text-primary uppercase truncate max-w-[160px] sm:max-w-[200px]" title={item.name}>
                      {item.name}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-black text-text-primary font-mono">{formatBRL(item.value)}</div>
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">{pct.toFixed(1)}% share</div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-[260px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.slice(0, 8)} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" opacity={0.4} />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tickFormatter={(v) => String(v).length > 10 ? String(v).substring(0, 10) + '...' : v}
                  tick={{ fontSize: 10, fill: 'var(--color-text-primary)', fontWeight: 600 }} 
                  width={75} 
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-bg-tertiary)', opacity: 0.3 }} />
                <Bar dataKey="value" name="Total" fill="#0D9488" radius={[0, 4, 4, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SalesIntelligenceDashboard() {
  const location = useLocation();
  const isInsideComercial = location.pathname.startsWith('/comercial');

  // Modos de visualização do Card "Resultados de Vendas"
  const [compareMode, setCompareMode] = useState<'mes_anterior' | 'mesmo_mes_ano_ant' | 'ano_acumulado'>('ano_acumulado');
  const [viewMetric, setViewMetric] = useState<'faturamento' | 'metas'>('faturamento');

  // Filtros locais Vendedor/Marca
  const [selectedVendedor, setSelectedVendedor] = useState('todas');
  const [selectedMarca, setSelectedMarca] = useState('todas');

  const params = useMemo(() => ({
    vendedor_id: selectedVendedor !== 'todas' ? selectedVendedor : undefined,
    marca: selectedMarca !== 'todas' ? selectedMarca : undefined,
    compare_mode: compareMode
  }), [selectedVendedor, selectedMarca, compareMode]);

  const visaoQuery = useBranchPeriodQuery<any>('/estatisticas/visao-estrategica', params);
  const vd = useBranchPeriodQuery<any>('/ranking/vendedores', { limit: 100, marca: selectedMarca !== 'todas' ? selectedMarca : undefined });
  const prod = useBranchPeriodQuery<any>('/ranking/produtos', { limit: 100, marca: selectedMarca !== 'todas' ? selectedMarca : undefined, vendedor_id: selectedVendedor !== 'todas' ? selectedVendedor : undefined });
  const cli = useBranchPeriodQuery<any>('/ranking/clientes', { limit: 100, marca: selectedMarca !== 'todas' ? selectedMarca : undefined, vendedor_id: selectedVendedor !== 'todas' ? selectedVendedor : undefined });
  const marcas = useBranchPeriodQuery<any>('/ranking/marcas', { limit: 100, vendedor_id: selectedVendedor !== 'todas' ? selectedVendedor : undefined });
  const cidades = useBranchPeriodQuery<any>('/ranking/cidades', { limit: 100, marca: selectedMarca !== 'todas' ? selectedMarca : undefined, vendedor_id: selectedVendedor !== 'todas' ? selectedVendedor : undefined });
  const categorias = useBranchPeriodQuery<any>('/ranking/categorias', { limit: 100, marca: selectedMarca !== 'todas' ? selectedMarca : undefined, vendedor_id: selectedVendedor !== 'todas' ? selectedVendedor : undefined });

  const data = visaoQuery.data || {};
  const currentYear = data?.years?.current || 2026;
  const prevYear = data?.years?.prev || 2025;

  // Cálculos do Card Resultados de Vendas
  const faturamentoAtual = data?.faturamento_atual || 0;
  const ytdAtual = data?.ytd_atual || 0;
  const ytdAnterior = data?.ytd_anterior || 0;
  const crescYtd = data?.cresc_ytd || 0;
  const totalAnoAnterior12m = data?.total_ano_anterior_12m || 0;
  const superacaoValor = data?.superacao_valor || 0;
  const superacaoPct = data?.superacao_pct || 0;

  const faturamentoMesAnterior = data?.faturamento_mes_anterior || 0;
  const crescMesAnterior = data?.cresc_mes_anterior || 0;

  const faturamentoMesmoMesAnoAnt = data?.faturamento_mesmo_mes_ano_ant || 0;
  const crescMesmoMesAnoAnt = data?.cresc_mesmo_mes_ano_ant || 0;

  const qtdPedidos = data?.qtd_pedidos || 0;
  const ticketMedio = data?.ticket_medio || 0;
  const taxaRecompra = data?.taxa_recompra || 0;
  const clientesComCompra = data?.clientes_com_compra || 0;
  const totalClientesBase = data?.total_clientes_base || 0;

  // Highlights
  const melhorVendedor = data?.highlights?.melhor_vendedor || { nome: '-', total: 0, pct_share: 0 };
  const melhorCliente = data?.highlights?.melhor_cliente || { nome: '-', total: 0, pct_share: 0 };
  const marcaMaisVendida = data?.highlights?.marca_mais_vendida || { nome: '-', total: 0, pct_share: 0 };
  const cidadeDestaque = data?.highlights?.cidade_destaque || { nome: '-', total: 0, pct_share: 0 };

  // Rankings
  const mockTopSellers = useMemo(() => {
    return vd.data?.data?.map((s: any) => ({ name: s.nome || s.vendedor, value: s.total || s.total_vendas })) || [];
  }, [vd.data]);

  const mockTopBrands = useMemo(() => {
    return marcas.data?.data?.map((m: any) => ({ name: m.nome || m.marca, value: m.total })) || [];
  }, [marcas.data]);

  const mockTopCategories = useMemo(() => {
    return categorias.data?.data?.map((c: any) => ({ name: c.nome || c.categoria, value: c.total })) || [];
  }, [categorias.data]);

  const mockTopCities = useMemo(() => {
    return cidades.data?.data?.map((c: any) => ({ name: c.nome || c.cidade, value: c.total })) || [];
  }, [cidades.data]);

  const mockTopClients = useMemo(() => {
    return cli.data?.data?.map((c: any) => ({ name: c.nome || c.cliente, value: c.total })) || [];
  }, [cli.data]);

  const totalSellersSum = useMemo(() => mockTopSellers.reduce((a: number, b: any) => a + (b.value || 0), 0), [mockTopSellers]);
  const maxSellerVal = useMemo(() => Math.max(...mockTopSellers.map((s: any) => s.value || 0), 1), [mockTopSellers]);

  const SELLER_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#0EA5E9', '#06B6D4', '#EC4899', '#F97316', '#14B8A6'];

  const activeGrowthPct = compareMode === 'ano_acumulado'
    ? crescYtd
    : compareMode === 'mesmo_mes_ano_ant'
      ? crescMesmoMesAnoAnt
      : crescMesAnterior;

  const activePrevValue = compareMode === 'ano_acumulado'
    ? ytdAnterior
    : compareMode === 'mesmo_mes_ano_ant'
      ? faturamentoMesmoMesAnoAnt
      : faturamentoMesAnterior;

  return (
    <div className="space-y-3.5 pb-10 animate-in fade-in duration-300 min-w-0" aria-label="Monitor de Vendas BI">
      
      {/* 1. BARRA ÚNICA COMPACTA E AUTO-ADAPTÁVEL DE FILTROS */}
      <div className="bi-filter-bar">
        {!isInsideComercial && (
          <PeriodFilter />
        )}

        <div className="flex flex-wrap items-center gap-2 flex-1 sm:flex-initial justify-end ml-auto min-w-0">
          {/* Vendedor */}
          <div className="relative flex-1 sm:flex-initial min-w-[175px] max-w-[260px]">
            <select
              aria-label="Filtrar por Vendedor"
              value={selectedVendedor}
              onChange={(e) => setSelectedVendedor(e.target.value)}
              className="bi-select w-full appearance-none pr-7 truncate"
            >
              <option value="todas">Vendedor: Todos</option>
              {vd.data?.data?.map((v: any) => (
                <option key={v.id || v.nome} value={v.nome}>{v.nome}</option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
          </div>

          {/* Marca */}
          <div className="relative flex-1 sm:flex-initial min-w-[165px] max-w-[240px]">
            <select
              aria-label="Filtrar por Marca"
              value={selectedMarca}
              onChange={(e) => setSelectedMarca(e.target.value)}
              className="bi-select w-full appearance-none pr-7 truncate uppercase"
            >
              <option value="todas">Marca: Todas</option>
              {marcas.data?.data?.map((m: any) => (
                <option key={m.marca || m.nome} value={m.marca || m.nome}>{m.marca || m.nome}</option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
          </div>
        </div>
      </div>

      {/* 2. CARD PRINCIPAL: RESULTADOS DE VENDAS */}
      <div className="bg-bg-primary rounded-2xl border border-border shadow-card p-4 sm:p-5 relative overflow-hidden flex flex-col gap-4">
        <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>

        {/* Header Controls */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2.5 border-b border-divider/40 pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-emerald-500 shrink-0" />
            <h2 className="text-xs sm:text-sm font-black text-text-primary uppercase tracking-wider">
              Resultados de Vendas
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Comparativo Toggle Buttons */}
            <div className="flex flex-wrap items-center bg-bg-secondary p-0.5 rounded-xl border border-divider gap-0.5">
              <button
                type="button"
                onClick={() => setCompareMode('mes_anterior')}
                className={clsx(
                  "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1 whitespace-nowrap",
                  compareMode === 'mes_anterior'
                    ? "bg-bg-primary text-text-primary shadow-xs border border-border"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                <Calendar size={12} className="text-blue-500" /> Mês Anterior
              </button>

              <button
                type="button"
                onClick={() => setCompareMode('mesmo_mes_ano_ant')}
                className={clsx(
                  "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1 whitespace-nowrap",
                  compareMode === 'mesmo_mes_ano_ant'
                    ? "bg-bg-primary text-text-primary shadow-xs border border-border"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                <RotateCcw size={12} className="text-teal-500" /> Mesmo Mês Ano Ant.
              </button>

              <button
                type="button"
                onClick={() => setCompareMode('ano_acumulado')}
                className={clsx(
                  "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1 whitespace-nowrap",
                  compareMode === 'ano_acumulado'
                    ? "bg-brand-500 text-white shadow-xs"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                <TrendingUp size={12} /> Ano Acumulado
              </button>
            </div>

            {/* View Mode: Faturamento / Metas */}
            <div className="flex items-center bg-bg-secondary p-0.5 rounded-xl border border-divider gap-0.5">
              <button
                type="button"
                onClick={() => setViewMetric('faturamento')}
                className={clsx(
                  "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1 whitespace-nowrap",
                  viewMetric === 'faturamento'
                    ? "bg-bg-primary text-text-primary shadow-xs border border-border"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                <DollarSign size={12} className="text-emerald-500" /> Faturamento
              </button>

              <button
                type="button"
                onClick={() => setViewMetric('metas')}
                className={clsx(
                  "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1 whitespace-nowrap",
                  viewMetric === 'metas'
                    ? "bg-bg-primary text-text-primary shadow-xs border border-border"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                <Target size={12} className="text-amber-500" /> Metas
              </button>
            </div>
          </div>
        </div>

        {/* Card Body: Comparativos */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 items-center gap-4">
            {/* Esquerda: Faturamento Mês Atual / Acumulado */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                <TrendingUp size={22} />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-black text-text-secondary uppercase tracking-wider block truncate">
                  {compareMode === 'ano_acumulado' ? `Faturamento Acumulado (${currentYear})` : 'Faturamento Mês Atual'}
                </span>
                <div className="font-black text-text-primary font-mono tracking-tight my-0.5 bi-kpi-hero">
                  {formatBRL(compareMode === 'ano_acumulado' ? ytdAtual : faturamentoAtual)}
                </div>
                <span className="text-[10.5px] text-text-muted font-semibold block truncate">
                  {data?.periodo_atual_label || 'Consolidado no período'}
                </span>
              </div>
            </div>

            {/* Centro: Badge Auto-Adaptável de Crescimento */}
            <div className="flex flex-col items-center justify-center">
              <div
                title={`${activeGrowthPct >= 0 ? '+' : ''}${activeGrowthPct.toFixed(2)}%`}
                className={clsx(
                  "min-w-[4.75rem] px-3.5 h-14 rounded-2xl flex flex-col items-center justify-center border-2 font-black shadow-xs tabular-nums whitespace-nowrap",
                  activeGrowthPct >= 0
                    ? "bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400"
                    : "bg-rose-500/10 border-rose-500 text-rose-600 dark:text-rose-400"
                )}
              >
                {activeGrowthPct >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                <span className="text-xs sm:text-[13px] font-extrabold">
                  {formatGrowthPct(activeGrowthPct, 1)}
                </span>
              </div>
              <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest mt-1.5 text-center">
                {compareMode === 'ano_acumulado'
                  ? 'Crescimento Acumulado (YTD)'
                  : compareMode === 'mesmo_mes_ano_ant'
                    ? 'vs. Mesmo Mês Ano Ant.'
                    : 'vs. Mês Anterior'}
              </span>
            </div>

            {/* Direita: Faturamento Anterior */}
            <div className="flex items-center gap-3 lg:justify-end text-left lg:text-right min-w-0">
              <div className="order-2 lg:order-1 min-w-0">
                <span className="text-[10px] font-black text-text-secondary uppercase tracking-wider block truncate">
                  {compareMode === 'ano_acumulado'
                    ? `Acumulado Ano Anterior (${prevYear})`
                    : compareMode === 'mesmo_mes_ano_ant'
                      ? `Mesmo Mês (${prevYear})`
                      : 'Faturamento Mês Anterior'}
                </span>
                <div className="font-black text-text-primary/85 font-mono tracking-tight my-0.5 bi-kpi-hero">
                  {formatBRL(activePrevValue)}
                </div>
                <span className="text-[10.5px] text-text-muted font-semibold block truncate">
                  {compareMode === 'ano_acumulado' ? `01/Jan a corte de ${prevYear}` : 'Referência comparativa'}
                </span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-bg-secondary border border-border text-amber-500 flex items-center justify-center shrink-0 order-1 lg:order-2">
                <Award size={22} />
              </div>
            </div>
          </div>

          {/* Faixa Inferior de Superação */}
          {compareMode === 'ano_acumulado' && (
            <div className="bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-emerald-500 text-white rounded-lg shadow-xs shrink-0">
                  <Award size={18} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-black text-text-primary text-xs uppercase tracking-wider">
                      Meta de Superação do Ano Fechado ({prevYear})
                    </h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 whitespace-nowrap">
                      {superacaoPct.toFixed(1)}% atingido
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5 font-medium">
                    Faturamento total de {prevYear} (12 meses): <strong className="tabular-nums">{formatBRL(totalAnoAnterior12m)}</strong>
                  </p>
                </div>
              </div>

              <div className="sm:text-right shrink-0">
                <div className="text-[10px] font-black text-text-secondary uppercase tracking-widest">
                  {superacaoValor >= 0 ? 'Superação Conquistada' : 'Falta para Superar'}
                </div>
                <div className={clsx(
                  "font-black font-mono mt-0.5 bi-kpi-value",
                  superacaoValor >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                )}>
                  {superacaoValor >= 0 ? '+' : ''}{formatBRL(superacaoValor)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. GRID DE 8 CARDS DE KPIS EXECUTIVOS (2 LINHAS X 4 COLUNAS AUTO-ADAPTÁVEIS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        {/* Card 1: Melhor Vendedor */}
        <div className="bg-bg-primary border border-border shadow-card rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[10px] font-black text-text-secondary uppercase tracking-wider truncate">Melhor Vendedor</span>
            <div className="w-7 h-7 bg-amber-500/10 text-amber-500 rounded-lg flex items-center justify-center shrink-0">
              <Trophy size={15} />
            </div>
          </div>
          <div className="text-xs sm:text-[13px] font-black text-text-primary truncate uppercase mb-0.5" title={melhorVendedor.nome}>
            {melhorVendedor.nome}
          </div>
          <div className="font-black text-emerald-600 dark:text-emerald-400 font-mono bi-kpi-value">
            {formatBRL(melhorVendedor.total)}
          </div>
          <span className="text-[10px] text-text-secondary font-medium block mt-1 truncate">
            {melhorVendedor.pct_share ? `${melhorVendedor.pct_share.toFixed(1)}% do faturamento total` : 'Líder em vendas'}
          </span>
        </div>

        {/* Card 2: Melhor Cliente */}
        <div className="bg-bg-primary border border-border shadow-card rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[10px] font-black text-text-secondary uppercase tracking-wider truncate">Melhor Cliente</span>
            <div className="w-7 h-7 bg-rose-500/10 text-rose-500 rounded-lg flex items-center justify-center shrink-0">
              <Award size={15} />
            </div>
          </div>
          <div className="text-xs sm:text-[13px] font-black text-text-primary truncate uppercase mb-0.5" title={melhorCliente.nome}>
            {melhorCliente.nome}
          </div>
          <div className="font-black text-emerald-600 dark:text-emerald-400 font-mono bi-kpi-value">
            {formatBRL(melhorCliente.total)}
          </div>
          <span className="text-[10px] text-text-secondary font-medium block mt-1 truncate">
            {melhorCliente.pct_share ? `${melhorCliente.pct_share.toFixed(1)}% do faturamento total` : 'Maior comprador'}
          </span>
        </div>

        {/* Card 3: Marca Mais Vendida */}
        <div className="bg-bg-primary border border-border shadow-card rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[10px] font-black text-text-secondary uppercase tracking-wider truncate">Marca Mais Vendida</span>
            <div className="w-7 h-7 bg-sky-500/10 text-sky-500 rounded-lg flex items-center justify-center shrink-0">
              <Tag size={15} />
            </div>
          </div>
          <div className="text-xs sm:text-[13px] font-black text-text-primary truncate uppercase mb-0.5" title={marcaMaisVendida.nome}>
            {marcaMaisVendida.nome}
          </div>
          <div className="font-black text-emerald-600 dark:text-emerald-400 font-mono bi-kpi-value">
            {formatBRL(marcaMaisVendida.total)}
          </div>
          <span className="text-[10px] text-text-secondary font-medium block mt-1 truncate">
            {marcaMaisVendida.pct_share ? `${marcaMaisVendida.pct_share.toFixed(1)}% do faturamento total` : 'Destaque em vendas'}
          </span>
        </div>

        {/* Card 4: Cidade Destaque */}
        <div className="bg-bg-primary border border-border shadow-card rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[10px] font-black text-text-secondary uppercase tracking-wider truncate">Cidade Destaque</span>
            <div className="w-7 h-7 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-lg flex items-center justify-center shrink-0">
              <MapPin size={15} />
            </div>
          </div>
          <div className="text-xs sm:text-[13px] font-black text-text-primary truncate uppercase mb-0.5" title={cidadeDestaque.nome}>
            {cidadeDestaque.nome}
          </div>
          <div className="font-black text-emerald-600 dark:text-emerald-400 font-mono bi-kpi-value">
            {formatBRL(cidadeDestaque.total)}
          </div>
          <span className="text-[10px] text-text-secondary font-medium block mt-1 truncate">
            {cidadeDestaque.pct_share ? `${cidadeDestaque.pct_share.toFixed(1)}% do faturamento total` : 'Principal praça'}
          </span>
        </div>

        {/* Card 5: Quantidade de Pedidos */}
        <div className="bg-bg-primary border border-border shadow-card rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[10px] font-black text-text-secondary uppercase tracking-wider truncate">Quantidade de Pedidos</span>
            <div className="w-7 h-7 bg-blue-500/10 text-blue-500 rounded-lg flex items-center justify-center shrink-0">
              <ShoppingBag size={15} />
            </div>
          </div>
          <div className="font-black text-text-primary font-mono bi-kpi-value">
            {formatNum(qtdPedidos)}
          </div>
          <span className="text-[10px] text-text-secondary font-medium block mt-1 truncate">Total de pedidos no período</span>
        </div>

        {/* Card 6: Ticket Médio */}
        <div className="bg-bg-primary border border-border shadow-card rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[10px] font-black text-text-secondary uppercase tracking-wider truncate">Ticket Médio</span>
            <div className="w-7 h-7 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center justify-center shrink-0">
              <DollarSign size={15} />
            </div>
          </div>
          <div className="font-black text-text-primary font-mono bi-kpi-value">
            {formatBRL(ticketMedio)}
          </div>
          <span className="text-[10px] text-text-secondary font-medium block mt-1 truncate">Média por pedido/nota</span>
        </div>

        {/* Card 7: Taxa de Retenção */}
        <div className="bg-bg-primary border border-border shadow-card rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[10px] font-black text-text-secondary uppercase tracking-wider truncate">Taxa de Retenção</span>
            <div className="w-7 h-7 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 rounded-lg flex items-center justify-center shrink-0">
              <RotateCcw size={15} />
            </div>
          </div>
          <div className="font-black text-text-primary font-mono bi-kpi-value">
            {taxaRecompra.toFixed(1)}%
          </div>
          <span className="text-[10px] text-text-secondary font-medium block mt-1 truncate">Clientes ativos vs carteira total</span>
        </div>

        {/* Card 8: Clientes com Compra */}
        <div className="bg-bg-primary border border-border shadow-card rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[10px] font-black text-text-secondary uppercase tracking-wider truncate">Clientes com Compra</span>
            <div className="w-7 h-7 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-lg flex items-center justify-center shrink-0">
              <Users size={15} />
            </div>
          </div>
          <div className="font-black text-text-primary font-mono bi-kpi-value">
            {clientesComCompra} <span className="text-xs font-normal text-text-secondary">de {formatNum(totalClientesBase)}</span>
          </div>
          <span className="text-[10px] text-text-secondary font-medium block mt-1 truncate">Carteira ativa no período</span>
        </div>
      </div>

      {/* 5. SEÇÃO: DESEMPENHO DOS VENDEDORES (GRÁFICO HORIZONTAL) & TOP 10 RANKING */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Esquerda: Gráfico de Barras Horizontais Coloridas */}
        <div className="bg-bg-primary border border-border shadow-card rounded-2xl p-5 flex flex-col min-h-[380px]">
          <div className="border-b border-divider/40 pb-3 mb-4 flex items-center gap-2">
            <BarChart3 size={18} className="text-brand-500" />
            <h3 className="text-xs font-black text-text-primary uppercase tracking-wider">
              Desempenho dos Vendedores (Gráfico)
            </h3>
          </div>

          <div className="flex-1 w-full pt-2">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart 
                data={mockTopSellers.slice(0, 8)} 
                layout="vertical" 
                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" opacity={0.3} />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tickFormatter={(v) => String(v).length > 12 ? String(v).substring(0, 12) + '...' : v}
                  tick={{ fontSize: 10, fill: 'var(--color-text-secondary)', fontWeight: 600 }} 
                  width={90} 
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-bg-tertiary)', opacity: 0.3 }} />
                <Bar dataKey="value" name="Faturamento" radius={[0, 4, 4, 0]} maxBarSize={20}>
                  {mockTopSellers.slice(0, 8).map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={SELLER_COLORS[index % SELLER_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Direita: TOP 10 VENDEDORES (RANKING) */}
        <div className="bg-bg-primary border border-border shadow-card rounded-2xl p-5 flex flex-col min-h-[380px]">
          <div className="flex justify-between items-center border-b border-divider/40 pb-3 mb-4">
            <h3 className="text-xs font-black text-text-primary uppercase tracking-wider flex items-center gap-2">
              <Trophy size={16} className="text-amber-500" />
              Top 10 Vendedores (Ranking)
            </h3>
            <span className="text-[10px] font-black text-brand-500 uppercase tracking-wider">
              Mostrar Todos ({mockTopSellers.length})
            </span>
          </div>

          <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[320px] pr-1">
            {mockTopSellers.slice(0, 10).map((s: any, idx: number) => {
              const rank = idx + 1;
              const share = totalSellersSum > 0 ? (s.value / totalSellersSum) * 100 : 0;
              const barWidth = maxSellerVal > 0 ? (s.value / maxSellerVal) * 100 : 0;

              return (
                <div key={s.name || idx} className="relative flex justify-between items-center py-2 px-3 rounded-xl overflow-hidden group hover:bg-bg-secondary transition-all">
                  <div 
                    className="absolute left-0 top-0 bottom-0 bg-brand-500/10 group-hover:bg-brand-500/15 transition-all duration-500" 
                    style={{ width: `${barWidth}%` }} 
                  />
                  <div className="relative z-10 flex items-center gap-2 min-w-0 mr-2 flex-1">
                    <span className={clsx(
                      "font-mono text-xs font-black min-w-[20px]",
                      rank === 1 ? "text-amber-500" : rank === 2 ? "text-slate-400" : rank === 3 ? "text-amber-700" : "text-text-muted"
                    )}>
                      #{rank}
                    </span>
                    <span className="text-xs font-bold text-text-primary truncate uppercase" title={s.name}>{s.name}</span>
                  </div>
                  <div className="relative z-10 text-right shrink-0 flex items-center gap-1.5 font-mono text-xs">
                    <span className="font-black text-text-primary">{formatBRL(s.value)}</span>
                    <span className="text-[10px] text-text-secondary">({share.toFixed(1)}%)</span>
                  </div>
                </div>
              );
            })}
            {mockTopSellers.length === 0 && (
              <div className="py-8 text-center text-text-secondary text-xs font-semibold">Sem vendedores no período</div>
            )}
          </div>
        </div>
      </div>

      {/* 6. CARDS DE DISTRIBUIÇÃO (4 CARDS: MARCAS, GRUPOS, CIDADES, CLIENTES) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Marcas */}
        <RankingCardWithToggle
          title="Top 10 Marcas"
          data={mockTopBrands}
          isLoading={marcas.isLoading}
          total={faturamentoAtual || ytdAtual}
          icon={Tag}
          colorClass="text-emerald-600 dark:text-emerald-400"
          badgeBg="bg-emerald-500/10"
        />

        {/* Top Grupos */}
        <RankingCardWithToggle
          title="Top 10 Grupos"
          data={mockTopCategories}
          isLoading={categorias.isLoading}
          total={faturamentoAtual || ytdAtual}
          icon={Box}
          colorClass="text-blue-600 dark:text-blue-400"
          badgeBg="bg-blue-500/10"
        />

        {/* Top Cidades */}
        <RankingCardWithToggle
          title="Top 10 Cidades"
          data={mockTopCities}
          isLoading={cidades.isLoading}
          total={faturamentoAtual || ytdAtual}
          icon={MapPin}
          colorClass="text-amber-600 dark:text-amber-400"
          badgeBg="bg-amber-500/10"
        />

        {/* Top Clientes */}
        <RankingCardWithToggle
          title="Top 15 Clientes"
          data={mockTopClients}
          isLoading={cli.isLoading}
          total={faturamentoAtual || ytdAtual}
          icon={Users}
          colorClass="text-rose-600 dark:text-rose-400"
          badgeBg="bg-rose-500/10"
        />
      </div>

      {/* 7. RODAPÉ: FATURAMENTO NO PERÍODO (HISTÓRICO 12 MESES, DIÁRIO/MENSAL E COMPARAÇÃO) */}
      <FaturamentoPeriodoCard
        vendedorId={selectedVendedor !== 'todas' ? selectedVendedor : undefined}
        marca={selectedMarca !== 'todas' ? selectedMarca : undefined}
        subtitle="Histórico consolidado do faturamento líquido no período com comparativos mensais"
        initialViewMode="grid"
      />

    </div>
  );
}
