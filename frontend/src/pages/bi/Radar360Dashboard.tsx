import { useOutletContext } from 'react-router-dom';
import { useBiPeriodQuery } from '../../hooks/useBiPeriodQuery';
import { BIService } from '../../services/biApi';
import { BiPeriodFilter } from '../../types/bi.types';
import { useState } from 'react';
import { User, Calendar, Loader2, Fingerprint } from 'lucide-react';

// Novos componentes da Interface Antecipatória
import { CommandCenter } from '../../components/bi/Radar360/CommandCenter';
import { AffinityCard } from '../../components/bi/Radar360/AffinityCard';
import { DNAVisualizer } from '../../components/bi/Radar360/DNAVisualizer';
import { FinancialPrediction } from '../../components/bi/Radar360/FinancialPrediction';
import { ActivityHeatmap } from '../../components/bi/Radar360/ActivityHeatmap';

export default function Radar360Dashboard() {
  const { filter } = useOutletContext<{ filter: BiPeriodFilter }>();
  const [customerId, setCustomerId] = useState<number | null>(null);

  const { data, isLoading, isError } = useBiPeriodQuery(
    ['bi', 'radar360', customerId],
    () => customerId ? BIService.getRadar360(customerId, filter) : Promise.resolve(null),
    filter,
    { enabled: !!customerId }
  );

  const handleSelectCustomer = (id: number) => {
    setCustomerId(id);
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div aria-label="Radar 360 Dashboard" className="space-y-8 animate-in fade-in duration-500 relative min-h-screen pb-12">
      {/* Background gradients for Glassmorphism effect */}
      <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-500/10 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-500/10 blur-[150px]"></div>
      </div>

      {/* CommandCenter (Busca Preditiva Flutuante) */}
      <div className="pt-4 pb-4">
        <CommandCenter onSelectCustomer={handleSelectCustomer} />
      </div>

      {!customerId ? (
        <div className="flex flex-col items-center justify-center h-64 text-text-muted">
          <Fingerprint size={64} className="mb-4 opacity-20" />
          <p>Aguardando seleção de cliente...</p>
        </div>
      ) : isLoading ? (
        <div className="flex flex-col items-center justify-center h-64 text-brand-500">
          <Loader2 size={48} className="animate-spin mb-4" />
          <p className="text-text-primary font-medium">Extraindo DNA do Cliente...</p>
        </div>
      ) : isError ? (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-2xl text-center backdrop-blur-md">
          Aviso: Os dados não puderam ser carregados. Verifique a conexão.
        </div>
      ) : data ? (
        <div className="animate-in slide-in-from-bottom-8 duration-700 ease-out">
          {/* Bento Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Coluna Esquerda: Perfil e Vendedor (4 colunas) */}
            <div className="md:col-span-4 space-y-6 flex flex-col">
              
              {/* Profile Card (Neumorphic) */}
              <div className="bg-bg-primary/60 backdrop-blur-md border border-white/10 rounded-3xl p-6 shadow-card relative overflow-hidden flex-shrink-0">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-500 to-cyan-500"></div>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-brand-500 to-cyan-600 rounded-full flex items-center justify-center text-white shadow-lg border-2 border-bg-primary">
                    <User size={30} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-text-primary leading-tight">{data.dna?.nome || 'Desconhecido'}</h2>
                    <p className="text-sm text-text-secondary">{data.dna?.documento || 'Sem CNPJ'}</p>
                  </div>
                </div>
                
                <div className="space-y-3 text-sm text-text-secondary">
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span>Status</span>
                    <span className={`font-bold ${data.dna?.status === 'ATIVO' ? 'text-green-500' : 'text-red-500'}`}>
                      {data.dna?.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span>Localidade</span>
                    <span className="font-medium text-text-primary">{data.dna?.cidade}/{data.dna?.estado}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span>Cliente desde</span>
                    <span className="font-medium text-text-primary">{data.dna?.data_cadastro ? new Date(data.dna.data_cadastro).toLocaleDateString('pt-BR') : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span>Última Compra</span>
                    <span className="font-medium text-text-primary">
                      {data.risk_assessment?.ultima_compra ? new Date(data.risk_assessment.ultima_compra).toLocaleDateString('pt-BR') : 'N/A'} 
                      <span className="text-xs ml-1 opacity-70">({data.risk_assessment?.dias_sem_comprar} dias)</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Vendedor Estrela */}
              <div className="flex-1">
                <AffinityCard 
                  vendedor={data.affinity?.vendedor_estrela || 'N/A'} 
                  shareOfWallet={85} 
                />
              </div>
            </div>

            {/* Centro e Direita: Gráficos e Analytics (8 colunas) */}
            <div className="md:col-span-8 space-y-6">
              
              {/* Linha Superior: Financeiro e Heatmap */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-auto md:h-[280px]">
                <FinancialPrediction 
                  ltv={data.dna?.ltv || 0} 
                  ticketMedio={data.behavior?.ticket_medio_historico || 0} 
                />
                <ActivityHeatmap bestHour={data.behavior?.melhor_horario || '14:00'} />
              </div>

              {/* Linha Inferior: DNA Visualizer */}
              <div className="h-auto md:h-[350px]">
                <DNAVisualizer 
                  produtoFavorito={data.behavior?.produto_favorito || ''}
                  marcaFavorita={data.behavior?.marca_favorita || ''}
                />
              </div>

            </div>

            {/* Linha Histórico de Pedidos (Full width) */}
            <div className="md:col-span-12">
              <div className="bg-bg-primary/60 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden shadow-card">
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                  <h3 className="text-base font-bold text-text-primary flex items-center">
                    <Calendar size={18} className="text-brand-500 mr-2" /> Histórico de Pedidos
                  </h3>
                  <span className="text-xs font-medium bg-bg-secondary text-text-secondary px-3 py-1 rounded-full border border-white/10">
                    Últimos {data.order_history?.length || 0} pedidos
                  </span>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-bg-secondary/30 text-xs text-text-secondary uppercase font-semibold">
                      <tr>
                        <th className="px-6 py-4">Data</th>
                        <th className="px-6 py-4">Documento</th>
                        <th className="px-6 py-4">Vendedor</th>
                        <th className="px-6 py-4 text-right">Valor Total</th>
                        <th className="px-6 py-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {data.order_history?.map((order: any) => (
                        <tr key={order.id} className="hover:bg-bg-secondary/20 transition-colors">
                          <td className="px-6 py-4 font-medium text-text-primary whitespace-nowrap">{order.data_emissao}</td>
                          <td className="px-6 py-4 text-text-secondary">{order.numero_nota}</td>
                          <td className="px-6 py-4 text-text-secondary">{order.vendedor_nome || '-'}</td>
                          <td className="px-6 py-4 text-right font-bold text-text-primary">{formatCurrency(order.valor_total)}</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-md ${
                              order.status === 'FATURADO' || order.status === 'FINALIZADO' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 
                              'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                            }`}>
                              {order.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {(!data.order_history || data.order_history.length === 0) && (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-text-muted">Nenhum pedido encontrado.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </div>
        </div>
      ) : null}
    </div>
  );
}
