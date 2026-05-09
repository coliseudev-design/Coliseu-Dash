import { useOutletContext } from 'react-router-dom';
import { useBiPeriodQuery } from '../../hooks/useBiPeriodQuery';
import { BIService } from '../../services/biApi';
import { BiPeriodFilter } from '../../types/bi.types';
import { Package, Activity, AlertTriangle } from 'lucide-react';

export default function ABCAnalysisDashboard() {
  const { filter } = useOutletContext<{ filter: BiPeriodFilter }>();

  const { data, isLoading, isError } = useBiPeriodQuery(
    ['bi', 'abc'],
    BIService.getABCAnalysis,
    filter
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-text-secondary">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mr-3"></div>
        Carregando Curva ABC...
      </div>
    );
  }

  // Mock fallback
  const mockABC = {
    classe_a: {
      quantidade_produtos: 45,
      faturamento_total: 100000.00,
      percentual_faturamento: 80.0,
      margem_media_pct: 30.2,
      produtos: [
        { id: 789, descricao: "Produto Premium XYZ", faturamento: 12500.00, quantidade_vendida: 250, margem_pct: 32.5, estoque_atual: 150, dias_reposicao: 5, classe: 'A' as const }
      ]
    },
    classe_b: {
      quantidade_produtos: 135,
      faturamento_total: 18750.00,
      percentual_faturamento: 15.0,
      margem_media_pct: 24.8,
      produtos: []
    },
    classe_c: {
      quantidade_produtos: 320,
      faturamento_total: 6250.00,
      percentual_faturamento: 5.0,
      margem_media_pct: 18.5,
      produtos: []
    }
  };

  const abcAnalysis = data?.abc_analysis || mockABC;

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Classe A */}
        <div className="bg-bg-primary border border-border-primary rounded-xl p-4 shadow-sm flex flex-col border-l-4 border-l-green-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-text-secondary text-sm font-medium">Classe A (80%)</span>
            <div className="p-2 bg-green-500/10 text-green-500 rounded-lg">
              <Package size={18} />
            </div>
          </div>
          <div className="text-2xl font-bold text-text-primary mb-1">
            {formatCurrency(abcAnalysis.classe_a.faturamento_total)}
          </div>
          <div className="flex items-center justify-between mt-auto">
            <span className="text-xs text-text-secondary">{abcAnalysis.classe_a.quantidade_produtos} Produtos</span>
            <span className="text-xs text-text-secondary">Margem: {abcAnalysis.classe_a.margem_media_pct}%</span>
          </div>
        </div>

        {/* Classe B */}
        <div className="bg-bg-primary border border-border-primary rounded-xl p-4 shadow-sm flex flex-col border-l-4 border-l-yellow-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-text-secondary text-sm font-medium">Classe B (15%)</span>
            <div className="p-2 bg-yellow-500/10 text-yellow-500 rounded-lg">
              <Activity size={18} />
            </div>
          </div>
          <div className="text-2xl font-bold text-text-primary mb-1">
            {formatCurrency(abcAnalysis.classe_b.faturamento_total)}
          </div>
          <div className="flex items-center justify-between mt-auto">
            <span className="text-xs text-text-secondary">{abcAnalysis.classe_b.quantidade_produtos} Produtos</span>
            <span className="text-xs text-text-secondary">Margem: {abcAnalysis.classe_b.margem_media_pct}%</span>
          </div>
        </div>

        {/* Classe C */}
        <div className="bg-bg-primary border border-border-primary rounded-xl p-4 shadow-sm flex flex-col border-l-4 border-l-red-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-text-secondary text-sm font-medium">Classe C (5%)</span>
            <div className="p-2 bg-red-500/10 text-red-500 rounded-lg">
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="text-2xl font-bold text-text-primary mb-1">
            {formatCurrency(abcAnalysis.classe_c.faturamento_total)}
          </div>
          <div className="flex items-center justify-between mt-auto">
            <span className="text-xs text-text-secondary">{abcAnalysis.classe_c.quantidade_produtos} Produtos</span>
            <span className="text-xs text-text-secondary">Margem: {abcAnalysis.classe_c.margem_media_pct}%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Placeholder Gráfico */}
        <div className="bg-bg-primary border border-border-primary rounded-xl p-4 shadow-sm min-h-[300px]">
          <h3 className="text-base font-semibold text-text-primary mb-4">Curva ABC</h3>
          <div className="h-64 flex items-center justify-center text-text-secondary border border-dashed border-border-primary rounded">
             Gráfico de Curva ABC (Em breve)
          </div>
        </div>
        
        {/* Lista Produtos Classe A */}
        <div className="bg-bg-primary border border-border-primary rounded-xl p-4 shadow-sm min-h-[300px]">
          <h3 className="text-base font-semibold text-text-primary mb-4">Top Produtos (Classe A)</h3>
          <div className="space-y-3">
            {abcAnalysis.classe_a.produtos?.length ? abcAnalysis.classe_a.produtos.map((prod) => (
              <div key={prod.id} className="flex justify-between items-center p-3 border border-border-primary rounded-lg">
                <div>
                  <div className="text-sm font-medium text-text-primary">{prod.descricao}</div>
                  <div className="text-xs text-text-secondary">Vendas: {prod.quantidade_vendida} | Estoque: {prod.estoque_atual}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-text-primary">{formatCurrency(prod.faturamento)}</div>
                  <div className="text-xs text-green-500">{prod.margem_pct}% margem</div>
                </div>
              </div>
            )) : (
              <div className="text-sm text-text-secondary">Sem produtos para exibir</div>
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
