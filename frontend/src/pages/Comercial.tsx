import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import PeriodFilter from '../components/PeriodFilter';
import { usePeriodStore, PERIOD_OPTIONS, periodToParams } from '../store/periodStore';
import { BiPeriodFilter } from '../types/bi.types';
import { useBranchParam } from '../contexts/BranchContext';
import { BarChart3, Users, Trophy, X, LayoutDashboard, ShoppingCart, Award, Sliders, ChevronDown } from 'lucide-react';
import clsx from 'clsx';

export default function Comercial() {
  const periodState = usePeriodStore();
  const location = useLocation();
  const navigate = useNavigate();
  const branchParam = useBranchParam();

  const [isMobile, setIsMobile] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const filter: BiPeriodFilter = {
    ...periodToParams(periodState),
    ...branchParam
  };

  const tabs = [
    { path: '/comercial', label: 'Visão Consolidada', shortLabel: 'Consolidada', icon: LayoutDashboard },
    { path: '/comercial/equipe', label: 'Equipes', shortLabel: 'Equipes', icon: Users },
    { path: '/comercial/rankings', label: 'Rankings', shortLabel: 'Rankings', icon: Trophy }
  ];

  // Identifica se estamos na visão de drill-down do vendedor
  const isVendedorView = location.pathname.includes('/comercial/vendedor');

  const currentTab = tabs.find(t => 
    t.path === '/comercial'
      ? location.pathname === '/comercial' || location.pathname === '/comercial/vendas'
      : location.pathname.startsWith(t.path)
  );

  const title = currentTab ? currentTab.label : 'Módulo Comercial';
  const description = currentTab
    ? (currentTab.label === 'Visão Consolidada' ? 'Acompanhamento consolidado de faturamento, vendas e KPIs'
      : currentTab.label === 'Hub de Pedidos' ? 'Central de monitoramento de pedidos, status de faturamento e performance'
      : currentTab.label === 'Equipes' ? 'Acompanhamento de comissões, metas e faturamento das equipes de venda'
      : currentTab.label === 'Hub do Vendedor' ? 'Painel detalhado de performance individual de vendas do vendedor'
      : 'Classificação de vendedores, marcas, produtos e cidades por faturamento')
    : 'Acompanhamento de vendas, metas, vendedores e rankings';

  const HeaderIcon = currentTab ? currentTab.icon : BarChart3;

  return (
    <div className="flex flex-col h-full space-y-4 md:space-y-6 animate-in fade-in duration-300" aria-label="Módulo Comercial">
      
      {/* Header unificado do Módulo Comercial */}
      <div className="bg-bg-primary border border-divider rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between shadow-card gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight flex items-center gap-2">
            <HeaderIcon className="text-brand-500" size={24} />
            {title}
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
            {description}
          </p>
        </div>

        <div className="hidden md:flex items-center gap-3 w-full md:w-auto justify-end">
          {/* Desktop Filter */}
          <div>
            <PeriodFilter excludePeriods={['yesterday']} />
          </div>
        </div>
      </div>

      {/* Mobile Bottom Sheet Filter Modal */}
      {showMobileFilters && (
        <div className="fixed inset-0 z-50 flex items-end justify-center select-none animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setShowMobileFilters(false)}
          />
          {/* Bottom Sheet Drawer */}
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl p-6 shadow-2xl z-10 animate-in slide-in-from-bottom duration-300 max-h-[85vh] overflow-y-auto flex flex-col pb-8">
            {/* Handle bar */}
            <div className="w-12 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-5 shrink-0" />

            <div className="flex justify-between items-center mb-6 shrink-0">
              <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">
                Filtrar Comercial
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
            </div>

            <div className="mt-8 shrink-0">
              <button
                onClick={() => setShowMobileFilters(false)}
                className="w-full py-3.5 bg-[#00a896] hover:bg-[#008f80] text-white font-bold rounded-2xl text-xs shadow-md transition-all active:scale-[0.98] cursor-pointer"
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
                tab.path === '/comercial'
                  ? location.pathname === '/comercial' || location.pathname === '/comercial/vendas'
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

      {/* Área de Renderização das Visões */}
      <div className={clsx("flex-1 min-h-0 overflow-y-auto pr-1", isMobile ? "pb-28" : "")}>
        <Outlet context={{ filter }} />
      </div>
    </div>
  );
}
