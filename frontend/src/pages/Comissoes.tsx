import { useMemo } from 'react'
import { usePeriodQuery } from '../hooks/useApi'
import PeriodFilter from '../components/PeriodFilter'
import {
  Users, Percent, ArrowDownAZ, Hash, Trophy, BarChart3
} from 'lucide-react'
import { formatBRL, formatBRLCompact, formatNum } from '../utils/format'
import KPICard from '../components/KPICard'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

export default function Comissoes() {
  const ranking = usePeriodQuery<any>('/comissoes/ranking')

  const dadosVendedores = ranking.data?.data || []

  // Ordena os vendedores por Total Vendido do maior para o menor
  const sortedData = useMemo(() => {
    return [...dadosVendedores].sort((a, b) => (b.total_vendas || 0) - (a.total_vendas || 0))
  }, [dadosVendedores])

  // Custom Tooltip for the chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-bg-primary p-3 rounded-lg shadow-card-hover border border-border text-sm">
          <p className="font-semibold text-text-primary mb-1">{payload[0].payload.vendedor}</p>
          <p className="text-brand-600 font-medium">Vendido: {formatBRL(payload[0].value)}</p>
          <p className="text-success font-medium">Comissão: {formatBRL(payload[0].payload.total_comissao)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold font-heading text-text-primary flex items-center gap-2">
          <Users className="text-brand-600" />
          Vendedores
        </h1>
        <PeriodFilter />
      </div>

      {ranking.isLoading ? (
        <div className="py-8 text-center text-text-secondary text-sm">Carregando dados dos vendedores...</div>
      ) : sortedData.length === 0 ? (
        <div className="py-8 text-center text-text-secondary text-sm card mt-4">Nenhum dado encontrado no período.</div>
      ) : (
        <div className="flex flex-col gap-4 sm:gap-6 mt-4">
          
          {/* Lista Resumida de Vendedores */}
          <div className="card w-full">
            <div className="flex items-center gap-2 mb-4 border-b border-divider pb-2">
              <Trophy size={18} className="text-warning" />
              <h2 className="font-heading font-semibold text-text-primary">Desempenho Consolidado</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {sortedData.map((v: any, i: number) => (
                <div key={v.vendedor_id} className="border border-border rounded-xl p-4 bg-bg-primary hover:shadow-card-hover transition-shadow relative shadow-card">
                  {/* Badge Rank */}
                  <span className={`absolute -top-3 -left-3 w-8 h-8 flex items-center justify-center text-xs font-bold rounded-full shadow-md text-white ${i === 0 ? 'bg-warning' : i === 1 ? 'bg-text-muted' : 'bg-brand-500'}`}>
                    {i + 1}º
                  </span>
                  
                  <h3 className="font-semibold text-text-primary mb-3 pl-3 truncate border-b border-divider pb-2" title={v.vendedor}>
                    {v.vendedor}
                  </h3>
                  
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center text-sm pt-2 border-t border-divider">
                      <span className="text-text-secondary">Qtd. Vendas</span>
                      <span className="font-medium text-text-primary bg-bg-secondary px-2 py-0.5 rounded-md">{formatNum(v.qtd_vendas)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-text-secondary">Total Vendido</span>
                      <span className="font-medium text-brand-600">{formatBRL(v.total_vendas)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-text-secondary">Ticket Médio</span>
                      <span className="font-medium text-text-primary">{formatBRL(v.ticket_medio)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-text-secondary">Descontos ({formatNum(v.qtd_descontos)})</span>
                      <span className="font-medium text-error">{formatBRL(v.total_desconto)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm pt-2 border-t border-divider">
                      <span className="text-text-secondary">Maior Venda</span>
                      <span className="font-medium text-text-primary">{formatBRL(v.maior_venda)}</span>
                    </div>
                    <div className="flex flex-col text-sm">
                      <span className="text-text-secondary text-xs">Cliente (Maior Venda)</span>
                      <span className="font-medium text-text-primary truncate" title={v.cliente_maior_venda}>{v.cliente_maior_venda}</span>
                    </div>
                    <div className="flex flex-col text-sm pt-2 border-t border-divider">
                      <span className="text-text-secondary text-xs">Produto Mais Vendido</span>
                      <span className="font-medium text-text-primary truncate" title={v.melhor_produto}>{v.melhor_produto}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

    </div>
  )
}
