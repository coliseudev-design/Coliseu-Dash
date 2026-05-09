import { useOutletContext } from 'react-router-dom';
import { useBiPeriodQuery } from '../../hooks/useBiPeriodQuery';
import { BIService } from '../../services/biApi';
import { BiPeriodFilter } from '../../types/bi.types';

export default function SalesHubDashboard() {
  const { filter } = useOutletContext<{ filter: BiPeriodFilter }>();

  const { data, isLoading, isError } = useBiPeriodQuery(
    ['bi', 'sales-hub'],
    BIService.getSalesHub,
    filter
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-text-secondary">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mr-3"></div>
        Carregando Hub de Vendas...
      </div>
    );
  }

  // Mock fallback
  const mockOrders = [
    {
      id: 12345,
      numero_nota: "NF-001234",
      data_emissao: "2026-01-15",
      cliente_nome: "Empresa XYZ Ltda",
      vendedor_nome: "João Silva",
      valor_total: 5420.50,
      status: "FATURADO" as const,
      status_code: 2,
      items_count: 8,
      margem_pct: 25.3
    },
    {
      id: 12344,
      numero_nota: "NF-001233",
      data_emissao: "2026-01-14",
      cliente_nome: "Loja ABC",
      vendedor_nome: "Maria Santos",
      valor_total: 3210.00,
      status: "PENDENTE" as const,
      status_code: 0,
      items_count: 5,
      margem_pct: 22.1
    }
  ];

  const recentOrders = data?.recent_orders || mockOrders;
  const sellerRankings = data?.seller_rankings || [];

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Tabela de Pedidos Recentes (Ocupa 2 colunas) */}
        <div className="lg:col-span-2 bg-bg-primary border border-border-primary rounded-xl shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border-primary flex justify-between items-center">
            <h3 className="text-base font-semibold text-text-primary">Pedidos Recentes</h3>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Buscar pedido..." 
                className="bg-bg-secondary border border-border-primary rounded-lg px-3 py-1 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-bg-secondary/50 text-xs text-text-secondary uppercase">
                  <th className="px-4 py-3 font-medium">Nota/Pedido</th>
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Vendedor</th>
                  <th className="px-4 py-3 font-medium text-right">Valor</th>
                  <th className="px-4 py-3 font-medium text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-primary">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-bg-secondary/30 transition-colors text-sm">
                    <td className="px-4 py-3 font-medium text-text-primary">{order.numero_nota}</td>
                    <td className="px-4 py-3 text-text-secondary">{order.data_emissao}</td>
                    <td className="px-4 py-3 text-text-primary truncate max-w-[150px]">{order.cliente_nome}</td>
                    <td className="px-4 py-3 text-text-secondary">{order.vendedor_nome}</td>
                    <td className="px-4 py-3 text-right font-medium text-text-primary">{formatCurrency(order.valor_total)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        order.status === 'FATURADO' ? 'bg-green-500/10 text-green-500' :
                        order.status === 'PENDENTE' ? 'bg-yellow-500/10 text-yellow-500' :
                        'bg-red-500/10 text-red-500'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Ranking de Vendedores */}
        <div className="bg-bg-primary border border-border-primary rounded-xl shadow-sm flex flex-col">
          <div className="p-4 border-b border-border-primary">
            <h3 className="text-base font-semibold text-text-primary">Performance Vendedores</h3>
          </div>
          <div className="p-4 flex-1 overflow-y-auto space-y-4">
            {sellerRankings.length > 0 ? (
              sellerRankings.map((seller) => (
                <div key={seller.vendedor_id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-500/10 text-brand-500 flex items-center justify-center font-bold text-xs">
                      #{seller.rank}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-text-primary">{seller.nome}</div>
                      <div className="text-xs text-text-secondary">{seller.quantidade_pedidos} pedidos</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-text-primary">{formatCurrency(seller.total_vendas)}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex items-center justify-center text-text-secondary text-sm italic">
                Nenhum dado de vendedor encontrado
              </div>
            )}
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
