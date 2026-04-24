import { useApiQuery, usePeriodQuery } from '../hooks/useApi'
import KPICard from '../components/KPICard'
import ChartCard from '../components/ChartCard'
import { Link } from 'react-router-dom'
import {
  DollarSign, ShoppingBag, Wallet, TrendingUp, AlertCircle,
  ArrowUpRight, Receipt, Calculator, LayoutDashboard, Award, Layers
} from 'lucide-react'
import { formatBRL, formatBRLCompact, formatNum, formatDateTime } from '../utils/format'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { CHART_COLORS } from '../utils/chartColors'
import { usePeriodStore } from '../store/periodStore'
import PeriodFilter from '../components/PeriodFilter'

interface Overview {
  hoje: { total: number; qtd: number }
  mes: { total: number; qtd: number }
  pedidos_abertos: number
  pedidos_processados: number
  total_receber: number
  total_recebido: number
  total_pagar: number
  total_pago: number
  top_marcas?: { marca: string; total: number }[]
  top_categorias?: { categoria: string; total: number }[]
}

export default function Home() {
  const period = usePeriodStore((s) => s.period)
  const start_date = usePeriodStore((s) => s.startDate)
  const end_date = usePeriodStore((s) => s.endDate)

  const ov = usePeriodQuery<Overview>('/estatisticas/overview')
  const fatMes = usePeriodQuery<any>('/vendas/faturadas')
  const recentes = useApiQuery<any>('/vendas/recentes', { limit: 8 })

  const totalPeriodo = ov.data?.mes?.total || 0
  const qtdPeriodo = ov.data?.mes?.qtd || 0
  const ticketMedio = qtdPeriodo > 0 ? totalPeriodo / qtdPeriodo : 0

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-bold tracking-tight text-text-primary">Visão Estratégica</h2>
          <p className="text-text-secondary text-base">Resumo consolidado do negócio em tempo real</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full xl:w-auto min-w-0">
          <PeriodFilter />
          {/* Slim Atalhos Section */}
          <div className="hidden lg:flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-divider shadow-sm h-[42px] sm:h-[38px]">
            <LayoutDashboard size={14} className="text-text-secondary ml-1" />
            {[
              { to: '/financeiro', label: 'Financeiro' },
              { to: '/produtos', label: 'Produtos' },
              { to: '/clientes', label: 'Clientes' },
            ].map((m) => (
              <Link
                key={m.to}
                to={m.to}
                className="px-2 py-1 rounded bg-bg-secondary hover:bg-brand-50 hover:text-brand-600 text-xs font-medium text-text-primary transition-colors"
              >
                {m.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        
        {/* SEÇÃO 1: VENDAS E PERFORMANCE COMERCIAL */}
        <div className="xl:col-span-8 flex flex-col space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-brand-600">Performance Comercial</h3>
            <div className="h-px bg-brand-100 flex-1"></div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 md:grid-rows-2 gap-3 sm:gap-4 flex-1">
            <div className="col-span-2 md:col-span-4">
              <KPICard
                label="Faturamento do Período"
                value={formatBRL(ov.data?.mes?.total)}
                icon={TrendingUp}
                iconColor="text-brand-500"
                hint={`${ov.data?.mes?.qtd || 0} processados`}
                loading={ov.isLoading}
              />
            </div>
            
            <div className="col-span-1">
              <KPICard
                label="Faturamento Hoje"
                value={formatBRL(ov.data?.hoje?.total)}
                icon={DollarSign}
                iconColor="text-success"
                hint={`${ov.data?.hoje?.qtd || 0} processados`}
                loading={ov.isLoading}
              />
            </div>
            
            <div className="col-span-1">
              <KPICard
                label="Ticket Médio"
                value={formatBRL(ticketMedio)}
                icon={Calculator}
                iconColor="text-brand-400"
                hint="Do período"
                loading={ov.isLoading}
              />
            </div>

            <div className="col-span-1">
              <KPICard
                label="Em Aberto"
                value={formatNum(ov.data?.pedidos_abertos)}
                icon={ShoppingBag}
                iconColor="text-warning"
                loading={ov.isLoading}
              />
            </div>

            <div className="col-span-1">
              <KPICard
                label="Processados"
                value={formatNum(ov.data?.pedidos_processados)}
                icon={ShoppingBag}
                iconColor="text-success"
                loading={ov.isLoading}
              />
            </div>
          </div>
        </div>

        {/* SEÇÃO 2: SAÚDE FINANCEIRA */}
        <div className="xl:col-span-4 flex flex-col space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-success">Saúde Financeira</h3>
            <div className="h-px bg-success/20 flex-1"></div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-rows-2 gap-3 sm:gap-4 flex-1">
            <KPICard
              label="A Receber"
              value={formatBRL(ov.data?.total_receber)}
              icon={Wallet}
              iconColor="text-warning"
              loading={ov.isLoading}
            />
            <KPICard
              label="Recebido (Pago)"
              value={formatBRL(ov.data?.total_recebido)}
              icon={DollarSign}
              iconColor="text-success"
              loading={ov.isLoading}
            />
            <KPICard
              label="A Pagar"
              value={formatBRL(ov.data?.total_pagar)}
              icon={Receipt}
              iconColor="text-danger"
              loading={ov.isLoading}
            />
            <KPICard
              label="Contas Pagas"
              value={formatBRL(ov.data?.total_pago)}
              icon={Receipt}
              iconColor="text-success"
              loading={ov.isLoading}
            />
          </div>
        </div>

      </div>

      {/* RANKINGS DE MARCAS E CATEGORIAS */}
      <div className="grid md:grid-cols-2 gap-6">
         <ChartCard title="Marcas Mais Vendidas" subtitle="Ranking por faturamento" loading={ov.isLoading}>
            <div className="space-y-3 mt-2 max-h-[220px] overflow-y-auto pr-1">
              {ov.data?.top_marcas?.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm p-3 rounded-lg bg-bg-secondary hover:bg-brand-50 transition-colors">
                  <div className="flex items-center gap-3 truncate">
                    <span className="font-bold text-brand-600 w-4">{idx + 1}º</span>
                    <span className="font-medium text-text-primary capitalize truncate">{item.marca?.toLowerCase() || 'Outros'}</span>
                  </div>
                  <span className="font-bold font-mono text-text-primary">
                    {formatBRL(item.total)}
                  </span>
                </div>
              ))}
              {!ov.isLoading && (!ov.data?.top_marcas || ov.data.top_marcas.length === 0) && (
                 <div className="text-center text-text-secondary text-sm py-4">Nenhuma marca computada no período.</div>
              )}
            </div>
         </ChartCard>

         <ChartCard title="Categorias Principais" subtitle="Representatividade em vendas" loading={ov.isLoading}>
            <div className="space-y-3 mt-2 max-h-[220px] overflow-y-auto pr-1">
              {ov.data?.top_categorias?.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm p-3 rounded-lg bg-bg-secondary hover:bg-success/5 transition-colors">
                  <div className="flex items-center gap-3 truncate">
                    <span className="font-bold text-success w-4">{idx + 1}º</span>
                    <span className="font-medium text-text-primary capitalize truncate">{item.categoria?.toLowerCase() || 'Sem Categoria'}</span>
                  </div>
                  <span className="font-bold font-mono text-text-primary">
                    {formatBRL(item.total)}
                  </span>
                </div>
              ))}
              {!ov.isLoading && (!ov.data?.top_categorias || ov.data.top_categorias.length === 0) && (
                 <div className="text-center text-text-secondary text-sm py-4">Nenhuma categoria computada no período.</div>
              )}
            </div>
         </ChartCard>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Gráfico de vendas últimos 7 dias */}
        <ChartCard
          title="Faturamento no Período"
          subtitle="Acompanhamento diário"
          className="lg:col-span-2"
          loading={fatMes.isLoading}
          empty={!fatMes.data?.data?.length}
          action={
            <Link to="/vendas" className="text-xs text-brand-500 hover:underline flex items-center gap-1">
              Ver detalhes <ArrowUpRight size={12} />
            </Link>
          }
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fatMes.data?.data || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                <XAxis
                  dataKey="data"
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                  tickFormatter={(d) => d.slice(5)}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: '#6B7280' }} 
                  tickFormatter={(v) => formatBRLCompact(v)} 
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(v: any) => formatBRL(v)}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: 'rgba(2f, 8c, 240, 0.05)' }}
                />
                <Bar dataKey="total" fill={CHART_COLORS.primary} radius={[6, 6, 0, 0]} maxBarSize={60} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Últimos Pedidos" subtitle="Recentes finalizados" loading={recentes.isLoading} className="hidden lg:flex flex-col">
          <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-3">
            {((recentes.data?.data || []) as any[])
              .filter((r) => r.status === 'FINALIZADO' || r.status === 'PROCESSADO' || r.status === '2')
              .slice(0, 7)
              .map((r: any) => (
              <div key={r.id} className="flex justify-between items-center p-3 rounded-xl border border-divider hover:shadow-sm hover:border-brand-200 transition-all">
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-text-primary truncate max-w-[120px]" title={r.cliente}>{r.cliente || 'Consumidor Final'}</div>
                  <div className="text-[10px] text-text-secondary mono">#{r.numero_pedido} - {formatDateTime(r.data_venda)?.split(' ')[0]}</div>
                </div>
                <div className="text-sm font-bold text-success mono">
                  {formatBRL(r.valor_total)}
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

    </div>
  )
}
