import { useState, useMemo, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useBiPeriodQuery } from '../../hooks/useBiPeriodQuery';
import { BIService } from '../../services/biApi';
import { BiPeriodFilter } from '../../types/bi.types';
import {
  DollarSign, AlertTriangle, Search, X, Eye, EyeOff,
  Boxes, TrendingUp, TrendingDown, Clock, Layers, BarChart2,
  Package2, ChevronLeft, ChevronRight, Filter, CircleDollarSign,
  ShieldAlert, RefreshCw, Zap, Archive, CheckCircle2, AlertCircle
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts';
import { formatBRL, formatNum } from '../../utils/format';
import clsx from 'clsx';

const fmtCompact = (v: number) => {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(1)}K`;
  return formatBRL(v);
};

// Tooltip customizado para o gráfico de barras
const BarTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload;
  return (
    <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/60 rounded-xl p-3 shadow-2xl text-xs z-50">
      <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-1.5">{label}</p>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-300">Valor em Estoque:</span>
          <span className="text-emerald-400 font-black font-mono">{formatBRL(item?.valor_custo || item?.estoque || 0)}</span>
        </div>
        {item?.qtd_itens !== undefined && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-300">Volume Físico:</span>
            <span className="text-white font-bold">{formatNum(item.qtd_itens)} un</span>
          </div>
        )}
        {item?.pct_total !== undefined && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-300">% do Total:</span>
            <span className="text-indigo-300 font-bold">{item.pct_total.toFixed(1)}%</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default function InventoryManagementDashboard() {
  const { filter } = useOutletContext<{ filter: BiPeriodFilter }>();

  const { data, isLoading, isError } = useBiPeriodQuery(
    ['bi', 'inventory'],
    BIService.getInventoryManagement || BIService.getABCAnalysis,
    filter
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [marcaFilter, setMarcaFilter] = useState('');
  const [grupoFilter, setGrupoFilter] = useState('');
  const [statusGiroFilter, setStatusGiroFilter] = useState('');
  const [statusCoberturaFilter, setStatusCoberturaFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'todos' | 'critico' | 'atencao' | 'ideal' | 'excesso'>('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeBarIdx, setActiveBarIdx] = useState<number | null>(null);
  const itemsPerPage = 35;

  const rawBarChartData: any[] = data?.barChartData || data?.topMarcasEstoque || [];
  const distGrupo: any[] = data?.distGrupo || [];
  const distMarca: any[] = data?.distMarca || [];
  const tableData: any[] = data?.tableData || [];
  const kpis = data?.kpis || {
    valor_estoque_custo: 0,
    valor_estoque_venda: 0,
    total_volume: 0,
    cobertura_media_dias: 82,
    giro_turnover: 4.39,
    skus_zerados: 0,
    skus_com_saldo: 0,
    margem_critica: 0,
    estoque_morto: 0,
    total_skus: 0,
    ruptura_pct: 0
  };

  const marcasDisponiveis = useMemo(() => {
    return Array.from(new Set(tableData.map((x: any) => x.marca).filter(Boolean))).sort() as string[];
  }, [tableData]);

  const gruposDisponiveis = useMemo(() => {
    return Array.from(new Set(tableData.map((x: any) => x.grupo).filter(Boolean))).sort() as string[];
  }, [tableData]);

  // Lista de marcas para o gráfico (top 10 ordenado com percentuais calculados)
  const chartData = useMemo(() => {
    if (!rawBarChartData.length) return [];
    const totalCusto = kpis.valor_estoque_custo || rawBarChartData.reduce((acc, curr) => acc + (curr.valor_custo || curr.estoque || 0), 0);
    return rawBarChartData.slice(0, 10).map((item, idx) => {
      const val = item.valor_custo || item.estoque || 0;
      const pct = totalCusto > 0 ? (val / totalCusto) * 100 : 0;
      let cor = '#10B981'; // Verde padrão
      if (idx === 2 || idx === 8) cor = '#F59E0B'; // Amarelo
      if (idx === 6) cor = '#EF4444'; // Vermelho atenção
      return {
        ...item,
        name: item.marca || item.name,
        valor_custo: val,
        estoque: val,
        pct_total: pct,
        cor: item.color || cor
      };
    });
  }, [rawBarChartData, kpis.valor_estoque_custo]);

  // Filtros aplicados na tabela de produtos
  const filteredData = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return tableData.filter((item: any) => {
      const matchSearch = !term ||
        item.desc?.toLowerCase().includes(term) ||
        item.cod?.toLowerCase().includes(term) ||
        item.cod_barra?.toLowerCase().includes(term) ||
        String(item.id_firebird || '').toLowerCase().includes(term);

      const matchMarca = !marcaFilter || item.marca === marcaFilter;
      const matchGrupo = !grupoFilter || item.grupo === grupoFilter;

      let matchStatusGiro = true;
      if (statusGiroFilter) {
        matchStatusGiro = item.status === statusGiroFilter;
      }

      let matchStatusCobertura = true;
      if (statusCoberturaFilter) {
        if (statusCoberturaFilter === 'sem_giro') matchStatusCobertura = item.cobertura_dias === 999;
        else if (statusCoberturaFilter === 'critico') matchStatusCobertura = item.cobertura_dias < 15;
        else if (statusCoberturaFilter === 'atencao') matchStatusCobertura = item.cobertura_dias >= 15 && item.cobertura_dias < 30;
        else if (statusCoberturaFilter === 'ideal') matchStatusCobertura = item.cobertura_dias >= 30 && item.cobertura_dias <= 90;
        else if (statusCoberturaFilter === 'excesso') matchStatusCobertura = item.cobertura_dias > 90 && item.cobertura_dias < 999;
      }

      let matchTab = true;
      if (activeTab === 'critico') matchTab = item.status === 'Crítico' || item.status === 'Ruptura';
      else if (activeTab === 'atencao') matchTab = item.status === 'Atenção';
      else if (activeTab === 'ideal') matchTab = item.status === 'Ideal';
      else if (activeTab === 'excesso') matchTab = item.status === 'Excesso' || item.status === 'Sem Giro';

      return matchSearch && matchMarca && matchGrupo && matchStatusGiro && matchStatusCobertura && matchTab;
    });
  }, [tableData, searchTerm, marcaFilter, grupoFilter, statusGiroFilter, statusCoberturaFilter, activeTab]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, marcaFilter, grupoFilter, statusGiroFilter, statusCoberturaFilter, activeTab]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  const maxGrupo = useMemo(() => Math.max(...distGrupo.map(g => g.value), 1), [distGrupo]);
  const maxMarca = useMemo(() => Math.max(...distMarca.map(m => m.value), 1), [distMarca]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] space-y-4">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-semibold text-text-secondary animate-pulse">
          Carregando indicadores de inventário e estoque...
        </span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6 bg-red-500/5 border border-red-500/20 rounded-2xl">
        <AlertTriangle className="text-red-500 mb-3" size={40} />
        <h3 className="text-lg font-bold text-text-primary">Erro ao carregar dados do inventário</h3>
        <p className="text-sm text-text-secondary mt-1">Verifique sua conexão ou permissões e tente novamente.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* ══ HEADER ══════════════════════════════════════════ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight">
            Gestão de inventário
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary font-medium mt-0.5">
            Métricas gerenciais, perfil de estoque e controle de reposição/giro.
          </p>
        </div>
      </div>

      {/* ══ FILTROS SUPERIORES ══════════════════════════════ */}
      <div className="bg-bg-primary border border-divider/60 rounded-2xl p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-text-secondary mb-1">
              Filtrar por Marca
            </label>
            <select
              value={marcaFilter}
              onChange={e => setMarcaFilter(e.target.value)}
              className="w-full bg-bg-secondary/60 border border-border/80 rounded-xl px-3 py-2 text-xs font-semibold text-text-primary focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
            >
              <option value="">Todas as Marcas</option>
              {marcasDisponiveis.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-text-secondary mb-1">
              Filtrar por Grupo
            </label>
            <select
              value={grupoFilter}
              onChange={e => setGrupoFilter(e.target.value)}
              className="w-full bg-bg-secondary/60 border border-border/80 rounded-xl px-3 py-2 text-xs font-semibold text-text-primary focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
            >
              <option value="">Todos os Grupos</option>
              {gruposDisponiveis.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {(marcaFilter || grupoFilter) && (
            <div className="flex items-end">
              <button
                onClick={() => { setMarcaFilter(''); setGrupoFilter(''); }}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-500/10 rounded-xl border border-red-500/20 transition-all cursor-pointer h-[34px]"
              >
                <X size={14} /> Limpar Filtros
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ══ 8 KPI CARDS (2 LINHAS DE 4 CARDS) ════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Linha 1 */}
        {/* Card 1: Valor Estoque Custo */}
        <div className="bg-bg-primary border border-divider/70 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
              <span className="text-emerald-500">💎</span> Valor Estoque (Custo)
            </span>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black font-mono text-text-primary tracking-tight">
              {formatBRL(kpis.valor_estoque_custo)}
            </div>
            <div className="text-[10px] text-text-secondary font-medium mt-0.5">
              Custo total em estoque
            </div>
          </div>
        </div>

        {/* Card 2: Valor Estoque Venda */}
        <div className="bg-bg-primary border border-divider/70 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
              <span className="text-blue-500">💲</span> Valor Estoque (Venda)
            </span>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black font-mono text-text-primary tracking-tight">
              {formatBRL(kpis.valor_estoque_venda)}
            </div>
            <div className="text-[10px] text-text-secondary font-medium mt-0.5">
              Potencial de venda
            </div>
          </div>
        </div>

        {/* Card 3: Total Itens / Volume */}
        <div className="bg-bg-primary border border-divider/70 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
              <span className="text-cyan-500">📦</span> Total Itens / Volume
            </span>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black font-mono text-text-primary tracking-tight">
              {formatNum(kpis.total_volume)}
            </div>
            <div className="text-[10px] text-text-secondary font-medium mt-0.5">
              Unidades físicas totais
            </div>
          </div>
        </div>

        {/* Card 4: Cobertura Média */}
        <div className="bg-bg-primary border border-divider/70 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
              <span className="text-amber-500">⏳</span> Cobertura Média
            </span>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black font-mono text-text-primary tracking-tight">
              {kpis.cobertura_media_dias} dias
            </div>
            <div className="text-[10px] text-text-secondary font-medium mt-0.5">
              Dias de estoque estimado
            </div>
          </div>
        </div>

        {/* Linha 2 */}
        {/* Card 5: Giro / Turnover */}
        <div className="bg-bg-primary border border-divider/70 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
              <span className="text-emerald-500">⚡</span> Giro / Turnover
            </span>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black font-mono text-text-primary tracking-tight">
              {kpis.giro_turnover}x
            </div>
            <div className="text-[10px] text-text-secondary font-medium mt-0.5">
              O giro nos últimos meses
            </div>
          </div>
        </div>

        {/* Card 6: Ruptura (Zerado) - Alerta Vermelho */}
        <div className="bg-red-500/5 border-2 border-red-500/30 rounded-2xl p-4 shadow-sm flex flex-col justify-between relative overflow-hidden hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-red-500 uppercase tracking-wider">
              RUPTURA (ZERADO)
            </span>
            <AlertCircle size={15} className="text-red-500" />
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-black font-mono text-red-500 tracking-tight">
              {formatNum(kpis.skus_zerados)}
            </div>
            <div className="text-[10px] text-red-400/90 font-semibold mt-0.5">
              Itens com estoque zero
            </div>
          </div>
        </div>

        {/* Card 7: Margem Crítica */}
        <div className="bg-bg-primary border border-divider/70 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
              <span className="text-amber-500">🔒</span> Margem Crítica
            </span>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black font-mono text-text-primary tracking-tight">
              {formatNum(kpis.margem_critica)}
            </div>
            <div className="text-[10px] text-text-secondary font-medium mt-0.5">
              Abaixo do mínimo
            </div>
          </div>
        </div>

        {/* Card 8: Estoque Morto */}
        <div className="bg-bg-primary border border-divider/70 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
              <span className="text-indigo-400">💰</span> Estoque Morto
            </span>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black font-mono text-text-primary tracking-tight">
              {formatBRL(kpis.estoque_morto)}
            </div>
            <div className="text-[10px] text-text-secondary font-medium mt-0.5">
              Sem saída &gt; 90 dias
            </div>
          </div>
        </div>
      </div>

      {/* ══ GRÁFICO — EXIGÊNCIA DE CAPITAL (TOP 10 MARCAS) ═══ */}
      <div className="bg-bg-primary border border-divider/70 rounded-3xl shadow-sm p-6 space-y-6 hover:shadow-md transition-shadow">
        <div>
          <h3 className="text-base font-black text-text-primary tracking-tight flex items-center gap-2">
            <span className="text-emerald-500">📊</span> EXIGÊNCIA DE CAPITAL (TOP 10 MARCAS)
          </h3>
          <p className="text-[11px] text-text-secondary font-medium mt-0.5">
            Volume financeiro retido em estoque por marca com distribuição percentual / status de giro
          </p>
        </div>

        {/* Recharts Bar Chart */}
        <div className="h-64 sm:h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 10, bottom: 40 }}
              onMouseLeave={() => setActiveBarIdx(null)}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.25} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 9, fill: 'var(--color-text-muted)', fontWeight: 700 }}
                tickLine={false}
                axisLine={false}
                interval={0}
                angle={-25}
                textAnchor="end"
              />
              <YAxis
                tickFormatter={fmtCompact}
                tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }}
                tickLine={false}
                axisLine={false}
                width={56}
              />
              <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(16, 185, 129, 0.05)', radius: 8 } as any} />
              <Bar
                dataKey="estoque"
                name="Valor em Estoque"
                radius={[6, 6, 0, 0]}
                maxBarSize={48}
                onMouseEnter={(_: any, index: number) => setActiveBarIdx(index)}
              >
                {chartData.map((entry: any, idx: number) => (
                  <Cell
                    key={idx}
                    fill={entry.cor}
                    opacity={activeBarIdx === null || activeBarIdx === idx ? 1 : 0.4}
                    style={{ transition: 'all 0.2s' }}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Tabela Estoque por Marca */}
        <div className="pt-4 border-t border-divider/60">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-black text-text-primary uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> ESTOQUE POR MARCA
            </h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-divider/60 text-[10px] font-extrabold uppercase tracking-wider text-text-secondary">
                  <th className="py-2.5 px-3">MARCA</th>
                  <th className="py-2.5 px-3 text-right">QTD ITENS</th>
                  <th className="py-2.5 px-3 text-right">VALOR EM ESTOQUE (CUSTO)</th>
                  <th className="py-2.5 px-3 text-right">% DO TOTAL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider/40">
                {chartData.map((item: any, idx: number) => (
                  <tr key={idx} className="hover:bg-bg-secondary/40 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-text-primary uppercase truncate max-w-[200px]">
                      {item.name}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-text-secondary">
                      {formatNum(item.qtd_itens || 0)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-black font-mono text-text-primary">
                      {formatBRL(item.valor_custo || item.estoque || 0)}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-2.5">
                        <div className="w-16 bg-bg-secondary h-1.5 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${Math.min(100, item.pct_total || 0)}%` }}
                          />
                        </div>
                        <span className="font-extrabold text-[11px] text-text-primary min-w-[42px] text-right">
                          {(item.pct_total || 0).toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ══ DISTRIBUIÇÃO GRUPO + MARCA (LADO A LADO) ═════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribuição por Grupo */}
        <div className="bg-bg-primary border border-divider/70 rounded-3xl shadow-sm p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-5">
            <span className="text-blue-500">🔷</span>
            <h3 className="text-sm font-black text-text-primary uppercase tracking-wider">
              DISTRIBUIÇÃO POR GRUPO (TOP 10)
            </h3>
          </div>
          <div className="space-y-3">
            {distGrupo.map((item: any, i: number) => {
              const pct = Math.round((item.value / maxGrupo) * 100);
              const rank = i + 1;
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-500 text-[10px] font-black flex items-center justify-center shrink-0">
                    {rank}
                  </span>
                  <div className="w-32 text-[11px] font-bold text-text-secondary text-right truncate shrink-0" title={item.name}>
                    {item.name}
                  </div>
                  <div className="flex-1 bg-bg-secondary rounded-full h-2.5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="w-12 text-[11px] font-black text-text-primary text-right shrink-0">
                    {formatNum(item.value)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Distribuição por Marca */}
        <div className="bg-bg-primary border border-divider/70 rounded-3xl shadow-sm p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-5">
            <span className="text-emerald-500">🟢</span>
            <h3 className="text-sm font-black text-text-primary uppercase tracking-wider">
              DISTRIBUIÇÃO POR MARCA (TOP 10)
            </h3>
          </div>
          <div className="space-y-3">
            {distMarca.map((item: any, i: number) => {
              const pct = Math.round((item.value / maxMarca) * 100);
              const rank = i + 1;
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-black flex items-center justify-center shrink-0">
                    {rank}
                  </span>
                  <div className="w-32 text-[11px] font-bold text-text-secondary text-right truncate shrink-0" title={item.name}>
                    {item.name}
                  </div>
                  <div className="flex-1 bg-bg-secondary rounded-full h-2.5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="w-12 text-[11px] font-black text-text-primary text-right shrink-0">
                    {formatNum(item.value)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ══ LISTAGEM DETALHADA DE PRODUTOS ═══════════════════ */}
      <div className="bg-bg-primary border border-divider/70 rounded-3xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
        {/* Header do Card com Barra de Filtros */}
        <div className="p-6 border-b border-divider/60 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-base font-black text-text-primary uppercase tracking-wider flex items-center gap-2">
                <span className="text-emerald-500">📋</span> LISTAGEM DETALHADA DE PRODUTOS
              </h3>
              <p className="text-[11px] text-text-secondary font-medium mt-0.5">
                {filteredData.length} produtos correspondentes aos filtros aplicados
              </p>
            </div>
          </div>

          {/* Filtros em Linha: Busca + Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Código ou descrição do produto..."
                className="w-full bg-bg-secondary/60 border border-border/80 rounded-xl pl-9 pr-8 py-2 text-xs font-semibold text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
                  <X size={14} />
                </button>
              )}
            </div>

            <div>
              <select
                value={statusGiroFilter}
                onChange={e => setStatusGiroFilter(e.target.value)}
                className="w-full bg-bg-secondary/60 border border-border/80 rounded-xl px-3 py-2 text-xs font-semibold text-text-primary focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
              >
                <option value="">Status de Giro (Todos)</option>
                <option value="Ideal">Ideal</option>
                <option value="Atenção">Atenção</option>
                <option value="Crítico">Crítico</option>
                <option value="Sem Giro">Sem Giro</option>
                <option value="Ruptura">Ruptura</option>
                <option value="Excesso">Excesso</option>
              </select>
            </div>

            <div>
              <select
                value={statusCoberturaFilter}
                onChange={e => setStatusCoberturaFilter(e.target.value)}
                className="w-full bg-bg-secondary/60 border border-border/80 rounded-xl px-3 py-2 text-xs font-semibold text-text-primary focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
              >
                <option value="">Status de Cobertura (Todos)</option>
                <option value="critico">Crítico (&lt; 15 dias)</option>
                <option value="atencao">Atenção (15 a 30 dias)</option>
                <option value="ideal">Ideal (30 a 90 dias)</option>
                <option value="excesso">Excesso (&gt; 90 dias)</option>
                <option value="sem_giro">Sem Giro</option>
              </select>
            </div>

            <div>
              <select
                value={marcaFilter}
                onChange={e => setMarcaFilter(e.target.value)}
                className="w-full bg-bg-secondary/60 border border-border/80 rounded-xl px-3 py-2 text-xs font-semibold text-text-primary focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
              >
                <option value="">Marca (Todas)</option>
                {marcasDisponiveis.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Filter Tabs */}
          <div className="flex items-center gap-2 pt-2 border-t border-divider/40 overflow-x-auto pb-1">
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'critico', label: '🔴 Crítico' },
              { id: 'atencao', label: '🟡 Atenção' },
              { id: 'ideal', label: '🟢 Ideal' },
              { id: 'excesso', label: '⚪ Excesso / Sem Giro' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={clsx(
                  'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer',
                  activeTab === tab.id
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'bg-bg-secondary/70 text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[1000px]">
            <thead>
              <tr className="border-b border-divider/70 bg-bg-secondary/30 text-[10px] font-extrabold uppercase tracking-wider text-text-secondary">
                <th className="py-3 px-4">CÓDIGO</th>
                <th className="py-3 px-4 min-w-[280px]">DESCRIÇÃO</th>
                <th className="py-3 px-3 text-center">UN</th>
                <th className="py-3 px-4">MARCA</th>
                <th className="py-3 px-4">GRUPO</th>
                <th className="py-3 px-3 text-center">STATUS</th>
                <th className="py-3 px-3 text-center">COBERTURA</th>
                <th className="py-3 px-3 text-right">VENDA / MÊS</th>
                <th className="py-3 px-3 text-right">CUSTO</th>
                <th className="py-3 px-4 text-right">PREÇO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider/40">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-text-muted font-semibold">
                    Nenhum produto encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                paginatedData.map((item: any, idx: number) => {
                  let statusBadge = (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      Ideal
                    </span>
                  );
                  if (item.status === 'Crítico') {
                    statusBadge = (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/20">
                        Crítico
                      </span>
                    );
                  } else if (item.status === 'Atenção') {
                    statusBadge = (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                        Atenção
                      </span>
                    );
                  } else if (item.status === 'Ruptura') {
                    statusBadge = (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/20">
                        Ruptura
                      </span>
                    );
                  } else if (item.status === 'Sem Giro') {
                    statusBadge = (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">
                        Sem Giro
                      </span>
                    );
                  } else if (item.status === 'Excesso') {
                    statusBadge = (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20">
                        Excesso
                      </span>
                    );
                  }

                  return (
                    <tr key={idx} className="hover:bg-bg-secondary/30 transition-colors group">
                      <td className="py-3 px-4 font-mono font-bold text-text-primary text-[11px]">
                        {item.cod}
                      </td>
                      <td className="py-3 px-4 font-bold text-text-primary truncate max-w-[340px]" title={item.desc}>
                        {item.desc}
                      </td>
                      <td className="py-3 px-3 text-center text-text-secondary font-bold text-[10px]">
                        {item.un || 'UN'}
                      </td>
                      <td className="py-3 px-4 text-text-secondary font-semibold uppercase text-[11px] truncate max-w-[140px]" title={item.marca}>
                        {item.marca}
                      </td>
                      <td className="py-3 px-4 text-text-muted font-medium text-[11px] truncate max-w-[140px]" title={item.grupo}>
                        {item.grupo}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {statusBadge}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={clsx(
                          'font-bold text-[11px]',
                          item.cobertura_dias < 15 ? 'text-red-500' : (item.cobertura_dias < 30 ? 'text-amber-500' : 'text-emerald-500')
                        )}>
                          {item.cobertura_label}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-text-secondary font-mono">
                        {item.venda_mes} un
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-text-secondary font-mono">
                        {formatBRL(item.custo)}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-text-primary font-mono">
                        {formatBRL(item.preco)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-divider/60 flex items-center justify-between flex-wrap gap-3">
            <div className="text-xs font-semibold text-text-secondary">
              Página <span className="text-text-primary font-bold">{currentPage}</span> de <span className="text-text-primary font-bold">{totalPages}</span> ({filteredData.length} itens)
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-border/70 hover:bg-bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let p = i + 1;
                if (totalPages > 5 && currentPage > 3) {
                  p = currentPage - 3 + i;
                  if (p > totalPages) p = totalPages - (4 - i);
                }
                return (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={clsx(
                      'w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer',
                      currentPage === p
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : 'border border-border/70 hover:bg-bg-secondary text-text-secondary hover:text-text-primary'
                    )}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-border/70 hover:bg-bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
