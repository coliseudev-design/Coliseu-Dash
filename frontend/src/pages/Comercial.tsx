import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import PeriodFilter from '../components/PeriodFilter';
import { usePeriodStore, PERIOD_OPTIONS, periodToParams } from '../store/periodStore';
import { BiPeriodFilter } from '../types/bi.types';
import { useBranchParam } from '../contexts/BranchContext';
import { BarChart3, Users, Trophy, X, LayoutDashboard } from 'lucide-react';
import clsx from 'clsx';

export default function Comercial() {
  const periodState = usePeriodStore();
  const location = useLocation();
  const navigate = useNavigate();
  const branchParam = useBranchParam();

  const [isMobile, setIsMobile] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const filter: BiPeriodFilter = {
    ...periodToParams(periodState),
    ...branchParam
  };

  const tabs = [
    { path: '/comercial', label: 'Visão Consolidada', icon: LayoutDashboard },
    { path: '/comercial/equipe', label: 'Equipe', icon: Users },
    { path: '/comercial/rankings', label: 'Rankings', icon: Trophy }
  ];

  // Identifica se estamos na visão de drill-down do vendedor
  const isVendedorView = location.pathname.includes('/comercial/vendedor');

  return (
    <div className="flex flex-col h-full space-y-4 md:space-y-6 animate-in fade-in duration-300" aria-label="Módulo Comercial">
      
      {/* Header unificado do Módulo Comercial */}
      <div className="bg-bg-primary border border-divider rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between shadow-card gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight flex items-center gap-2">
            <BarChart3 className="text-brand-500" size={24} />
            Módulo Comercial
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
            Acompanhamento de vendas, metas, vendedores e rankings
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          {/* Desktop Filter */}
          <div className="hidden lg:block">
            <PeriodFilter excludePeriods={['yesterday']} />
          </div>

          {/* Mobile Filter Trigger */}
          {isMobile && (
            <button
              onClick={() => setShowMobileFilters(true)}
              className="px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer w-full md:w-auto text-center"
            >
              Filtro de Período
            </button>
          )}
        </div>
      </div>

      {/* Tabs de Navegação Comercial (apenas se não estiver no Hub de Vendedor individual) */}
      {!isVendedorView && (
        <div className="flex bg-bg-primary/80 backdrop-blur-md p-1 rounded-2xl border border-divider shadow-sm max-w-xl w-full">
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
                  "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer",
                  isActive
                    ? "bg-brand-500 text-white shadow-md"
                    : "text-text-secondary hover:bg-bg-secondary hover:text-text-primary"
                )}
              >
                <tab.icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Mobile Drawer Filter Modal */}
      {showMobileFilters && (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-[320px] bg-bg-primary h-full shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300">
            <div className="p-5 flex-1 overflow-y-auto space-y-5">
              <div className="flex justify-between items-center border-b border-divider pb-3">
                <h4 className="font-extrabold text-sm text-text-primary uppercase tracking-wider">Filtros de Período</h4>
                <button
                  onClick={() => setShowMobileFilters(false)}
                  className="text-text-muted hover:text-text-primary"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-extrabold text-text-secondary uppercase tracking-wider block">Período</span>
                <PeriodFilter excludePeriods={['yesterday']} compact={true} />
              </div>
            </div>

            <div className="p-4 border-t border-divider bg-bg-secondary/40">
              <button
                onClick={() => setShowMobileFilters(false)}
                className="w-full h-12 bg-brand-500 hover:bg-brand-600 text-white rounded-2xl text-xs font-bold shadow-sm cursor-pointer transition-all flex items-center justify-center"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Área de Renderização das Visões */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        <Outlet context={{ filter }} />
      </div>
    </div>
  );
}
