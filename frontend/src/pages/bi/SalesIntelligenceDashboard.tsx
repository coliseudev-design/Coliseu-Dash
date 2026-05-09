import { useOutletContext } from 'react-router-dom';
import { useBiPeriodQuery } from '../../hooks/useBiPeriodQuery';
import { BIService } from '../../services/biApi';
import { BiPeriodFilter } from '../../types/bi.types';
import { TrendingUp, TrendingDown, DollarSign, ShoppingBag, Users, UserCheck } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Componente para Exibir Badge Comparativo
const ComparisonBadge = ({ pct }: { pct: number }) => {
  const isUp = pct > 0;
  const isDown = pct < 0;
  return (
    <div className={`flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${
      isUp ? 'bg-green-500/10 text-green-500' : isDown ? 'bg-red-500/10 text-red-500' : 'bg-slate-500/10 text-slate-500'
    }`}>
      {isUp && <TrendingUp size={12} className="mr-1" />}
      {isDown && <TrendingDown size={12} className="mr-1" />}
      {Math.abs(pct).toFixed(2)}%
    </div>
  );
};

export default function SalesIntelligenceDashboard() {
  const { filter } = useOutletContext<{ filter: BiPeriodFilter }>();

  const { data, isLoading, isError } = useBiPeriodQuery(
    ['bi', 'sales-intelligence'],
    BIService.getSalesIntelligence,
    filter
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-text-secondary">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mr-3"></div>
        Carregando Inteligência de Vendas...
      </div>
    );
  }

  // Se der erro (ex: backend não tem o endpoint ainda), podemos exibir um fallback
  const mockData = {
    faturamento: 125000.50,
    crescimento_pct: 13.64,
    quantidade_pedidos: 245,
    ticket_medio: 510.20,
    margem_bruta_pct: 28.5,
    clientes_ativos: 87,
    vendedores_ativos: 12,
    meta_total: 150000.00,
    atingimento_meta_pct: 83.33,
  };

  const summary = data?.executive_summary || mockData;
  const kpis = data?.commercial_kpis || mockData;

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Faturamento */}
        <div className="bg-bg-primary border border-border-primary rounded-xl p-4 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-text-secondary text-sm font-medium">Faturamento</span>
            <div className="p-2 bg-brand-500/10 text-brand-500 rounded-lg">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="text-2xl font-bold text-text-primary mb-1">
            {formatCurrency(summary.faturamento)}
          </div>
          <div className="flex items-center justify-between mt-auto">
            <ComparisonBadge pct={summary.crescimento_pct} />
            <span className="text-xs text-text-secondary">vs. período anterior</span>
          </div>
        </div>

        {/* Quantidade Pedidos */}
        <div className="bg-bg-primary border border-border-primary rounded-xl p-4 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-text-secondary text-sm font-medium">Pedidos</span>
            <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg">
              <ShoppingBag size={18} />
            </div>
          </div>
          <div className="text-2xl font-bold text-text-primary mb-1">
            {summary.quantidade_pedidos}
          </div>
          <div className="flex items-center justify-between mt-auto">
            <span className="text-xs text-text-secondary">Ticket Médio: {formatCurrency(summary.ticket_medio)}</span>
          </div>
        </div>

        {/* Clientes Ativos */}
        <div className="bg-bg-primary border border-border-primary rounded-xl p-4 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-text-secondary text-sm font-medium">Clientes Ativos</span>
            <div className="p-2 bg-purple-500/10 text-purple-500 rounded-lg">
              <Users size={18} />
            </div>
          </div>
          <div className="text-2xl font-bold text-text-primary mb-1">
            {summary.clientes_ativos}
          </div>
        </div>

        {/* Meta */}
        <div className="bg-bg-primary border border-border-primary rounded-xl p-4 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-text-secondary text-sm font-medium">Atingimento de Meta</span>
            <div className="p-2 bg-orange-500/10 text-orange-500 rounded-lg">
              <TrophyIcon size={18} />
            </div>
          </div>
          <div className="text-2xl font-bold text-text-primary mb-2">
            {summary.atingimento_meta_pct || kpis.atingimento_meta_pct}%
          </div>
          <div className="w-full bg-bg-secondary rounded-full h-2">
            <div 
              className="bg-brand-500 h-2 rounded-full" 
              style={{ width: `${Math.min(100, summary.atingimento_meta_pct || kpis.atingimento_meta_pct)}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Placeholder Gráfico */}
        <div className="bg-bg-primary border border-border-primary rounded-xl p-4 shadow-sm min-h-[300px]">
          <h3 className="text-base font-semibold text-text-primary mb-4">Evolução Diária</h3>
          <div className="h-64 flex items-center justify-center text-text-secondary border border-dashed border-border-primary rounded">
             Gráfico de Evolução (Em breve)
          </div>
        </div>
        
        {/* Placeholder Ranking */}
        <div className="bg-bg-primary border border-border-primary rounded-xl p-4 shadow-sm min-h-[300px]">
          <h3 className="text-base font-semibold text-text-primary mb-4">Top Vendedores</h3>
          <div className="h-64 flex items-center justify-center text-text-secondary border border-dashed border-border-primary rounded">
             Tabela de Ranking (Em breve)
          </div>
        </div>
      </div>

      {isError && (
        <div className="bg-orange-500/10 border border-orange-500/20 text-orange-500 p-3 rounded-lg text-sm mt-4">
          Aviso: Os dados exibidos podem ser simulados, pois houve erro na comunicação com a API.
        </div>
      )}
    </div>
  );
}

// Simple fallback icon
function TrophyIcon(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>;
}
