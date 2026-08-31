import { useState, useCallback, useEffect, useRef } from 'react'
import { useApiQuery, useBranchPeriodQuery } from '../hooks/useApi'
import DataTable from '../components/DataTable'
import { Search, ChevronDown } from 'lucide-react'
import { formatBRL, formatNum } from '../utils/format'

interface ProdutoItem {
  id: number
  codigo: string
  nome: string
  categoria: string
  marca: string
  estoque: number
  estoque_minimo: number
  preco: number
  custo: number
  valor_total_estoque: number
}

interface ProdutosList {
  total: number
  data: ProdutoItem[]
  limit: number
  offset: number
}

interface Categoria {
  categoria: string
  qtd: number
}

const PAGE_SIZE = 200

export default function Produtos() {
  const [search, setSearch] = useState('')
  const [categoria, setCategoria] = useState('')
  const [vendedorId, setVendedorId] = useState('')
  const [offset, setOffset] = useState(0)
  const [accData, setAccData] = useState<ProdutoItem[]>([])
  const prevKey = useRef('')

  const cats = useApiQuery<{ data: Categoria[] }>('/produtos/categorias')
  const vendedores = useBranchPeriodQuery<any>('/ranking/vendedores', { limit: 100 })

  const lista = useApiQuery<ProdutosList>(
    '/produtos/lista',
    {
      search: search || undefined,
      categoria: categoria || undefined,
      vendedor_id: vendedorId || undefined,
      limit: PAGE_SIZE,
      offset,
    },
    { placeholderData: (prev: any) => prev },
  )

  // Acumula dados conforme paginação avança
  useEffect(() => {
    if (!lista.data) return
    const key = `${search}|${categoria}|${vendedorId}`
    if (key !== prevKey.current) {
      // Filtros mudaram: reset
      prevKey.current = key
      setAccData(lista.data.data)
    } else if (offset === 0) {
      setAccData(lista.data.data)
    } else {
      setAccData((prev) => {
        const ids = new Set(prev.map((p) => p.id))
        const novos = lista.data!.data.filter((p) => !ids.has(p.id))
        return [...prev, ...novos]
      })
    }
  }, [lista.data])

  const resetFilters = (cb: () => void) => {
    setOffset(0)
    setAccData([])
    cb()
  }

  const handleSearch = useCallback((v: string) => resetFilters(() => setSearch(v)), [])
  const handleCategoria = useCallback((v: string) => resetFilters(() => setCategoria(v)), [])
  const handleVendedor = useCallback((v: string) => resetFilters(() => setVendedorId(v)), [])

  const total = lista.data?.total ?? 0
  const displayData = accData
  const hasMore = displayData.length > 0 && displayData.length < total

  const vdList: { id: number; nome: string }[] = (vendedores.data?.data || []).map((v: any) => ({
    id: v.id || v.vendedor_id || v.id_firebird,
    nome: v.nome || v.vendedor,
  }))

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Filtros */}
      <div className="card !p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-wrap">
        {/* Busca por nome / código */}
        <div className="flex-1 min-w-0 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            className="input !pl-9 w-full"
            placeholder="Buscar por código, cód. barras, referência ou nome..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        {/* Filtro categoria */}
        <div className="relative">
          <select
            className="input !w-auto appearance-none pr-8"
            value={categoria}
            onChange={(e) => handleCategoria(e.target.value)}
          >
            <option value="">Todas categorias</option>
            {(cats.data?.data || []).map((c) => (
              <option key={c.categoria} value={c.categoria}>
                {c.categoria} ({c.qtd})
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
        </div>

        {/* Filtro vendedor */}
        <div className="relative">
          <select
            className="input !w-auto appearance-none pr-8"
            value={vendedorId}
            onChange={(e) => handleVendedor(e.target.value)}
          >
            <option value="">Todos os vendedores</option>
            {vdList.map((v) => (
              <option key={v.id} value={String(v.id)}>
                {v.nome}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
        </div>

        {/* Contador */}
        <span className="text-xs text-text-secondary whitespace-nowrap">
          {lista.isLoading ? '...' : `${formatNum(displayData.length)} / ${formatNum(total)} produtos`}
        </span>
      </div>

      {/* Tabela */}
      <DataTable
        loading={lista.isLoading && offset === 0}
        data={displayData}
        empty="Nenhum produto encontrado"
        columns={[
          {
            key: 'id',
            label: 'Código',
            render: (r: any) => (
              <span className="mono text-xs font-bold text-indigo-600 dark:text-indigo-400">{r.id}</span>
            ),
          },
          {
            key: 'codigo',
            label: 'Cód. Barras',
            render: (r: any) => <span className="mono text-xs text-text-secondary">{r.codigo || '-'}</span>,
          },
          { key: 'nome', label: 'Nome' },
          {
            key: 'categoria',
            label: 'Categoria',
            render: (r: any) => <span className="badge-info">{r.categoria}</span>,
          },
          {
            key: 'marca',
            label: 'Marca',
            render: (r: any) => <span className="text-xs text-text-secondary">{r.marca || '-'}</span>,
          },
          {
            key: 'estoque',
            label: 'Estoque',
            align: 'right',
            render: (r: any) => (
              <span className={r.estoque <= r.estoque_minimo ? 'text-danger font-semibold' : 'font-bold'}>
                {formatNum(r.estoque)}
              </span>
            ),
          },
          {
            key: 'preco',
            label: 'Preço',
            align: 'right',
            render: (r: any) => formatBRL(r.preco),
          },
          {
            key: 'custo',
            label: 'Custo',
            align: 'right',
            render: (r: any) => <span className="text-text-secondary">{formatBRL(r.custo)}</span>,
          },
          {
            key: 'valor_total_estoque',
            label: 'Total Estoque',
            align: 'right',
            render: (r: any) => <span className="font-semibold">{formatBRL(r.valor_total_estoque)}</span>,
          },
        ]}
      />

      {/* Botão carregar mais */}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <button
            className="btn btn-secondary flex items-center gap-2 text-sm"
            onClick={() => setOffset((prev) => prev + PAGE_SIZE)}
            disabled={lista.isLoading}
          >
            {lista.isLoading && offset > 0 ? (
              <span className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full inline-block" />
            ) : null}
            Carregar mais ({formatNum(total - displayData.length)} restantes)
          </button>
        </div>
      )}
    </div>
  )
}
