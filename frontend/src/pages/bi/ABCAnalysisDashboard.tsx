import { useState, useMemo, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useBiPeriodQuery } from '../../hooks/useBiPeriodQuery';
import { BIService } from '../../services/biApi';
import { BiPeriodFilter } from '../../types/bi.types';
import {
  DollarSign, AlertTriangle, Search, X, Eye, EyeOff,
  Boxes, TrendingUp, TrendingDown, Clock, Layers, BarChart2,
  Package2, ChevronLeft, ChevronRight, Filter, CircleDollarSign
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList
} from 'recharts';
import { formatBRL, formatNum } from '../../utils/format';
import clsx from 'clsx';

const fmtCompact = (v: number) => {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(1)}K`;
  return formatBRL(v);
};

const barGradients = ['#4F46E5', '#6366F1', '#0EA5E9', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#14B8A6'];

// Tooltip premium para o gráfico
const BarTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(15,23,42,0.92)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(99,102,241,0.3)',
      borderRadius: 12,
      padding: '10px 14px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
    }}>
      <p style={{ color: '#94a3b8', fontSize: 10, fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
      {payload.map((e: any, i: number) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: e.fill, display: 'block' }} />
          <span style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 800 }}>{fmtCompact(e.value)}</span>
        </div>
      ))}
    </div>
  );
};

// Renderizador customizado do label nas barras
const BarValueLabel = ({ x, y, width, value }: any) => {
  if (!value) return null;
  return (
    <text
      x={x + width / 2}
      y={y - 5}
      fill="#6366f1"
      textAnchor="middle"
      fontSize={9}
      fontWeight={800}
    >
      {fmtCompact(value)}
    </text>
  );
};

export default function InventoryManagementDashboard() {
  const { filter } = useOutletContext<{ filter: BiPeriodFilter }>();

  const { data, isLoading, isError } = useBiPeriodQuery(
    ['bi', 'abc'],
    BIService.getABCAnalysis,
    filter
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [marcaFilter, setMarcaFilter] = useState('');
  const [grupoFilter, setGrupoFilter] = useState('');
  const [abcFilter, setAbcFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  // Padrão: somente produtos com estoque positivo
  const [filtroEstoque, setFiltroEstoque] = useState<'com_estoque' | 'todos' | 'negativo' | 'sem_estoque'>('com_estoque');
  const [ordenacao, setOrdenacao] = useState<'abc' | 'nome_asc' | 'nome_desc' | 'cod_asc' | 'cod_desc' | 'estoque_desc' | 'estoque_asc' | 'valor_desc' | 'valor_asc'>('abc');
  const [currentPage, setCurrentPage] = useState(1);
  const [showChartValues, setShowChartValues] = useState(false);
  const [activeBarIdx, setActiveBarIdx] = useState<number | null>(null);
  const itemsPerPage = 50;

  const barChartData: any[] = data?.barChartData || [];
  const distGrupo: any[] = data?.distGrupo || [];
  const distMarca: any[] = data?.distMarca || [];
  const tableData: any[] = data?.tableData || [];
  const kpis = data?.kpis || {
    valor_estoque_custo: 0, valor_estoque_venda: 0, total_volume: 0,
    skus_com_saldo: 0, ruptura_pct: 0,
    curva_a_count: 0, curva_b_count: 0, curva_c_count: 0
  };

  const markup = kpis.valor_estoque_custo > 0 ? kpis.valor_estoque_venda / kpis.valor_estoque_custo : 0;
  const semEstoque = tableData.filter((x: any) => x.estoque === 0).length;
  const estoqueNegativo = tableData.filter((x: any) => x.estoque < 0).length;
  const estoqueCritico = tableData.filter((x: any) => x.estoque > 0 && x.estoque < 10).length;
  const diasEstoque = 73;
  const estoqueIdeal = kpis.valor_estoque_custo * 0.13;




  const marcasDisponiveis = useMemo(() => {
    return Array.from(new Set(tableData.map((x: any) => x.marca).filter(Boolean))).sort() as string[];
  }, [tableData]);

  const gruposDisponiveis = useMemo(() => {
    return Array.from(new Set(tableData.map((x: any) => x.grupo).filter(Boolean))).sort() as string[];
  }, [tableData]);

  const filteredData = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const list = tableData.filter((item: any) => {
      const matchSearch = !term ||
        item.desc?.toLowerCase().includes(term) ||
        item.cod?.toLowerCase().includes(term) ||
        item.cod_barra?.toLowerCase().includes(term) ||
        String(item.id_firebird || '').toLowerCase().includes(term);
      const matchMarca = !marcaFilter || item.marca === marcaFilter;
      const matchGrupo = !grupoFilter || item.grupo === grupoFilter;
      const matchAbc = !abcFilter || item.abc === abcFilter;
      const matchStatus = !statusFilter || item.status === statusFilter;
      
      let matchEstoque = true;
      if (filtroEstoque === 'com_estoque') matchEstoque = item.estoque > 0;
      else if (filtroEstoque === 'negativo') matchEstoque = item.estoque < 0;
      else if (filtroEstoque === 'sem_estoque') matchEstoque = item.estoque === 0;

      return matchSearch && matchMarca && matchGrupo && matchAbc && matchStatus && matchEstoque;
    });

    return list.sort((a: any, b: any) => {
      switch (ordenacao) {
        case 'nome_asc':
          return (a.desc || '').localeCompare(b.desc || '');
        case 'nome_desc':
          return (b.desc || '').localeCompare(a.desc || '');
        case 'cod_asc':
          return (Number(a.cod) || 0) - (Number(b.cod) || 0);
        case 'cod_desc':
          return (Number(b.cod) || 0) - (Number(a.cod) || 0);
        case 'estoque_desc':
          return (b.estoque || 0) - (a.estoque || 0);
        case 'estoque_asc':
          return (a.estoque || 0) - (b.estoque || 0);
        case 'valor_desc':
          return ((b.estoque || 0) * (b.custo || 0)) - ((a.estoque || 0) * (a.custo || 0));
        case 'valor_asc':
          return ((a.estoque || 0) * (a.custo || 0)) - ((b.estoque || 0) * (b.custo || 0));
        case 'abc':
        default:
          return (b.faturamento || 0) - (a.faturamento || 0);
      }
    });
  }, [tableData, searchTerm, marcaFilter, grupoFilter, abcFilter, statusFilter, filtroEstoque, ordenacao]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, marcaFilter, grupoFilter, abcFilter, statusFilter, filtroEstoque, ordenacao]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  const paginatedData = useMemo(() =>
    filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  , [filteredData, currentPage]);

  const maxGrupo = Math.max(...distGrupo.map((x: any) => x.value), 1);
  const maxMarca = Math.max(...distMarca.map((x: any) => x.value), 1);

  const statusStyle = (status: string): string => {
    const n = status?.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (n === 'Critico') return 'bg-red-50 text-red-600 border border-red-200 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30';
    if (n === 'Atencao') return 'bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30';
    if (status === 'Ideal') return 'bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30';
    return 'bg-cyan-50 text-cyan-600 border border-cyan-200 dark:bg-cyan-500/15 dark:text-cyan-400 dark:border-cyan-500/30';
  };

  const abcStyle = (abc: string) => {
    if (abc === 'A') return 'bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400';
    if (abc === 'B') return 'bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-400';
    return 'bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-500/15 dark:text-slate-400';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-text-secondary">
        <div className="w-9 h-9 rounded-full border-[3px] border-indigo-500 border-t-transparent animate-spin" />
        <span className="text-sm font-semibold">Carregando Dinâmica de Inventário...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">

      {/* ══ HEADER ══════════════════════════════════════════ */}
      <div className="flex flex-wrap gap-4 items-start justify-between">
        <div>
          <h1 className="text-xl font-black text-text-primary tracking-tight">DINÂMICA E SAÚDE DO INVENTÁRIO</h1>
          <p className="text-sm text-text-secondary mt-0.5">Capital, giro e saúde do portfólio de produtos</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select value={marcaFilter} onChange={e => setMarcaFilter(e.target.value)}
            className="bg-bg-primary border border-divider rounded-2xl px-4 py-2.5 text-xs font-semibold text-text-primary outline-none cursor-pointer shadow-sm hover:border-indigo-400 transition-colors">
            <option value="">Todas as Marcas</option>
            {marcasDisponiveis.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={grupoFilter} onChange={e => setGrupoFilter(e.target.value)}
            className="bg-bg-primary border border-divider rounded-2xl px-4 py-2.5 text-xs font-semibold text-text-primary outline-none cursor-pointer shadow-sm hover:border-indigo-400 transition-colors">
            <option value="">Todos os Grupos</option>
            {gruposDisponiveis.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      </div>

      {/* ══ KPI CARDS ══════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-4">
        {[
          {
            label: 'Total Investido', value: formatBRL(kpis.valor_estoque_custo), sub: 'Custo do estoque',
            Icon: DollarSign, color: '#10B981', trend: null, alert: false
          },
          {
            label: 'Receita Potencial', value: formatBRL(kpis.valor_estoque_venda), sub: 'Preço de venda',
            Icon: CircleDollarSign, color: '#4F46E5', trend: null, alert: false
          },
          {
            label: 'Itens em Estoque', value: formatNum(kpis.total_volume), sub: 'Unidades físicas',
            Icon: Boxes, color: '#06B6D4', trend: null, alert: false
          },
          {
            label: 'Cobertura', value: `${diasEstoque}d`, sub: 'Dias de estoque',
            Icon: Clock, color: '#F59E0B', trend: null, alert: false
          },
          {
            label: 'Markup Médio', value: `${markup.toFixed(2)}x`, sub: 'Venda / Custo',
            Icon: BarChart2, color: '#6366F1', trend: null, alert: false
          },
          {
            label: 'Ruptura (0 Saldo)', value: String(semEstoque), sub: 'Sem estoque',
            Icon: AlertTriangle, color: '#64748B', trend: null, alert: false
          },
          {
            label: 'Estoque Negativo', value: String(estoqueNegativo), sub: 'Abaixo de 0',
            Icon: AlertTriangle, color: '#EF4444', trend: null, alert: true
          },
          {
            label: 'Estoque Ideal', value: formatBRL(estoqueIdeal), sub: 'Capital recomendado',
            Icon: Package2, color: '#14B8A6', trend: null, alert: false
          },
        ].map((card, i) => (
          <div key={i} className={clsx(
            'col-span-2 group rounded-2xl p-4 flex flex-col justify-between gap-2 transition-all duration-200 min-w-0',
            'bg-bg-primary shadow-sm hover:shadow-md',
            card.alert
              ? 'border-l-4'
              : 'border border-divider hover:border-indigo-200 dark:hover:border-indigo-500/30',
          )} style={card.alert ? { borderLeftColor: card.color, borderTop: `1px solid ${card.color}20`, borderRight: `1px solid ${card.color}20`, borderBottom: `1px solid ${card.color}20` } : {}}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 group-hover:scale-110"
                  style={{ background: `${card.color}18`, border: `1px solid ${card.color}25` }}>
                  <card.Icon size={14} style={{ color: card.color }} />
                </div>
              </div>
            </div>
            <div className="min-w-0">
              <div className="text-[9px] font-bold text-text-secondary uppercase tracking-widest truncate">{card.label}</div>
              <div 
                className="text-base sm:text-lg xl:text-xl font-black font-mono leading-tight mt-1 truncate" 
                title={card.value}
                style={{ color: card.alert ? card.color : 'var(--color-text-primary)' }}
              >
                {card.value}
              </div>
              <div className="text-[9px] text-text-secondary mt-0.5 truncate">{card.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ══ GRÁFICO — Eficiência de Capital ══════════════════ */}
      <div className="bg-bg-primary border border-divider rounded-3xl shadow-sm p-6 transition-shadow hover:shadow-md">
        <div className="flex items-start justify-between mb-5 gap-3 flex-wrap">
          <div>
            <h3 className="text-base font-black text-text-primary flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                <Layers size={15} className="text-indigo-500" />
              </div>
              Eficiência de Capital
            </h3>
            <p className="text-[11px] text-text-secondary font-medium mt-1 pl-10">
              Top 15 marcas com maior valor em estoque
            </p>
          </div>
          {/* Toggle button */}
          <button
            onClick={() => setShowChartValues(v => !v)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all duration-200 border cursor-pointer',
              showChartValues
                ? 'bg-indigo-500 text-white border-indigo-500 shadow-md shadow-indigo-500/25'
                : 'bg-bg-primary text-text-secondary border-divider hover:bg-bg-secondary hover:border-indigo-300'
            )}
          >
            {showChartValues ? <EyeOff size={13} /> : <Eye size={13} />}
            {showChartValues ? 'Ocultar Valores' : 'Mostrar Valores'}
          </button>
        </div>

        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={barChartData}
              margin={{ top: showChartValues ? 22 : 8, right: 8, left: 0, bottom: 28 }}
              onMouseLeave={() => setActiveBarIdx(null)}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.25} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 9, fill: 'var(--color-text-muted)', fontWeight: 600 }}
                tickLine={false} axisLine={false}
                interval={0} angle={-30} textAnchor="end"
              />
              <YAxis
                tickFormatter={v => `${(v / 1000).toFixed(0)}K`}
                tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }}
                tickLine={false} axisLine={false} width={42}
              />
              <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(99,102,241,0.06)', radius: 8 } as any} />
              <Bar
                dataKey="estoque"
                name="Estoque"
                radius={[8, 8, 0, 0]}
                maxBarSize={44}
                onMouseEnter={(_: any, index: number) => setActiveBarIdx(index)}
              >
                {barChartData.map((_: any, idx: number) => (
                  <Cell
                    key={idx}
                    fill={barGradients[idx % barGradients.length]}
                    opacity={activeBarIdx === null || activeBarIdx === idx ? 1 : 0.45}
                    style={{ filter: activeBarIdx === idx ? `drop-shadow(0 4px 8px ${barGradients[idx % barGradients.length]}60)` : 'none', transition: 'all 0.2s' }}
                  />
                ))}
                {showChartValues && (
                  <LabelList
                    dataKey="estoque"
                    content={<BarValueLabel />}
                  />
                )}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legenda de cores */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-divider/40 flex-wrap">
          {[
            { color: '#4F46E5', label: 'Alto capital' },
            { color: '#10B981', label: 'Médio capital' },
            { color: '#F59E0B', label: 'Menor capital' },
          ].map((l, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[10px] text-text-secondary font-medium">
              <span className="w-3 h-3 rounded-sm" style={{ background: l.color }} />
              {l.label}
            </div>
          ))}
        </div>
      </div>



      {/* ══ DISTRIBUIÇÃO GRUPO + MARCA ══════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {[
          {
            title: 'Distribuição por Grupo', subtitle: 'Top 10 grupos por quantidade de SKUs',
            data: distGrupo, max: maxGrupo,
            gradFrom: '#4F46E5', gradTo: '#818CF8', iconColor: '#6366F1'
          },
          {
            title: 'Distribuição por Marca', subtitle: 'Top 5 marcas por quantidade de SKUs',
            data: distMarca.slice(0, 5), max: maxMarca,
            gradFrom: '#059669', gradTo: '#34D399', iconColor: '#10B981'
          },
        ].map((section, si) => (
          <div key={si} className="bg-bg-primary border border-divider rounded-3xl shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center border" style={{ background: `${section.iconColor}12`, borderColor: `${section.iconColor}22` }}>
                <BarChart2 size={15} style={{ color: section.iconColor }} />
              </div>
              <div>
                <h3 className="text-sm font-black text-text-primary">{section.title}</h3>
                <p className="text-[10px] text-text-secondary">{section.subtitle}</p>
              </div>
            </div>
            <div className="space-y-3">
              {section.data.map((item: any, i: number) => {
                const pct = Math.round((item.value / section.max) * 100);
                const rank = i + 1;
                return (
                  <div key={i} className="flex items-center gap-3 group">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0"
                      style={{ background: `${section.gradFrom}15`, color: section.gradFrom }}>
                      {rank}
                    </span>
                    <div className="w-28 text-[10px] font-semibold text-text-secondary text-right truncate shrink-0" title={item.name}>{item.name}</div>
                    <div className="flex-1 bg-bg-secondary rounded-full h-2.5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${pct}%`,
                          background: `linear-gradient(90deg, ${section.gradFrom}, ${section.gradTo})`
                        }}
                      />
                    </div>
                    <div className="w-12 text-[10px] font-black text-text-primary text-right shrink-0">{formatNum(item.value)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* ══ LISTAGEM DETALHADA ══════════════════════════════ */}
      <div className="bg-bg-primary border border-divider rounded-3xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">

        {/* Header */}
        <div className="px-6 py-4 border-b border-divider/40 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Boxes size={15} className="text-indigo-500" />
            </div>
            <div>
              <h3 className="text-sm font-black text-text-primary">Análise Estratégica: Curva ABC</h3>
              <p className="text-[10px] text-text-secondary">{filteredData.length} itens encontrados</p>
            </div>
          </div>
          {/* Status legend */}
          <div className="flex items-center gap-2.5 text-[9px] font-black uppercase tracking-wider flex-wrap">
            {[
              { color: '#EF4444', label: 'Crítico' },
              { color: '#F59E0B', label: 'Atenção' },
              { color: '#10B981', label: 'Ideal' },
              { color: '#06B6D4', label: 'Sem Giro' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1 text-text-secondary">
                <span className="w-2 h-2 rounded-full" style={{ background: l.color }} />
                {l.label}
              </div>
            ))}
          </div>
        </div>

        {/* Filtros da tabela */}
        <div className="px-6 py-3 bg-bg-secondary/20 border-b border-divider/30 flex flex-wrap gap-2.5 items-center">
          <div className="flex items-center gap-2 flex-1 min-w-[220px] bg-bg-primary border border-divider rounded-2xl px-3.5 py-2.5 shadow-sm hover:border-indigo-300 transition-colors focus-within:border-indigo-400 focus-within:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]">
            <Search size={13} className="text-text-secondary shrink-0" />
            <input type="text" placeholder="Buscar produto ou código..."
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="bg-transparent text-xs font-medium text-text-primary placeholder-text-secondary/50 outline-none w-full" />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="text-text-secondary hover:text-text-primary cursor-pointer transition-colors">
                <X size={12} />
              </button>
            )}
          </div>

          {/* Seletor de Ordenação */}
          <select 
            value={ordenacao} 
            onChange={e => setOrdenacao(e.target.value as any)}
            className="bg-bg-primary border border-divider rounded-2xl px-3.5 py-2.5 text-xs font-semibold text-text-primary outline-none cursor-pointer hover:border-indigo-300 transition-colors"
          >
            <option value="abc">Ordenar: Curva ABC</option>
            <option value="nome_asc">Ordenar: Nome (A-Z)</option>
            <option value="nome_desc">Ordenar: Nome (Z-A)</option>
            <option value="cod_asc">Ordenar: Código (1 → 9)</option>
            <option value="cod_desc">Ordenar: Código (9 → 1)</option>
            <option value="estoque_desc">Ordenar: Maior Estoque</option>
            <option value="estoque_asc">Ordenar: Menor Estoque</option>
            <option value="valor_desc">Ordenar: Maior Valor Total</option>
            <option value="valor_asc">Ordenar: Menor Valor Total</option>
          </select>

          {/* Filtro de Estoque */}
          <select 
            value={filtroEstoque} 
            onChange={e => setFiltroEstoque(e.target.value as any)}
            className={clsx(
              "border rounded-2xl px-3.5 py-2.5 text-xs font-bold outline-none cursor-pointer transition-colors",
              filtroEstoque === 'com_estoque' 
                ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30"
                : filtroEstoque === 'negativo'
                ? "bg-red-50 text-red-700 border-red-300 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30"
                : "bg-bg-primary text-text-primary border-divider hover:border-indigo-300"
            )}
          >
            <option value="com_estoque">Estoque: Com Saldo (&gt; 0)</option>
            <option value="todos">Estoque: Mostrar Todos</option>
            <option value="negativo">Estoque: Negativos (&lt; 0)</option>
            <option value="sem_estoque">Estoque: Zerados (= 0)</option>
          </select>

          {/* Grupo Filter */}
          <select 
            value={grupoFilter} 
            onChange={e => setGrupoFilter(e.target.value)}
            className="bg-bg-primary border border-divider rounded-2xl px-3.5 py-2.5 text-xs font-semibold text-text-primary outline-none cursor-pointer hover:border-indigo-300 transition-colors"
          >
            <option value="">Grupo / Categoria: Todos</option>
            {gruposDisponiveis.map(g => <option key={g} value={g}>{g}</option>)}
          </select>

          {/* Marca Filter */}
          <select 
            value={marcaFilter} 
            onChange={e => setMarcaFilter(e.target.value)}
            className="bg-bg-primary border border-divider rounded-2xl px-3.5 py-2.5 text-xs font-semibold text-text-primary outline-none cursor-pointer hover:border-indigo-300 transition-colors"
          >
            <option value="">Marca: Todas</option>
            {marcasDisponiveis.map(m => <option key={m} value={m}>{m}</option>)}
          </select>

          {/* ABC Filter */}
          <select 
            value={abcFilter} 
            onChange={e => setAbcFilter(e.target.value)}
            className="bg-bg-primary border border-divider rounded-2xl px-3.5 py-2.5 text-xs font-semibold text-text-primary outline-none cursor-pointer hover:border-indigo-300 transition-colors"
          >
            <option value="">Curva ABC: Todas</option>
            <option value="A">Curva A</option>
            <option value="B">Curva B</option>
            <option value="C">Curva C</option>
          </select>

          {/* Status Filter */}
          <select 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-bg-primary border border-divider rounded-2xl px-3.5 py-2.5 text-xs font-semibold text-text-primary outline-none cursor-pointer hover:border-indigo-300 transition-colors"
          >
            <option value="">Status: Todos</option>
            <option value="Ideal">Ideal</option>
            <option value="Atencao">Atenção</option>
            <option value="Critico">Crítico</option>
            <option value="Sem Giro">Sem Giro</option>
          </select>

          {(searchTerm || marcaFilter || grupoFilter || abcFilter || statusFilter || filtroEstoque !== 'com_estoque' || ordenacao !== 'abc') && (
            <button
              onClick={() => { 
                setSearchTerm(''); 
                setMarcaFilter(''); 
                setGrupoFilter(''); 
                setAbcFilter(''); 
                setStatusFilter(''); 
                setFiltroEstoque('com_estoque'); 
                setOrdenacao('abc'); 
              }}
              className="flex items-center gap-1 text-[10px] font-black text-red-500 hover:text-red-600 cursor-pointer transition-colors px-2 py-2 rounded-xl bg-red-50 dark:bg-red-500/10"
            >
              <Filter size={11} /> Limpar Filtros
            </button>
          )}
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-bg-secondary/40">
              <tr className="text-[9px] text-text-secondary uppercase font-black tracking-widest border-b border-divider/40">
                <th className="px-5 py-4">Código</th>
                <th className="px-5 py-4">Descrição</th>
                <th className="px-5 py-4">Marca</th>
                <th className="px-5 py-4">Grupo</th>
                <th className="px-5 py-4 text-center">ABC</th>
                <th className="px-5 py-4 text-right">Estoque</th>
                <th className="px-5 py-4 text-right">Custo Unit.</th>
                <th className="px-5 py-4 text-right">Preço Venda</th>
                <th className="px-5 py-4 text-right">Valor Total</th>
                <th className="px-5 py-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider/20">
              {paginatedData.map((row: any, i: number) => {
                const totalValor = (row.estoque || 0) * (row.custo || 0);
                const isNegativo = (row.estoque || 0) < 0;
                const isZero = (row.estoque || 0) === 0;

                return (
                  <tr key={i} className="hover:bg-indigo-50/40 dark:hover:bg-indigo-500/5 transition-colors cursor-default group">
                    <td className="px-5 py-3.5 font-mono font-black text-indigo-600 dark:text-indigo-400 text-xs">{row.cod}</td>
                    <td className="px-5 py-3.5 font-semibold text-text-primary text-xs max-w-[240px] truncate" title={row.desc}>{row.desc}</td>
                    <td className="px-5 py-3.5 text-text-secondary text-xs">{row.marca}</td>
                    <td className="px-5 py-3.5 text-text-secondary text-xs">{row.grupo}</td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={clsx('px-2 py-0.5 text-[9px] font-black rounded-md', abcStyle(row.abc))}>
                        {row.abc}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-xs">
                      {isNegativo ? (
                        <span className="inline-block px-2 py-0.5 rounded-md font-black bg-red-100 text-red-700 border border-red-200 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30">
                          {formatNum(row.estoque)}
                        </span>
                      ) : isZero ? (
                        <span className="text-text-muted font-normal">0,00</span>
                      ) : (
                        <span className="text-text-primary font-bold">{formatNum(row.estoque)}</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-text-secondary text-xs">{formatBRL(row.custo)}</td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-text-primary text-xs">{formatBRL(row.preco)}</td>
                    <td className="px-5 py-3.5 text-right font-mono text-xs">
                      {isNegativo ? (
                        <span className="text-red-600 dark:text-red-400 font-bold">{formatBRL(totalValor)}</span>
                      ) : isZero ? (
                        <span className="text-text-muted">R$ 0,00</span>
                      ) : (
                        <span className="font-black text-emerald-600 dark:text-emerald-400">{formatBRL(totalValor)}</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={clsx('px-2.5 py-0.5 text-[9px] font-black rounded-full uppercase tracking-wide', statusStyle(row.status))}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {paginatedData.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-5 py-12 text-center text-text-secondary font-semibold text-sm">
                    Nenhum produto encontrado para os filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-divider/40 flex items-center justify-between gap-4 flex-wrap bg-bg-secondary/10">
            <span className="text-xs font-semibold text-text-secondary">
              Página <span className="text-text-primary font-bold">{currentPage}</span> de <span className="text-text-primary font-bold">{totalPages}</span>
              <span className="ml-2 text-text-secondary">({filteredData.length} itens)</span>
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1}
                className="w-8 h-8 flex items-center justify-center rounded-xl border border-divider text-text-secondary hover:bg-bg-secondary hover:border-indigo-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all">
                <ChevronLeft size={10} className="mr-[-2px]" /><ChevronLeft size={10} />
              </button>
              <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}
                className="w-8 h-8 flex items-center justify-center rounded-xl border border-divider text-text-secondary hover:bg-bg-secondary hover:border-indigo-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all">
                <ChevronLeft size={13} />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                .reduce((acc: (number | string)[], p, idx, arr) => {
                  if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push('…');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, idx) =>
                  p === '…' ? (
                    <span key={`ellip-${idx}`} className="w-8 h-8 flex items-center justify-center text-xs text-text-secondary">…</span>
                  ) : (
                    <button key={p} onClick={() => setCurrentPage(p as number)}
                      className={clsx(
                        'w-8 h-8 flex items-center justify-center rounded-xl border text-xs font-bold transition-all cursor-pointer',
                        currentPage === p
                          ? 'bg-indigo-500 text-white border-indigo-500 shadow-sm shadow-indigo-500/30'
                          : 'border-divider text-text-secondary hover:bg-bg-secondary hover:border-indigo-300'
                      )}>{p}</button>
                  )
                )
              }

              <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}
                className="w-8 h-8 flex items-center justify-center rounded-xl border border-divider text-text-secondary hover:bg-bg-secondary hover:border-indigo-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all">
                <ChevronRight size={13} />
              </button>
              <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}
                className="w-8 h-8 flex items-center justify-center rounded-xl border border-divider text-text-secondary hover:bg-bg-secondary hover:border-indigo-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all">
                <ChevronRight size={10} className="ml-[-2px]" /><ChevronRight size={10} />
              </button>
            </div>
          </div>
        )}
      </div>

      {isError && (
        <div className="flex items-center gap-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 p-4 rounded-2xl text-sm">
          <AlertTriangle size={16} />
          Aviso: os dados não puderam ser carregados. Verifique a conexão com o banco de dados.
        </div>
      )}
    </div>
  );
}
