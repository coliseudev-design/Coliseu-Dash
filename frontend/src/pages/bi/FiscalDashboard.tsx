import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  FileText, ArrowUpRight, ArrowDownLeft, Search, Download, Copy, Check,
  Eye, X, RefreshCw, ChevronLeft, ChevronRight, Scale, Filter, Truck, Building2, Package, ChevronDown, FileCheck2, AlertTriangle
} from 'lucide-react'
import clsx from 'clsx'
import api from '../../services/api'
import PeriodFilter from '../../components/PeriodFilter'
import { usePeriodStore, periodToParams } from '../../store/periodStore'
import { useBranchParam } from '../../contexts/BranchContext'
import { formatBRL, formatDate, formatNum } from '../../utils/format'

interface FiscalKpis {
  emitidas_qtd: number
  emitidas_valor: number
  emitidas_ticket_medio: number
  emitidas_chave_qtd: number
  entradas_qtd: number
  entradas_valor: number
  entradas_ticket_medio: number
  entradas_chave_qtd: number
  saldo_fiscal: number
  total_documentos: number
}

interface NaturezaResumo {
  key?: string
  natureza_operacao: string
  tipo_operacao: 'SAIDA' | 'ENTRADA'
  qtd: number
  valor: number
}

interface CfopResumo {
  key?: string
  cfop: string
  tipo_operacao: 'SAIDA' | 'ENTRADA'
  qtd: number
  valor: number
}

interface FiscalResumoResponse {
  period: { start: string; end: string; label: string }
  apenas_nfe?: boolean
  apenas_nfe_efetivo?: boolean
  has_synced_nf?: boolean
  kpis: FiscalKpis
  naturezas?: NaturezaResumo[]
  cfops: CfopResumo[]
}

interface FiscalNotaRow {
  origem: 'cargas' | 'vendas'
  registro_id: number
  tipo_operacao: 'SAIDA' | 'ENTRADA'
  modelo_doc: string
  numero_nota: string
  serie: string
  numero_pedido: string
  chave_nfe: string | null
  data_emissao: string
  parceiro_nome: string
  parceiro_documento: string
  cidade: string
  uf: string
  cfop: string
  natureza_operacao: string
  valor_total: number
  status: string
  qtd_itens: number
}

interface FiscalNotasResponse {
  tipo: 'SAIDA' | 'ENTRADA'
  total: number
  soma_valor: number
  page: number
  limit: number
  total_pages: number
  data: FiscalNotaRow[]
}

interface FiscalItemDetalhe {
  ordem: number
  codigo: string
  descricao: string
  ncm: string
  cst: string
  cfop: string
  unidade: string
  quantidade: number
  valor_unitario: number
  desconto: number
  valor_total: number
}

interface FiscalNotaDetalhe {
  origem: 'cargas' | 'vendas'
  registro_id: number
  tipo_operacao: 'SAIDA' | 'ENTRADA'
  modelo_doc: string
  numero_nota: string
  serie: string
  numero_pedido: string
  chave_nfe: string | null
  protocolo: string | null
  natureza_operacao: string
  data_emissao: string
  status: string
  vendedor_nome?: string | null
  valor_produtos: number
  valor_frete: number
  valor_desconto: number
  valor_total: number
  remetente: { nome: string; documento: string; municipio: string; uf: string }
  destinatario: { nome: string; documento: string; municipio: string; uf: string }
  transporte: {
    transportadora_nome: string | null
    transportadora_documento: string | null
    placa: string | null
    uf: string | null
    volumes: string | number | null
    especie: string | null
    peso_bruto: number
    peso_liquido: number
  }
  itens: FiscalItemDetalhe[]
}

function formatChaveGroups(chave: string) {
  return chave.replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim()
}

function shortenChave(chave: string) {
  const clean = chave.replace(/\s+/g, '')
  if (clean.length <= 16) return clean
  return `${clean.slice(0, 8)}...${clean.slice(-8)}`
}

export default function FiscalDashboard() {
  const periodState = usePeriodStore()
  const branchParam = useBranchParam()

  const { data: tenantParams } = useQuery<{ somente_vendas_com_nf?: boolean }>({
    queryKey: ['tenant-parametros'],
    queryFn: async () => {
      const res = await api.get('/configuracoes/parametros')
      return res.data
    },
  })

  const [activeTab, setActiveTab] = useState<'SAIDA' | 'ENTRADA'>('SAIDA')
  const [apenasNfe, setApenasNfe] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedOperacao, setSelectedOperacao] = useState('todos')
  const [page, setPage] = useState(1)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [selectedNota, setSelectedNota] = useState<{ origem: 'cargas' | 'vendas'; id: number } | null>(null)

  useEffect(() => {
    if (tenantParams && typeof tenantParams.somente_vendas_com_nf === 'boolean') {
      setApenasNfe(tenantParams.somente_vendas_com_nf)
    }
  }, [tenantParams?.somente_vendas_com_nf])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim())
      setPage(1)
    }, 350)
    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    setPage(1)
  }, [activeTab, apenasNfe, selectedOperacao, periodState.period, periodState.startDate, periodState.endDate, branchParam.depto_id])

  const baseParams = useMemo(() => {
    const p: Record<string, string | number> = {
      ...periodToParams(periodState),
      apenas_nfe: apenasNfe ? 'true' : 'false',
    }
    if (branchParam.depto_id) p.depto_id = branchParam.depto_id
    if (selectedOperacao !== 'todos') p.operacao = selectedOperacao
    if (debouncedSearch) p.search = debouncedSearch
    return p
  }, [periodState, apenasNfe, branchParam.depto_id, selectedOperacao, debouncedSearch])

  const {
    data: resumo,
    isLoading: loadingResumo,
    refetch: refetchResumo,
  } = useQuery<FiscalResumoResponse>({
    queryKey: ['fiscal-resumo', baseParams],
    queryFn: async () => {
      const res = await api.get('/fiscal/resumo', { params: baseParams })
      return res.data
    },
  })

  const {
    data: notasPage,
    isLoading: loadingNotas,
    isFetching: fetchingNotas,
    refetch: refetchNotas,
  } = useQuery<FiscalNotasResponse>({
    queryKey: ['fiscal-notas', activeTab, page, baseParams],
    queryFn: async () => {
      const res = await api.get('/fiscal/notas', {
        params: {
          ...baseParams,
          tipo: activeTab,
          page,
          limit: 50,
        },
      })
      return res.data
    },
  })

  const { data: detalheNota, isLoading: loadingDetalhe } = useQuery<FiscalNotaDetalhe>({
    queryKey: ['fiscal-nota-detalhe', selectedNota?.origem, selectedNota?.id],
    enabled: Boolean(selectedNota),
    queryFn: async () => {
      const res = await api.get(`/fiscal/notas/${selectedNota!.origem}/${selectedNota!.id}`)
      return res.data
    },
  })

  const kpis = resumo?.kpis || {
    emitidas_qtd: 0,
    emitidas_valor: 0,
    emitidas_ticket_medio: 0,
    emitidas_chave_qtd: 0,
    entradas_qtd: 0,
    entradas_valor: 0,
    entradas_ticket_medio: 0,
    entradas_chave_qtd: 0,
    saldo_fiscal: 0,
    total_documentos: 0,
  }

  const naturezasDisponiveis = useMemo(() => {
    const all = resumo?.naturezas || []
    const unique = new Map<string, { key: string; label: string; qtd: number; valor: number }>()
    for (const item of all) {
      const label = (item.natureza_operacao || '').trim()
      if (!label) continue
      const key = item.key || `nat:${label}`
      const prev = unique.get(key)
      if (prev) {
        prev.qtd += item.qtd
        prev.valor += item.valor
      } else {
        unique.set(key, { key, label, qtd: item.qtd, valor: item.valor })
      }
    }
    return Array.from(unique.values()).sort((a, b) => b.valor - a.valor)
  }, [resumo?.naturezas])

  const cfopsDisponiveis = useMemo(() => {
    const all = resumo?.cfops || []
    const unique = new Map<string, { key: string; cfop: string; qtd: number; valor: number }>()
    for (const item of all) {
      const code = (item.cfop || '').trim()
      if (!code) continue
      const key = item.key || `cfop:${code}`
      const prev = unique.get(key)
      if (prev) {
        prev.qtd += item.qtd
        prev.valor += item.valor
      } else {
        unique.set(key, { key, cfop: code, qtd: item.qtd, valor: item.valor })
      }
    }
    return Array.from(unique.values()).sort((a, b) => b.valor - a.valor)
  }, [resumo?.cfops])

  const topOperacoesTab = useMemo(() => {
    const natTab = (resumo?.naturezas || [])
      .filter((n) => n.tipo_operacao === activeTab && (n.natureza_operacao || '').trim() !== '')
      .map((n) => ({
        key: n.key || `nat:${n.natureza_operacao.trim()}`,
        shortLabel: n.natureza_operacao.trim(),
        qtd: n.qtd,
        valor: n.valor,
      }))

    const cfopTab = (resumo?.cfops || [])
      .filter((c) => c.tipo_operacao === activeTab && (c.cfop || '').trim() !== '')
      .map((c) => ({
        key: c.key || `cfop:${c.cfop.trim()}`,
        shortLabel: `CFOP ${c.cfop.trim()}`,
        qtd: c.qtd,
        valor: c.valor,
      }))

    if (cfopTab.length > 0 && natTab.length > 0) {
      return [...natTab.slice(0, 2), ...cfopTab.slice(0, 3)]
    }
    return (natTab.length > 0 ? natTab : cfopTab).slice(0, 4)
  }, [resumo?.naturezas, resumo?.cfops, activeTab])

  const selectedOperacaoLabel = useMemo(() => {
    if (selectedOperacao === 'todos') return ''
    if (selectedOperacao.startsWith('cfop:')) return `CFOP ${selectedOperacao.slice(5)}`
    if (selectedOperacao.startsWith('nat:')) return selectedOperacao.slice(4)
    return selectedOperacao
  }, [selectedOperacao])

  const handleCopyChave = (chave: string) => {
    navigator.clipboard?.writeText(chave.replace(/\s+/g, '')).catch(() => {})
    setCopiedKey(chave)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const handleExportCsv = () => {
    const rows = notasPage?.data || []
    if (rows.length === 0) return

    const headers = [
      'Tipo',
      'Numero Nota',
      'Serie',
      'Modelo',
      'Data Emissao',
      activeTab === 'SAIDA' ? 'Cliente' : 'Fornecedor',
      'Documento',
      'Cidade',
      'UF',
      'CFOP',
      'Natureza Operacao',
      'Pedido',
      'Chave NFe',
      'Valor Total',
      'Status',
    ]

    const escapeCsv = (val: unknown) => {
      const s = String(val ?? '').replace(/"/g, '""')
      return `"${s}"`
    }

    const lines = rows.map((r) =>
      [
        r.tipo_operacao === 'SAIDA' ? 'EMITIDA (SAIDA)' : 'ENTRADA',
        r.numero_nota,
        r.serie,
        r.modelo_doc,
        formatDate(r.data_emissao),
        r.parceiro_nome,
        r.parceiro_documento,
        r.cidade,
        r.uf,
        r.cfop,
        r.natureza_operacao,
        r.numero_pedido,
        r.chave_nfe || '',
        r.valor_total.toFixed(2).replace('.', ','),
        r.status,
      ]
        .map(escapeCsv)
        .join(';')
    )

    const csvContent = '\uFEFF' + [headers.join(';'), ...lines].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `notas_fiscais_${activeTab.toLowerCase()}_p${page}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-3.5 pb-6">
      {/* Barra Superior Compacta Unificada */}
      <div className="bi-filter-bar">
        <div className="min-w-0">
          <PeriodFilter />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Alternador Rápido: Todos vs Somente c/ NF-e */}
          <div className="inline-flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-lg h-8">
            <button
              type="button"
              onClick={() => setApenasNfe(false)}
              className={clsx(
                'px-2.5 h-full rounded-md text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap',
                !apenasNfe
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              )}
              title="Exibe todas as vendas faturadas e notas de entrada sincronizadas do ERP"
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setApenasNfe(true)}
              className={clsx(
                'px-2.5 h-full rounded-md text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1 whitespace-nowrap',
                apenasNfe
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              )}
              title="Filtra exclusivamente documentos com número ou chave NF-e / XML vinculado"
            >
              <FileCheck2 size={12} />
              <span>Somente c/ NF-e</span>
            </button>
          </div>

          {/* Filtro Unificado de Natureza de Operação + CFOP */}
          <div className="relative flex items-center">
            <Filter size={13} className="absolute left-2.5 text-slate-400 pointer-events-none" />
            <select
              value={selectedOperacao}
              onChange={(e) => setSelectedOperacao(e.target.value)}
              className="bi-select appearance-none pl-7 pr-7 max-w-[235px] sm:max-w-[265px] truncate"
              aria-label="Filtrar por Natureza de Operação ou CFOP"
            >
              <option value="todos">Todas as Naturezas / CFOPs</option>
              {naturezasDisponiveis.length > 0 && (
                <optgroup label="Natureza de Operação">
                  {naturezasDisponiveis.map((n) => (
                    <option key={n.key} value={n.key}>
                      {n.label} ({formatNum(n.qtd)})
                    </option>
                  ))}
                </optgroup>
              )}
              {cfopsDisponiveis.length > 0 && (
                <optgroup label="Código CFOP">
                  {cfopsDisponiveis.map((c) => (
                    <option key={c.key} value={c.key}>
                      CFOP {c.cfop} ({formatNum(c.qtd)})
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <ChevronDown size={13} className="absolute right-2 text-slate-400 pointer-events-none" />
          </div>

          {/* Busca Rápida */}
          <div className="relative flex-1 sm:flex-none sm:w-56 lg:w-64 min-w-[190px]">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Nº Nota, Pedido, Chave, Cliente..."
              className="w-full h-8 pl-8 pr-7 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500/30"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                aria-label="Limpar busca"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              refetchResumo()
              refetchNotas()
            }}
            className="h-8 w-8 inline-flex items-center justify-center bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors cursor-pointer shrink-0"
            title="Atualizar dados fiscais"
          >
            <RefreshCw size={14} className={clsx((loadingResumo || fetchingNotas) && 'animate-spin text-blue-600')} />
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={!notasPage?.data?.length}
            className="inline-flex items-center gap-1.5 h-8 px-3 bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
          >
            <Download size={13} />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Aviso de Proteção Inteligente quando 'Somente c/ NF-e' é clicado em empresa sem NFs sincronizadas */}
      {apenasNfe && resumo && resumo.has_synced_nf === false && (
        <div className="bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle size={15} className="text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="leading-snug">
              <strong>Proteção inteligente ativa:</strong> o SyncAgent desta empresa ainda não sincroniza número/chave de NF-e ou XML (0 notas detectadas). Exibindo todos os documentos faturados e de entrada do ERP para evitar listagem vazia.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setApenasNfe(false)}
            className="text-[11px] font-bold text-amber-800 dark:text-amber-300 hover:underline shrink-0 cursor-pointer"
          >
            Voltar p/ Todos
          </button>
        </div>
      )}

      {/* Cards Executivos de KPIs Fiscais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        {/* Card 1: Notas Emitidas (Saída) */}
        <button
          type="button"
          onClick={() => setActiveTab('SAIDA')}
          className={clsx(
            'text-left bg-white dark:bg-slate-900 rounded-2xl p-4 border transition-all cursor-pointer shadow-[0_4px_16px_rgba(15,23,42,0.04)] flex flex-col justify-between min-w-0',
            activeTab === 'SAIDA'
              ? 'border-emerald-400/80 dark:border-emerald-500/60 ring-2 ring-emerald-500/10'
              : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
          )}
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
              Notas Fiscais Emitidas
            </span>
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: '#10B98114', border: '1px solid #10B98133' }}
            >
              <ArrowUpRight size={16} style={{ color: '#10B981' }} strokeWidth={2} />
            </div>
          </div>
          <div className="bi-kpi-value font-extrabold font-mono text-slate-900 dark:text-white tracking-tight">
            {loadingResumo ? '...' : formatBRL(kpis.emitidas_valor)}
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            <span>
              <strong className="text-slate-700 dark:text-slate-200">{formatNum(kpis.emitidas_qtd)}</strong> saídas
            </span>
            <span className="font-mono">Ticket: {formatBRL(kpis.emitidas_ticket_medio)}</span>
          </div>
        </button>

        {/* Card 2: Notas de Entrada */}
        <button
          type="button"
          onClick={() => setActiveTab('ENTRADA')}
          className={clsx(
            'text-left bg-white dark:bg-slate-900 rounded-2xl p-4 border transition-all cursor-pointer shadow-[0_4px_16px_rgba(15,23,42,0.04)] flex flex-col justify-between min-w-0',
            activeTab === 'ENTRADA'
              ? 'border-blue-400/80 dark:border-blue-500/60 ring-2 ring-blue-500/10'
              : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
          )}
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
              Notas de Entrada
            </span>
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: '#2563EB14', border: '1px solid #2563EB33' }}
            >
              <ArrowDownLeft size={16} style={{ color: '#2563EB' }} strokeWidth={2} />
            </div>
          </div>
          <div className="bi-kpi-value font-extrabold font-mono text-slate-900 dark:text-white tracking-tight">
            {loadingResumo ? '...' : formatBRL(kpis.entradas_valor)}
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            <span>
              <strong className="text-slate-700 dark:text-slate-200">{formatNum(kpis.entradas_qtd)}</strong> entradas
            </span>
            <span className="font-mono">Média: {formatBRL(kpis.entradas_ticket_medio)}</span>
          </div>
        </button>

        {/* Card 3: Saldo Fiscal */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-[0_4px_16px_rgba(15,23,42,0.04)] flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
              Saldo Fiscal (Saídas − Entradas)
            </span>
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: '#0D948814', border: '1px solid #0D948833' }}
            >
              <Scale size={16} style={{ color: '#0D9488' }} strokeWidth={1.9} />
            </div>
          </div>
          <div
            className={clsx(
              'bi-kpi-value font-extrabold font-mono tracking-tight',
              kpis.saldo_fiscal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
            )}
          >
            {loadingResumo ? '...' : formatBRL(kpis.saldo_fiscal)}
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            <span>Total: {formatNum(kpis.total_documentos)} docs</span>
            <span>
              Chaves XML: {formatNum(kpis.emitidas_chave_qtd + kpis.entradas_chave_qtd)}
            </span>
          </div>
        </div>

        {/* Card 4: Top Naturezas / CFOPs da Aba */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-[0_4px_16px_rgba(15,23,42,0.04)] flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
              Top Naturezas / CFOPs ({activeTab === 'SAIDA' ? 'Saída' : 'Entrada'})
            </span>
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: '#F59E0B14', border: '1px solid #F59E0B33' }}
            >
              <FileText size={16} style={{ color: '#F59E0B' }} strokeWidth={1.9} />
            </div>
          </div>

          {topOperacoesTab.length === 0 ? (
            <div className="text-xs text-slate-400 py-2">Nenhuma operação registrada no período selecionado.</div>
          ) : (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {topOperacoesTab.map((item) => {
                const isSelected = selectedOperacao === item.key
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setSelectedOperacao(isSelected ? 'todos' : item.key)}
                    className={clsx(
                      'px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer max-w-full truncate',
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    )}
                    title={`Filtrar por ${item.shortLabel} (${formatBRL(item.valor)})`}
                  >
                    {item.shortLabel} <span className="opacity-70">({formatNum(item.qtd)})</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Container de Abas + Tabela */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-[0_4px_16px_rgba(15,23,42,0.04)] overflow-hidden">
        {/* Seletor de Abas */}
        <div className="px-4 sm:px-5 pt-4 pb-3 border-b border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl gap-1 self-start">
            <button
              type="button"
              onClick={() => setActiveTab('SAIDA')}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer',
                activeTab === 'SAIDA'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              <ArrowUpRight size={15} className="text-emerald-600" />
              <span>Notas Fiscais Emitidas</span>
              <span className="px-2 py-0.5 rounded-full text-[11px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold">
                {formatNum(kpis.emitidas_qtd)}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ENTRADA')}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer',
                activeTab === 'ENTRADA'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              <ArrowDownLeft size={15} className="text-blue-600" />
              <span>Notas de Entrada</span>
              <span className="px-2 py-0.5 rounded-full text-[11px] bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold">
                {formatNum(kpis.entradas_qtd)}
              </span>
            </button>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-3">
            {selectedOperacao !== 'todos' && (
              <button
                type="button"
                onClick={() => setSelectedOperacao('todos')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold cursor-pointer"
              >
                <span>{selectedOperacaoLabel}</span>
                <X size={12} />
              </button>
            )}
            <span>
              Soma da listagem:{' '}
              <strong className="text-slate-800 dark:text-slate-100">
                {formatBRL(notasPage?.soma_valor || 0)}
              </strong>
            </span>
          </div>
        </div>

        {/* Tabela Desktop */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200/70 dark:border-slate-800">
                <th className="py-3 px-4">Nº Nota / Série</th>
                <th className="py-3 px-3">Emissão</th>
                <th className="py-3 px-3">{activeTab === 'SAIDA' ? 'Cliente / Destinatário' : 'Fornecedor / Emitente'}</th>
                <th className="py-3 px-3 hidden md:table-cell">Cidade / UF</th>
                <th className="py-3 px-3">CFOP / Natureza</th>
                <th className="py-3 px-3 hidden xl:table-cell">Chave de Acesso NF-e</th>
                <th className="py-3 px-3 text-right">Valor Total</th>
                <th className="py-3 px-4 text-center">Itens</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs sm:text-[13px]">
              {loadingNotas ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td colSpan={8} className="py-4 px-4">
                      <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : !notasPage?.data?.length ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    Nenhuma {activeTab === 'SAIDA' ? 'nota fiscal emitida' : 'nota de entrada'} encontrada para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                notasPage.data.map((row) => (
                  <tr
                    key={`${row.origem}-${row.registro_id}`}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">
                          Nº {row.numero_nota}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium">
                          Série {row.serie}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                        <span>{row.modelo_doc}</span>
                        {row.numero_pedido && row.numero_pedido !== '-' && (
                          <span>• Ped. {row.numero_pedido}</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap text-slate-700 dark:text-slate-300 font-medium">
                      {formatDate(row.data_emissao)}
                    </td>

                    <td className="py-3 px-3 max-w-[260px]">
                      <div className="font-semibold text-slate-800 dark:text-slate-100 truncate" title={row.parceiro_nome}>
                        {row.parceiro_nome}
                      </div>
                      {row.parceiro_documento && (
                        <div className="text-[11px] text-slate-400 font-mono">
                          {row.parceiro_documento}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-3 hidden md:table-cell text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {row.cidade ? `${row.cidade}${row.uf ? ` / ${row.uf}` : ''}` : row.uf || '—'}
                    </td>

                    <td className="py-3 px-3 max-w-[220px]">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {row.cfop ? (
                          <button
                            type="button"
                            onClick={() => setSelectedOperacao(selectedOperacao === `cfop:${row.cfop}` ? 'todos' : `cfop:${row.cfop}`)}
                            className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 font-mono font-bold text-[11px] shrink-0 cursor-pointer transition-colors"
                            title={`Filtrar por CFOP ${row.cfop}`}
                          >
                            {row.cfop}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => setSelectedOperacao(selectedOperacao === `nat:${row.natureza_operacao}` ? 'todos' : `nat:${row.natureza_operacao}`)}
                          className="text-left text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 truncate text-xs cursor-pointer transition-colors"
                          title={`Filtrar por Natureza: ${row.natureza_operacao}`}
                        >
                          {row.natureza_operacao}
                        </button>
                      </div>
                    </td>

                    <td className="py-3 px-3 hidden xl:table-cell">
                      {row.chave_nfe ? (
                        <div className="inline-flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 px-2 py-1 rounded-lg">
                          <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300">
                            {shortenChave(row.chave_nfe)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyChave(row.chave_nfe!)}
                            className="text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                            title="Copiar Chave de Acesso NF-e"
                          >
                            {copiedKey === row.chave_nfe ? (
                              <Check size={13} className="text-emerald-600" />
                            ) : (
                              <Copy size={13} />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400">Nota interna ERP</span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-right whitespace-nowrap font-bold text-slate-900 dark:text-white">
                      {formatBRL(row.valor_total)}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedNota({ origem: row.origem, id: row.registro_id })}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                        title="Visualizar espelho e itens da nota"
                      >
                        <Eye size={14} />
                        <span>{row.qtd_itens > 0 ? `${row.qtd_itens}` : 'Ver'}</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {notasPage && notasPage.total > 0 && (
          <div className="px-4 sm:px-5 py-3.5 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
            <div>
              Exibindo página <strong className="text-slate-800 dark:text-slate-200">{notasPage.page}</strong> de{' '}
              <strong className="text-slate-800 dark:text-slate-200">{notasPage.total_pages}</strong> •{' '}
              <strong className="text-slate-800 dark:text-slate-200">{formatNum(notasPage.total)}</strong> documentos encontrados
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft size={14} />
                Anterior
              </button>
              <button
                type="button"
                disabled={page >= notasPage.total_pages}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold disabled:opacity-40 cursor-pointer"
              >
                Próxima
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Detalhes e Itens da Nota Fiscal */}
      {selectedNota && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150"
          onClick={() => setSelectedNota(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header do Modal */}
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: detalheNota?.tipo_operacao === 'ENTRADA' ? '#2563EB14' : '#10B98114',
                    border: `1px solid ${detalheNota?.tipo_operacao === 'ENTRADA' ? '#2563EB33' : '#10B98133'}`,
                  }}
                >
                  <FileText
                    size={19}
                    style={{ color: detalheNota?.tipo_operacao === 'ENTRADA' ? '#2563EB' : '#10B981' }}
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Nota Fiscal Nº {detalheNota?.numero_nota || '...'}
                    </h3>
                    {detalheNota && (
                      <span
                        className={clsx(
                          'text-[11px] font-bold px-2.5 py-0.5 rounded-full',
                          detalheNota.tipo_operacao === 'ENTRADA'
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                        )}
                      >
                        {detalheNota.tipo_operacao === 'ENTRADA' ? 'NOTA DE ENTRADA' : 'NOTA EMITIDA (SAÍDA)'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {detalheNota
                      ? `Série ${detalheNota.serie} • Emissão ${formatDate(detalheNota.data_emissao)} • ${detalheNota.natureza_operacao}`
                      : 'Carregando detalhes do documento fiscal...'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedNota(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                aria-label="Fechar modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Corpo do Modal */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1">
              {loadingDetalhe || !detalheNota ? (
                <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400 text-sm">
                  <RefreshCw size={22} className="animate-spin text-blue-600" />
                  <span>Carregando itens e dados fiscais...</span>
                </div>
              ) : (
                <>
                  {/* Chave de Acesso */}
                  {detalheNota.chave_nfe && (
                    <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Chave de Acesso NF-e
                        </div>
                        <div className="font-mono text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 mt-0.5 break-all">
                          {formatChaveGroups(detalheNota.chave_nfe)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyChave(detalheNota.chave_nfe!)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-blue-500 cursor-pointer self-start sm:self-center flex-shrink-0"
                      >
                        {copiedKey === detalheNota.chave_nfe ? (
                          <>
                            <Check size={14} className="text-emerald-600" />
                            <span>Chave Copiada</span>
                          </>
                        ) : (
                          <>
                            <Copy size={14} />
                            <span>Copiar Chave</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Emitente & Destinatário */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 space-y-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        <Building2 size={13} />
                        Emitente / Remetente
                      </div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">
                        {detalheNota.remetente.nome}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {detalheNota.remetente.documento && `Doc: ${detalheNota.remetente.documento}`}
                        {detalheNota.remetente.municipio && ` • ${detalheNota.remetente.municipio}/${detalheNota.remetente.uf}`}
                      </div>
                    </div>

                    <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 space-y-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        <Building2 size={13} />
                        Destinatário
                      </div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">
                        {detalheNota.destinatario.nome}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {detalheNota.destinatario.documento && `Doc: ${detalheNota.destinatario.documento}`}
                        {detalheNota.destinatario.municipio && ` • ${detalheNota.destinatario.municipio}/${detalheNota.destinatario.uf}`}
                      </div>
                    </div>
                  </div>

                  {/* Resumo Financeiro da Nota */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-200/60 dark:border-slate-800">
                      <div className="text-[11px] text-slate-500">Valor Produtos</div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                        {formatBRL(detalheNota.valor_produtos)}
                      </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-200/60 dark:border-slate-800">
                      <div className="text-[11px] text-slate-500">Frete</div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                        {formatBRL(detalheNota.valor_frete)}
                      </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-200/60 dark:border-slate-800">
                      <div className="text-[11px] text-slate-500">Descontos</div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                        {formatBRL(detalheNota.valor_desconto)}
                      </div>
                    </div>
                    <div className="bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl p-3 border border-emerald-200/70 dark:border-emerald-800/50">
                      <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold">Valor Total da Nota</div>
                      <div className="text-sm font-extrabold text-emerald-700 dark:text-emerald-300 mt-0.5">
                        {formatBRL(detalheNota.valor_total)}
                      </div>
                    </div>
                  </div>

                  {detalheNota.transporte.transportadora_nome && (
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 px-1">
                      <span className="inline-flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                        <Truck size={14} className="text-blue-600" />
                        Transportadora: {detalheNota.transporte.transportadora_nome}
                      </span>
                      {detalheNota.transporte.placa && <span>Placa: {detalheNota.transporte.placa}</span>}
                      {detalheNota.transporte.volumes && <span>Volumes: {detalheNota.transporte.volumes}</span>}
                      {detalheNota.transporte.peso_bruto > 0 && (
                        <span>Peso Bruto: {formatNum(detalheNota.transporte.peso_bruto)} kg</span>
                      )}
                    </div>
                  )}

                  {/* Tabela de Itens da Nota */}
                  <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden">
                    <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        <Package size={14} className="text-blue-600" />
                        Itens da Nota Fiscal ({detalheNota.itens.length})
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-200/70 dark:border-slate-800 text-[11px] uppercase text-slate-400">
                            <th className="py-2.5 px-3">Código</th>
                            <th className="py-2.5 px-3">Produto / Descrição</th>
                            <th className="py-2.5 px-2">NCM</th>
                            <th className="py-2.5 px-2">CFOP</th>
                            <th className="py-2.5 px-2 text-right">Qtd</th>
                            <th className="py-2.5 px-2 text-right">Vl. Unit.</th>
                            <th className="py-2.5 px-3 text-right">Vl. Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {detalheNota.itens.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-6 text-center text-slate-400">
                                Nenhum item detalhado sincronizado para este documento.
                              </td>
                            </tr>
                          ) : (
                            detalheNota.itens.map((it) => (
                              <tr key={`${it.ordem}-${it.codigo}`}>
                                <td className="py-2 px-3 font-mono text-slate-500">{it.codigo}</td>
                                <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-100">
                                  {it.descricao}
                                </td>
                                <td className="py-2 px-2 font-mono text-slate-500">{it.ncm || '—'}</td>
                                <td className="py-2 px-2 font-mono font-semibold text-blue-600 dark:text-blue-400">
                                  {it.cfop || '—'}
                                </td>
                                <td className="py-2 px-2 text-right text-slate-700 dark:text-slate-300">
                                  {formatNum(it.quantidade)} {it.unidade}
                                </td>
                                <td className="py-2 px-2 text-right text-slate-700 dark:text-slate-300">
                                  {formatBRL(it.valor_unitario)}
                                </td>
                                <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-white">
                                  {formatBRL(it.valor_total)}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
