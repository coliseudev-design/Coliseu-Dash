import { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useBiPeriodQuery } from '../../hooks/useBiPeriodQuery';
import { BIService } from '../../services/biApi';
import { BiPeriodFilter } from '../../types/bi.types';
import { 
  DollarSign, ArrowDown, TrendingUp, Percent, Filter, ChevronDown
} from 'lucide-react';
import { formatBRL } from '../../utils/format';
import clsx from 'clsx';

const formatCurrency = formatBRL;

export default function ProfitabilityDashboard() {
  const [selectedPeriodTab, setSelectedPeriodTab] = useState<'MÊS' | 'ACUMULADO'>('MÊS');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedVendedor, setSelectedVendedor] = useState<string>('todas');
  const [selectedCidade, setSelectedCidade] = useState<string>('todas');

  // Consome o filtro global de filial do contexto do BiDashboard pai
  const { filter: globalFilter } = useOutletContext<{ filter: BiPeriodFilter }>();

  // Busca de Vendedores e Cidades do banco de dados para os filtros
  const sellersQuery = useQuery<any>({
    queryKey: ['bi', 'sellers'],
    queryFn: BIService.getSellers
  });
  const citiesQuery = useQuery<any>({
    queryKey: ['bi', 'cities'],
    queryFn: BIService.getCities
  });

  // Gera as datas de início/fim com base no mês/ano e tab acumulada
  const buildDateRange = (m: number, y: number, isAcumulado: boolean) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const lastDay = new Date(y, m, 0).getDate();
    return {
      start_date: isAcumulado ? `${y}-01-01` : `${y}-${pad(m)}-01`,
      end_date: `${y}-${pad(m)}-${pad(lastDay)}`
    };
  };

  // Filtro de API ativo para envio
  const activeFilter = useMemo<BiPeriodFilter>(() => ({
    period: 'custom',
    ...buildDateRange(month, year, selectedPeriodTab === 'ACUMULADO'),
    depto_id: globalFilter.depto_id,
    centro_custo: globalFilter.centro_custo,
    vendedor_id: selectedVendedor,
    cidade: selectedCidade
  }), [month, year, selectedPeriodTab, globalFilter.depto_id, globalFilter.centro_custo, selectedVendedor, selectedCidade]);

  const { data, isLoading, refetch } = useBiPeriodQuery(
    ['bi', 'comparative', activeFilter],
    () => BIService.getComparativeAnalysis(activeFilter),
    activeFilter
  );

  const handleFilterClick = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-brand-500 space-y-4">
        <LoaderSpinner />
        <div className="text-center">
          <p className="text-text-primary text-sm font-black uppercase tracking-widest animate-pulse">Carregando Painel de Rentabilidade...</p>
          <p className="text-xs text-text-secondary mt-1">Processando margens e faturamentos da empresa...</p>
        </div>
      </div>
    );
  }

  // Dados retornados do backend
  const marcaData = data?.marcaData || [];
  const grupoData = data?.grupoData || [];
  const vendedorData = data?.vendedorData || [];
  const cidadeData = data?.cidadeData || [];
  const overview = data?.overview || { faturamento: 0, custo: 0, lucro: 0, margem_pct: 0 };

  return (
    <div className="space-y-4 animate-in fade-in duration-300 pb-10">
      
      {/* BARRA UNIFICADA COMPACTA DE FILTROS DE RENTABILIDADE */}
      <div className="bi-filter-bar">
        <div className="flex flex-wrap items-center gap-2">
          {/* Alternador MÊS / ACUMULADO */}
          <div className="inline-flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200/80 dark:border-slate-700 h-8">
            {(['MÊS', 'ACUMULADO'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setSelectedPeriodTab(tab)}
                className={clsx(
                  "px-2.5 h-full rounded-md text-[10.5px] font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap",
                  selectedPeriodTab === tab 
                    ? "bg-brand-500 text-white shadow-xs" 
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Mês */}
          <div className="relative">
            <select 
              id="select-month"
              aria-label="Mês"
              value={month} 
              onChange={(e) => setMonth(Number(e.target.value))}
              className="bi-select appearance-none pr-7 w-28"
            >
              <option value={1}>Janeiro</option>
              <option value={2}>Fevereiro</option>
              <option value={3}>Março</option>
              <option value={4}>Abril</option>
              <option value={5}>Maio</option>
              <option value={6}>Junho</option>
              <option value={7}>Julho</option>
              <option value={8}>Agosto</option>
              <option value={9}>Setembro</option>
              <option value={10}>Outubro</option>
              <option value={11}>Novembro</option>
              <option value={12}>Dezembro</option>
            </select>
            <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Ano */}
          <div className="relative">
            <select 
              id="select-year"
              aria-label="Ano"
              value={year} 
              onChange={(e) => setYear(Number(e.target.value))}
              className="bi-select appearance-none pr-7 w-20"
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
              <option value={2024}>2024</option>
            </select>
            <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 flex-1 justify-end min-w-[260px]">
          {/* Filtro Vendedor */}
          <div className="relative flex-1 sm:flex-none sm:w-48">
            <select
              id="select-vendedor"
              aria-label="Vendedor"
              value={selectedVendedor}
              onChange={(e) => setSelectedVendedor(e.target.value)}
              className="bi-select appearance-none w-full pr-7"
            >
              <option value="todas">Todos os Vendedores</option>
              {sellersQuery.data?.data?.map((v: any) => (
                <option key={v.id} value={v.id}>{v.nome}</option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Filtro Cidade */}
          <div className="relative flex-1 sm:flex-none sm:w-44">
            <select
              id="select-cidade"
              aria-label="Cidade"
              value={selectedCidade}
              onChange={(e) => setSelectedCidade(e.target.value)}
              className="bi-select appearance-none w-full pr-7 uppercase"
            >
              <option value="todas">Todas as Cidades</option>
              {citiesQuery.data?.data?.map((c: any) => (
                <option key={c.nome || c.cidade} value={c.nome || c.cidade}>{c.nome || c.cidade}</option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Botão Filtrar */}
          <button
            onClick={handleFilterClick}
            className="bg-brand-500 hover:bg-brand-600 text-white font-bold px-3.5 rounded-lg inline-flex items-center justify-center gap-1.5 h-8 text-xs transition-colors shadow-xs cursor-pointer shrink-0 whitespace-nowrap"
          >
            <Filter size={13} /> Filtrar
          </button>
        </div>
      </div>

      {/* 4 KPIs DE RESULTADO AUTO-ADAPTÁVEIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 animate-in fade-in duration-300">
        
        {/* Card 1: Faturamento Total */}
        <div className="bg-bg-primary border border-divider shadow-card rounded-2xl p-4 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between gap-2 text-[10px] font-black text-text-secondary/70 uppercase tracking-widest mb-2">
            <span className="truncate">Faturamento Total</span>
            <div className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg shrink-0"><DollarSign size={14} /></div>
          </div>
          <div 
            className="bi-kpi-value font-black text-text-primary mb-0.5 font-mono"
            title={formatCurrency(overview.faturamento)}
          >
            {formatCurrency(overview.faturamento)}
          </div>
          <div className="text-[10px] text-text-secondary font-semibold">Receita bruta do período</div>
        </div>

        {/* Card 2: Custo Total */}
        <div className="bg-bg-primary border border-divider shadow-card rounded-2xl p-4 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between gap-2 text-[10px] font-black text-text-secondary/70 uppercase tracking-widest mb-2">
            <span className="truncate">Custo Total</span>
            <div className="p-1.5 bg-red-500/10 text-red-500 rounded-lg shrink-0"><ArrowDown size={14} /></div>
          </div>
          <div 
            className="bi-kpi-value font-black text-text-primary mb-0.5 font-mono"
            title={formatCurrency(overview.custo)}
          >
            {formatCurrency(overview.custo)}
          </div>
          <div className="text-[10px] text-text-secondary font-semibold">Custo dos produtos vendidos</div>
        </div>

        {/* Card 3: Resultado Operacional */}
        <div className="bg-bg-primary border border-divider shadow-card rounded-2xl p-4 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between gap-2 text-[10px] font-black text-text-secondary/70 uppercase tracking-widest mb-2">
            <span className="truncate">Resultado Operacional</span>
            <div className="p-1.5 bg-amber-500/10 text-amber-500 rounded-lg shrink-0"><TrendingUp size={14} /></div>
          </div>
          <div 
            className="bi-kpi-value font-black text-text-primary mb-0.5 font-mono"
            title={formatCurrency(overview.lucro)}
          >
            {formatCurrency(overview.lucro)}
          </div>
          <div className="text-[10px] text-text-secondary font-semibold">Lucro após custos diretos</div>
        </div>

        {/* Card 4: Margem de Lucro */}
        <div className="bg-bg-primary border border-divider shadow-card rounded-2xl p-4 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between gap-2 text-[10px] font-black text-text-secondary/70 uppercase tracking-widest mb-2">
            <span className="truncate">Margem de Lucro (%)</span>
            <div className={clsx(
              "p-1.5 rounded-lg shrink-0",
              overview.margem_pct < 0 ? "bg-red-500/10 text-red-500" : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
            )}>
              <Percent size={14} />
            </div>
          </div>
          <div className={clsx(
            "bi-kpi-value font-black mb-0.5 font-mono",
            overview.margem_pct < 0 ? "text-red-500" : "text-blue-600 dark:text-blue-400"
          )}>
            {overview.margem_pct.toFixed(2)}%
          </div>
          <div className="text-[10px] text-text-secondary font-semibold">Eficiência operacional</div>
        </div>
      </div>

      {/* BLOCO 1: RESULTADOS POR MARCA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Tabela de Marcas (7/12) */}
        <div className="bg-bg-primary border border-divider shadow-card rounded-3xl p-5 flex flex-col lg:col-span-7">
          <div className="mb-4">
            <h3 className="font-black text-text-primary text-xs tracking-wider">Rentabilidade por Fabricante</h3>
            <p className="text-[9px] text-text-secondary/60 font-bold uppercase mt-0.5">Top 15 marcas por rentabilidade comercial.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[10.5px] font-medium whitespace-nowrap">
              <thead className="bg-bg-secondary/40 text-[8.5px] text-text-secondary uppercase font-black tracking-wider border-b border-divider/10">
                <tr>
                  <th className="py-2.5 px-1.5 w-6">#</th>
                  <th className="py-2.5 px-1.5">MARCA</th>
                  <th className="py-2.5 px-1.5 text-right">VENDAS</th>
                  <th className="py-2.5 px-1.5 text-right">CUSTO</th>
                  <th className="py-2.5 px-1.5 text-right">L. BRUTO</th>
                  <th className="py-2.5 px-1.5 text-right">LUCRATIV.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider/10">
                {marcaData.slice(0, 15).map((row: any) => (
                  <tr key={row.rank} className="hover:bg-bg-secondary/20 transition-colors">
                    <td className="py-2 px-1.5 font-bold text-text-secondary/60 font-mono">{row.rank}º</td>
                    <td className="py-2 px-1.5 font-bold text-text-primary max-w-[120px] truncate uppercase">{row.name}</td>
                    <td className="py-2 px-1.5 text-right text-text-secondary font-mono">{formatCurrency(row.vendas)}</td>
                    <td className="py-2 px-1.5 text-right text-text-secondary font-mono">{formatCurrency(row.custo)}</td>
                    <td className={clsx("py-2 px-1.5 text-right font-bold font-mono", row.lucro < 0 ? "text-red-500" : "text-emerald-500")}>{formatCurrency(row.lucro)}</td>
                    <td className={clsx(
                      "py-2 px-1.5 text-right font-black font-mono",
                      row.luc_pct < 0 ? "text-red-500" : "text-blue-600 dark:text-blue-400"
                    )}>
                      {row.luc_pct.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Gráfico de Barras Horizontais Customizado por Marca (5/12) */}
        <div className="bg-bg-primary border border-divider shadow-card rounded-3xl p-5 flex flex-col lg:col-span-5 justify-between">
          <div className="mb-4">
            <h3 className="font-black text-text-primary text-xs tracking-wider">Rentabilidade por Fabricante</h3>
            <p className="text-[9px] text-text-secondary/60 font-bold uppercase mt-0.5">Margem de contribuição por fabricante</p>
          </div>

          <div className="flex-1 flex flex-col justify-center space-y-2 pt-2">
            {marcaData.slice(0, 15).map((row: any, idx: number) => {
              const maxVal = Math.max(...marcaData.map((x: any) => x.vendas)) || 1;
              const widthPct = Math.max(10, (row.vendas / maxVal) * 100);
              return (
                <div key={idx} className="flex items-center gap-3">
                  <span className="w-24 text-right truncate text-[10px] font-bold text-text-secondary uppercase">{row.name}</span>
                  <div className="flex-1 bg-bg-secondary h-2.5 rounded-full relative group border border-divider/10 overflow-hidden">
                    <div 
                      className="bg-brand-500 h-full rounded-full transition-all duration-300 relative"
                      style={{ 
                        width: `${widthPct}%`,
                        backgroundColor: row.color || '#0EA5E9'
                      }}
                    >
                      {/* Tooltip no Hover */}
                      <div className="absolute left-1/2 bottom-full -translate-x-1/2 mb-1 bg-black/95 text-white text-[9px] font-mono px-2 py-0.5 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none whitespace-nowrap">
                        {row.name} | Valor: {formatCurrency(row.vendas)}
                      </div>
                    </div>
                  </div>
                  <span className={clsx("w-12 text-left text-[10px] font-black font-mono", row.luc_pct < 0 ? "text-red-500" : "text-blue-600 dark:text-blue-400")}>{row.luc_pct.toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* BLOCO 2: RESULTADOS POR GRUPO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Tabela de Grupos (7/12) */}
        <div className="bg-bg-primary border border-divider shadow-card rounded-3xl p-5 flex flex-col lg:col-span-7">
          <div className="mb-4">
            <h3 className="font-black text-text-primary text-xs tracking-wider">Desempenho por Categoria</h3>
            <p className="text-[9px] text-text-secondary/60 font-bold uppercase mt-0.5">Top 15 grupos com maior margem de vendas.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[10.5px] font-medium whitespace-nowrap">
              <thead className="bg-bg-secondary/40 text-[8.5px] text-text-secondary uppercase font-black tracking-wider border-b border-divider/10">
                <tr>
                  <th className="py-2.5 px-1.5 w-6">#</th>
                  <th className="py-2.5 px-1.5">GRUPO</th>
                  <th className="py-2.5 px-1.5 text-right">VENDAS</th>
                  <th className="py-2.5 px-1.5 text-right">CUSTO</th>
                  <th className="py-2.5 px-1.5 text-right">L. BRUTO</th>
                  <th className="py-2.5 px-1.5 text-right">LUCRATIV.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider/10">
                {grupoData.slice(0, 15).map((row: any) => (
                  <tr key={row.rank} className="hover:bg-bg-secondary/20 transition-colors">
                    <td className="py-2 px-1.5 font-bold text-text-secondary/60 font-mono">{row.rank}º</td>
                    <td className="py-2 px-1.5 font-bold text-text-primary max-w-[120px] truncate uppercase">{row.name}</td>
                    <td className="py-2 px-1.5 text-right text-text-secondary font-mono">{formatCurrency(row.vendas)}</td>
                    <td className="py-2 px-1.5 text-right text-text-secondary font-mono">{formatCurrency(row.custo)}</td>
                    <td className={clsx("py-2 px-1.5 text-right font-bold font-mono", row.lucro < 0 ? "text-red-500" : "text-emerald-500")}>{formatCurrency(row.lucro)}</td>
                    <td className={clsx(
                      "py-2 px-1.5 text-right font-black font-mono",
                      row.luc_pct < 0 ? "text-red-500" : "text-blue-600 dark:text-blue-400"
                    )}>
                      {row.luc_pct.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Gráfico de Barras Horizontais Customizado por Grupo (5/12) */}
        <div className="bg-bg-primary border border-divider shadow-card rounded-3xl p-5 flex flex-col lg:col-span-5 justify-between">
          <div className="mb-4">
            <h3 className="font-black text-text-primary text-xs tracking-wider">Desempenho por Categoria</h3>
            <p className="text-[9px] text-text-secondary/60 font-bold uppercase mt-0.5">Margem de contribuição por grupo (Top 15)</p>
          </div>

          <div className="flex-1 flex flex-col justify-center space-y-2 pt-2">
            {grupoData.slice(0, 15).map((row: any, idx: number) => {
              const maxVal = Math.max(...grupoData.map((x: any) => x.vendas)) || 1;
              const widthPct = Math.max(10, (row.vendas / maxVal) * 100);
              return (
                <div key={idx} className="flex items-center gap-3">
                  <span className="w-24 text-right truncate text-[10px] font-bold text-text-secondary uppercase">{row.name}</span>
                  <div className="flex-1 bg-bg-secondary h-2.5 rounded-full relative group border border-divider/10 overflow-hidden">
                    <div 
                      className="bg-brand-500 h-full rounded-full transition-all duration-300 relative"
                      style={{ 
                        width: `${widthPct}%`,
                        backgroundColor: '#0EA5E9'
                      }}
                    >
                      {/* Tooltip no Hover */}
                      <div className="absolute left-1/2 bottom-full -translate-x-1/2 mb-1 bg-black/95 text-white text-[9px] font-mono px-2 py-0.5 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none whitespace-nowrap">
                        {row.name} | Valor: {formatCurrency(row.vendas)}
                      </div>
                    </div>
                  </div>
                  <span className={clsx("w-12 text-left text-[10px] font-black font-mono", row.luc_pct < 0 ? "text-red-500" : "text-blue-600 dark:text-blue-400")}>{row.luc_pct.toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* BLOCO 3: RESULTADOS POR VENDEDOR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Tabela de Vendedores (7/12) */}
        <div className="bg-bg-primary border border-divider shadow-card rounded-3xl p-5 flex flex-col lg:col-span-7">
          <div className="mb-4">
            <h3 className="font-black text-text-primary text-xs tracking-wider">Contribuição por Executivo</h3>
            <p className="text-[9px] text-text-secondary/60 font-bold uppercase mt-0.5">Desempenho financeiro e rentabilidade comercial.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[10.5px] font-medium whitespace-nowrap">
              <thead className="bg-bg-secondary/40 text-[8.5px] text-text-secondary uppercase font-black tracking-wider border-b border-divider/10">
                <tr>
                  <th className="py-2.5 px-1.5 w-6">#</th>
                  <th className="py-2.5 px-1.5">VENDEDOR</th>
                  <th className="py-2.5 px-1.5 text-right">VENDAS</th>
                  <th className="py-2.5 px-1.5 text-right">CUSTO</th>
                  <th className="py-2.5 px-1.5 text-right">L. BRUTO</th>
                  <th className="py-2.5 px-1.5 text-right">LUCRATIV.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider/10">
                {vendedorData.slice(0, 10).map((row: any) => (
                  <tr key={row.rank} className="hover:bg-bg-secondary/20 transition-colors">
                    <td className="py-2 px-1.5 font-bold text-text-secondary/60 font-mono">{row.rank}º</td>
                    <td className="py-2 px-1.5 font-bold text-text-primary max-w-[120px] truncate uppercase">{row.name}</td>
                    <td className="py-2 px-1.5 text-right text-text-secondary font-mono">{formatCurrency(row.vendas)}</td>
                    <td className="py-2 px-1.5 text-right text-text-secondary font-mono">{formatCurrency(row.custo)}</td>
                    <td className={clsx("py-2 px-1.5 text-right font-bold font-mono", row.lucro < 0 ? "text-red-500" : "text-emerald-500")}>{formatCurrency(row.lucro)}</td>
                    <td className={clsx(
                      "py-2 px-1.5 text-right font-black font-mono",
                      row.luc_pct < 0 ? "text-red-500" : "text-blue-600 dark:text-blue-400"
                    )}>
                      {row.luc_pct.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Gráfico de Barras Horizontais Customizado por Vendedor (5/12) */}
        <div className="bg-bg-primary border border-divider shadow-card rounded-3xl p-5 flex flex-col lg:col-span-5 justify-between">
          <div className="mb-4">
            <h3 className="font-black text-text-primary text-xs tracking-wider">Contribuição por Executivo</h3>
            <p className="text-[9px] text-text-secondary/60 font-bold uppercase mt-0.5">Desempenho de margem e faturamento de vendas</p>
          </div>

          <div className="flex-1 flex flex-col justify-center space-y-2.5 pt-2">
            {vendedorData.slice(0, 10).map((row: any, idx: number) => {
              const maxVal = Math.max(...vendedorData.map((x: any) => x.vendas)) || 1;
              const widthPct = Math.max(10, (row.vendas / maxVal) * 100);
              return (
                <div key={idx} className="flex items-center gap-3">
                  <span className="w-24 text-right truncate text-[10px] font-bold text-text-secondary uppercase">{row.name}</span>
                  <div className="flex-1 bg-bg-secondary h-2.5 rounded-full relative group border border-divider/10 overflow-hidden">
                    <div 
                      className="bg-brand-500 h-full rounded-full transition-all duration-300 relative"
                      style={{ 
                        width: `${widthPct}%`,
                        backgroundColor: row.color || '#10B981'
                      }}
                    >
                      {/* Tooltip no Hover */}
                      <div className="absolute left-1/2 bottom-full -translate-x-1/2 mb-1 bg-black/95 text-white text-[9px] font-mono px-2 py-0.5 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none whitespace-nowrap">
                        {row.name} | Valor: {formatCurrency(row.vendas)}
                      </div>
                    </div>
                  </div>
                  <span className={clsx("w-12 text-left text-[10px] font-black font-mono", row.luc_pct < 0 ? "text-red-500" : "text-blue-600 dark:text-blue-400")}>{row.luc_pct.toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* BLOCO 4: RESULTADOS POR CIDADE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Tabela de Cidades (7/12) */}
        <div className="bg-bg-primary border border-divider shadow-card rounded-3xl p-5 flex flex-col lg:col-span-7">
          <div className="mb-4">
            <h3 className="font-black text-text-primary text-xs tracking-wider">Resultados por Cidade</h3>
            <p className="text-[9px] text-text-secondary/60 font-bold uppercase mt-0.5">Faturamento e margens de vendas por município.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[10.5px] font-medium whitespace-nowrap">
              <thead className="bg-bg-secondary/40 text-[8.5px] text-text-secondary uppercase font-black tracking-wider border-b border-divider/10">
                <tr>
                  <th className="py-2.5 px-1.5 w-6">#</th>
                  <th className="py-2.5 px-1.5">CIDADE</th>
                  <th className="py-2.5 px-1.5 text-right">VENDAS</th>
                  <th className="py-2.5 px-1.5 text-right">CUSTO</th>
                  <th className="py-2.5 px-1.5 text-right">L. BRUTO</th>
                  <th className="py-2.5 px-1.5 text-right">LUCRATIV.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider/10">
                {cidadeData.slice(0, 15).map((row: any) => (
                  <tr key={row.rank} className="hover:bg-bg-secondary/20 transition-colors">
                    <td className="py-2 px-1.5 font-bold text-text-secondary/60 font-mono">{row.rank}º</td>
                    <td className="py-2 px-1.5 font-bold text-text-primary max-w-[120px] truncate uppercase">{row.name}</td>
                    <td className="py-2 px-1.5 text-right text-text-secondary font-mono">{formatCurrency(row.vendas)}</td>
                    <td className="py-2 px-1.5 text-right text-text-secondary font-mono">{formatCurrency(row.custo)}</td>
                    <td className={clsx("py-2 px-1.5 text-right font-bold font-mono", row.lucro < 0 ? "text-red-500" : "text-emerald-500")}>{formatCurrency(row.lucro)}</td>
                    <td className={clsx(
                      "py-2 px-1.5 text-right font-black font-mono",
                      row.luc_pct < 0 ? "text-red-500" : "text-blue-600 dark:text-blue-400"
                    )}>
                      {row.luc_pct.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Gráfico de Barras Horizontais Customizado por Cidade (5/12) */}
        <div className="bg-bg-primary border border-divider shadow-card rounded-3xl p-5 flex flex-col lg:col-span-5 justify-between">
          <div className="mb-4">
            <h3 className="font-black text-text-primary text-xs tracking-wider">Rentabilidade por Cidade</h3>
            <p className="text-[9px] text-text-secondary/60 font-bold uppercase mt-0.5">Margem de contribuição por município</p>
          </div>

          <div className="flex-1 flex flex-col justify-center space-y-2 pt-2">
            {cidadeData.slice(0, 15).map((row: any, idx: number) => {
              const maxVal = Math.max(...cidadeData.map((x: any) => x.vendas)) || 1;
              const widthPct = Math.max(10, (row.vendas / maxVal) * 100);
              return (
                <div key={idx} className="flex items-center gap-3">
                  <span className="w-24 text-right truncate text-[10px] font-bold text-text-secondary uppercase">{row.name}</span>
                  <div className="flex-1 bg-bg-secondary h-2.5 rounded-full relative group border border-divider/10 overflow-hidden">
                    <div 
                      className="bg-brand-500 h-full rounded-full transition-all duration-300 relative"
                      style={{ 
                        width: `${widthPct}%`,
                        backgroundColor: row.color || '#14B8A6'
                      }}
                    >
                      {/* Tooltip no Hover */}
                      <div className="absolute left-1/2 bottom-full -translate-x-1/2 mb-1 bg-black/95 text-white text-[9px] font-mono px-2 py-0.5 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none whitespace-nowrap">
                        {row.name} | Valor: {formatCurrency(row.vendas)}
                      </div>
                    </div>
                  </div>
                  <span className={clsx("w-12 text-left text-[10px] font-black font-mono", row.luc_pct < 0 ? "text-red-500" : "text-blue-600 dark:text-blue-400")}>{row.luc_pct.toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* ANÁLISE DE LUCRATIVIDADE (RODAPÉ DO MODELO) */}
      <div className="bg-bg-primary border border-divider shadow-card rounded-2xl p-5 animate-in fade-in duration-300">
        <h3 className="font-black text-text-primary text-xs tracking-wider mb-2">Análise de Rentabilidade</h3>
        <p className="text-xs text-text-secondary leading-relaxed font-semibold">
          A lucratividade de <span className={clsx("font-black font-mono", overview.margem_pct < 0 ? "text-red-500" : "text-blue-600 dark:text-blue-400")}>{overview.margem_pct.toFixed(2)}%</span> indica que para cada R$ 100,00 vendidos, a empresa retém <span className={clsx("font-black font-mono", overview.margem_pct < 0 ? "text-red-500" : "text-blue-600 dark:text-blue-400")}>R$ {overview.margem_pct.toFixed(2)}</span> após cobrir todos os custos diretos dos produtos.
        </p>
      </div>

    </div>
  );
}

function LoaderSpinner() {
  return (
    <div className="relative flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
      <div className="absolute text-xs font-black text-brand-500">💰</div>
    </div>
  );
}
