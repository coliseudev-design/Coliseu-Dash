import { useState, useEffect } from 'react'
import { usePeriodQuery, useApiQuery } from '../hooks/useApi'
import { useBranchParam } from '../contexts/BranchContext'
import KPICard from '../components/KPICard'
import ChartCard from '../components/ChartCard'
import PeriodFilter from '../components/PeriodFilter'
import {
  Wallet, Receipt, Scale, ArrowDownCircle, ArrowUpCircle, Banknote, Filter
} from 'lucide-react'
import {
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { formatBRL, formatBRLCompact } from '../utils/format'
import { CHART_COLORS } from '../utils/chartColors'

export default function Financeiro() {
  // Seletor de Caixas Real
  const [selectedCaixa, setSelectedCaixa] = useState('todos')
  const branchParam = useBranchParam()
  
  // Lista de caixas
  const { data: caixasRes } = useApiQuery<any>('/financeiro/caixas')
  const caixas = caixasRes?.data || []

  useEffect(() => {
    if (caixas.length > 0 && selectedCaixa === 'todos') {
      setSelectedCaixa(String(caixas[0].id))
    }
  }, [caixas, selectedCaixa])

  const extraParams = {
    ...(selectedCaixa !== 'todos' ? { caixa_id: selectedCaixa } : {}),
    ...branchParam
  }
  const caixa = usePeriodQuery<any>('/financeiro/caixa', extraParams)

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:flex-wrap justify-between items-start sm:items-center gap-4 w-full min-w-0">
        <PeriodFilter excludePeriods={['lastMonth', 'last12m']} />
        
        {/* Seletor de Caixa */}
        <div className="flex items-center gap-2 bg-bg-primary rounded-lg border border-border p-1.5 shadow-sm">
          <Filter size={16} className="text-text-secondary ml-2" />
          <select 
            value={selectedCaixa}
            onChange={(e) => setSelectedCaixa(e.target.value)}
            className="bg-transparent border-none text-sm font-medium text-text-primary focus:ring-0 cursor-pointer pr-8"
          >
            <option value="todos">Todos os Caixas</option>
            {caixas.map((c: any) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ====== CAIXA ====== */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Banknote size={20} className="text-brand-600" />
          <h2 className="font-heading font-semibold text-base sm:text-lg">
            Resumo do Caixa {selectedCaixa !== 'todos' && '(Filtrado)'}
          </h2>
          <span className="text-xs text-text-secondary hidden sm:inline">
            · {caixa.data?.period?.label || ''}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-4">
          <KPICard
            label="Entradas"
            value={formatBRL(caixa.data?.kpis?.entradas || 0)}
            compactValue={formatBRLCompact(caixa.data?.kpis?.entradas)}
            icon={ArrowDownCircle}
            iconColor="text-success"
            hint={`${caixa.data?.kpis?.qtd_entradas || 0} movimentos`}
            loading={caixa.isLoading}
          />
          <KPICard
            label="Saídas"
            value={formatBRL(caixa.data?.kpis?.saidas || 0)}
            compactValue={formatBRLCompact(caixa.data?.kpis?.saidas)}
            icon={ArrowUpCircle}
            iconColor="text-danger"
            hint={`${caixa.data?.kpis?.qtd_saidas || 0} movimentos`}
            loading={caixa.isLoading}
          />
          <KPICard
            label="Saldo Líquido"
            value={formatBRL(caixa.data?.kpis?.saldo || 0)}
            compactValue={formatBRLCompact(caixa.data?.kpis?.saldo)}
            icon={Scale}
            iconColor={(caixa.data?.kpis?.saldo || 0) >= 0 ? 'text-success' : 'text-danger'}
            loading={caixa.isLoading}
          />
        </div>

        {caixa.data?.kpis?.especies && caixa.data.kpis.especies.length > 0 && (
          <div className="bg-bg-primary rounded-xl border border-border p-4 mb-6 shadow-sm">
            <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-tight sm:tracking-wider mb-4 flex items-center gap-2">
              <Banknote size={16} className="text-brand-500" />
              Composição por Espécie
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {caixa.data.kpis.especies.map((esp: any) => (
                <div key={esp.nome} className="flex flex-col p-3 rounded-lg bg-bg-secondary border border-transparent hover:border-brand-200 transition-colors">
                  <span className="text-[10px] sm:text-xs font-medium text-text-secondary mb-1 truncate capitalize">
                    {esp.nome.toLowerCase()}
                  </span>
                  <span className="font-bold text-text-primary text-sm sm:text-base truncate" title={formatBRL(esp.total || 0)}>
                    {formatBRL(esp.total || 0)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <ChartCard
          title="Fluxo de Movimentações"
          subtitle="Acompanhamento diário das entradas e saídas de capital"
          loading={caixa.isLoading}
          empty={!caixa.data?.kpis?.movimentacoes?.length}
        >
          <div className="h-64 sm:h-80 -mx-1 sm:mx-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={caixa.data?.kpis?.movimentacoes || []}>
                <defs>
                  <linearGradient id="colorEntrCaixa" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.success} stopOpacity={0.5} />
                    <stop offset="95%" stopColor={CHART_COLORS.success} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorSaiCaixa" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.danger} stopOpacity={0.5} />
                    <stop offset="95%" stopColor={CHART_COLORS.danger} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="data" tick={{ fontSize: 10, fill: '#6B7280' }} tickFormatter={(d) => d?.slice(5) || d} />
                <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} tickFormatter={formatBRLCompact} width={55} />
                <Tooltip formatter={(v: any) => formatBRL(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="entradas" stroke={CHART_COLORS.success} fill="url(#colorEntrCaixa)" name="Entradas" />
                <Area type="monotone" dataKey="saidas" stroke={CHART_COLORS.danger} fill="url(#colorSaiCaixa)" name="Saídas" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
    </div>
  )
}
