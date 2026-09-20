import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import PeriodFilter from '../components/PeriodFilter';
import { usePeriodStore, PERIOD_OPTIONS, periodToParams } from '../store/periodStore';
import { useApiQuery } from '../hooks/useApi';
import { BiPeriodFilter } from '../types/bi.types';
import { useBranchParam } from '../contexts/BranchContext';
import { Wallet, LineChart, FileText, Banknote, Filter, X, Sliders } from 'lucide-react';
import clsx from 'clsx';

export default function FinanceiroConsolidado() {
  const periodState = usePeriodStore();
  const location = useLocation();
  const navigate = useNavigate();
  const branchParam = useBranchParam();

  const [isMobile, setIsMobile] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [selectedCaixa, setSelectedCaixa] = useState('todos');

  // Carrega lista de caixas
  const { data: caixasRes } = useApiQuery<any>('/financeiro/caixas');
  const caixas = caixasRes?.data || [];

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const filter: BiPeriodFilter = {
    ...periodToParams(periodState),
    ...branchParam,
    ...(selectedCaixa !== 'todos' ? { caixa_id: selectedCaixa } : {})
  };

  const tabs = [
    { path: '/financeiro-consolidado', label: 'Gestão Financeira', shortLabel: 'Gestão', icon: Wallet },
    { path: '/financeiro-consolidado/fluxo-caixa', label: 'Fluxo de Caixa', shortLabel: 'Fluxo', icon: LineChart },
    { path: '/financeiro-consolidado/titulos', label: 'Títulos & Contas', shortLabel: 'Títulos', icon: FileText },
    { path: '/financeiro-consolidado/caixas', label: 'Caixas & Movimentos', shortLabel: 'Caixas', icon: Banknote }
  ];

  return (
    <div className="flex flex-col h-full space-y-3 md:space-y-4 animate-in fade-in duration-300" aria-label="Módulo Financeiro">
      
      {/* Header do Módulo Financeiro com Tabs integradas */}
      <div className="bg-bg-primary border border-divider rounded-2xl p-4 sm:p-5 flex flex-col gap-4 shadow-card">
        {/* Line 1: Title + Tabs */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight flex items-center gap-2 whitespace-nowrap">
              <Wallet className="text-brand-500" size={24} />
              Módulo Financeiro
            </h1>
            <p className="text-xs text-text-muted mt-0.5">Gestão de liquidez, projeção de caixa, títulos e extrato</p>
          </div>

          {/* Desktop Navigation Tabs */}
          <div className="flex flex-wrap bg-bg-secondary p-1 rounded-xl border border-divider shadow-xs gap-1">
            {tabs.map((tab) => {
              const isActive = 
                tab.path === '/financeiro-consolidado'
                  ? location.pathname === '/financeiro-consolidado' || location.pathname === '/financeiro-consolidado/gestao'
                  : location.pathname.startsWith(tab.path);
                  
              return (
                <button
                  key={tab.path}
                  onClick={() => navigate(tab.path)}
                  className={clsx(
                    "flex items-center justify-center gap-2 py-1.5 px-3.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    isActive
                      ? "bg-brand-500 text-white shadow-sm"
                      : "text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
                  )}
                >
                  <tab.icon size={14} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Line 2: Desktop Period Filter + Caixa Filter */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-3 border-t border-divider">
          <div className="flex-1 min-w-0 flex items-center overflow-x-auto pb-1 md:pb-0">
            <PeriodFilter excludePeriods={['yesterday']} />
          </div>

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

      {/* Mobile Bottom Sheet Filter Modal */}
      {showMobileFilters && (
        <div className="fixed inset-0 z-50 flex items-end justify-center select-none animate-in fade-in duration-200">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setShowMobileFilters(false)}
          />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl p-6 shadow-2xl z-10 animate-in slide-in-from-bottom duration-300 max-h-[85vh] overflow-y-auto flex flex-col pb-8">
            <div className="w-12 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-5 shrink-0" />

            <div className="flex justify-between items-center mb-6 shrink-0">
              <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">
                Filtrar Financeiro
              </h3>
              <button
                onClick={() => setShowMobileFilters(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-6 flex-1">
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2.5 pl-1">
                  Período
                </span>
                <PeriodFilter excludePeriods={['yesterday']} compact={true} />
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2.5 pl-1">
                  Caixa
                </span>
                <select
                  value={selectedCaixa}
                  onChange={(e) => setSelectedCaixa(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 dark:text-white"
                >
                  <option value="todos">Todos os Caixas ({caixas.length})</option>
                  {caixas.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-8 shrink-0">
              <button
                onClick={() => setShowMobileFilters(false)}
                className="w-full py-3.5 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-2xl text-xs shadow-md transition-all active:scale-[0.98] cursor-pointer"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MOBILE STICKY BOTTOM NAVIGATION ──────────────────────────────── */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800/80 py-2 px-4 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] select-none">
          <div className="flex items-center justify-around w-full max-w-md mx-auto">
            {tabs.map((tab) => {
              const isActive = 
                tab.path === '/financeiro-consolidado'
                  ? location.pathname === '/financeiro-consolidado' || location.pathname === '/financeiro-consolidado/gestao'
                  : location.pathname.startsWith(tab.path);
              return (
                <button
                  key={tab.path}
                  onClick={() => navigate(tab.path)}
                  className={clsx(
                    "flex flex-col items-center justify-center py-1 flex-1 cursor-pointer transition-all",
                    isActive ? "text-[#00a896]" : "text-slate-400 dark:text-slate-500"
                  )}
                >
                  <tab.icon size={18} />
                  <span className="text-[8px] font-bold uppercase tracking-wider mt-1">{tab.shortLabel}</span>
                </button>
              );
            })}
            {/* Filtros Trigger button */}
            <button
              onClick={() => setShowMobileFilters(true)}
              className="flex flex-col items-center justify-center py-1 flex-1 cursor-pointer transition-all text-slate-400 dark:text-slate-500 relative"
            >
              {periodState.period !== 'thisMonth' && (
                <span className="absolute top-1 right-6 w-2 h-2 rounded-full bg-emerald-500 border border-white" />
              )}
              <Sliders size={18} />
              <span className="text-[8px] font-bold uppercase tracking-wider mt-1">Filtros</span>
            </button>
          </div>
        </div>
      )}

      {/* Conteúdo Dinâmico */}
      <div className={clsx("flex-1 min-h-0 overflow-y-auto pr-1", isMobile ? "pb-28" : "")}>
        <Outlet context={{ filter }} />
      </div>
    </div>
  );
}

