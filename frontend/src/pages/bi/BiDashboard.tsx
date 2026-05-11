import { Outlet } from 'react-router-dom';
import PeriodFilter from '../../components/PeriodFilter';
import { usePeriodStore, periodToParams } from '../../store/periodStore';

export default function BiDashboard() {
  const periodState = usePeriodStore();
  const filter = periodToParams(periodState);

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Filtros Globais do BI */}
      <div className="bg-bg-primary border border-border-primary rounded-lg p-4 flex items-center justify-between shadow-sm">
        <h2 className="text-xl font-bold text-text-primary">Business Intelligence</h2>
        
        <div className="flex items-center space-x-4">
          <PeriodFilter excludePeriods={['today', 'yesterday', 'last7']} />
        </div>
      </div>

      {/* Conteúdo Dinâmico das Abas/Dashboards */}
      <div className="flex-1 overflow-auto">
        <Outlet context={{ filter }} />
      </div>
    </div>
  );
}
