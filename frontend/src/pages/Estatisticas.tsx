import { usePeriodQuery } from '../hooks/useApi'
import KPICard from '../components/KPICard'
import PeriodFilter from '../components/PeriodFilter'
import {
  DollarSign, ShoppingCart, Users, Percent, Receipt, Package, Award, TrendingUp, Calendar,
} from 'lucide-react'
import { formatBRL, formatBRLCompact, formatNum, formatPct, formatDate } from '../utils/format'

export default function Estatisticas() {
  const kpis = usePeriodQuery<any>('/estatisticas/kpis')
  const k = kpis.data?.kpis

  return (
    <div className="space-y-6">
      <PeriodFilter />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <KPICard
          label="Total Faturado"
          value={formatBRLCompact(k?.total_faturado)}
          icon={DollarSign}
          iconColor="text-success"
          loading={kpis.isLoading}
        />
        <KPICard
          label="Ticket Médio"
          value={formatBRL(k?.ticket_medio)}
          icon={Receipt}
          iconColor="text-brand-500"
          loading={kpis.isLoading}
        />
        <KPICard
          label="Quantidade de Pedidos"
          value={formatNum(k?.qtd_pedidos)}
          icon={ShoppingCart}
          loading={kpis.isLoading}
        />
        <KPICard
          label="Clientes Ativos"
          value={formatNum(k?.clientes_ativos)}
          icon={Users}
          iconColor="text-brand-500"
          hint={`de ${formatNum(k?.total_clientes)} total`}
          loading={kpis.isLoading}
        />
        <KPICard
          label="Taxa de Conversão"
          value={formatPct(k?.taxa_conversao_pct)}
          icon={Percent}
          iconColor="text-warning"
          hint="clientes que compraram"
          loading={kpis.isLoading}
        />
        <KPICard
          label="Produto Mais Vendido"
          value={k?.produto_mais_vendido || '—'}
          icon={Package}
          iconColor="text-brand-500"
          loading={kpis.isLoading}
        />
        <KPICard
          label="Vendedor Top"
          value={k?.vendedor_top || '—'}
          icon={Award}
          iconColor="text-warning"
          hint={formatBRL(k?.vendedor_top_valor)}
          loading={kpis.isLoading}
        />
        <KPICard
          label="Melhor Dia"
          value={k?.melhor_dia ? formatDate(k.melhor_dia) : '—'}
          icon={Calendar}
          iconColor="text-success"
          hint={formatBRL(k?.melhor_dia_valor)}
          loading={kpis.isLoading}
        />
      </div>

      <div className="card">
        <div className="flex items-start gap-3">
          <TrendingUp size={20} className="text-brand-500 mt-0.5" />
          <div>
            <h3 className="font-heading font-semibold text-sm mb-1">Resumo do Desempenho</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              No período selecionado, a empresa faturou{' '}
              <span className="font-semibold text-text-primary">{formatBRL(k?.total_faturado)}</span>{' '}
              em{' '}
              <span className="font-semibold text-text-primary">{formatNum(k?.qtd_pedidos)} pedidos</span>,
              com um ticket médio de{' '}
              <span className="font-semibold text-text-primary">{formatBRL(k?.ticket_medio)}</span>.
              {' '}
              <span className="font-semibold">{k?.clientes_ativos || 0}</span> clientes únicos realizaram compras
              — uma conversão de <span className="font-semibold">{formatPct(k?.taxa_conversao_pct)}</span> da base.
              {' '}
              O destaque de vendas foi{' '}
              <span className="font-semibold text-text-primary">{k?.vendedor_top || '—'}</span>
              {k?.vendedor_top_valor ? ` com ${formatBRL(k.vendedor_top_valor)} vendidos` : ''}.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
