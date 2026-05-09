import { useOutletContext } from 'react-router-dom';
import { useBiPeriodQuery } from '../../hooks/useBiPeriodQuery';
import { BIService } from '../../services/biApi';
import { BiPeriodFilter } from '../../types/bi.types';
import { DollarSign, ArrowDownRight, ArrowUpRight, Wallet } from 'lucide-react';

export default function FinancialIntelligenceDashboard() {
  const { filter } = useOutletContext<{ filter: BiPeriodFilter }>();

  const { data, isLoading, isError } = useBiPeriodQuery(
    ['bi', 'financial'],
    BIService.getFinancialIntelligence,
    filter
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-text-secondary">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mr-3"></div>
        Carregando Inteligência Financeira...
      </div>
    );
  }

  // Mock fallback
  const mockFinancial = {
    visao_geral: {
      faturamento_total: 125000.50,
      custo_total: 89375.36,
      lucro_bruto: 35625.14,
      margem_bruta_pct: 28.5,
      periodo: { inicio: "2026-01-01", fim: "2026-01-31" }
    },
    contas_receber: {
      total_recebido: 120000.00,
      total_a_receber: 45000.00,
      a_receber_15d: 12000.00,
      a_receber_30d: 28000.00,
      a_receber_60d: 35000.00,
      taxa_inadimplencia_pct: 3.2,
      dias_medio_recebimento: 18.5
    },
    contas_pagar: {
      total_pago: 85000.00,
      total_a_pagar: 32000.00,
      a_pagar_15d: 8000.00,
      a_pagar_30d: 18000.00,
      a_pagar_60d: 28000.00,
      dias_medio_pagamento: 22.3
    },
    fluxo_caixa: {
      saldo_real: 35000.00,
      saldo_projetado_15d: 27000.00,
      saldo_projetado_30d: 10000.00,
      saldo_projetado_60d: 17000.00
    },
    analise_por_grupo: [
      { grupo: "Eletrônicos", faturamento: 45000.00, custo: 31500.00, lucro: 13500.00, margem_pct: 30.0, quantidade_vendas: 85 }
    ],
    analise_por_marca: [
      { marca: "Brand Premium", faturamento: 35000.00, custo: 24500.00, lucro: 10500.00, margem_pct: 30.0, quantidade_vendas: 65 }
    ]
  };

  const financial = data || mockFinancial;
  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Faturamento */}
        <div className="bg-bg-primary border border-border-primary rounded-xl p-4 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-text-secondary text-sm font-medium">Faturamento Total</span>
            <div className="p-2 bg-brand-500/10 text-brand-500 rounded-lg">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="text-2xl font-bold text-text-primary mb-1">
            {formatCurrency(financial.visao_geral.faturamento_total)}
          </div>
        </div>

        {/* Custos */}
        <div className="bg-bg-primary border border-border-primary rounded-xl p-4 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-text-secondary text-sm font-medium">Custo Total</span>
            <div className="p-2 bg-red-500/10 text-red-500 rounded-lg">
              <ArrowDownRight size={18} />
            </div>
          </div>
          <div className="text-2xl font-bold text-text-primary mb-1">
            {formatCurrency(financial.visao_geral.custo_total)}
          </div>
        </div>

        {/* Lucro Bruto */}
        <div className="bg-bg-primary border border-border-primary rounded-xl p-4 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-text-secondary text-sm font-medium">Lucro Bruto</span>
            <div className="p-2 bg-green-500/10 text-green-500 rounded-lg">
              <ArrowUpRight size={18} />
            </div>
          </div>
          <div className="text-2xl font-bold text-text-primary mb-1">
            {formatCurrency(financial.visao_geral.lucro_bruto)}
          </div>
          <div className="flex items-center justify-between mt-auto">
            <span className="text-xs text-green-500 font-medium">Margem: {financial.visao_geral.margem_bruta_pct}%</span>
          </div>
        </div>

        {/* Saldo Fluxo de Caixa */}
        <div className="bg-bg-primary border border-border-primary rounded-xl p-4 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-text-secondary text-sm font-medium">Saldo Atual</span>
            <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg">
              <Wallet size={18} />
            </div>
          </div>
          <div className="text-2xl font-bold text-text-primary mb-1">
            {formatCurrency(financial.fluxo_caixa.saldo_real)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Contas a Receber */}
        <div className="bg-bg-primary border border-border-primary rounded-xl p-4 shadow-sm">
          <h3 className="text-base font-semibold text-text-primary mb-4 flex items-center">
            <ArrowUpRight size={18} className="text-green-500 mr-2" /> Contas a Receber
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-border-primary">
              <span className="text-sm text-text-secondary">Total a Receber</span>
              <span className="text-lg font-bold text-text-primary">{formatCurrency(financial.contas_receber.total_a_receber)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-text-secondary">A receber 15d</span>
              <span className="text-sm font-medium text-text-primary">{formatCurrency(financial.contas_receber.a_receber_15d)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-text-secondary">A receber 30d</span>
              <span className="text-sm font-medium text-text-primary">{formatCurrency(financial.contas_receber.a_receber_30d)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-text-secondary">Inadimplência</span>
              <span className="text-sm font-medium text-red-500">{financial.contas_receber.taxa_inadimplencia_pct}%</span>
            </div>
          </div>
        </div>
        
        {/* Contas a Pagar */}
        <div className="bg-bg-primary border border-border-primary rounded-xl p-4 shadow-sm">
          <h3 className="text-base font-semibold text-text-primary mb-4 flex items-center">
            <ArrowDownRight size={18} className="text-red-500 mr-2" /> Contas a Pagar
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-border-primary">
              <span className="text-sm text-text-secondary">Total a Pagar</span>
              <span className="text-lg font-bold text-text-primary">{formatCurrency(financial.contas_pagar.total_a_pagar)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-text-secondary">A pagar 15d</span>
              <span className="text-sm font-medium text-text-primary">{formatCurrency(financial.contas_pagar.a_pagar_15d)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-text-secondary">A pagar 30d</span>
              <span className="text-sm font-medium text-text-primary">{formatCurrency(financial.contas_pagar.a_pagar_30d)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-text-secondary">Média pagamentos</span>
              <span className="text-sm font-medium text-text-primary">{financial.contas_pagar.dias_medio_pagamento} dias</span>
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
