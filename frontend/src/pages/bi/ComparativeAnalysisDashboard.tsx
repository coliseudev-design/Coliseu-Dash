import { useOutletContext } from 'react-router-dom';
import { useBiPeriodQuery } from '../../hooks/useBiPeriodQuery';
import { BIService } from '../../services/biApi';
import { BiPeriodFilter } from '../../types/bi.types';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const TrendIcon = ({ trend }: { trend: 'UP' | 'DOWN' | 'STABLE' }) => {
  if (trend === 'UP') return <TrendingUp size={16} className="text-green-500" />;
  if (trend === 'DOWN') return <TrendingDown size={16} className="text-red-500" />;
  return <Minus size={16} className="text-slate-500" />;
};

const DeltaBadge = ({ pct, trend }: { pct: number, trend: 'UP' | 'DOWN' | 'STABLE' }) => {
  const isUp = trend === 'UP';
  const isDown = trend === 'DOWN';
  return (
    <div className={`flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${
      isUp ? 'bg-green-500/10 text-green-500' : isDown ? 'bg-red-500/10 text-red-500' : 'bg-slate-500/10 text-slate-500'
    }`}>
      <TrendIcon trend={trend} />
      <span className="ml-1">{Math.abs(pct).toFixed(2)}%</span>
    </div>
  );
};

export default function ComparativeAnalysisDashboard() {
  const { filter } = useOutletContext<{ filter: BiPeriodFilter }>();

  // Nota: A API deve idealmente receber um segundo período de filtro (ex: period2Start, period2End),
  // mas para esta demonstração usaremos o filter padrão.
  const { data, isLoading, isError } = useBiPeriodQuery(
    ['bi', 'comparative'],
    BIService.getComparativeAnalysis,
    filter
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-text-secondary">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mr-3"></div>
        Carregando Análise Comparativa...
      </div>
    );
  }

  // Mock fallback
  const mockComparative = {
    comparacao: {
      periodo_1: { inicio: "2026-01-01", fim: "2026-01-31", label: "Janeiro 2026" },
      periodo_2: { inicio: "2025-12-01", fim: "2025-12-31", label: "Dezembro 2025" }
    },
    resumo_comparativo: {
      faturamento: { periodo_1: 125000.50, periodo_2: 110000.00, delta: 15000.50, delta_pct: 13.64, tendencia: "UP" as const },
      quantidade_pedidos: { periodo_1: 245, periodo_2: 220, delta: 25, delta_pct: 11.36, tendencia: "UP" as const },
      ticket_medio: { periodo_1: 510.20, periodo_2: 500.00, delta: 10.20, delta_pct: 2.04, tendencia: "UP" as const },
      margem_media_pct: { periodo_1: 28.5, periodo_2: 27.2, delta: 1.3, delta_pct: 4.78, tendencia: "UP" as const }
    },
    ranking_comparativo: [
      { rank_periodo_1: 1, rank_periodo_2: 1, mudanca_rank: 0, vendedor: "João Silva", faturamento_p1: 45000.00, faturamento_p2: 42000.00, delta_pct: 7.14 },
      { rank_periodo_1: 2, rank_periodo_2: 3, mudanca_rank: -1, vendedor: "Maria Santos", faturamento_p1: 38000.00, faturamento_p2: 40000.00, delta_pct: -5.00 }
    ]
  };

  const comp = data || mockComparative;
  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      
      {/* Cabeçalho da Comparação */}
      <div className="bg-bg-primary border border-border-primary rounded-xl p-4 shadow-sm flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-text-primary">Análise Comparativa</h3>
          <p className="text-sm text-text-secondary">
            Comparando <strong>{comp.comparacao.periodo_1.label || 'Período Atual'}</strong> com <strong>{comp.comparacao.periodo_2.label || 'Período Anterior'}</strong>
          </p>
        </div>
        <div className="flex gap-2">
          {/* Aqui poderia ter um seletor para escolher o Período 2 (Mês passado, Ano passado, Personalizado) */}
          <select className="bg-bg-secondary border border-border-primary rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-primary">
            <option>vs. Mês Anterior</option>
            <option>vs. Mesmo Mês Ano Passado</option>
            <option>vs. Período Personalizado</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Faturamento */}
        <div className="bg-bg-primary border border-border-primary rounded-xl p-4 shadow-sm">
          <h4 className="text-sm font-semibold text-text-secondary mb-3">Faturamento</h4>
          <div className="flex justify-between items-end mb-2">
            <div>
              <div className="text-2xl font-bold text-text-primary">{formatCurrency(comp.resumo_comparativo.faturamento.periodo_1)}</div>
              <div className="text-sm text-text-secondary">Atual</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold text-text-secondary">{formatCurrency(comp.resumo_comparativo.faturamento.periodo_2)}</div>
              <div className="text-sm text-text-secondary">Anterior</div>
            </div>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-border-primary mt-3">
            <span className="text-sm text-text-secondary">Diferença</span>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${comp.resumo_comparativo.faturamento.tendencia === 'UP' ? 'text-green-500' : 'text-red-500'}`}>
                {comp.resumo_comparativo.faturamento.tendencia === 'UP' ? '+' : ''}{formatCurrency(comp.resumo_comparativo.faturamento.delta)}
              </span>
              <DeltaBadge pct={comp.resumo_comparativo.faturamento.delta_pct} trend={comp.resumo_comparativo.faturamento.tendencia} />
            </div>
          </div>
        </div>

        {/* Quantidade Pedidos */}
        <div className="bg-bg-primary border border-border-primary rounded-xl p-4 shadow-sm">
          <h4 className="text-sm font-semibold text-text-secondary mb-3">Quantidade de Pedidos</h4>
          <div className="flex justify-between items-end mb-2">
            <div>
              <div className="text-2xl font-bold text-text-primary">{comp.resumo_comparativo.quantidade_pedidos.periodo_1}</div>
              <div className="text-sm text-text-secondary">Atual</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold text-text-secondary">{comp.resumo_comparativo.quantidade_pedidos.periodo_2}</div>
              <div className="text-sm text-text-secondary">Anterior</div>
            </div>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-border-primary mt-3">
            <span className="text-sm text-text-secondary">Diferença</span>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${comp.resumo_comparativo.quantidade_pedidos.tendencia === 'UP' ? 'text-green-500' : 'text-red-500'}`}>
                {comp.resumo_comparativo.quantidade_pedidos.tendencia === 'UP' ? '+' : ''}{comp.resumo_comparativo.quantidade_pedidos.delta}
              </span>
              <DeltaBadge pct={comp.resumo_comparativo.quantidade_pedidos.delta_pct} trend={comp.resumo_comparativo.quantidade_pedidos.tendencia} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Placeholder Gráfico */}
        <div className="bg-bg-primary border border-border-primary rounded-xl p-4 shadow-sm min-h-[300px]">
          <h3 className="text-base font-semibold text-text-primary mb-4">Evolução Comparativa (Faturamento)</h3>
          <div className="h-64 flex items-center justify-center text-text-secondary border border-dashed border-border-primary rounded">
             Gráfico de Linha Comparativo (Em breve)
          </div>
        </div>

        {/* Ranking Comparativo */}
        <div className="bg-bg-primary border border-border-primary rounded-xl p-4 shadow-sm min-h-[300px] flex flex-col">
          <h3 className="text-base font-semibold text-text-primary mb-4">Mudanças no Ranking (Vendedores)</h3>
          <div className="flex-1 overflow-y-auto pr-2 space-y-3">
            {comp.ranking_comparativo.map((r, i) => (
              <div key={i} className="flex items-center justify-between p-3 border border-border-primary rounded-lg bg-bg-secondary/20">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-center justify-center w-8">
                    <span className="text-sm font-bold text-text-primary">#{r.rank_periodo_1}</span>
                    {r.mudanca_rank > 0 && <span className="text-[10px] text-red-500 flex items-center"><TrendingDown size={10} /> {r.mudanca_rank}</span>}
                    {r.mudanca_rank < 0 && <span className="text-[10px] text-green-500 flex items-center"><TrendingUp size={10} /> {Math.abs(r.mudanca_rank)}</span>}
                    {r.mudanca_rank === 0 && <span className="text-[10px] text-slate-500">-</span>}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-text-primary">{r.vendedor}</div>
                    <div className="text-xs text-text-secondary text-balance">
                      Ant: {formatCurrency(r.faturamento_p2)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-text-primary">{formatCurrency(r.faturamento_p1)}</div>
                  <div className={`text-xs ${r.delta_pct >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {r.delta_pct > 0 ? '+' : ''}{r.delta_pct}%
                  </div>
                </div>
              </div>
            ))}
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
