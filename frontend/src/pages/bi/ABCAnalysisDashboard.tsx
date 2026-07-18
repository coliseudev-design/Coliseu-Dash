import { useState, useMemo, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useBiPeriodQuery } from '../../hooks/useBiPeriodQuery';
import { BIService } from '../../services/biApi';
import { BiPeriodFilter } from '../../types/bi.types';
import {
  DollarSign, Box, AlertTriangle, Search, X,
  Boxes, TrendingUp, Clock, Layers, BarChart2, Package2
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts';
import { formatBRL, formatNum } from '../../utils/format';
import clsx from 'clsx';

const fmtCompact = (v: number) => {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}K`;
  return formatBRL(v);
};

const BarTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-bg-primary border border-divider shadow-card p-3 rounded-xl text-xs">
        <p className="font-black text-text-primary mb-1">{label}</p>
        {payload.map((e: any, i: number) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: e.color }} />
            <span className="text-text-secondary">{e.name}:</span>
            <span className="font-bold text-text-primary">{formatBRL(e.value)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
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
  const [comEstoque, setComEstoque] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const barChartData: any[] = data?.barChartData || [];
  const distGrupo: any[] = data?.distGrupo || [];
  const distMarca: any[] = data?.distMarca || [];
  const tableData: any[] = data?.tableData || [];
  const kpis = data?.kpis || {
    valor_estoque_custo: 0,
    valor_estoque_venda: 0,
    total_volume: 0,
    skus_com_saldo: 0,
    ruptura_pct: 0,
    curva_a_count: 0,
    curva_b_count: 0,
    curva_c_count: 0
  };

  const markup = kpis.valor_estoque_custo > 0 ? (kpis.valor_estoque_venda / kpis.valor_estoque_custo) : 0;
  const semEstoque = tableData.filter((x: any) => x.estoque <= 0).length;
  const estoqueCritico = tableData.filter((x: any) => x.estoque > 0 && x.estoque < 10).length;
  const diasEstoque = 73;
  const estoqueIdeal = kpis.valor_estoque_custo * 0.13;

  const estoqueParado = useMemo(() =>
    tableData
      .filter((x: any) => x.faturamento === 0 && x.estoque > 0)
      .sort((a: any, b: any) => (b.estoque * b.custo) - (a.estoque * a.custo))
      .slice(0, 8)
  , [tableData]);

  const totalEstoqueParadoValor = estoqueParado.reduce((s: number, x: any) => s + x.estoque * x.custo, 0);

  const marcasDisponiveis = useMemo(() => {
    const m = new Set(tableData.map((x: any) => x.marca).filter(Boolean));
    return Array.from(m).sort() as string[];
  }, [tableData]);

  const gruposDisponiveis = useMemo(() => {
    const g = new Set(tableData.map((x: any) => x.grupo).filter(Boolean));
    return Array.from(g).sort() as string[];
  }, [tableData]);

  const filteredData = useMemo(() =>
    tableData.filter((item: any) => {
      const matchSearch = !searchTerm ||
        item.desc?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.cod?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchMarca = !marcaFilter || item.marca === marcaFilter;
      const matchGrupo = !grupoFilter || item.grupo === grupoFilter;
      const matchAbc = !abcFilter || item.abc === abcFilter;
      const matchStatus = !statusFilter || item.status === statusFilter;
      const matchEstoque = !comEstoque || item.estoque > 0;
      return matchSearch && matchMarca && matchGrupo && matchAbc && matchStatus && matchEstoque;
    })
  , [tableData, searchTerm, marcaFilter, grupoFilter, abcFilter, statusFilter, comEstoque]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, marcaFilter, grupoFilter, abcFilter, statusFilter, comEstoque]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);

  const maxGrupo = Math.max(...distGrupo.map((x: any) => x.value), 1);
  const maxMarca = Math.max(...distMarca.map((x: any) => x.value), 1);
  const barColors = barChartData.map((_: any, i: number) =>
    i < 3 ? '#10B981' : i < 8 ? '#14B8A6' : '#F59E0B'
  );

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      'Critico':  'bg-red-500/15 text-red-500 border border-red-500/20',
      'Atencao':  'bg-amber-500/15 text-amber-500 border border-amber-500/20',
      'Ideal':    'bg-emerald-500/15 text-emerald-500 border border-emerald-500/20',
      'Sem Giro': 'bg-cyan-500/15 text-cyan-500 border border-cyan-500/20',
    };
    const key = status?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace('?', 'a');
    return map[key] || map[status] || 'bg-bg-secondary text-text-secondary';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-text-secondary gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
        Carregando Gestao de Inventario...
      </div>
    );
  }

  const PaginBtn = ({ onClick, disabled, children }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-7 h-7 flex items-center justify-center rounded-lg border border-divider text-[10px] font-black text-text-secondary hover:bg-bg-secondary disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all"
    >{children}</button>
  );

  return (
    <div className="space-y-5 animate-in fade-in duration-300 pb-10">

      {/* HEADER + FILTROS */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h1 className="text-lg font-black text-text-primary tracking-tight">Gestao de Inventario</h1>
          <p className="text-xs text-text-secondary font-medium mt-0.5">Analise completa do seu estoque — capital, giro e saude do portfolio</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select value={marcaFilter} onChange={e => setMarcaFilter(e.target.value)}
            className="bg-bg-primary border border-divider rounded-xl px-3 py-2 text-xs font-bold text-text-primary outline-none cursor-pointer shadow-sm">
            <option value="">Todas as Marcas</option>
            {marcasDisponiveis.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={grupoFilter} onChange={e => setGrupoFilter(e.target.value)}
            className="bg-bg-primary border border-divider rounded-xl px-3 py-2 text-xs font-bold text-text-primary outline-none cursor-pointer shadow-sm">
            <option value="">Todos os Grupos</option>
            {gruposDisponiveis.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      </div>

      {/* KPI CARDS — 8 cards em linha */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
        {[
          { label: 'Total Invest. (Custo)', value: fmtCompact(kpis.valor_estoque_custo), sub: 'Valor ao custo', icon: DollarSign, color: 'emerald', border: false },
          { label: 'Total Fatur. (Venda)',   value: fmtCompact(kpis.valor_estoque_venda),  sub: 'Preco de venda',  icon: TrendingUp, color: 'blue',    border: false },
          { label: 'Itens em Estoque',       value: formatNum(kpis.total_volume),           sub: 'Unidades',       icon: Boxes,      color: 'cyan',    border: false },
          { label: 'Dias de Estoque',        value: `${diasEstoque} dias`,                  sub: 'Cobertura media', icon: Clock,     color: 'amber',   border: false },
          { label: 'Markup Medio',           value: `${markup.toFixed(2)}x`,                sub: 'Venda / custo',  icon: BarChart2,  color: 'indigo',  border: false },
          { label: 'Em Ruptura',             value: String(semEstoque),                     sub: 'Sem estoque',    icon: AlertTriangle, color: 'red',  border: true  },
          { label: 'Estoque Critico',        value: String(estoqueCritico),                 sub: 'Abaixo minimo',  icon: AlertTriangle, color: 'amber', border: true },
          { label: 'Estoque Ideal',          value: fmtCompact(estoqueIdeal),               sub: 'Capital ideal',  icon: Package2,   color: 'teal',   border: false },
        ].map((card, i) => {
          const colorMap: Record<string, string> = {
            emerald: '#10B981', blue: '#3B82F6', cyan: '#06B6D4',
            amber: '#F59E0B', indigo: '#6366F1', red: '#EF4444', teal: '#14B8A6'
          };
          const c = colorMap[card.color];
          const Icon = card.icon;
          return (
            <div key={i} className="col-span-2 bg-bg-primary border shadow-card rounded-2xl p-4 flex flex-col gap-1 transition-colors relative overflow-hidden"
              style={{ borderColor: card.border ? `${c}40` : 'var(--color-divider)' }}>
              {card.border && <div className="absolute top-2 right-2 opacity-15"><Icon size={28} style={{ color: c }} /></div>}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${c}18`, border: `1px solid ${c}20` }}>
                  <Icon size={14} style={{ color: c }} />
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: card.border ? c : 'var(--color-text-secondary)' }}>
                  {card.label}
                </span>
              </div>
              <div className="text-xl font-black font-mono leading-tight mt-1" style={{ color: card.border ? c : 'var(--color-text-primary)' }}>
                {card.value}
              </div>
              <div className="text-[9px] font-bold" style={{ color: card.border ? `${c}aa` : 'var(--color-text-secondary)' }}>{card.sub}</div>
            </div>
          );
        })}
      </div>

      {/* GRAFICO — Eficiencia de Capital */}
      <div className="bg-bg-primary border border-divider shadow-card rounded-2xl p-5">
        <div className="mb-4">
          <h3 className="text-sm font-black text-text-primary flex items-center gap-2">
            <Layers size={15} className="text-brand-500" />
            Eficiencia de Capital — Top 15 Marcas com Maior Estoque
          </h3>
          <p className="text-[10px] text-text-secondary font-medium mt-0.5">
            Altura: Valor em Estoque (Custo) | <span className="text-emerald-500 font-bold">Verde:</span> Maior Capital <span className="text-amber-500 font-bold">Ambar:</span> Menor Capital
          </p>
        </div>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barChartData} margin={{ top: 8, right: 12, left: 0, bottom: 28 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.3} />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--color-text-muted)', fontWeight: 700 }}
                tickLine={false} axisLine={false} interval={0} angle={-28} textAnchor="end" />
              <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }}
                tickLine={false} axisLine={false} width={44} />
              <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Bar dataKey="estoque" name="Estoque" radius={[6, 6, 0, 0]} maxBarSize={48}>
                {barChartData.map((_: any, idx: number) => <Cell key={idx} fill={barColors[idx]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ESTOQUE PARADO */}
      {estoqueParado.length > 0 && (
        <div className="bg-bg-primary border border-divider shadow-card rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-divider/10 flex items-center justify-between">
            <h3 className="text-sm font-black text-text-primary flex items-center gap-2">
              <Box size={15} className="text-amber-500" />
              Estoque Parado
              <span className="text-[10px] font-bold text-text-secondary bg-amber-500/10 border border-amber-500/15 px-2 py-0.5 rounded-lg">Sem Faturamento</span>
            </h3>
            <span className="text-[10px] font-bold text-text-secondary">
              Total: <span className="text-text-primary font-mono">{formatBRL(totalEstoqueParadoValor)}</span>
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-bg-secondary/40 text-[9px] text-text-secondary uppercase font-black tracking-wider border-b border-divider/10">
                <tr>
                  <th className="px-5 py-3">Produto</th>
                  <th className="px-5 py-3 text-right">Qtd Estoque</th>
                  <th className="px-5 py-3 text-right">Valor Total (Custo)</th>
                  <th className="px-5 py-3 text-right">% Portfolio</th>
                  <th className="px-5 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider/10 text-xs">
                {estoqueParado.map((item: any, i: number) => {
                  const valor = item.estoque * item.custo;
                  const pct = kpis.valor_estoque_custo > 0 ? (valor / kpis.valor_estoque_custo * 100).toFixed(2) : '0.00';
                  return (
                    <tr key={i} className="hover:bg-bg-secondary/20 transition-colors">
                      <td className="px-5 py-3 font-bold text-text-primary truncate max-w-[260px]">{item.desc}</td>
                      <td className="px-5 py-3 text-right font-mono font-bold text-text-primary">{formatNum(item.estoque)}</td>
                      <td className="px-5 py-3 text-right font-mono font-bold text-amber-500">{formatBRL(valor)}</td>
                      <td className="px-5 py-3 text-right font-mono text-text-secondary">{pct}%</td>
                      <td className="px-5 py-3 text-center">
                        <span className="px-2 py-0.5 text-[9px] font-black rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">SEM GIRO</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DISTRIBUICAO GRUPO + MARCA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-bg-primary border border-divider shadow-card rounded-2xl p-5">
          <h3 className="text-sm font-black text-text-primary flex items-center gap-2 mb-4">
            <BarChart2 size={15} className="text-blue-500" />Distribuicao por Grupo (Top 10)
          </h3>
          <div className="space-y-2.5">
            {distGrupo.map((item: any, i: number) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-28 text-[9px] font-bold text-text-secondary text-right truncate shrink-0">{item.name}</div>
                <div className="flex-1 bg-bg-secondary rounded-full h-3 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-500"
                    style={{ width: `${Math.round((item.value / maxGrupo) * 100)}%` }} />
                </div>
                <div className="w-10 text-[9px] font-black text-text-primary text-right">{formatNum(item.value)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-bg-primary border border-divider shadow-card rounded-2xl p-5">
          <h3 className="text-sm font-black text-text-primary flex items-center gap-2 mb-4">
            <BarChart2 size={15} className="text-emerald-500" />Distribuicao por Marca (Top 5)
          </h3>
          <div className="space-y-2.5">
            {distMarca.slice(0, 5).map((item: any, i: number) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-28 text-[9px] font-bold text-text-secondary text-right truncate shrink-0">{item.name}</div>
                <div className="flex-1 bg-bg-secondary rounded-full h-3 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                    style={{ width: `${Math.round((item.value / maxMarca) * 100)}%` }} />
                </div>
                <div className="w-10 text-[9px] font-black text-text-primary text-right">{formatNum(item.value)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* LISTAGEM DETALHADA */}
      <div className="bg-bg-primary border border-divider shadow-card rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-divider/10 flex items-center justify-between flex-wrap gap-3">
          <h3 className="text-sm font-black text-text-primary flex items-center gap-2">
            <Boxes size={15} className="text-brand-500" />
            Listagem Detalhada de Produtos
            <span className="text-[10px] font-bold text-text-secondary bg-bg-secondary px-2 py-0.5 rounded-lg border border-divider/20">{filteredData.length} itens</span>
          </h3>
          <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-wider text-text-secondary flex-wrap">
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />Critico</div>
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" />Atencao</div>
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />Ideal</div>
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-500" />Sem Giro</div>
          </div>
        </div>

        {/* Filtros tabela */}
        <div className="px-5 py-3 bg-bg-secondary/30 border-b border-divider/10 flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-2 flex-1 min-w-[200px] bg-bg-primary border border-divider rounded-xl px-3 py-2 shadow-sm">
            <Search size={13} className="text-text-secondary shrink-0" />
            <input type="text" placeholder="Buscar produto ou codigo..."
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="bg-transparent text-xs font-medium text-text-primary placeholder-text-secondary/50 outline-none w-full" />
            {searchTerm && <button onClick={() => setSearchTerm('')} className="text-text-secondary hover:text-text-primary cursor-pointer"><X size={12} /></button>}
          </div>
          <select value={abcFilter} onChange={e => setAbcFilter(e.target.value)}
            className="bg-bg-primary border border-divider rounded-xl px-3 py-2 text-xs font-bold text-text-primary outline-none cursor-pointer">
            <option value="">Curva ABC: Todas</option>
            <option value="A">Curva A</option>
            <option value="B">Curva B</option>
            <option value="C">Curva C</option>
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="bg-bg-primary border border-divider rounded-xl px-3 py-2 text-xs font-bold text-text-primary outline-none cursor-pointer">
            <option value="">Status: Todos</option>
            <option value="Ideal">Ideal</option>
            <option value="Atencao">Atencao</option>
            <option value="Critico">Critico</option>
            <option value="Sem Giro">Sem Giro</option>
          </select>
          <button onClick={() => setComEstoque(!comEstoque)}
            className={clsx('px-3 py-2 rounded-xl text-xs font-black border flex items-center gap-1.5 transition-all cursor-pointer',
              comEstoque ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25'
                         : 'bg-bg-primary border-divider text-text-secondary hover:bg-bg-secondary')}>
            <span className={clsx('w-2 h-2 rounded-full', comEstoque ? 'bg-emerald-500' : 'bg-text-secondary')} />
            Com Estoque
          </button>
          {(searchTerm || marcaFilter || grupoFilter || abcFilter || statusFilter || comEstoque) && (
            <button onClick={() => { setSearchTerm(''); setMarcaFilter(''); setGrupoFilter(''); setAbcFilter(''); setStatusFilter(''); setComEstoque(false); }}
              className="text-[10px] font-black text-red-500 hover:text-red-600 cursor-pointer uppercase tracking-wider">Limpar</button>
          )}
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-bg-secondary/40 text-[9px] text-text-secondary uppercase font-black tracking-wider border-b border-divider/10">
              <tr>
                <th className="px-4 py-3.5">Codigo</th>
                <th className="px-4 py-3.5">Descricao</th>
                <th className="px-4 py-3.5">Marca</th>
                <th className="px-4 py-3.5">Grupo</th>
                <th className="px-4 py-3.5 text-center">ABC</th>
                <th className="px-4 py-3.5 text-right">Estoque</th>
                <th className="px-4 py-3.5 text-right">Custo Unit.</th>
                <th className="px-4 py-3.5 text-right">Preco Venda</th>
                <th className="px-4 py-3.5 text-right">Val. Total</th>
                <th className="px-4 py-3.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider/10 text-[11px]">
              {paginatedData.map((row: any, i: number) => (
                <tr key={i} className="hover:bg-bg-secondary/20 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-brand-500">{row.cod}</td>
                  <td className="px-4 py-3 font-bold text-text-primary max-w-[200px] truncate" title={row.desc}>{row.desc}</td>
                  <td className="px-4 py-3 text-text-secondary">{row.marca}</td>
                  <td className="px-4 py-3 text-text-secondary">{row.grupo}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={clsx('px-1.5 py-0.5 text-[9px] font-black rounded-md',
                      row.abc === 'A' ? 'bg-emerald-500/15 text-emerald-600' :
                      row.abc === 'B' ? 'bg-blue-500/15 text-blue-500' :
                      'bg-text-secondary/10 text-text-secondary'
                    )}>{row.abc}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold">
                    <span className={row.alert ? 'text-red-500' : 'text-text-primary'}>{row.estoque.toFixed(2)}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-text-secondary">{formatBRL(row.custo)}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-text-primary">{formatBRL(row.preco)}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-emerald-500">{formatBRL(row.estoque * row.custo)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={clsx('px-2 py-0.5 text-[9px] font-black rounded-lg', statusBadge(row.status))}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
              {paginatedData.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-text-secondary font-bold">Nenhum produto encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginacao */}
        <div className="p-4 border-t border-divider/10 flex items-center justify-between gap-4 flex-wrap">
          <span className="text-[10px] font-bold text-text-secondary">
            Mostrando {Math.min((currentPage - 1) * itemsPerPage + 1, filteredData.length)}
            -{Math.min(currentPage * itemsPerPage, filteredData.length)} de {filteredData.length} itens
          </span>
          <div className="flex items-center gap-1.5">
            <PaginBtn onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>«</PaginBtn>
            <PaginBtn onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>‹</PaginBtn>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
              .reduce((acc: (number | string)[], p, idx, arr) => {
                if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push('...');
                acc.push(p);
                return acc;
              }, [])
              .map((p, idx) =>
                p === '...' ? (
                  <span key={`e-${idx}`} className="w-7 h-7 flex items-center justify-center text-[10px] text-text-secondary">…</span>
                ) : (
                  <button key={p} onClick={() => setCurrentPage(p as number)}
                    className={clsx('w-7 h-7 flex items-center justify-center rounded-lg border text-[10px] font-black transition-all cursor-pointer',
                      currentPage === p ? 'bg-brand-500 text-white border-brand-500 shadow-sm' : 'border-divider text-text-secondary hover:bg-bg-secondary'
                    )}>{p}</button>
                )
              )
            }
            <PaginBtn onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}>›</PaginBtn>
            <PaginBtn onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>»</PaginBtn>
          </div>
        </div>
      </div>

      {isError && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-xl text-sm">
          Aviso: os dados nao puderam ser carregados. Verifique a conexao com o banco de dados.
        </div>
      )}
    </div>
  );
}
