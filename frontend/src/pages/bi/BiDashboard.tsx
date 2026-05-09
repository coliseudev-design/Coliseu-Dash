import { Outlet } from 'react-router-dom';
import { useBiFilterState } from '../../hooks/useBiPeriodQuery';

export default function BiDashboard() {
  const { filter, setFilter } = useBiFilterState();

  // Função simplificada para lidar com mudança de datas
  const handleDateChange = (start: string, end: string) => {
    setFilter((prev) => ({ ...prev, startDate: start, endDate: end }));
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Filtros Globais do BI */}
      <div className="bg-bg-primary border border-border-primary rounded-lg p-4 flex items-center justify-between shadow-sm">
        <h2 className="text-xl font-bold text-text-primary">Business Intelligence</h2>
        
        <div className="flex items-center space-x-4">
          <div className="flex flex-col">
            <label className="text-xs text-text-secondary mb-1">Data Inicial</label>
            <input 
              type="date" 
              className="bg-bg-secondary border border-border-primary rounded px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
              value={filter.startDate}
              onChange={(e) => handleDateChange(e.target.value, filter.endDate)}
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-text-secondary mb-1">Data Final</label>
            <input 
              type="date" 
              className="bg-bg-secondary border border-border-primary rounded px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
              value={filter.endDate}
              onChange={(e) => handleDateChange(filter.startDate, e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Conteúdo Dinâmico das Abas/Dashboards */}
      <div className="flex-1 overflow-auto">
        {/* Passamos o filter pelo contexto do Outlet se necessário, mas o ideal é que cada página use seu próprio hook ou Zustand.
            Para manter simples, as páginas filhas podem usar o hook. Mas para garantir mesma instância, 
            podemos usar Outlet context */}
        <Outlet context={{ filter }} />
      </div>
    </div>
  );
}
