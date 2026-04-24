import { usePeriodQuery } from '../hooks/useApi'
import ChartCard from '../components/ChartCard'
import PeriodFilter from '../components/PeriodFilter'
import DataTable from '../components/DataTable'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import { formatBRL, formatBRLCompact } from '../utils/format'
import { CHART_PALETTE } from '../utils/chartColors'
import { Trophy, Package, Tag, Layers, Users, CreditCard } from 'lucide-react'

// Componente local para padronizar todas as linhas de Ranking (Lista + Gráfico de Barras)
function RankingSection({ title, subtitle, icon: Icon, data, loading }: any) {
//... same as before => wait, I shouldn't replace lines 13-44 with this, because RankingSection is in lines 11-49!
// I'll re-specify the start/end lines properly.
  return (
    <div className="grid lg:grid-cols-2 gap-4 sm:gap-6 pt-6 border-t border-gray-100 mt-6 first:border-0 first:pt-0 first:mt-0">
      
      {/* Lado Esquerdo: Listagem (DataTable) */}
      <div className="flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <Icon size={20} className="text-brand-500" />
          <div>
            <h3 className="font-heading font-semibold text-lg text-text-primary">{title}</h3>
            <p className="text-sm text-text-secondary">{subtitle}</p>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex-1 shadow-sm">
          <DataTable
            loading={loading}
            data={data || []}
            empty="Sem dados no período"
            columns={[
              { key: '#', label: 'RANK', width: '60px', render: (_: any, i: number) => <span className="text-text-muted mono font-semibold">{i + 1}º</span> },
              { key: 'nome', label: 'DESCRIÇÃO', render: (r: any) => <span className="font-medium text-text-primary capitalize truncate block max-w-[200px]" title={r.nome}>{r.nome}</span> },
              { key: 'total', label: 'FATURAMENTO', align: 'right', render: (r: any) => <span className="font-semibold text-brand-600">{formatBRL(r.total)}</span> },
            ]}
          />
        </div>
      </div>

      {/* Lado Direito: Gráfico de Barras */}
      <ChartCard
        title={`Gráfico: ${title}`}
        subtitle="Visualização de performance"
        loading={loading}
        empty={!data?.length}
      >
        <div className="h-64 sm:h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data || []} layout="vertical" margin={{ left: 80, right: 30, top: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#6B7280' }} tickFormatter={formatBRLCompact} />
              <YAxis 
                type="category" 
                dataKey="nome" 
                tick={{ fontSize: 11, fill: '#374151', textTransform: 'capitalize' }} 
                width={140}
                tickFormatter={(val) => val.length > 20 ? val.substring(0, 18) + '...' : val}
              />
              <Tooltip formatter={(v: any) => formatBRL(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="total" radius={[0, 4, 4, 0]} barSize={22}>
                {(data || []).map((_: any, i: number) => (
                  <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    </div>
  )
}

export default function Ranking() {
  const vendedores = usePeriodQuery<any>('/ranking/vendedores', { limit: 10 })
  const produtos = usePeriodQuery<any>('/ranking/produtos', { limit: 10 })
  const clientes = usePeriodQuery<any>('/ranking/clientes', { limit: 10 })
  const marcas = usePeriodQuery<any>('/ranking/marcas', { limit: 10 })
  const categorias = usePeriodQuery<any>('/ranking/categorias', { limit: 10 })
  const especies = usePeriodQuery<any>('/ranking/especies', { limit: 10 })
  
  // Normalização de Dados para o formato padronizado { nome, total }
  const getNorm = (arr: any[], nameKey1: string, nameKey2: string, valKey1: string, valKey2: string) => {
    return (arr || []).slice(0, 10).map(d => ({
      nome: d[nameKey1] || d[nameKey2] || 'Desconhecido',
      total: parseFloat(d[valKey1]) || parseFloat(d[valKey2]) || 0
    }))
  }

  const vData = getNorm(vendedores.data?.data, 'vendedor', 'nome', 'total', 'faturamento')
  const pData = getNorm(produtos.data?.data, 'produto', 'nome', 'total', 'faturamento')
  const cData = getNorm(clientes.data?.data, 'cliente', 'nome', 'total', 'faturamento')
  const mData = getNorm(marcas.data?.data, 'nome', 'marca', 'faturamento', 'total')
  
  const catData = getNorm(categorias.data?.data, 'nome', 'categoria', 'faturamento', 'total')
  
  const eData = getNorm(especies.data?.data, 'especie', 'nome', 'total', 'faturamento')

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h2 className="font-heading text-xl font-semibold text-text-primary">Super Guia de Rankings</h2>
        <p className="text-text-secondary text-sm mb-4">Listagens e gráficos lado a lado para todas as métricas.</p>
        <PeriodFilter />
      </div>

      <div className="flex flex-col gap-8 pb-10">
        <RankingSection title="Top 10 Vendedores" subtitle="Volume faturado por usuário" icon={Trophy} data={vData} loading={vendedores.isLoading} />
        
        <RankingSection title="Top 10 Produtos" subtitle="SKUs de maior rentabilidade" icon={Package} data={pData} loading={produtos.isLoading} />
        
        <RankingSection title="Top 10 Marcas" subtitle="Marcas que lideram faturamento" icon={Tag} data={mData} loading={marcas.isLoading} />
        
        <RankingSection title="Top 10 Categorias" subtitle="Segmentos mais fortes" icon={Layers} data={catData} loading={categorias.isLoading} />
        
        <RankingSection title="Top 10 Clientes" subtitle="Principais compradores" icon={Users} data={cData} loading={clientes.isLoading} />
        
        <RankingSection title="Vendas por Espécie" subtitle="Ranking de Formas de Pagamento" icon={CreditCard} data={eData} loading={especies.isLoading} />
      </div>
    </div>
  )
}
