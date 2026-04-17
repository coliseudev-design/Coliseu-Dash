import { useState } from 'react'
import { useApiQuery } from '../hooks/useApi'
import KPICard from '../components/KPICard'
import DataTable from '../components/DataTable'
import { Package, DollarSign, AlertCircle, TrendingUp, TrendingDown, Search } from 'lucide-react'
import { formatBRL, formatBRLCompact, formatNum } from '../utils/format'

export default function Produtos() {
  const [search, setSearch] = useState('')
  const [categoria, setCategoria] = useState('')
  const kpis = useApiQuery<any>('/produtos/kpis')
  const cats = useApiQuery<any>('/produtos/categorias')
  const lista = useApiQuery<any>(
    '/produtos/lista',
    { search, categoria: categoria || undefined, limit: 200 },
    { placeholderData: (prev: any) => prev },
  )

  const k = kpis.data?.kpis

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
        <KPICard
          label="Total Produtos"
          value={formatNum(k?.total_produtos)}
          icon={Package}
          iconColor="text-brand-500"
          loading={kpis.isLoading}
        />
        <KPICard
          label="Valor em Estoque"
          value={formatBRLCompact(k?.valor_total_estoque)}
          icon={DollarSign}
          iconColor="text-success"
          loading={kpis.isLoading}
        />
        <KPICard
          label="Baixo Estoque"
          value={formatNum(k?.baixo_estoque)}
          icon={AlertCircle}
          iconColor="text-danger"
          hint="abaixo do mínimo"
          loading={kpis.isLoading}
        />
        <KPICard
          label="Mais Caro"
          value={k?.produto_mais_caro || '—'}
          icon={TrendingUp}
          iconColor="text-success"
          loading={kpis.isLoading}
        />
        <KPICard
          label="Mais Barato"
          value={k?.produto_mais_barato || '—'}
          icon={TrendingDown}
          iconColor="text-neutral"
          loading={kpis.isLoading}
        />
      </div>

      <div className="card !p-3 flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            className="input !pl-9"
            placeholder="Buscar por nome ou código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input !w-auto"
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
        >
          <option value="">Todas categorias</option>
          {(cats.data?.data || []).map((c: any) => (
            <option key={c.categoria} value={c.categoria}>
              {c.categoria} ({c.qtd})
            </option>
          ))}
        </select>
        <span className="text-xs text-text-secondary">
          {lista.data?.total || 0} produtos
        </span>
      </div>

      <DataTable
        loading={lista.isLoading}
        data={lista.data?.data || []}
        empty="Nenhum produto encontrado"
        columns={[
          { key: 'codigo', label: 'Código', render: (r: any) => <span className="mono text-xs text-text-secondary">{r.codigo}</span> },
          { key: 'nome', label: 'Nome' },
          { key: 'categoria', label: 'Categoria', render: (r: any) => <span className="badge-info">{r.categoria}</span> },
          { key: 'estoque', label: 'Estoque', align: 'right',
            render: (r: any) => (
              <span className={r.estoque <= r.estoque_minimo ? 'text-danger font-semibold' : ''}>
                {formatNum(r.estoque)}
              </span>
            ) },
          { key: 'preco', label: 'Preço', align: 'right', render: (r: any) => formatBRL(r.preco) },
          { key: 'custo', label: 'Custo', align: 'right', render: (r: any) => <span className="text-text-secondary">{formatBRL(r.custo)}</span> },
          { key: 'valor_total_estoque', label: 'Total Estoque', align: 'right',
            render: (r: any) => <span className="font-semibold">{formatBRL(r.valor_total_estoque)}</span> },
        ]}
      />
    </div>
  )
}
