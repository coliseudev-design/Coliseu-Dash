import { useOutletContext } from 'react-router-dom';
import { useBiPeriodQuery } from '../../hooks/useBiPeriodQuery';
import { BIService } from '../../services/biApi';
import { BiPeriodFilter } from '../../types/bi.types';
import { Users, UserPlus, UserMinus, Activity, AlertCircle } from 'lucide-react';

export default function CustomerAnalyticsDashboard() {
  const { filter } = useOutletContext<{ filter: BiPeriodFilter }>();

  const { data, isLoading, isError } = useBiPeriodQuery(
    ['bi', 'customer-analytics'],
    BIService.getCustomerAnalytics,
    filter
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-text-secondary">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mr-3"></div>
        Carregando Análise de Clientes...
      </div>
    );
  }

  // Mock fallback
  const mockAnalytics = {
    customer_overview: {
      total_clientes: 450,
      clientes_ativos: 320,
      clientes_novos: 25,
      clientes_em_crescimento: 85,
      clientes_em_queda: 42,
      clientes_inativos: 78,
      taxa_retencao_pct: 92.5,
      valor_medio_cliente: 390.63
    },
    top_clientes: [
      { rank: 1, cliente_id: 456, nome: "Loja Premium ABC", faturamento: 25000.00, quantidade_pedidos: 45, ticket_medio: 555.56, margem_media_pct: 28.5, ultima_compra: "2026-01-18" },
      { rank: 2, cliente_id: 789, nome: "Supermercado XYZ", faturamento: 18000.00, quantidade_pedidos: 32, ticket_medio: 562.50, margem_media_pct: 25.0, ultima_compra: "2026-01-15" }
    ],
    clientes_sem_comprar: [
      { cliente_id: 123, nome: "Loja XYZ", dias_sem_comprar: 120, ultima_compra: "2025-09-20", faturamento_historico: 15000.00, frequencia_dias: 25, risco_churn_pct: 85.0 }
    ],
    clientes_novos: [
      { cliente_id: 789, nome: "Novo Cliente 2026", data_primeira_compra: "2026-01-10", faturamento: 5000.00, quantidade_pedidos: 3, ticket_medio: 1666.67, potencial_score: 7.5 }
    ]
  };

  const analytics = data || mockAnalytics;
  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-bg-primary border border-border-primary rounded-xl p-4 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-text-secondary text-sm font-medium">Clientes Ativos</span>
            <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg">
              <Users size={18} />
            </div>
          </div>
          <div className="text-2xl font-bold text-text-primary mb-1">
            {analytics.customer_overview.clientes_ativos}
          </div>
          <div className="flex items-center justify-between mt-auto">
            <span className="text-xs text-text-secondary">de {analytics.customer_overview.total_clientes} totais</span>
          </div>
        </div>

        <div className="bg-bg-primary border border-border-primary rounded-xl p-4 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-text-secondary text-sm font-medium">Novos Clientes</span>
            <div className="p-2 bg-green-500/10 text-green-500 rounded-lg">
              <UserPlus size={18} />
            </div>
          </div>
          <div className="text-2xl font-bold text-text-primary mb-1">
            {analytics.customer_overview.clientes_novos}
          </div>
          <div className="flex items-center justify-between mt-auto">
            <span className="text-xs text-text-secondary">Neste período</span>
          </div>
        </div>

        <div className="bg-bg-primary border border-border-primary rounded-xl p-4 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-text-secondary text-sm font-medium">Clientes Inativos</span>
            <div className="p-2 bg-red-500/10 text-red-500 rounded-lg">
              <UserMinus size={18} />
            </div>
          </div>
          <div className="text-2xl font-bold text-text-primary mb-1">
            {analytics.customer_overview.clientes_inativos}
          </div>
          <div className="flex items-center justify-between mt-auto">
            <span className="text-xs text-text-secondary">Sem comprar há >90 dias</span>
          </div>
        </div>

        <div className="bg-bg-primary border border-border-primary rounded-xl p-4 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-text-secondary text-sm font-medium">Retenção</span>
            <div className="p-2 bg-brand-500/10 text-brand-500 rounded-lg">
              <Activity size={18} />
            </div>
          </div>
          <div className="text-2xl font-bold text-text-primary mb-1">
            {analytics.customer_overview.taxa_retencao_pct}%
          </div>
          <div className="flex items-center justify-between mt-auto">
            <span className="text-xs text-text-secondary">Valor Médio: {formatCurrency(analytics.customer_overview.valor_medio_cliente)}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Top Clientes */}
        <div className="bg-bg-primary border border-border-primary rounded-xl shadow-sm flex flex-col">
          <div className="p-4 border-b border-border-primary">
            <h3 className="text-base font-semibold text-text-primary">Top Clientes por Faturamento</h3>
          </div>
          <div className="p-4 overflow-y-auto max-h-[300px]">
            <div className="space-y-3">
              {analytics.top_clientes.map((c) => (
                <div key={c.cliente_id} className="flex justify-between items-center p-3 border border-border-primary rounded-lg bg-bg-secondary/30">
                  <div className="flex gap-3 items-center">
                    <div className="font-bold text-lg text-brand-500 w-6">#{c.rank}</div>
                    <div>
                      <div className="text-sm font-medium text-text-primary">{c.nome}</div>
                      <div className="text-xs text-text-secondary">{c.quantidade_pedidos} pedidos • Último em {c.ultima_compra}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-text-primary">{formatCurrency(c.faturamento)}</div>
                    <div className="text-xs text-text-secondary">TM: {formatCurrency(c.ticket_medio)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Clientes em Risco (Inativos) */}
        <div className="bg-bg-primary border border-border-primary rounded-xl shadow-sm flex flex-col">
          <div className="p-4 border-b border-border-primary flex items-center">
            <AlertCircle size={18} className="text-red-500 mr-2" />
            <h3 className="text-base font-semibold text-text-primary">Clientes em Risco (Sem Comprar)</h3>
          </div>
          <div className="p-4 overflow-y-auto max-h-[300px]">
            <div className="space-y-3">
              {analytics.clientes_sem_comprar.map((c) => (
                <div key={c.cliente_id} className="flex justify-between items-center p-3 border border-border-primary rounded-lg bg-red-500/5">
                  <div>
                    <div className="text-sm font-medium text-text-primary">{c.nome}</div>
                    <div className="text-xs text-red-500">{c.dias_sem_comprar} dias sem comprar</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-text-primary">{formatCurrency(c.faturamento_historico)}</div>
                    <div className="text-xs text-text-secondary">Risco de Churn: {c.risco_churn_pct}%</div>
                  </div>
                </div>
              ))}
              {analytics.clientes_sem_comprar.length === 0 && (
                <div className="text-sm text-text-secondary text-center py-4">Nenhum cliente em risco encontrado.</div>
              )}
            </div>
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
