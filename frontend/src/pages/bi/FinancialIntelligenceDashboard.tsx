import React, { useState, useMemo } from 'react';
import { useOutletContext, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import { useBiPeriodQuery } from '../../hooks/useBiPeriodQuery';
import { useApiQuery, usePeriodQuery } from '../../hooks/useApi';
import { usePeriodStore, periodToParams } from '../../store/periodStore';
import { useBranchParam } from '../../contexts/BranchContext';
import { BIService } from '../../services/biApi';
import { BiPeriodFilter } from '../../types/bi.types';
import PeriodFilter from '../../components/PeriodFilter';
import KPICard from '../../components/KPICard';
import DataTable from '../../components/DataTable';
import { 
  Wallet, ArrowUpRight, ArrowDownRight, DollarSign, CreditCard, 
  AlertTriangle, TrendingUp, TrendingDown, BarChart3, Clock, Search, ChevronDown,
  LineChart, FileText, Banknote, Filter, ArrowDownCircle, ArrowUpCircle, ShoppingCart,
  Scale, Receipt, CheckCircle, AlertCircle
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatBRL, formatBRLCompact, formatDate } from '../../utils/format';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-bg-primary border border-border shadow-card-hover p-3 rounded-lg z-50 min-w-[150px]">
        <p className="text-text-primary font-bold mb-2 text-sm">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex justify-between items-center gap-4 text-xs font-medium mb-1">
            <span style={{ color: entry.color }}>{entry.name}:</span>
            <span className="font-bold text-text-primary">
              {formatBRL(entry.value)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function FinancialIntelligenceDashboard() {
  const context = useOutletContext<{ filter?: BiPeriodFilter }>();
  const periodState = usePeriodStore();
  const branchParam = useBranchParam();
  const location = useLocation();

  // Abas disponíveis
  const [activeTab, setActiveTab] = useState<'gestao' | 'fluxo' | 'titulos' | 'caixas'>('gestao');
  
  // Filtro de Caixa
  const [selectedCaixa, setSelectedCaixa] = useState('todos');

  // Filtros internos da aba Títulos
  const [tipoTitulo, setTipoTitulo] = useState<'' | 'RECEBER' | 'PAGAR'>('');
  const [statusTitulo, setStatusTitulo] = useState<'' | 'ABERTO' | 'PAGO' | 'VENCIDA'>('');
  const [buscaTitulo, setBuscaTitulo] = useState('');

  // Filtros internos da aba Caixas
  const [apenasVendas, setApenasVendas] = useState(false);

  // Estados da aba Gestão
  const [expandedReceberIndex, setExpandedReceberIndex] = useState<number | null>(null);
  const [expandedPagarIndex, setExpandedPagarIndex] = useState<number | null>(null);
  const [chartView, setChartView] = useState<'daily' | 'monthly'>('daily');

  // Carrega lista de caixas
  const { data: caixasRes } = useApiQuery<any>('/financeiro/caixas');
  const caixas = caixasRes?.data || [];

  // Constrói filtro consolidado
  const activeFilter: BiPeriodFilter = {
    ...periodToParams(periodState),
    ...branchParam,
    ...(context?.filter || {}),
    ...(selectedCaixa !== 'todos' ? { caixa_id: selectedCaixa } : {})
  };

  // 1. Dados da aba Gestão (BI Financial Summary)
  const { data: biData, isLoading: isLoadingBi } = useBiPeriodQuery(
    ['bi', 'financial', activeFilter.caixa_id || 'todos'],
    BIService.getFinancialIntelligence,
    activeFilter
  );

  // 2. Dados da aba Fluxo de Caixa
  const { data: fluxoRes, isLoading: isLoadingFluxo } = useApiQuery<any>(
    '/financeiro/fluxo-caixa',
    {
      period: periodState.period,
      start_date: periodState.startDate,
      end_date: periodState.endDate,
      ...(selectedCaixa !== 'todos' ? { caixa_id: selectedCaixa } : {}),
      ...branchParam
    }
  );
  const fluxoList = fluxoRes?.fluxo || [];

  // 3. Dados da aba Títulos
  const { data: titulosRes, isLoading: isLoadingTitulos } = useApiQuery<any>(
    '/financeiro/contas',
    {
      tipo: tipoTitulo || undefined,
      status: statusTitulo || undefined,
      ...(selectedCaixa !== 'todos' ? { caixa_id: selectedCaixa } : {}),
      ...branchParam,
      limit: 300
    }
  );
  const titulos = useMemo(() => {
    const raw = titulosRes?.data || [];
    if (!buscaTitulo.trim()) return raw;
    const q = buscaTitulo.toLowerCase();
    return raw.filter((t: any) => 
      String(t.descricao || '').toLowerCase().includes(q) ||
      String(t.cliente || '').toLowerCase().includes(q) ||
      String(t.numero_pedido || '').toLowerCase().includes(q)
    );
  }, [titulosRes?.data, buscaTitulo]);

  // 4. Dados da aba Caixas
  const caixaParams = {
    ...(selectedCaixa !== 'todos' ? { caixa_id: selectedCaixa } : {}),
    ...branchParam
  };
  const caixaSummary = usePeriodQuery<any>('/financeiro/caixa', caixaParams);
  const caixasMovimentos = usePeriodQuery<any>('/financeiro/contas', {
    status: 'PAGO',
    limit: 250,
    apenas_vendas: apenasVendas,
    ...(selectedCaixa !== 'todos' ? { caixa_id: selectedCaixa } : {}),
    ...branchParam
  });
  const movimentos = caixasMovimentos.data?.data || [];

  // Constrói lista de espécies de saldo no caixa
  const saldosEspeciesList = caixaSummary.data?.kpis?.saldos_especies || [];
  const displayEspecies = useMemo(() => {
    const base = [
      { nome: 'DINHEIRO', total: 0 },
      { nome: 'CARTAO DEBITO', total: 0 },
      { nome: 'CARTAO CREDITO', total: 0 },
      { nome: 'PIX', total: 0 }
    ];
    return base.map(item => {
      const found = saldosEspeciesList.find((e: any) => e.nome === item.nome);
      return {
        nome: item.nome,
        total: found ? found.total : 0
      };
    });
  }, [saldosEspeciesList]);

  const vendasVista = caixaSummary.data?.vendas_por_especie?.vista_caixa || { itens: [], subtotal: 0 };
  const vendasPrazo = caixaSummary.data?.vendas_por_especie?.prazo || { itens: [], subtotal: 0 };

  const tabs = [
    { key: 'gestao' as const, label: 'Gestão Financeira', shortLabel: 'Gestão', icon: Wallet },
    { key: 'fluxo' as const, label: 'Fluxo de Caixa', shortLabel: 'Fluxo', icon: LineChart },
    { key: 'titulos' as const, label: 'Títulos & Contas', shortLabel: 'Títulos', icon: FileText },
    { key: 'caixas' as const, label: 'Caixas & Movimentos', shortLabel: 'Caixas', icon: Banknote },
  ];

  const projecaoData = biData?.projecao_fluxo?.length ? biData.projecao_fluxo : [
    { periodo: 'Próx. 7 dias', entradas: 0, saidas: 0, saldo: 0 },
    { periodo: 'Próx. 15 dias', entradas: 0, saidas: 0, saldo: 0 },
    { periodo: 'Próx. 30 dias', entradas: 0, saidas: 0, saldo: 0 },
    { periodo: 'Próx. 60 dias', entradas: 0, saidas: 0, saldo: 0 },
    { periodo: 'Próx. 90 dias', entradas: 0, saidas: 0, saldo: 0 },
  ];

  const evolucaoData = chartView === 'daily' 
    ? (biData?.evolucao_fluxo_dias || biData?.evolucao_fluxo || [])
    : (biData?.evolucao_fluxo_meses || biData?.evolucao_fluxo || []);

  const agingReceber = biData?.aging_receber || [];
  const agingPagar = biData?.aging_pagar || [];

  return (
    <div aria-label="Módulo Financeiro" className="space-y-4 animate-in fade-in duration-300 pb-8">
      
      {/* ── HEADER MODERNO DO MÓDULO FINANCEIRO (TÍTULO, ABAS & FILTROS) ────── */}
      <div className="bg-bg-primary border border-divider rounded-2xl p-4 sm:p-5 flex flex-col gap-4 shadow-card">
        
        {/* Linha 1: Título e Abas de Navegação */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight flex items-center gap-2 whitespace-nowrap">
              <Wallet className="text-brand-500" size={24} />
              Módulo Financeiro
            </h1>
            <p className="text-xs text-text-muted mt-0.5">Gestão de liquidez, projeção de caixa, títulos e extrato</p>
          </div>

          {/* Abas */}
          <div className="flex flex-wrap bg-bg-secondary p-1 rounded-xl border border-divider shadow-xs gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={clsx(
                  "flex items-center justify-center gap-2 py-1.5 px-3.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  activeTab === tab.key
                    ? "bg-brand-500 text-white shadow-sm"
                    : "text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
                )}
              >
                <tab.icon size={14} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Linha 2: Barra de Filtros (Período sem corte + Dropdown de Caixa) */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-3 border-t border-divider">
          
          {/* Seletor de Período Flexível (sem cortes) */}
          <div className="flex-1 min-w-0 flex items-center overflow-x-auto pb-1 md:pb-0">
            <PeriodFilter excludePeriods={['yesterday']} />
          </div>

          {/* Seletor de Caixa */}
          <div className="flex items-center gap-2 bg-bg-secondary/80 rounded-xl border border-divider px-3 py-1.5 shadow-xs shrink-0">
            <Filter size={15} className="text-brand-500" />
            <span className="text-xs font-bold text-text-secondary whitespace-nowrap">Caixa:</span>
            <select
              value={selectedCaixa}
              onChange={(e) => setSelectedCaixa(e.target.value)}
              className="bg-transparent border-none text-xs sm:text-sm font-bold text-text-primary focus:ring-0 cursor-pointer pr-6"
              aria-label="Selecionar Caixa"
            >
              <option value="todos">Todos os Caixas ({caixas.length})</option>
              {caixas.map((c: any) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── ABA 1: GESTÃO FINANCEIRA (VISÃO BI, KPIS, PROJEÇÃO, AGING) ───────── */}
      {activeTab === 'gestao' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {isLoadingBi ? (
            <div className="flex items-center justify-center h-64 text-text-secondary">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mr-3"></div>
              Carregando Gestão Financeira...
            </div>
          ) : (
            <>
              {/* TOP KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* Total Recebido */}
                <div className="bg-bg-primary border border-border shadow-card rounded-xl p-4 flex flex-col justify-between">
                  <div className="flex items-center gap-2 text-text-muted mb-2 text-[10px] font-bold uppercase tracking-wider">
                    <ArrowUpRight size={14} className="text-blue-500"/> Total Recebido
                  </div>
                  <div>
                    <div
                      className="text-xl sm:text-2xl font-extrabold text-text-primary mb-1 tracking-tight truncate font-mono"
                      title={formatBRL(biData?.recebimentos_realizados || 0)}
                    >{formatBRL(biData?.recebimentos_realizados || 0)}</div>
                    <div className="text-[10px] text-text-muted font-medium">No período selecionado</div>
                  </div>
                </div>

                {/* Total Pago */}
                <div className="bg-bg-primary border border-border shadow-card rounded-xl p-4 flex flex-col justify-between">
                  <div className="flex items-center gap-2 text-text-muted mb-2 text-[10px] font-bold uppercase tracking-wider">
                    <ArrowDownRight size={14} className="text-warning"/> Total Pago
                  </div>
                  <div>
                    <div
                      className="text-xl sm:text-2xl font-extrabold text-text-primary mb-1 tracking-tight truncate font-mono"
                      title={formatBRL(biData?.pagamentos_realizados || 0)}
                    >{formatBRL(biData?.pagamentos_realizados || 0)}</div>
                    <div className="text-[10px] text-text-muted font-medium">No período selecionado</div>
                  </div>
                </div>

                {/* A Receber */}
                <div className="bg-bg-primary border border-border shadow-card rounded-xl p-4 flex flex-col justify-between">
                  <div className="flex items-center gap-2 text-text-muted mb-2 text-[10px] font-bold uppercase tracking-wider">
                    <DollarSign size={14} className="text-brand-500"/> A Receber
                  </div>
                  <div>
                    <div
                      className="text-xl sm:text-2xl font-extrabold text-text-primary mb-1 tracking-tight truncate font-mono"
                      title={formatBRL(biData?.contas_receber || 0)}
                    >{formatBRL(biData?.contas_receber || 0)}</div>
                    <div className="text-[10px] text-danger font-bold flex items-center gap-1">
                      <ArrowDownRight size={12}/> Títulos em aberto
                    </div>
                  </div>
                </div>

                {/* A Pagar */}
                <div className="bg-bg-primary border border-border shadow-card rounded-xl p-4 flex flex-col justify-between">
                  <div className="flex items-center gap-2 text-text-muted mb-2 text-[10px] font-bold uppercase tracking-wider">
                    <CreditCard size={14} className="text-danger"/> A Pagar
                  </div>
                  <div>
                    <div
                      className="text-xl sm:text-2xl font-extrabold text-text-primary mb-1 tracking-tight truncate font-mono"
                      title={formatBRL(biData?.contas_pagar || 0)}
                    >{formatBRL(biData?.contas_pagar || 0)}</div>
                    <div className="text-[10px] text-danger font-bold flex items-center gap-1">
                      <ArrowDownRight size={12}/> Títulos em aberto
                    </div>
                  </div>
                </div>
              </div>

              {/* PROJEÇÃO DE FLUXO DE CAIXA */}
              <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 flex flex-col">
                <h3 className="font-bold text-text-primary text-sm flex items-center gap-2 mb-6">
                  <TrendingUp size={16} className="text-blue-500"/> Projeção de Fluxo de Caixa
                </h3>
                
                <div className="flex-1 overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-divider text-[10px] text-text-muted uppercase font-bold tracking-wider">
                        <th className="pb-3 px-2">PERÍODO</th>
                        <th className="pb-3 px-2 text-right">ENTRADAS PREVISTAS</th>
                        <th className="pb-3 px-2 text-right">SAÍDAS PREVISTAS</th>
                        <th className="pb-3 px-2 text-right">SALDO PROJETADO</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-divider/30 text-xs">
                      {projecaoData.map((row, i) => (
                        <tr key={i} className="hover:bg-bg-secondary/50 transition-colors">
                          <td className="py-4 px-2 font-bold text-text-primary flex items-center gap-2">
                            <Clock size={14} className="text-text-muted" /> {row.periodo}
                          </td>
                          <td className="py-4 px-2 text-right font-mono font-bold text-success">{formatBRL(row.entradas)}</td>
                          <td className="py-4 px-2 text-right font-mono font-bold text-danger">{formatBRL(row.saidas)}</td>
                          <td className="py-4 px-2 text-right">
                            <div className={clsx(
                              "inline-flex items-center gap-1 font-mono font-bold px-2 py-1 rounded",
                              row.saldo >= 0 ? "text-success bg-success/10" : "text-danger bg-danger/10"
                            )}>
                              {row.saldo >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                              {formatBRL(row.saldo)}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* EVOLUÇÃO (FLUXO REALIZADO) */}
              <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
                  <h3 className="font-bold text-text-primary text-sm flex items-center gap-2">
                    <BarChart3 size={16} className="text-brand-500"/> Fluxo Realizado: Entradas vs Saídas
                  </h3>

                  <div className="flex items-center gap-1 bg-bg-secondary p-1 rounded-lg border border-border self-end sm:self-auto">
                    <button
                      onClick={() => setChartView('daily')}
                      className={clsx(
                        'px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer',
                        chartView === 'daily' 
                          ? 'bg-brand-500 text-white shadow-sm' 
                          : 'text-text-secondary hover:text-text-primary'
                      )}
                    >
                      Diário
                    </button>
                    <button
                      onClick={() => setChartView('monthly')}
                      className={clsx(
                        'px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer',
                        chartView === 'monthly' 
                          ? 'bg-brand-500 text-white shadow-sm' 
                          : 'text-text-secondary hover:text-text-primary'
                      )}
                    >
                      12 Meses
                    </button>
                  </div>
                </div>

                <div className="h-[220px] sm:h-[280px] lg:h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={evolucaoData} margin={{ top: 20, right: 20, bottom: 0, left: -10 }} barGap={2}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.3} />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false} />
                      <YAxis tickFormatter={(v) => formatBRLCompact(v)} tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-bg-tertiary)', opacity: 0.4 }} />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} iconType="square" />
                      <Bar dataKey="recebido" name="Recebido" fill="#10B981" radius={[2, 2, 0, 0]} maxBarSize={30} />
                      <Bar dataKey="pago" name="Pago" fill="#EF4444" radius={[2, 2, 0, 0]} maxBarSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* ÚLTIMAS CONTAS PAGAS & RECEBIDAS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {/* Últimas Contas Pagas */}
                <div className="bg-bg-primary border border-border shadow-card rounded-xl p-3 sm:p-5">
                  <h3 className="font-bold text-text-primary text-sm flex items-center gap-2 mb-4">
                    <TrendingDown size={16} className="text-danger"/> Últimas 10 Contas Pagas
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-divider text-text-secondary font-semibold uppercase tracking-wider">
                          <th className="py-2.5">Descrição</th>
                          <th className="py-2.5">Pagamento</th>
                          <th className="py-2.5 text-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-divider font-medium">
                        {(biData?.ultimas_pagas || []).map((item: any, i: number) => (
                          <tr key={i} className="hover:bg-bg-secondary/40 transition-colors">
                            <td className="py-2.5 text-text-primary font-bold max-w-[200px] truncate" title={item.descricao}>{item.descricao}</td>
                            <td className="py-2.5 text-text-secondary whitespace-nowrap">{item.data_pagamento ? item.data_pagamento.substring(5, 10).split('-').reverse().join('/') : '-'}</td>
                            <td className="py-2.5 text-right font-mono text-danger font-bold whitespace-nowrap">{formatBRL(item.valor)}</td>
                          </tr>
                        ))}
                        {(!biData?.ultimas_pagas || biData.ultimas_pagas.length === 0) && (
                          <tr><td colSpan={3} className="py-6 text-center text-text-muted italic">Nenhuma conta paga no período</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Últimas Contas Recebidas */}
                <div className="bg-bg-primary border border-border shadow-card rounded-xl p-3 sm:p-5">
                  <h3 className="font-bold text-text-primary text-sm flex items-center gap-2 mb-4">
                    <TrendingUp size={16} className="text-success"/> Últimas 10 Contas Recebidas
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-divider text-text-secondary font-semibold uppercase tracking-wider">
                          <th className="py-2.5">Descrição</th>
                          <th className="py-2.5">Recebimento</th>
                          <th className="py-2.5 text-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-divider font-medium">
                        {(biData?.ultimas_recebidas || []).map((item: any, i: number) => (
                          <tr key={i} className="hover:bg-bg-secondary/40 transition-colors">
                            <td className="py-2.5 text-text-primary font-bold max-w-[200px] truncate" title={item.descricao}>{item.descricao}</td>
                            <td className="py-2.5 text-text-secondary whitespace-nowrap">{item.data_pagamento ? item.data_pagamento.substring(5, 10).split('-').reverse().join('/') : '-'}</td>
                            <td className="py-2.5 text-right font-mono text-success font-bold whitespace-nowrap">{formatBRL(item.valor)}</td>
                          </tr>
                        ))}
                        {(!biData?.ultimas_recebidas || biData.ultimas_recebidas.length === 0) && (
                          <tr><td colSpan={3} className="py-6 text-center text-text-muted italic">Nenhuma conta recebida no período</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* MAPA DE VENCIMENTOS (AGING) */}
              <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5">
                <h3 className="font-bold text-text-primary text-sm flex items-center gap-2 mb-6">
                  <Clock size={16} className="text-warning"/> Mapa de Vencimentos (Aging)
                </h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Contas a Receber Aging */}
                  <div>
                    <h4 className="font-bold text-[11px] uppercase tracking-wider text-blue-500 flex items-center gap-2 mb-3">
                      <DollarSign size={14} /> CONTAS A RECEBER
                    </h4>
                    <div className="flex flex-col gap-2">
                      {agingReceber.map((row: any, i: number) => {
                        const isExpanded = expandedReceberIndex === i;
                        const details = [
                          "Títulos com atraso no pagamento. Requer ação de cobrança comercial ativa.",
                          "Recebimentos previstos para os próximos 15 dias. Fluxo garantido para pagamentos imediatos.",
                          "Previsão de entrada na segunda quinzena do mês corrente.",
                          "Carteira de recebíveis de médio prazo cadastrada no ERP.",
                          "Planejamento financeiro de longo prazo com vencimento estendido."
                        ];
                        return (
                          <div key={i} className="flex flex-col">
                            <button 
                              onClick={() => setExpandedReceberIndex(isExpanded ? null : i)}
                              className={`w-full flex justify-between items-center p-3 rounded-xl transition-all duration-200 text-xs font-bold text-left focus:outline-none ${
                                row.red 
                                  ? "bg-danger/5 hover:bg-danger/10 border border-danger/20" 
                                  : "bg-bg-secondary/20 hover:bg-bg-secondary/40 border border-divider/60"
                              }`}
                            >
                              <span className={`flex items-center gap-2 ${row.red ? "text-danger" : "text-text-primary"}`}>
                                {row.red && <AlertTriangle size={13} />}
                                <span>{row.label}</span>
                              </span>
                              <div className="flex items-center gap-2 font-mono">
                                <span className={row.red ? "text-danger" : "text-blue-500"}>
                                  {formatBRL(row.valor)}
                                </span>
                                <ChevronDown size={14} className={clsx("text-text-secondary transition-transform duration-300", isExpanded && "rotate-180")} />
                              </div>
                            </button>
                            {isExpanded && (
                              <div className="bg-bg-secondary/35 border-x border-b border-divider/50 p-3 rounded-b-xl -mt-1 text-[11px] font-medium text-text-secondary animate-in slide-in-from-top-1 duration-200">
                                {details[i]}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Contas a Pagar Aging */}
                  <div>
                    <h4 className="font-bold text-[11px] uppercase tracking-wider text-warning flex items-center gap-2 mb-3">
                      <CreditCard size={14} /> CONTAS A PAGAR
                    </h4>
                    <div className="flex flex-col gap-2">
                      {agingPagar.map((row: any, i: number) => {
                        const isExpanded = expandedPagarIndex === i;
                        const details = [
                          "Contas vencidas em atraso. Priorizar pagamento para evitar acúmulo de juros e multas.",
                          "Contas com vencimento próximo. Provisão de saldo bancário recomendada.",
                          "Previsão de saída programada para a segunda quinzena do mês.",
                          "Duplicatas de fornecedores e prestadores de médio prazo.",
                          "Parcelamentos e compromissos contratuais de longo prazo."
                        ];
                        return (
                          <div key={i} className="flex flex-col">
                            <button 
                              onClick={() => setExpandedPagarIndex(isExpanded ? null : i)}
                              className={`w-full flex justify-between items-center p-3 rounded-xl transition-all duration-200 text-xs font-bold text-left focus:outline-none ${
                                row.red 
                                  ? "bg-danger/5 hover:bg-danger/10 border border-danger/20" 
                                  : "bg-bg-secondary/20 hover:bg-bg-secondary/40 border border-divider/60"
                              }`}
                            >
                              <span className={`flex items-center gap-2 ${row.red ? "text-danger" : "text-text-primary"}`}>
                                {row.red && <AlertTriangle size={13} />}
                                <span>{row.label}</span>
                              </span>
                              <div className="flex items-center gap-2 font-mono">
                                <span className={row.red ? "text-danger" : "text-warning"}>
                                  {formatBRL(row.valor)}
                                </span>
                                <ChevronDown size={14} className={clsx("text-text-secondary transition-transform duration-300", isExpanded && "rotate-180")} />
                              </div>
                            </button>
                            {isExpanded && (
                              <div className="bg-bg-secondary/35 border-x border-b border-divider/50 p-3 rounded-b-xl -mt-1 text-[11px] font-medium text-text-secondary animate-in slide-in-from-top-1 duration-200">
                                {details[i]}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── ABA 2: FLUXO DE CAIXA DETALHADO ─────────────────────────────────── */}
      {activeTab === 'fluxo' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5">
            <h3 className="font-bold text-text-primary text-sm flex items-center gap-2 mb-4">
              <LineChart size={16} className="text-brand-500" />
              Demonstrativo de Fluxo de Caixa Diário
            </h3>

            {isLoadingFluxo ? (
              <div className="text-xs text-text-secondary py-8 text-center">Carregando fluxo de caixa...</div>
            ) : fluxoList.length === 0 ? (
              <div className="text-xs text-text-secondary py-8 text-center italic">Nenhum registro de fluxo no período selecionado.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-divider text-text-secondary font-semibold uppercase tracking-wider">
                      <th className="py-2.5 px-3">Data</th>
                      <th className="py-2.5 px-3 text-right">Entradas</th>
                      <th className="py-2.5 px-3 text-right">Saídas</th>
                      <th className="py-2.5 px-3 text-right">Saldo do Dia</th>
                      <th className="py-2.5 px-3 text-right">Saldo Acumulado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-divider font-medium">
                    {fluxoList.map((item: any, idx: number) => {
                      const saldoDia = item.saldo_do_dia ?? (item.entradas - item.saidas);
                      return (
                        <tr key={idx} className="hover:bg-bg-secondary/40 transition-colors">
                          <td className="py-2.5 px-3 text-text-primary font-bold">
                            {item.data ? item.data.split('-').reverse().join('/') : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-success">
                            {formatBRL(item.entradas)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-danger">
                            {formatBRL(item.saidas)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold">
                            <span className={saldoDia >= 0 ? 'text-success' : 'text-danger'}>
                              {formatBRL(saldoDia)}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-extrabold">
                            <span className={(item.saldo_acumulado || 0) >= 0 ? 'text-brand-600 dark:text-brand-400' : 'text-danger'}>
                              {formatBRL(item.saldo_acumulado || 0)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ABA 3: TÍTULOS & CONTAS (PAGAR / RECEBER) ────────────────────────── */}
      {activeTab === 'titulos' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Barra de Filtros Internos de Títulos */}
          <div className="bg-bg-primary border border-border shadow-card rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="bg-bg-secondary border border-divider text-xs font-bold text-text-primary rounded-lg px-3 py-2 cursor-pointer"
                value={tipoTitulo}
                onChange={(e) => setTipoTitulo(e.target.value as any)}
                aria-label="Tipo de Conta"
              >
                <option value="">Todas as Contas (Receber e Pagar)</option>
                <option value="RECEBER">A Receber</option>
                <option value="PAGAR">A Pagar</option>
              </select>

              <select
                className="bg-bg-secondary border border-divider text-xs font-bold text-text-primary rounded-lg px-3 py-2 cursor-pointer"
                value={statusTitulo}
                onChange={(e) => setStatusTitulo(e.target.value as any)}
                aria-label="Status de Pagamento"
              >
                <option value="">Todos os Status</option>
                <option value="ABERTO">Em Aberto</option>
                <option value="PAGO">Pago</option>
                <option value="VENCIDA">Vencida</option>
              </select>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  placeholder="Buscar descrição, cliente..."
                  value={buscaTitulo}
                  onChange={(e) => setBuscaTitulo(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-bg-secondary border border-divider rounded-lg text-xs font-medium text-text-primary focus:outline-none focus:border-brand-500"
                />
              </div>
              <span className="text-xs text-text-secondary whitespace-nowrap">
                {titulos.length} título(s)
              </span>
            </div>
          </div>

          {/* Tabela de Títulos */}
          <DataTable
            loading={isLoadingTitulos}
            data={titulos}
            empty="Nenhum título encontrado com os filtros atuais."
            columns={[
              {
                key: 'tipo',
                label: 'TIPO',
                render: (r: any) => {
                  const rTipo = String(r.tipo || '').trim();
                  return (
                    <span className={`flex items-center gap-1.5 text-xs font-bold ${rTipo === 'RECEBER' ? 'text-success' : 'text-danger'}`}>
                      {rTipo === 'RECEBER' ? <ArrowDownCircle size={14} /> : <ArrowUpCircle size={14} />}
                      {rTipo}
                    </span>
                  );
                }
              },
              { 
                key: 'descricao', 
                label: 'DESCRIÇÃO', 
                render: (r: any) => (
                  <div className="flex flex-col min-w-0 max-w-[300px]">
                    <span className="font-semibold text-xs sm:text-sm text-text-primary leading-tight truncate">{r.descricao || '—'}</span>
                    <span className="text-[10px] text-text-muted mt-0.5 truncate">
                      {r.cliente || '—'}
                    </span>
                  </div>
                )
              },
              { key: 'cliente', label: 'CLIENTE/FORNECEDOR', className: 'hidden md:table-cell', render: (r: any) => <span className="text-xs text-text-secondary max-w-[200px] truncate block">{r.cliente || '—'}</span> },
              { key: 'data_vencimento', label: 'VENCIMENTO', render: (r: any) => <span className="mono text-xs">{formatDate(r.data_vencimento)}</span> },
              {
                key: 'valor',
                label: 'VALOR',
                align: 'right',
                render: (r: any) => <span className="font-semibold font-mono text-xs sm:text-sm">{formatBRL(r.valor)}</span>
              },
              {
                key: 'status_pagamento',
                label: 'STATUS',
                align: 'right',
                render: (r: any) => {
                  const rStatus = String(r.status_pagamento || '').trim();
                  let isVencida = rStatus === 'ABERTO' && new Date(r.data_vencimento) < new Date(new Date().setHours(0,0,0,0));
                  let statusText = isVencida ? 'VENCIDA' : rStatus;
                  
                  let badgeClass = 'bg-bg-tertiary text-text-secondary border-border';
                  let Icon = null;
                  
                  if (statusText === 'PAGO') {
                     badgeClass = 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400 border-green-200 dark:border-green-800';
                     Icon = CheckCircle;
                  } else if (statusText === 'VENCIDA') {
                     badgeClass = 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-200 dark:border-red-800';
                     Icon = AlertCircle;
                  } else if (statusText === 'ABERTO') {
                     badgeClass = 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-800';
                  }
                  
                  return (
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${badgeClass}`}>
                      {Icon && <Icon size={12} />}
                      {statusText}
                    </span>
                  );
                }
              }
            ]}
          />
        </div>
      )}

      {/* ── ABA 4: CAIXAS & MOVIMENTOS (SALDOS POR ESPÉCIE & EXTRATO) ─────────── */}
      {activeTab === 'caixas' && (
        <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200">
          {/* Resumo do Caixa */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            <KPICard
              label="Entradas no Caixa"
              value={formatBRL(caixaSummary.data?.kpis?.entradas || 0)}
              compactValue={formatBRLCompact(caixaSummary.data?.kpis?.entradas)}
              icon={ArrowDownCircle}
              iconColor="text-success"
              hint={`${caixaSummary.data?.kpis?.qtd_entradas || 0} movimentos`}
              loading={caixaSummary.isLoading}
            />
            <KPICard
              label="Saídas do Caixa"
              value={formatBRL(caixaSummary.data?.kpis?.saidas || 0)}
              compactValue={formatBRLCompact(caixaSummary.data?.kpis?.saidas)}
              icon={ArrowUpCircle}
              iconColor="text-danger"
              hint={`${caixaSummary.data?.kpis?.qtd_saidas || 0} movimentos`}
              loading={caixaSummary.isLoading}
            />
            <KPICard
              label="Saldo Líquido do Caixa"
              value={formatBRL(caixaSummary.data?.kpis?.saldo || 0)}
              compactValue={formatBRLCompact(caixaSummary.data?.kpis?.saldo)}
              icon={Scale}
              iconColor={(caixaSummary.data?.kpis?.saldo || 0) >= 0 ? 'text-success' : 'text-danger'}
              loading={caixaSummary.isLoading}
            />
          </div>

          {/* Saldos por Espécie */}
          <div className="bg-bg-primary rounded-xl border border-border p-5 shadow-card">
            <h3 className="font-heading font-semibold text-base sm:text-lg mb-4 text-text-primary flex items-center gap-2">
              <Wallet className="text-brand-500" size={20} />
              Saldos do Caixa por Espécie {selectedCaixa === 'todos' ? '(Todos os Caixas)' : ''}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {displayEspecies.map((esp) => (
                <div key={esp.nome} className="flex flex-col p-4 rounded-xl bg-bg-secondary border border-divider hover:border-brand-200 transition-colors">
                  <span className="text-xs font-extrabold text-text-secondary mb-1 truncate capitalize">
                    Saldo em {esp.nome.toLowerCase().replace('cartao ', '')}
                  </span>
                  <span className="font-black text-text-primary text-base sm:text-lg font-mono truncate" title={formatBRL(esp.total)}>
                    {formatBRL(esp.total)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Vendas por Espécie (À Vista vs A Prazo) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-bg-primary rounded-xl border border-border p-5 shadow-card flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-divider">
                  <h3 className="font-extrabold text-text-primary text-xs uppercase tracking-wider flex items-center gap-2">
                    <CreditCard size={16} className="text-blue-500" />
                    Vendas no Período por Espécie (Caixa)
                  </h3>
                  <span className="text-[10px] font-bold text-text-muted">À Vista</span>
                </div>
                <div className="space-y-2">
                  {caixaSummary.isLoading ? (
                    <div className="text-xs text-text-secondary py-4 text-center">Carregando espécies...</div>
                  ) : vendasVista.itens.length === 0 ? (
                    <div className="text-xs text-text-secondary py-4 text-center">Nenhuma venda à vista no período.</div>
                  ) : (
                    vendasVista.itens.map((v: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center text-xs py-1.5 px-2.5 rounded-lg hover:bg-bg-secondary transition-colors">
                        <span className="font-semibold text-text-primary uppercase truncate pr-2">{v.nome}</span>
                        <span className="font-mono font-bold text-text-primary shrink-0">{formatBRL(v.total)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-divider flex justify-between items-center bg-bg-secondary/40 p-2.5 rounded-lg">
                <span className="text-xs font-black uppercase text-text-primary">Subtotal À Vista</span>
                <span className="font-mono font-black text-sm text-blue-600 dark:text-blue-400">{formatBRL(vendasVista.subtotal)}</span>
              </div>
            </div>

            <div className="bg-bg-primary rounded-xl border border-border p-5 shadow-card flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-divider">
                  <h3 className="font-extrabold text-text-primary text-xs uppercase tracking-wider flex items-center gap-2">
                    <ShoppingCart size={16} className="text-emerald-500" />
                    Vendas a Prazo no Período por Espécie
                  </h3>
                  <span className="text-[10px] font-bold text-text-muted">Faturadas / Boletos</span>
                </div>
                <div className="space-y-2">
                  {caixaSummary.isLoading ? (
                    <div className="text-xs text-text-secondary py-4 text-center">Carregando espécies a prazo...</div>
                  ) : vendasPrazo.itens.length === 0 ? (
                    <div className="text-xs text-text-secondary py-4 text-center">Nenhuma venda a prazo no período.</div>
                  ) : (
                    vendasPrazo.itens.map((v: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center text-xs py-1.5 px-2.5 rounded-lg hover:bg-bg-secondary transition-colors">
                        <span className="font-semibold text-text-primary uppercase truncate pr-2">{v.nome}</span>
                        <span className="font-mono font-bold text-text-primary shrink-0">{formatBRL(v.total)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-divider flex justify-between items-center bg-bg-secondary/40 p-2.5 rounded-lg">
                <span className="text-xs font-black uppercase text-text-primary">Subtotal A Prazo</span>
                <span className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">{formatBRL(vendasPrazo.subtotal)}</span>
              </div>
            </div>
          </div>

          {/* Lista de Movimentações */}
          <div className="bg-bg-primary rounded-xl border border-border p-6 shadow-card">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 pb-3 border-b border-divider">
              <div>
                <h3 className="font-heading font-semibold text-base sm:text-lg text-text-primary flex items-center gap-2">
                  <Receipt className="text-brand-500" size={20} />
                  Movimentações {selectedCaixa === 'todos' ? 'de Todos os Caixas' : `do Caixa`}
                </h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  {movimentos.length} registro(s) encontrado(s) {apenasVendas ? '· Filtrado: Apenas Vendas' : '· Todas as entradas e saídas'}
                </p>
              </div>

              <div className="flex items-center p-1 rounded-xl bg-bg-secondary border border-divider shadow-xs">
                <button
                  type="button"
                  onClick={() => setApenasVendas(false)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${!apenasVendas ? 'bg-brand-500 text-white shadow-xs' : 'text-text-secondary hover:text-text-primary'}`}
                >
                  Todas as Movimentações
                </button>
                <button
                  type="button"
                  onClick={() => setApenasVendas(true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${apenasVendas ? 'bg-emerald-600 text-white shadow-xs' : 'text-text-secondary hover:text-emerald-500'}`}
                >
                  <ShoppingCart size={14} />
                  Apenas Vendas
                </button>
              </div>
            </div>

            {caixasMovimentos.isLoading ? (
              <div className="text-sm text-text-secondary py-6 text-center">Carregando movimentações...</div>
            ) : !movimentos || movimentos.length === 0 ? (
              <div className="text-sm text-text-secondary py-6 text-center">Nenhuma movimentação registrada para este filtro no período.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-divider text-xs font-bold text-text-secondary uppercase">
                      <th className="py-2.5 px-3">Data</th>
                      <th className="py-2.5 px-3">Caixa</th>
                      <th className="py-2.5 px-3">Descrição / Cliente</th>
                      <th className="py-2.5 px-3">Doc / Pedido</th>
                      <th className="py-2.5 px-3">Tipo</th>
                      <th className="py-2.5 px-3">Espécie</th>
                      <th className="py-2.5 px-3 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-divider text-xs text-text-primary">
                    {movimentos.map((mov: any) => {
                      const isReceber = mov.tipo === 'RECEBER';
                      return (
                        <tr key={mov.id} className="hover:bg-bg-secondary/50 transition-colors">
                          <td className="py-2.5 px-3 text-text-secondary whitespace-nowrap">
                            {mov.data_pagamento ? new Date(mov.data_pagamento).toLocaleDateString('pt-BR') : ''}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded-md">
                              {mov.nome_caixa || 'CAIXA'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 max-w-[260px] truncate font-medium text-xs" title={mov.descricao || mov.cliente || 'Lançamento'}>
                            {mov.descricao || mov.cliente || 'Lançamento'}
                          </td>
                          <td className="py-2.5 px-3 text-text-secondary text-xs font-mono">
                            {mov.numero_pedido || '-'}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${isReceber ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                              {mov.tipo}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-semibold uppercase text-xs">{mov.especie || 'DINHEIRO'}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-xs whitespace-nowrap text-right">
                            <span className={isReceber ? 'text-success' : 'text-danger'}>
                              {formatBRL(mov.valor_pago || mov.valor)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

