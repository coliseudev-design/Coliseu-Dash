import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useBiPeriodQuery } from '../../hooks/useBiPeriodQuery';
import { useBranchPeriodQuery } from '../../hooks/useApi';
import { BIService } from '../../services/biApi';
import { BiPeriodFilter } from '../../types/bi.types';
import { 
  Trophy, Users, Box, Award, DollarSign, TrendingUp, TrendingDown, 
  Calendar, MapPin, FileText, ChevronLeft, ChevronRight, Activity, Percent
} from 'lucide-react';
import { 
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip 
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

// Gauge Chart Component using Recharts PieChart (Semi-Circle)
const SellerGaugeChart = ({ faturamento, meta }: { faturamento: number; meta: number }) => {
  const atingimento = meta > 0 ? (faturamento / meta) * 100 : faturamento > 0 ? 100 : 0;
  const displayVal = Math.min(atingimento, 100);
  
  const data = [
    { name: 'Atingido', value: displayVal, color: '#10B981' }, // Emerald/Green
    { name: 'Restante', value: 100 - displayVal, color: 'var(--color-bg-tertiary)' }
  ];

  return (
    <div className="w-full flex flex-col items-center">
      <div className="relative h-28 w-full max-w-[240px] mx-auto mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="100%"
              startAngle={180}
              endAngle={0}
              innerRadius={55}
              outerRadius={75}
              paddingAngle={0}
              dataKey="value"
              stroke="none"
              cornerRadius={2}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
          <span className="text-2xl font-extrabold text-text-primary tracking-tight">{atingimento.toFixed(1)}%</span>
          <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider">da meta</span>
        </div>
      </div>
    </div>
  );
};

export default function SellerHubDashboard() {
  const { filter: globalFilter } = useOutletContext<{ filter: BiPeriodFilter }>();

  // Fetch list of sellers dynamically
  const vdFull = useBranchPeriodQuery<any>('/ranking/vendedores', { limit: 100 });

  // Local Filter state matching mock
  const [selectedMes, setSelectedMes] = useState<number>(() => new Date().getMonth() + 1);
  const [selectedAno, setSelectedAno] = useState<number>(() => new Date().getFullYear());
  const [selectedVendedor, setSelectedVendedor] = useState<string>('');

  // Set default seller when list loaded
  useEffect(() => {
    if (vdFull.data?.data && vdFull.data.data.length > 0 && !selectedVendedor) {
      setSelectedVendedor(String(vdFull.data.data[0].id));
    }
  }, [vdFull.data, selectedVendedor]);

  // Form active filters that query backend on submit
  const [queryFilter, setQueryFilter] = useState({
    mes: selectedMes,
    ano: selectedAno,
    vendedor_id: selectedVendedor
  });

  const activeFilter = useMemo(() => ({
    ...globalFilter,
    mes: queryFilter.mes,
    ano: queryFilter.ano,
    vendedor_id: queryFilter.vendedor_id || undefined
  }), [globalFilter, queryFilter]);

  const { data, isLoading, isError } = useBiPeriodQuery<any>(
    ['bi', 'seller-summary', queryFilter],
    async (f) => {
      const response = await BIService.getSellerSummary({
        mes: f.mes,
        ano: f.ano,
        vendedor_id: f.vendedor_id
      });
      return response;
    },
    activeFilter
  );

  // Pagination for Invoices Table
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setQueryFilter({
      mes: selectedMes,
      ano: selectedAno,
      vendedor_id: selectedVendedor
    });
    setCurrentPage(1);
  };

  // Safe metrics extraction
  const faturamento = data?.faturamento || 0;
  const ticketMedio = data?.ticket_medio || 0;
  const notasEmitidas = data?.notas_emitidas || 0;
  const clientesNovos = data?.clientes_novos || 0;
  const novosPct = data?.novos_pct || 0;
  const antigosPct = data?.antigos_pct || 100;
  const cidadeTop = data?.cidade_top || 'N/A';
  const cidadeTopValor = data?.cidade_top_valor || 0;
  const crescimentoPct = data?.crescimento_pct || 0;
  const faturamentoAnterior = data?.faturamento_anterior || 0;
  const metaVendedor = data?.meta_vendedor || 0;

  const topMarcas = data?.top_marcas || [];
  const topClientes = data?.top_clientes || [];
  const topGrupos = data?.top_grupos || [];
  const topProdutos = data?.top_produtos || [];
  
  const historicoVendas = data?.historico_vendas || [];
  const vendasPorDiaSemana = data?.vendas_por_dia_semana || [];
  const heatmapDados = data?.heatmap_dados || [];
  const invoicesList = data?.notas_fiscais || [];

  // Pagination compute
  const totalPages = Math.ceil(invoicesList.length / itemsPerPage) || 1;
  const currentInvoices = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return invoicesList.slice(start, start + itemsPerPage);
  }, [invoicesList, currentPage]);

  const maxHeatmapVal = useMemo(() => {
    return Math.max(...heatmapDados.map((h: any) => h.valor), 1);
  }, [heatmapDados]);

  const months = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' }
  ];

  const years = [2025, 2026];

  const cronogramaDias = useMemo(() => {
    const totalDias = new Date(queryFilter.ano, queryFilter.mes, 0).getDate();
    return `${totalDias}/${totalDias} dias - 0 úteis`;
  }, [queryFilter.mes, queryFilter.ano]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 text-text-secondary">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500 mr-3"></div>
        Carregando Hub do Vendedor...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* FILTER BAR ROW */}
      <div className="bg-bg-primary border border-divider shadow-card rounded-xl p-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-text-primary flex items-center gap-2">
            <Activity className="text-brand-500" size={22} />
            Hub do Vendedor
          </h2>
          <p className="text-[11px] sm:text-xs text-text-secondary">Hub estratégico para acelerar seus resultados</p>
        </div>
        
        <form onSubmit={handleFilter} className="flex flex-wrap items-end gap-3 w-full lg:w-auto">
          <div className="flex flex-col gap-1 min-w-[100px] flex-1 sm:flex-initial">
            <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider">Mês</span>
            <select
              value={selectedMes}
              onChange={(e) => setSelectedMes(Number(e.target.value))}
              className="px-2.5 py-1.5 bg-bg-secondary border border-divider text-text-primary rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-500 transition-all duration-300"
            >
              {months.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1 min-w-[80px] flex-1 sm:flex-initial">
            <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider">Ano</span>
            <select
              value={selectedAno}
              onChange={(e) => setSelectedAno(Number(e.target.value))}
              className="px-2.5 py-1.5 bg-bg-secondary border border-divider text-text-primary rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-500 transition-all duration-300"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1 min-w-[200px] flex-1 sm:flex-initial">
            <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider">Vendedor</span>
            <select
              value={selectedVendedor}
              onChange={(e) => setSelectedVendedor(e.target.value)}
              className="px-2.5 py-1.5 bg-bg-secondary border border-divider text-text-primary rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-500 transition-all duration-300 w-full"
            >
              <option value="">Selecione um vendedor...</option>
              {vdFull.data?.data?.map((v: any) => (
                <option key={v.id} value={v.id}>{v.nome}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={!selectedVendedor}
            className="px-4 py-1.5 bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 disabled:opacity-50 h-[30px]"
          >
            <span>Filtrar</span>
          </button>
        </form>
      </div>

      {/* CORE LAYOUT GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: GAUGE CARD (Saúde da Meta) */}
        <div className="xl:col-span-4 bg-bg-primary border border-divider shadow-card rounded-xl p-5 flex flex-col min-h-[460px]">
          <div className="flex items-center justify-between border-b border-divider/30 pb-3 mb-4">
            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Saúde da Meta</h3>
            <span className="text-[10px] font-bold text-text-muted">Status</span>
          </div>

          <div className="flex-1 flex flex-col justify-between">
            {/* Pie Gauge */}
            <SellerGaugeChart faturamento={faturamento} meta={metaVendedor} />

            <div className="space-y-3.5 mt-4">
              <div className="flex items-center justify-between py-1 border-b border-divider/10 text-xs">
                <span className="text-text-secondary font-medium">Meta do Vendedor</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-text-primary">{metaVendedor > 0 ? formatBRL(metaVendedor) : 'Sem meta'}</span>
                  <span className={clsx(
                    "text-[10px] px-1.5 py-0.5 rounded font-bold uppercase",
                    faturamento >= metaVendedor && metaVendedor > 0 ? "bg-success/15 text-success" : "bg-text-muted/10 text-text-muted"
                  )}>
                    {faturamento >= metaVendedor && metaVendedor > 0 ? "Atingida" : "Sem meta"}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-divider/10 text-xs">
                <span className="text-text-secondary font-medium flex items-center gap-1">
                  <Calendar size={13} className="text-brand-500" /> Cronograma
                </span>
                <span className="font-semibold text-text-primary">{cronogramaDias}</span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-divider/10 text-xs">
                <div>
                  <div className="text-[10px] font-bold text-text-secondary uppercase">Janeiro (Atual)</div>
                  <div className="font-extrabold text-text-primary text-sm mt-0.5">{formatBRL(faturamento)}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold text-text-secondary">{months.find(m => m.value === queryFilter.mes)?.label}</div>
                  <div className="text-[11px] text-text-muted font-semibold mt-0.5">
                    {notasEmitidas} notas | TM {formatBRL(ticketMedio)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between py-2 text-xs">
                <div>
                  <div className="text-[10px] font-bold text-text-secondary uppercase">Mês Anterior</div>
                  <div className="font-bold text-text-primary">{formatBRL(faturamentoAnterior)}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-text-muted font-semibold">Volume</div>
                  <div className="text-[11px] text-text-muted font-bold">Histórico de Notas</div>
                </div>
              </div>
            </div>

            {/* Growth comparison banner */}
            <div className={clsx(
              "mt-5 p-3 rounded-lg flex items-center justify-between text-xs font-bold",
              crescimentoPct >= 0 ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
            )}>
              <span className="flex items-center gap-1">
                {crescimentoPct >= 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
                {crescimentoPct >= 0 ? 'Crescimento' : 'Retração'}
              </span>
              <span>
                {Math.abs(crescimentoPct).toFixed(1)}% {crescimentoPct >= 0 ? 'acima' : 'abaixo'} do mês anterior
              </span>
            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: KPIs & TOP LISTS */}
        <div className="xl:col-span-8 flex flex-col space-y-6">
          
          {/* 5 KPI CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            
            {/* Card 1: Faturamento */}
            <div className="bg-bg-primary border border-divider shadow-card rounded-xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-text-secondary">
                <span className="text-[10px] font-bold uppercase tracking-wider">Faturamento</span>
                <div className="p-1 bg-brand-500/10 text-brand-500 rounded">
                  <DollarSign size={14} />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-[10px] font-bold text-text-muted uppercase">Realizado</span>
                <div className="text-base font-extrabold text-text-primary tracking-tight mt-0.5">
                  {formatBRL(faturamento)}
                </div>
              </div>
            </div>

            {/* Card 2: Ticket Médio */}
            <div className="bg-bg-primary border border-divider shadow-card rounded-xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-text-secondary">
                <span className="text-[10px] font-bold uppercase tracking-wider">Ticket Médio</span>
                <div className="p-1 bg-brand-500/10 text-brand-500 rounded">
                  <Trophy size={14} />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-[10px] font-bold text-text-muted uppercase">Médio por Nota</span>
                <div className="text-base font-extrabold text-text-primary tracking-tight mt-0.5">
                  {formatBRL(ticketMedio)}
                </div>
              </div>
            </div>

            {/* Card 3: Notas Emitidas */}
            <div className="bg-bg-primary border border-divider shadow-card rounded-xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-text-secondary">
                <span className="text-[10px] font-bold uppercase tracking-wider">Notas Emitidas</span>
                <div className="p-1 bg-brand-500/10 text-brand-500 rounded">
                  <FileText size={14} />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-[10px] font-bold text-text-muted uppercase">Total emitido</span>
                <div className="text-base font-extrabold text-text-primary tracking-tight mt-0.5">
                  {notasEmitidas}
                </div>
              </div>
            </div>

            {/* Card 4: Clientes Novos */}
            <div className="bg-bg-primary border border-divider shadow-card rounded-xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-text-secondary">
                <span className="text-[10px] font-bold uppercase tracking-wider">Clientes Novos</span>
                <div className="p-1 bg-brand-500/10 text-brand-500 rounded">
                  <Users size={14} />
                </div>
              </div>
              <div className="mt-2.5">
                <span className="text-[10px] font-bold text-text-muted uppercase block leading-tight">{clientesNovos} neste mês</span>
                <div className="flex justify-between items-center text-[9px] text-text-secondary font-bold mt-1.5 leading-none">
                  <span className="text-success">Novos: {novosPct.toFixed(0)}%</span>
                  <span className="text-text-muted">Antigos: {antigosPct.toFixed(0)}%</span>
                </div>
              </div>
            </div>

            {/* Card 5: Cidade Top */}
            <div className="bg-bg-primary border border-divider shadow-card rounded-xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-text-secondary">
                <span className="text-[10px] font-bold uppercase tracking-wider">Cidade Top</span>
                <div className="p-1 bg-brand-500/10 text-brand-500 rounded">
                  <MapPin size={14} />
                </div>
              </div>
              <div className="mt-3 leading-tight">
                <div className="text-xs font-bold text-text-primary truncate max-w-[100px]" title={cidadeTop}>
                  {cidadeTop}
                </div>
                <span className="text-[10px] font-bold text-brand-500">
                  {formatBRLCompact(cidadeTopValor)}
                </span>
              </div>
            </div>

          </div>

          {/* 4 TOP LISTS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Top Marcas */}
            <div className="bg-bg-primary border border-divider shadow-card rounded-xl p-4 flex flex-col min-h-[300px]">
              <div className="flex items-center gap-1.5 border-b border-divider/20 pb-2 mb-3">
                <Award size={15} className="text-brand-500" />
                <h4 className="text-[10px] font-bold text-text-primary uppercase tracking-wider">Top 15 Marcas</h4>
              </div>
              <div className="flex-1 overflow-y-auto max-h-[220px] text-[11px] space-y-2">
                {topMarcas.map((m: any) => (
                  <div key={m.rank} className="flex justify-between items-center py-0.5 border-b border-divider/5 hover:bg-bg-secondary/50 px-1 rounded transition-colors">
                    <span className="text-text-secondary truncate max-w-[110px]" title={m.name}>
                      <span className="font-bold text-brand-500/80 mr-1 font-mono">{m.rank}.</span>
                      {m.name}
                    </span>
                    <span className="font-bold text-brand-500">{formatBRLCompact(m.value)}</span>
                  </div>
                ))}
                {topMarcas.length === 0 && (
                  <div className="text-center text-text-muted mt-12">Nenhuma marca</div>
                )}
              </div>
            </div>

            {/* Top Clientes */}
            <div className="bg-bg-primary border border-divider shadow-card rounded-xl p-4 flex flex-col min-h-[300px]">
              <div className="flex items-center gap-1.5 border-b border-divider/20 pb-2 mb-3">
                <Users size={15} className="text-brand-500" />
                <h4 className="text-[10px] font-bold text-text-primary uppercase tracking-wider">Top 10 Clientes</h4>
              </div>
              <div className="flex-1 overflow-y-auto max-h-[220px] text-[11px] space-y-2">
                {topClientes.map((c: any) => (
                  <div key={c.rank} className="flex justify-between items-center py-0.5 border-b border-divider/5 hover:bg-bg-secondary/50 px-1 rounded transition-colors">
                    <span className="text-text-secondary truncate max-w-[110px]" title={c.name}>
                      <span className="font-bold text-brand-500/80 mr-1 font-mono">{c.rank}.</span>
                      {c.name}
                    </span>
                    <span className="font-bold text-brand-500">{formatBRLCompact(c.value)}</span>
                  </div>
                ))}
                {topClientes.length === 0 && (
                  <div className="text-center text-text-muted mt-12">Nenhum cliente</div>
                )}
              </div>
            </div>

            {/* Top Grupos */}
            <div className="bg-bg-primary border border-divider shadow-card rounded-xl p-4 flex flex-col min-h-[300px]">
              <div className="flex items-center gap-1.5 border-b border-divider/20 pb-2 mb-3">
                <Box size={15} className="text-brand-500" />
                <h4 className="text-[10px] font-bold text-text-primary uppercase tracking-wider">Top 10 Grupos</h4>
              </div>
              <div className="flex-1 overflow-y-auto max-h-[220px] text-[11px] space-y-2">
                {topGrupos.map((g: any) => (
                  <div key={g.rank} className="flex justify-between items-center py-0.5 border-b border-divider/5 hover:bg-bg-secondary/50 px-1 rounded transition-colors">
                    <span className="text-text-secondary truncate max-w-[110px]" title={g.name}>
                      <span className="font-bold text-brand-500/80 mr-1 font-mono">{g.rank}.</span>
                      {g.name}
                    </span>
                    <span className="font-bold text-brand-500">{formatBRLCompact(g.value)}</span>
                  </div>
                ))}
                {topGrupos.length === 0 && (
                  <div className="text-center text-text-muted mt-12">Nenhum grupo</div>
                )}
              </div>
            </div>

            {/* Top Produtos */}
            <div className="bg-bg-primary border border-divider shadow-card rounded-xl p-4 flex flex-col min-h-[300px]">
              <div className="flex items-center gap-1.5 border-b border-divider/20 pb-2 mb-3">
                <Trophy size={15} className="text-brand-500" />
                <h4 className="text-[10px] font-bold text-text-primary uppercase tracking-wider">Top 10 Produtos</h4>
              </div>
              <div className="flex-1 overflow-y-auto max-h-[220px] text-[11px] space-y-2">
                {topProdutos.map((p: any) => (
                  <div key={p.rank} className="flex justify-between items-center py-0.5 border-b border-divider/5 hover:bg-bg-secondary/50 px-1 rounded transition-colors">
                    <span className="text-text-secondary truncate max-w-[110px]" title={p.name}>
                      <span className="font-bold text-brand-500/80 mr-1 font-mono">{p.rank}.</span>
                      {p.name}
                    </span>
                    <span className="font-bold text-brand-500">{formatBRLCompact(p.value)}</span>
                  </div>
                ))}
                {topProdutos.length === 0 && (
                  <div className="text-center text-text-muted mt-12">Nenhum produto</div>
                )}
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* SECTION: DESEMPENHO POR MARCA */}
      <div className="bg-bg-primary border border-divider shadow-card rounded-xl p-5">
        <div className="border-b border-divider/20 pb-3 mb-4">
          <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">Desempenho por Marca</h3>
          <p className="text-[11px] text-text-secondary mt-0.5">Acompanhe suas metas por marca</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {topMarcas.slice(0, 8).map((m: any) => {
            const marcaMeta = 0; // Default meta
            const marcaAtingidaPct = 100; // Since meta is 0, progress bar is full

            return (
              <div key={m.rank} className="border border-divider/20 rounded-lg p-3 bg-bg-secondary/20 flex flex-col justify-between">
                <div className="flex justify-between items-start gap-1">
                  <span className="text-[10px] font-extrabold text-text-primary uppercase truncate max-w-[80%]" title={m.name}>
                    {m.name}
                  </span>
                  <span className="text-[10px] font-bold text-success">
                    {marcaAtingidaPct.toFixed(1)}%
                  </span>
                </div>
                
                <div className="w-full bg-bg-secondary h-1.5 rounded-full mt-2.5 overflow-hidden">
                  <div className="bg-success h-full" style={{ width: `${marcaAtingidaPct}%` }}></div>
                </div>

                <div className="flex justify-between items-center text-[10px] text-text-secondary font-medium mt-3 leading-none">
                  <span>Realizado: <span className="font-bold text-text-primary">{formatBRLCompact(m.value)}</span></span>
                  <span>Meta: <span className="text-text-muted">{formatBRLCompact(marcaMeta)}</span></span>
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

      {/* SECTION: CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Histórico de Vendas */}
        <div className="bg-bg-primary border border-divider shadow-card rounded-xl p-5 flex flex-col min-h-[360px]">
          <div className="border-b border-divider/20 pb-3 mb-4 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">Histórico de Vendas</h3>
              <p className="text-[11px] text-text-secondary mt-0.5">Evolução diária de faturamento do vendedor</p>
            </div>
            <span className="text-[10px] font-bold text-text-muted uppercase">Mês Fechado</span>
          </div>

          <div className="flex-1 min-h-[220px]">
            {historicoVendas.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historicoVendas} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
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
                  <Line 
                    type="monotone" 
                    dataKey="valor" 
                    name="Faturamento"
                    stroke="#10B981" // Custom green lines
                    strokeWidth={3}
                    dot={{ r: 3, stroke: '#10B981', strokeWidth: 1, fill: '#FFFFFF' }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-text-muted text-xs">
                Sem histórico de faturamento neste período.
              </div>
            )}
          </div>
        </div>

        {/* Vendas por Dia da Semana & Mapa de Calor */}
        <div className="bg-bg-primary border border-divider shadow-card rounded-xl p-5 flex flex-col min-h-[360px]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
            
            {/* Weekdays bar chart */}
            <div className="flex flex-col h-full">
              <div className="border-b border-divider/20 pb-2 mb-3">
                <h4 className="text-[11px] font-bold text-text-primary uppercase tracking-wider">Vendas por Dia da Semana</h4>
              </div>
              <div className="flex-1 min-h-[180px]">
                {vendasPorDiaSemana.some((v: any) => v.valor > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={vendasPorDiaSemana} layout="vertical" margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-divider)" opacity={0.2} />
                      <XAxis type="number" hide />
                      <YAxis 
                        dataKey="dia" 
                        type="category" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 9, fill: 'var(--color-text-secondary)', fontWeight: 750 }} 
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="valor" name="Total" fill="#3B82F6" radius={[0, 3, 3, 0]} barSize={8} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-text-muted text-xs">
                    Sem faturamento registrado por dia da semana.
                  </div>
                )}
              </div>
            </div>

            {/* CSS Grid Heatmap */}
            <div className="flex flex-col h-full">
              <div className="border-b border-divider/20 pb-2 mb-3 flex justify-between items-center">
                <h4 className="text-[11px] font-bold text-text-primary uppercase tracking-wider">Mapa de Calor</h4>
                <span className="text-[8px] font-bold text-text-muted uppercase">S1 a S5</span>
              </div>
              
              <div className="flex-1 flex flex-col justify-center">
                {heatmapDados.length > 0 ? (
                  <div className="grid grid-cols-6 gap-1.5 text-center px-1">
                    {/* Header Row */}
                    <div className="text-[9px] font-bold text-text-muted"></div>
                    {['S1', 'S2', 'S3', 'S4', 'S5'].map(w => (
                      <div key={w} className="text-[9px] font-bold text-text-muted uppercase">{w}</div>
                    ))}
                    
                    {/* Activity Row Grid */}
                    {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(dia => (
                      <React.Fragment key={dia}>
                        <div className="text-[9px] font-bold text-text-secondary flex items-center justify-end pr-1.5 font-mono">{dia}</div>
                        {['S1', 'S2', 'S3', 'S4', 'S5'].map(sem => {
                          const item = heatmapDados.find((h: any) => h.dia === dia && h.semana === sem);
                          const valor = item ? item.valor : 0;
                          
                          // Interpolate color values safely (Emerald shades - compliant with Purple Ban)
                          const opacity = maxHeatmapVal > 0 ? (valor / maxHeatmapVal) : 0;
                          const bgStyle = opacity === 0 
                            ? 'var(--color-bg-secondary)' 
                            : `rgba(16, 185, 129, ${0.15 + opacity * 0.85})`;

                          return (
                            <div 
                              key={sem} 
                              className="h-6 rounded border border-divider/10 transition-all duration-300 hover:scale-105 hover:border-brand-500 relative group cursor-pointer"
                              style={{ backgroundColor: bgStyle }}
                            >
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-bg-primary border border-border shadow-card p-2 rounded-lg z-50 text-[10px] whitespace-nowrap">
                                <p className="font-bold text-text-primary">{dia} - {sem}</p>
                                <p className="text-brand-500 font-bold mt-0.5">{formatBRL(valor)}</p>
                              </div>
                            </div>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-text-muted text-xs">
                    Sem faturamento.
                  </div>
                )}
                
                <div className="flex justify-between items-center mt-3 text-[8px] text-text-muted uppercase font-bold px-1">
                  <span>Mínimo</span>
                  <span className="flex gap-0.5">
                    <span className="w-2 h-2 bg-bg-secondary border border-divider/10 rounded"></span>
                    <span className="w-2 h-2 bg-green-500/30 rounded"></span>
                    <span className="w-2 h-2 bg-green-500/60 rounded"></span>
                    <span className="w-2 h-2 bg-green-500/90 rounded"></span>
                  </span>
                  <span>Máx</span>
                </div>

              </div>
            </div>

          </div>
        </div>

      </div>

      {/* SECTION: NOTAS FISCAIS DO VENDEDOR */}
      <div className="bg-bg-primary border border-divider shadow-card rounded-xl p-5 flex flex-col">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-divider/20 pb-3 mb-4 gap-2">
          <div>
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">Notas Fiscais do Vendedor</h3>
            <p className="text-[11px] text-text-secondary mt-0.5">Fila de notas faturadas no período consultado</p>
          </div>
          <span className="text-[10px] font-bold text-text-muted uppercase bg-bg-secondary px-2.5 py-1 rounded-full border border-divider/10">
            {invoicesList.length} registros
          </span>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead>
              <tr className="border-b border-divider text-[10px] text-text-muted uppercase font-extrabold tracking-wider bg-bg-secondary/40">
                <th className="py-2.5 px-3">COD</th>
                <th className="py-2.5 px-3">Nº NOTA</th>
                <th className="py-2.5 px-3">CLIENTE</th>
                <th className="py-2.5 px-3">DATA</th>
                <th className="py-2.5 px-3 text-right">VALOR TOTAL</th>
                <th className="py-2.5 px-3 text-center">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider/10">
              {currentInvoices.map((inv: any, i: number) => (
                <tr key={inv.cod || i} className="hover:bg-bg-secondary/30 transition-colors">
                  <td className="py-3 px-3 font-mono text-text-muted">{inv.cod}</td>
                  <td className="py-3 px-3 text-brand-500 font-bold">{inv.numero_nota}</td>
                  <td className="py-3 px-3 text-text-primary font-semibold truncate max-w-[240px]" title={inv.cliente}>
                    {inv.cliente}
                  </td>
                  <td className="py-3 px-3 text-text-secondary font-medium">{inv.data}</td>
                  <td className="py-3 px-3 text-right font-mono font-extrabold text-success">
                    {formatBRL(inv.valor)}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className={clsx(
                      "text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider",
                      inv.status && ['FATURADO', 'FINALIZADO'].includes(inv.status.trim()) 
                        ? 'bg-success/15 text-success border border-success/10' 
                        : 'bg-text-muted/10 text-text-muted border border-divider/10'
                    )}>
                      {inv.status ? inv.status.trim() : 'Normal'}
                    </span>
                  </td>
                </tr>
              ))}
              {currentInvoices.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-text-muted font-medium">
                    Nenhuma nota fiscal emitida para este vendedor no período.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION PANEL */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-4 pt-4 border-t border-divider/20 text-xs">
            <span className="text-[11px] text-text-secondary">
              Mostrando {currentInvoices.length} de {invoicesList.length} notas
            </span>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded-md border border-divider hover:bg-bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Página anterior"
              >
                <ChevronLeft size={16} />
              </button>
              
              <span className="font-semibold text-text-primary text-[11px]">
                Pág {currentPage} de {totalPages}
              </span>
              
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1 rounded-md border border-divider hover:bg-bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Próxima página"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {isError && (
        <div className="bg-danger/10 border border-danger/25 text-danger p-3 rounded-lg text-xs font-semibold">
          Erro de comunicação: Não foi possível sincronizar os dados do vendedor. Verifique a conexão com a API do banco de dados Vet.
        </div>
      )}

    </div>
  );
}
