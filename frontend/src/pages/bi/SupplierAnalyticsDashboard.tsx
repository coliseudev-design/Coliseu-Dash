import { useOutletContext } from 'react-router-dom';
import { useBiPeriodQuery } from '../../hooks/useBiPeriodQuery';
import { BIService } from '../../services/biApi';
import { BiPeriodFilter } from '../../types/bi.types';
import { Truck, ShoppingBag, Clock, ShieldAlert, Package, TrendingUp } from 'lucide-react';
import { SupplierAnalyticsResponse } from '../../types/supplier.types';

export default function SupplierAnalyticsDashboard() {
  const { filter } = useOutletContext<{ filter: BiPeriodFilter }>();

  const { data, isLoading, isError } = useBiPeriodQuery<SupplierAnalyticsResponse>(
    ['bi', 'supplier'],
    BIService.getSupplierAnalytics,
    filter
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-text-secondary">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mr-3"></div>
        Carregando Análise de Fornecedores...
      </div>
    );
  }

  // Mock fallback
  const mockSupplier: SupplierAnalyticsResponse = {
    supplier_overview: {
      total_fornecedores: 145,
      fornecedores_ativos: 82,
      compras_totais: 450000.00,
      numero_compras: 320,
      ticket_medio_compra: 1406.25,
      prazo_medio_entrega_dias: 7.5,
      taxa_devolucao_pct: 2.1
    },
    top_fornecedores: [
      { fornecedor_id: 1, nome: "Distribuidora Tech Max", compras_totais: 125000.00, numero_compras: 45, ticket_medio: 2777.77, prazo_entrega_dias: 5.2, taxa_devolucao_pct: 1.5, status: "ATIVO" },
      { fornecedor_id: 2, nome: "Atacado Global", compras_totais: 85000.00, numero_compras: 62, ticket_medio: 1370.96, prazo_entrega_dias: 8.5, taxa_devolucao_pct: 3.2, status: "ATIVO" }
    ],
    analise_estoque: {
      estoque_total_valor: 850000.00,
      estoque_total_quantidade: 15420,
      produtos_estoque_critico: 45,
      produtos_estoque_baixo: 120,
      produtos_sem_estoque: 15,
      dias_estoque_medio: 45.5
    },
    ranking_marcas: [
      { marca: "TechBrand", compras_totais: 95000.00, numero_compras: 120, ticket_medio: 791.66, fornecedor_principal: "Distribuidora Tech Max", margem_media_pct: 32.5 },
      { marca: "HomeAppliances", compras_totais: 65000.00, numero_compras: 85, ticket_medio: 764.70, fornecedor_principal: "Atacado Global", margem_media_pct: 28.0 }
    ]
  };

  const supplier = data || mockSupplier;
  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-bg-primary border border-border-primary rounded-xl p-4 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-text-secondary text-sm font-medium">Total de Compras</span>
            <div className="p-2 bg-brand-500/10 text-brand-500 rounded-lg">
              <ShoppingBag size={18} />
            </div>
          </div>
          <div className="text-2xl font-bold text-text-primary mb-1">
            {formatCurrency(supplier.supplier_overview.compras_totais)}
          </div>
          <div className="flex items-center justify-between mt-auto">
            <span className="text-xs text-text-secondary">{supplier.supplier_overview.numero_compras} pedidos de {supplier.supplier_overview.fornecedores_ativos} fornecedores</span>
          </div>
        </div>

        <div className="bg-bg-primary border border-border-primary rounded-xl p-4 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-text-secondary text-sm font-medium">Prazo Médio Entrega</span>
            <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg">
              <Clock size={18} />
            </div>
          </div>
          <div className="text-2xl font-bold text-text-primary mb-1">
            {supplier.supplier_overview.prazo_medio_entrega_dias} dias
          </div>
          <div className="flex items-center justify-between mt-auto">
            <span className="text-xs text-text-secondary">Tempo médio de reposição</span>
          </div>
        </div>

        <div className="bg-bg-primary border border-border-primary rounded-xl p-4 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-text-secondary text-sm font-medium">Taxa de Devolução</span>
            <div className="p-2 bg-red-500/10 text-red-500 rounded-lg">
              <ShieldAlert size={18} />
            </div>
          </div>
          <div className="text-2xl font-bold text-text-primary mb-1">
            {supplier.supplier_overview.taxa_devolucao_pct}%
          </div>
          <div className="flex items-center justify-between mt-auto">
            <span className="text-xs text-text-secondary">Itens com defeito/RMA</span>
          </div>
        </div>

        <div className="bg-bg-primary border border-border-primary rounded-xl p-4 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-text-secondary text-sm font-medium">Valor em Estoque</span>
            <div className="p-2 bg-green-500/10 text-green-500 rounded-lg">
              <Package size={18} />
            </div>
          </div>
          <div className="text-2xl font-bold text-text-primary mb-1">
            {formatCurrency(supplier.analise_estoque.estoque_total_valor)}
          </div>
          <div className="flex items-center justify-between mt-auto">
            <span className="text-xs text-text-secondary">{supplier.analise_estoque.estoque_total_quantidade} itens armazenados</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Top Fornecedores */}
        <div className="xl:col-span-2 bg-bg-primary border border-border-primary rounded-xl shadow-sm flex flex-col">
          <div className="p-4 border-b border-border-primary flex items-center">
            <Truck size={18} className="text-brand-500 mr-2" />
            <h3 className="text-base font-semibold text-text-primary">Top Fornecedores (Parceiros Chave)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-bg-secondary/50 text-xs text-text-secondary uppercase">
                  <th className="px-4 py-3 font-medium">Fornecedor</th>
                  <th className="px-4 py-3 font-medium text-right">Volume Comprado</th>
                  <th className="px-4 py-3 font-medium text-right">Pedidos</th>
                  <th className="px-4 py-3 font-medium text-center">Prazo (Dias)</th>
                  <th className="px-4 py-3 font-medium text-center">Devolução</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-primary">
                {supplier.top_fornecedores.map((f, index) => (
                  <tr key={f.fornecedor_id} className="hover:bg-bg-secondary/30 transition-colors text-sm">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-text-tertiary w-4">{index + 1}.</span>
                        <span className="font-medium text-text-primary truncate max-w-[200px]">{f.nome}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-text-primary">{formatCurrency(f.compras_totais)}</td>
                    <td className="px-4 py-3 text-right text-text-secondary">{f.numero_compras}</td>
                    <td className="px-4 py-3 text-center text-text-secondary">
                      <span className={f.prazo_entrega_dias > 15 ? 'text-red-500' : 'text-green-500'}>
                        {f.prazo_entrega_dias}d
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        f.taxa_devolucao_pct > 3 ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'
                      }`}>
                        {f.taxa_devolucao_pct}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Análise de Estoque e Marcas */}
        <div className="space-y-4">
          <div className="bg-bg-primary border border-border-primary rounded-xl p-4 shadow-sm flex flex-col">
            <h3 className="text-base font-semibold text-text-primary mb-4 flex items-center">
              <ShieldAlert size={18} className="text-yellow-500 mr-2" /> Alertas de Reposição
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 border border-border-primary rounded-lg bg-red-500/5">
                <span className="text-sm font-medium text-text-primary">Produtos sem estoque</span>
                <span className="text-lg font-bold text-red-500">{supplier.analise_estoque.produtos_sem_estoque}</span>
              </div>
              <div className="flex justify-between items-center p-3 border border-border-primary rounded-lg bg-orange-500/5">
                <span className="text-sm font-medium text-text-primary">Estoque Crítico</span>
                <span className="text-lg font-bold text-orange-500">{supplier.analise_estoque.produtos_estoque_critico}</span>
              </div>
              <div className="flex justify-between items-center p-3 border border-border-primary rounded-lg bg-yellow-500/5">
                <span className="text-sm font-medium text-text-primary">Estoque Baixo</span>
                <span className="text-lg font-bold text-yellow-500">{supplier.analise_estoque.produtos_estoque_baixo}</span>
              </div>
            </div>
          </div>

          <div className="bg-bg-primary border border-border-primary rounded-xl p-4 shadow-sm flex flex-col flex-1">
            <h3 className="text-base font-semibold text-text-primary mb-4 flex items-center">
              <TrendingUp size={18} className="text-brand-500 mr-2" /> Top Marcas (Giro)
            </h3>
            <div className="space-y-3 overflow-y-auto max-h-[200px]">
              {supplier.ranking_marcas.map((m, i) => (
                <div key={i} className="flex justify-between items-center p-2 border-b border-border-primary last:border-0">
                  <div>
                    <div className="text-sm font-medium text-text-primary">{m.marca}</div>
                    <div className="text-xs text-text-secondary truncate max-w-[150px]">Via {m.fornecedor_principal}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-text-primary">{formatCurrency(m.compras_totais)}</div>
                    <div className="text-xs text-green-500">{m.margem_media_pct}% margem</div>
                  </div>
                </div>
              ))}
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
