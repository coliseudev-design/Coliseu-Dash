import { useState, useEffect, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  FileText,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Download,
  Copy,
  Check,
  Eye,
  X,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Filter,
  Truck,
  Building2,
  Package,
  ChevronDown,
  ChevronUp,
  FileCheck2,
  AlertTriangle,
  CheckSquare,
  Square,
  Save,
  Calendar,
  ArrowUpDown,
  CheckCircle2,
} from 'lucide-react'
import clsx from 'clsx'
import api from '../../services/api'
import PeriodFilter from '../../components/PeriodFilter'
import { usePeriodStore, periodToParams } from '../../store/periodStore'
import { useBranch, useBranchParam } from '../../contexts/BranchContext'
import { formatBRL, formatDate, formatNum } from '../../utils/format'
import { useAuthStore } from '../../store/authStore'

interface FiscalKpis {
  emitidas_qtd: number
  emitidas_saidas_brutas_qtd?: number
  emitidas_saidas_brutas_valor_produtos?: number
  emitidas_saidas_brutas_descontos?: number
  emitidas_saidas_brutas_valor?: number
  emitidas_devolucoes_qtd?: number
  emitidas_devolucoes_valor_produtos?: number
  emitidas_devolucoes_descontos?: number
  emitidas_devolucoes_valor?: number
  emitidas_valor_produtos?: number
  emitidas_descontos_valor?: number
  emitidas_valor: number
  emitidas_ticket_medio: number
  emitidas_chave_qtd: number
  entradas_qtd: number
  entradas_valor_produtos?: number
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
  valor_produtos?: number
  valor: number
}

interface CfopResumo {
  key?: string
  cfop: string
  tipo_operacao: 'SAIDA' | 'ENTRADA'
  natureza_operacao?: string
  qtd: number
  valor_produtos?: number
  valor: number
}

interface FiscalResumoResponse {
  period: { start: string; end: string; label: string }
  apenas_nfe?: boolean
  apenas_nfe_efetivo?: boolean
  has_synced_nf?: boolean
  cfops_faturamento?: string[] | null
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
  valor_produtos?: number
  valor_total: number
  status: string
  qtd_itens: number
}

interface FiscalNotasResponse {
  tipo: 'SAIDA' | 'ENTRADA'
  total: number
  soma_saidas_brutas_produtos?: number
  soma_saidas_brutas_valor?: number
  soma_devolucoes_produtos?: number
  soma_valor_produtos?: number
  soma_descontos?: number
  soma_valor: number
  soma_devolucoes?: number
  qtd_devolucoes?: number
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
  const queryClient = useQueryClient()
  const periodState = usePeriodStore()
  const { filiais, selectedBranch } = useBranch()
  const branchParam = useBranchParam()
  const activeUser = useAuthStore((s) => s.user)
  const userKey = String(activeUser?.email || activeUser?.id || 'default').toLowerCase()

  const tabelaSectionRef = useRef<HTMLDivElement | null>(null)

  const { data: tenantParams } = useQuery<{
    somente_vendas_com_nf?: boolean
    cfops_faturamento?: string[] | null
    cfops_disponiveis?: Array<{ cfop: string }>
  }>({
    queryKey: ['tenant-parametros', userKey],
    queryFn: async () => {
      const res = await api.get('/configuracoes/parametros')
      return res.data
    },
  })

  const [activeTab, setActiveTab] = useState<'SAIDA' | 'ENTRADA'>('SAIDA')
  const [apenasNfe, setApenasNfe] = useState(true)
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedOperacao, setSelectedOperacao] = useState('todos')
  // undefined = usa padrão configurado no projeto (sem waterfall no mount); null = todos os CFOPs; string[] = seleção customizada
  const [checkedCfops, setCheckedCfops] = useState<string[] | null | undefined>(undefined)
  const [cfopSaveMsg, setCfopSaveMsg] = useState<string | null>(null)
  const [expandedCfopDetails, setExpandedCfopDetails] = useState<Record<string, boolean>>({})
  const [showSecondaryMetrics, setShowSecondaryMetrics] = useState(false)
  const [alertExpanded, setAlertExpanded] = useState(false)
  const [page, setPage] = useState(1)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [selectedNota, setSelectedNota] = useState<{ origem: 'cargas' | 'vendas'; id: number } | null>(null)

  const [tableSortField, setTableSortField] = useState<'emissao' | 'numero' | 'valor'>('emissao')
  const [tableSortDir, setTableSortDir] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    if (tenantParams && tenantParams.somente_vendas_com_nf === true) {
      setApenasNfe(true)
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
  }, [activeTab, apenasNfe, selectedOperacao, checkedCfops, periodState.period, periodState.startDate, periodState.endDate, branchParam.depto_id])

  const activeBranchInfo = useMemo(() => {
    if (selectedBranch === 'todas') {
      return {
        label: filiais.length > 1 ? `Todas as Filiais (${filiais.length})` : 'Todas as Filiais',
        documento: null,
      }
    }
    const found = filiais.find((f) => f.depto_id === selectedBranch)
    return {
      label: found ? found.nome : `Filial #${selectedBranch}`,
      documento: found?.documento || null,
    }
  }, [filiais, selectedBranch])

  const baseParams = useMemo(() => {
    const p: Record<string, string | number> = {
      ...periodToParams(periodState),
      apenas_nfe: apenasNfe ? 'true' : 'false',
    }
    if (branchParam.depto_id) p.depto_id = branchParam.depto_id
    if (selectedOperacao !== 'todos') p.operacao = selectedOperacao
    if (Array.isArray(checkedCfops)) {
      p.cfops = checkedCfops.length > 0 ? checkedCfops.join(',') : 'nenhum'
    } else if (checkedCfops === null) {
      p.cfops = 'todos'
    }
    if (debouncedSearch) p.search = debouncedSearch
    return p
  }, [periodState, apenasNfe, branchParam.depto_id, selectedOperacao, checkedCfops, debouncedSearch])

  const {
    data: resumo,
    isLoading: loadingResumo,
    isError: errorResumo,
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
    isError: errorNotas,
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

  const cfopsEmitidosResumo = useMemo(() => {
    const all = (resumo?.cfops || []).filter((c) => c.tipo_operacao === 'SAIDA' && (c.cfop || '').trim() !== '')
    const unique = new Map<string, { key: string; cfop: string; natureza: string; qtd: number; valor_produtos: number; valor: number }>()
    for (const item of all) {
      const code = (item.cfop || '').trim()
      if (!code) continue
      const key = item.key || `cfop:${code}`
      const prev = unique.get(code)
      if (prev) {
        prev.qtd += item.qtd
        prev.valor_produtos += Number(item.valor_produtos ?? item.valor ?? 0)
        prev.valor += item.valor
      } else {
        unique.set(code, {
          key,
          cfop: code,
          natureza: item.natureza_operacao || `CFOP ${code}`,
          qtd: item.qtd,
          valor_produtos: Number(item.valor_produtos ?? item.valor ?? 0),
          valor: item.valor,
        })
      }
    }
    return Array.from(unique.values()).sort((a, b) => b.valor - a.valor)
  }, [resumo?.cfops])

  const allEmitidosCodes = useMemo(() => cfopsEmitidosResumo.map((c) => c.cfop), [cfopsEmitidosResumo])
  const allHistoricalCfopCodes = useMemo(() => {
    const set = new Set<string>(allEmitidosCodes)
    for (const item of tenantParams?.cfops_disponiveis || []) {
      if (item.cfop) set.add(String(item.cfop).trim())
    }
    return Array.from(set)
  }, [allEmitidosCodes, tenantParams?.cfops_disponiveis])

  const effectiveCheckedCfops = useMemo(() => {
    if (Array.isArray(checkedCfops)) return checkedCfops
    if (checkedCfops === null) return allHistoricalCfopCodes
    const configured = resumo?.cfops_faturamento ?? tenantParams?.cfops_faturamento
    if (Array.isArray(configured) && configured.length > 0) {
      const returnCfops = ['1201', '1202', '1411', '2201', '2202', '2411']
      const hasSales = configured.some((c) => /^[56]/.test(String(c)))
      const hasReturn = configured.some((c) => returnCfops.includes(String(c)))
      return hasSales && !hasReturn ? Array.from(new Set([...configured, ...returnCfops])) : configured
    }
    return allHistoricalCfopCodes
  }, [checkedCfops, resumo?.cfops_faturamento, tenantParams?.cfops_faturamento, allHistoricalCfopCodes])

  const toggleCfopCheck = (code: string) => {
    const current = effectiveCheckedCfops
    const next = current.includes(code)
      ? current.filter((c) => c !== code)
      : [...current, code]
    setCheckedCfops(next.length >= allHistoricalCfopCodes.length && allHistoricalCfopCodes.every((c) => next.includes(c)) ? null : next)
  }

  // Agrupamento dos CFOPs em 3 categorias visuais: Vendas, Devoluções e Fora da Apuração
  const cfopGroups = useMemo(() => {
    const vendas: typeof cfopsEmitidosResumo = []
    const devolucoes: typeof cfopsEmitidosResumo = []
    const foraApuracao: typeof cfopsEmitidosResumo = []

    let vendasTotalValor = 0
    let vendasTotalQtd = 0
    let devolucoesTotalValor = 0
    let devolucoesTotalQtd = 0
    let foraTotalValor = 0
    let foraTotalQtd = 0

    for (const item of cfopsEmitidosResumo) {
      const isChecked = effectiveCheckedCfops.includes(item.cfop)
      const isDevolucao = item.cfop.startsWith('1') || item.cfop.startsWith('2')

      if (!isChecked) {
        foraApuracao.push(item)
        foraTotalValor += item.valor
        foraTotalQtd += item.qtd
      } else if (isDevolucao) {
        devolucoes.push(item)
        devolucoesTotalValor += item.valor
        devolucoesTotalQtd += item.qtd
      } else {
        vendas.push(item)
        vendasTotalValor += item.valor
        vendasTotalQtd += item.qtd
      }
    }

    return {
      vendas,
      devolucoes,
      foraApuracao,
      vendasTotalValor,
      vendasTotalQtd,
      devolucoesTotalValor,
      devolucoesTotalQtd,
      foraTotalValor,
      foraTotalQtd,
    }
  }, [cfopsEmitidosResumo, effectiveCheckedCfops])

  const emitidasComp = useMemo(() => {
    const devolucoesQtd = kpis.emitidas_devolucoes_qtd ?? 0
    const saidasBrutasQtd = kpis.emitidas_saidas_brutas_qtd ?? Math.max(0, kpis.emitidas_qtd - devolucoesQtd)
    const devolucoesProd = kpis.emitidas_devolucoes_valor_produtos ?? 0
    const produtosAposDevol = kpis.emitidas_valor_produtos ?? kpis.emitidas_valor
    const saidasBrutasProd = kpis.emitidas_saidas_brutas_valor_produtos ?? (produtosAposDevol + devolucoesProd)
    const totalLiquidoNf = kpis.emitidas_valor ?? 0
    const descontosEmissao = kpis.emitidas_descontos_valor ?? Math.max(0, Number((produtosAposDevol - totalLiquidoNf).toFixed(2)))
    const devolucoesNfLiquida = kpis.emitidas_devolucoes_valor ?? 0
    const saidasBrutasNfLiquida = kpis.emitidas_saidas_brutas_valor ?? (totalLiquidoNf + devolucoesNfLiquida)
    const saidasBrutasDescontos = kpis.emitidas_saidas_brutas_descontos ?? Math.max(0, saidasBrutasProd - saidasBrutasNfLiquida)
    const devolucoesDescontos = kpis.emitidas_devolucoes_descontos ?? Math.max(0, devolucoesProd - devolucoesNfLiquida)
    return {
      saidasBrutasQtd,
      devolucoesQtd,
      saidasBrutasProd,
      devolucoesProd,
      produtosAposDevol,
      descontosEmissao,
      totalLiquidoNf,
      saidasBrutasNfLiquida,
      devolucoesNfLiquida,
      saidasBrutasDescontos,
      devolucoesDescontos,
    }
  }, [kpis])

  const saveCfopsProjectMutation = useMutation({
    mutationFn: async (cfopsToSave: string[] | null) => {
      const res = await api.put('/configuracoes/parametros', {
        cfops_faturamento: cfopsToSave,
      })
      return res.data
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['tenant-parametros', userKey], updated)
      queryClient.invalidateQueries({
        predicate: (q) => q.queryKey[0] !== 'tenant-parametros',
      })
      setCfopSaveMsg('Configuração de CFOPs salva no projeto.')
      setTimeout(() => setCfopSaveMsg(null), 4000)
    },
  })

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

  const selectedOperacaoLabel = useMemo(() => {
    if (selectedOperacao === 'todos') return ''
    if (selectedOperacao.startsWith('cfop:')) return `CFOP ${selectedOperacao.slice(5)}`
    if (selectedOperacao.startsWith('nat:')) return selectedOperacao.slice(4)
    return selectedOperacao
  }, [selectedOperacao])

  const handleSelectCfopCard = (cfopCode: string) => {
    const targetKey = `cfop:${cfopCode}`
    if (selectedOperacao === targetKey) {
      setSelectedOperacao('todos')
    } else {
      setActiveTab('SAIDA')
      setSelectedOperacao(targetKey)
      tabelaSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const toggleCfopDetailExpand = (cfopCode: string) => {
    setExpandedCfopDetails((prev) => ({ ...prev, [cfopCode]: !prev[cfopCode] }))
  }

  // Ordenação da listagem de documentos
  const displayedNotas = useMemo(() => {
    const raw = notasPage?.data || []
    return [...raw].sort((a, b) => {
      const dir = tableSortDir === 'asc' ? 1 : -1
      if (tableSortField === 'valor') {
        return (a.valor_total - b.valor_total) * dir
      }
      if (tableSortField === 'numero') {
        const numA = parseInt(String(a.numero_nota).replace(/\D/g, ''), 10) || 0
        const numB = parseInt(String(b.numero_nota).replace(/\D/g, ''), 10) || 0
        return (numA - numB) * dir
      }
      return String(a.data_emissao || '').localeCompare(String(b.data_emissao || '')) * dir
    })
  }, [notasPage?.data, tableSortField, tableSortDir])

  const handleSortToggle = (field: 'emissao' | 'numero' | 'valor') => {
    if (tableSortField === field) {
      setTableSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setTableSortField(field)
      setTableSortDir('desc')
    }
  }

  const handleCopyChave = (chave: string) => {
    navigator.clipboard?.writeText(chave.replace(/\s+/g, '')).catch(() => {})
    setCopiedKey(chave)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const handleExportCsv = () => {
    const rows = displayedNotas
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
      'Valor Produtos',
      'Valor Total NF',
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
        Number(r.valor_produtos ?? r.valor_total ?? 0).toFixed(2).replace('.', ','),
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

  const periodContextText = resumo?.period
    ? `${resumo.period.label} (${formatDate(resumo.period.start)} a ${formatDate(resumo.period.end)})`
    : 'Período selecionado'

  const renderCfopCard = (
    item: { cfop: string; natureza: string; qtd: number; valor_produtos: number; valor: number },
    category: 'VENDA' | 'DEVOLUCAO' | 'FORA',
    referenceTotal: number,
    referenceLabel: string
  ) => {
    const isChecked = effectiveCheckedCfops.includes(item.cfop)
    const isSelectedFilter = selectedOperacao === `cfop:${item.cfop}`
    const isDetailOpen = Boolean(expandedCfopDetails[item.cfop])
    const descontoVal = Math.max(0, item.valor_produtos - item.valor)
    const pct = referenceTotal > 0 ? (item.valor / referenceTotal) * 100 : 0

    return (
      <div
        key={item.cfop}
        onClick={() => handleSelectCfopCard(item.cfop)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') handleSelectCfopCard(item.cfop)
        }}
        className={clsx(
          'rounded-xl p-4 border transition-all cursor-pointer flex flex-col justify-between text-left bg-white dark:bg-slate-900',
          isSelectedFilter
            ? 'border-blue-600 dark:border-blue-500 ring-2 ring-blue-500/20 shadow-sm'
            : category === 'FORA'
              ? 'border-slate-200/80 dark:border-slate-800 opacity-75 hover:opacity-100 hover:border-slate-300'
              : 'border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs'
        )}
      >
        <div>
          {/* Topo do Card: Código CFOP em destaque + Classificação atual + Checkbox de apuração */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  toggleCfopCheck(item.cfop)
                }}
                className="inline-flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-blue-600 cursor-pointer"
                title={isChecked ? 'Desmarcar este CFOP da apuração' : 'Incluir este CFOP na apuração'}
                aria-label={`Alternar CFOP ${item.cfop} na apuração`}
              >
                {isChecked ? (
                  <CheckSquare size={16} className="text-blue-600 dark:text-blue-400" />
                ) : (
                  <Square size={16} className="text-slate-400" />
                )}
              </button>
              <span className="text-base font-extrabold font-mono text-slate-900 dark:text-white tracking-tight">
                CFOP {item.cfop}
              </span>
            </div>

            {category === 'VENDA' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold">
                <ArrowUpRight size={12} />
                Conta como venda
              </span>
            )}
            {category === 'DEVOLUCAO' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[11px] font-semibold">
                <ArrowDownLeft size={12} />
                Deduz como devolução
              </span>
            )}
            {category === 'FORA' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[11px] font-semibold">
                Fora da apuração
              </span>
            )}
          </div>

          {/* Nome / Natureza da Operação */}
          <p
            className="text-xs font-medium text-slate-600 dark:text-slate-400 mt-1.5 line-clamp-1"
            title={item.natureza}
          >
            {item.natureza}
          </p>

          {/* Valor Total Correspondente + Quantidade de Documentos */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-baseline justify-between gap-2">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                Valor Total NF
              </span>
              <span
                className={clsx(
                  'text-lg font-extrabold font-mono tabular-nums',
                  category === 'DEVOLUCAO'
                    ? 'text-rose-700 dark:text-rose-400'
                    : 'text-slate-900 dark:text-white'
                )}
              >
                {formatBRL(item.valor)}
              </span>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                Documentos
              </span>
              <span className="text-sm font-bold font-mono tabular-nums text-slate-800 dark:text-slate-200">
                {formatNum(item.qtd)} {item.qtd === 1 ? 'NF' : 'NFs'}
              </span>
            </div>
          </div>
        </div>

        {/* Rodapé do Card: Participação % + Botão de Detalhes Secundários */}
        <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/60 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>
              {referenceTotal > 0 ? `${pct.toFixed(1)}% ${referenceLabel}` : '0,0%'}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                toggleCfopDetailExpand(item.cfop)
              }}
              className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 inline-flex items-center gap-0.5 cursor-pointer"
            >
              <span>{isDetailOpen ? 'Ocultar cálculo' : 'Detalhes'}</span>
              {isDetailOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </div>

          {isDetailOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-2.5 text-[11px] space-y-1 border border-slate-200/60 dark:border-slate-700/60"
            >
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Produtos (tabela):</span>
                <span className="font-mono tabular-nums font-medium text-slate-800 dark:text-slate-200">
                  {formatBRL(item.valor_produtos)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Descontos/ajustes:</span>
                <span className="font-mono tabular-nums font-medium text-slate-700 dark:text-slate-300">
                  {descontoVal > 0.009 ? `− ${formatBRL(descontoVal)}` : 'R$ 0,00'}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/70 dark:border-slate-700">
                <span className="font-semibold text-slate-700 dark:text-slate-200">Total NF:</span>
                <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                  {formatBRL(item.valor)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-10">
      {/* =====================================================================
          1. CONTEXTO E FILTROS COMPACTOS
      ===================================================================== */}
      <section
        aria-label="Contexto e filtros fiscais"
        className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl px-4 py-3 shadow-2xs space-y-2.5"
      >
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2.5">
          <div className="min-w-0 overflow-x-auto">
            <PeriodFilter />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Alternador: Todos vs Somente c/ NF-e */}
            <div className="inline-flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-lg h-8">
              <button
                type="button"
                onClick={() => setApenasNfe(false)}
                className={clsx(
                  'px-2.5 h-full rounded-md text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap',
                  !apenasNfe
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                )}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setApenasNfe(true)}
                className={clsx(
                  'px-2.5 h-full rounded-md text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1 whitespace-nowrap',
                  apenasNfe
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                )}
              >
                <FileCheck2 size={12} />
                <span>Somente c/ NF-e</span>
              </button>
            </div>

            {/* Filtro por Natureza ou CFOP */}
            <div className="relative flex items-center">
              <Filter size={13} className="absolute left-2.5 text-slate-400 pointer-events-none" />
              <select
                value={selectedOperacao}
                onChange={(e) => setSelectedOperacao(e.target.value)}
                className="bi-select appearance-none pl-7 pr-7 max-w-[220px] truncate"
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
            <div className="relative flex-1 sm:flex-none sm:w-56 min-w-[180px]">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
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
              <RefreshCw size={13} className={clsx((loadingResumo || fetchingNotas) && 'animate-spin text-blue-600')} />
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={!displayedNotas.length}
              className="inline-flex items-center gap-1.5 h-8 px-3 bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
            >
              <Download size={13} />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* Linha de Contexto Ativo Discreta */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/70 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1">
              <Building2 size={12} className="text-slate-400" />
              Unidade: <strong className="text-slate-700 dark:text-slate-200">{activeBranchInfo.label}</strong>
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1">
              <Calendar size={12} className="text-slate-400" />
              Período: <strong className="text-slate-700 dark:text-slate-200">{periodContextText}</strong>
            </span>
            {selectedOperacao !== 'todos' && (
              <>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => setSelectedOperacao('todos')}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-semibold cursor-pointer"
                >
                  <span>Filtro ativo: {selectedOperacaoLabel}</span>
                  <X size={11} />
                </button>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowSecondaryMetrics((v) => !v)}
            className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 inline-flex items-center gap-1 cursor-pointer"
          >
            <span>{showSecondaryMetrics ? 'Ocultar métricas secundárias' : 'Ver entradas, descontos e saldo fiscal'}</span>
            {showSecondaryMetrics ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </section>

      {/* Tratamento de Erro */}
      {(errorResumo || errorNotas) && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs text-rose-900 dark:text-rose-200">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-rose-600 shrink-0" />
            <span>Não foi possível carregar os dados fiscais. Tente novamente.</span>
          </div>
          <button
            type="button"
            onClick={() => {
              refetchResumo()
              refetchNotas()
            }}
            className="px-3 py-1 rounded-lg bg-rose-600 text-white font-semibold cursor-pointer"
          >
            Recarregar
          </button>
        </div>
      )}

      {/* =====================================================================
          2. DOIS TOTAIS PRINCIPAIS: TOTAL DE VENDAS E TOTAL DE DEVOLUÇÕES
      ===================================================================== */}
      <section aria-label="Totais principais de vendas e devoluções" className="space-y-3">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Card Principal 1: TOTAL DE VENDAS */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Total de Vendas
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                  <ArrowUpRight size={14} />
                  Vendas líquidas apuradas
                </span>
              </div>

              <div className="mt-2 text-3xl sm:text-4xl font-extrabold font-mono tabular-nums text-slate-900 dark:text-white tracking-tight">
                {loadingResumo ? '...' : formatBRL(emitidasComp.totalLiquidoNf)}
              </div>

              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                Referente a <strong className="text-slate-700 dark:text-slate-300">{periodContextText}</strong> •{' '}
                <strong className="text-slate-700 dark:text-slate-300">{ activeBranchInfo.label }</strong>
              </p>
            </div>

            <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300">
              <span>
                Saídas brutas (CFOPs de venda):{' '}
                <strong className="font-mono tabular-nums text-slate-900 dark:text-white">
                  {formatBRL(emitidasComp.saidasBrutasNfLiquida)}
                </strong>{' '}
                ({formatNum(emitidasComp.saidasBrutasQtd)} NFs)
              </span>
              <span>
                Deduzido de devoluções:{' '}
                <strong className="font-mono tabular-nums text-rose-700 dark:text-rose-400">
                  {formatBRL(emitidasComp.devolucoesNfLiquida)}
                </strong>
              </span>
            </div>
          </div>

          {/* Card Principal 2: TOTAL DE DEVOLUÇÕES */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Total de Devoluções
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                  <ArrowDownLeft size={14} />
                  Dedução das vendas
                </span>
              </div>

              <div className="mt-2 text-3xl sm:text-4xl font-extrabold font-mono tabular-nums text-rose-700 dark:text-rose-400 tracking-tight">
                {loadingResumo ? '...' : formatBRL(emitidasComp.devolucoesNfLiquida)}
              </div>

              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                Valor deduzido do faturamento em <strong className="text-slate-700 dark:text-slate-300">{periodContextText}</strong>
              </p>
            </div>

            <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300">
              <span>
                Documentos de devolução:{' '}
                <strong className="font-mono tabular-nums text-slate-900 dark:text-white">
                  {formatNum(emitidasComp.devolucoesQtd)} {emitidasComp.devolucoesQtd === 1 ? 'NF' : 'NFs'}
                </strong>
              </span>
              <span>
                Valor dos produtos devolvidos:{' '}
                <strong className="font-mono tabular-nums text-slate-900 dark:text-white">
                  {formatBRL(emitidasComp.devolucoesProd)}
                </strong>
              </span>
            </div>
          </div>
        </div>

        {/* Detalhes Secundários Opcionais (Recolhidos por padrão para não competir com os 2 totais) */}
        {showSecondaryMetrics && (
          <div className="bg-slate-50/90 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                Produtos após Devoluções
              </span>
              <span className="text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-0.5 block">
                {formatBRL(emitidasComp.produtosAposDevol)}
              </span>
              <span className="text-[11px] text-slate-500">
                Saídas prod.: {formatBRL(emitidasComp.saidasBrutasProd)}
              </span>
            </div>

            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                Descontos / Ajustes na Emissão
              </span>
              <span className="text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-0.5 block">
                {formatBRL(emitidasComp.descontosEmissao)}
              </span>
              <span className="text-[11px] text-slate-500">
                Diferença entre tabela e NF líquida
              </span>
            </div>

            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                Notas de Entrada (Compras)
              </span>
              <span className="text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-0.5 block">
                {formatBRL(kpis.entradas_valor)}
              </span>
              <span className="text-[11px] text-slate-500">
                {formatNum(kpis.entradas_qtd)} documentos de entrada
              </span>
            </div>

            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                Saldo Fiscal (Saídas − Entradas)
              </span>
              <span className="text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-0.5 block">
                {formatBRL(kpis.saldo_fiscal)}
              </span>
              <span className="text-[11px] text-slate-500">
                {formatNum(kpis.total_documentos)} docs • {formatNum(kpis.emitidas_chave_qtd + kpis.entradas_chave_qtd)} chaves XML
              </span>
            </div>
          </div>
        )}
      </section>

      {/* =====================================================================
          3. RESUMO POR CFOP EM CARDS (DIVIDIDO EM VENDAS, DEVOLUÇÕES E FORA DA APURAÇÃO)
      ===================================================================== */}
      <section
        aria-label="Resumo por CFOP em cards"
        className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-5"
      >
        {/* Cabeçalho da Seção de CFOPs + Controles de Apuração Existentes */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3.5 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Resumo por CFOP
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Clique em um card para filtrar os documentos daquele CFOP abaixo, ou marque/desmarque os CFOPs que compõem a apuração.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setCheckedCfops(null)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Marcar Todos ({cfopsEmitidosResumo.length})
            </button>
            <button
              type="button"
              onClick={() => {
                const commercialAndReturnDefaults = [
                  '5101', '5102', '5117', '5401', '5403', '5405', '5922',
                  '6101', '6102', '6108', '6403', '6404',
                  '1201', '1202', '1411', '2201', '2202', '2411',
                ]
                const nonCommercialCfops = ['5949', '6949', '5910', '6910', '5151', '5152', '6151', '6152']
                const combined = Array.from(
                  new Set([
                    ...commercialAndReturnDefaults,
                    ...allHistoricalCfopCodes.filter((code) => !nonCommercialCfops.includes(code)),
                  ])
                )
                setCheckedCfops(combined)
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/70 hover:bg-blue-100 transition-colors cursor-pointer"
            >
              Vendas Líquidas (Sem 5949)
            </button>
            <button
              type="button"
              disabled={saveCfopsProjectMutation.isPending}
              onClick={() => {
                const isAll =
                  checkedCfops === null ||
                  (allHistoricalCfopCodes.length > 0 && allHistoricalCfopCodes.every((c) => effectiveCheckedCfops.includes(c)))
                saveCfopsProjectMutation.mutate(isAll ? null : effectiveCheckedCfops)
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer disabled:opacity-50"
            >
              <Save size={13} />
              <span>Salvar CFOPs no Projeto</span>
            </button>
          </div>
        </div>

        {cfopSaveMsg && (
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl px-3.5 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <Check size={14} className="text-emerald-600" />
            <span>{cfopSaveMsg}</span>
          </div>
        )}

        {cfopsEmitidosResumo.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            {loadingResumo ? 'Carregando resumo por CFOP...' : 'Nenhum CFOP emitido no período selecionado.'}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Grupo 1: CFOPs de Vendas */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                    Vendas ({cfopGroups.vendas.length} {cfopGroups.vendas.length === 1 ? 'CFOP' : 'CFOPs'})
                  </h3>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                  Soma de saídas brutas: <strong className="text-slate-900 dark:text-white">{formatBRL(cfopGroups.vendasTotalValor)}</strong> ({formatNum(cfopGroups.vendasTotalQtd)} NFs)
                </span>
              </div>

              {cfopGroups.vendas.length === 0 ? (
                <div className="text-xs text-slate-400 py-3 px-4 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                  Nenhum CFOP de venda selecionado no período.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                  {cfopGroups.vendas.map((item) =>
                    renderCfopCard(item, 'VENDA', cfopGroups.vendasTotalValor, 'das vendas brutas')
                  )}
                </div>
              )}
            </div>

            {/* Grupo 2: CFOPs de Devoluções */}
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                    Devoluções ({cfopGroups.devolucoes.length} {cfopGroups.devolucoes.length === 1 ? 'CFOP' : 'CFOPs'})
                  </h3>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                  Total deduzido: <strong className="text-rose-700 dark:text-rose-400">{formatBRL(cfopGroups.devolucoesTotalValor)}</strong> ({formatNum(cfopGroups.devolucoesTotalQtd)} NFs)
                </span>
              </div>

              {cfopGroups.devolucoes.length === 0 ? (
                <div className="text-xs text-slate-400 py-3 px-4 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                  Nenhuma devolução registrada para os CFOPs selecionados neste período.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                  {cfopGroups.devolucoes.map((item) =>
                    renderCfopCard(item, 'DEVOLUCAO', cfopGroups.devolucoesTotalValor, 'das devoluções')
                  )}
                </div>
              )}
            </div>

            {/* Grupo 3: Fora da Apuração (Exibido somente quando houver dados nessa categoria) */}
            {cfopGroups.foraApuracao.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                      Fora da Apuração / Não Contabilizados ({cfopGroups.foraApuracao.length})
                    </h3>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                    Ignorado nos totais: <strong className="text-slate-700 dark:text-slate-300">{formatBRL(cfopGroups.foraTotalValor)}</strong> ({formatNum(cfopGroups.foraTotalQtd)} NFs)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                  {cfopGroups.foraApuracao.map((item) =>
                    renderCfopCard(item, 'FORA', cfopGroups.foraTotalValor, 'dos não contabilizados')
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* =====================================================================
          4. PONTOS DE ATENÇÃO COMPACTOS (SOMENTE QUANDO EXIGIREM AÇÃO)
      ===================================================================== */}
      {apenasNfe && resumo && resumo.has_synced_nf === false && (
        <section
          aria-label="Ponto de atenção fiscal"
          className="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/70 rounded-xl px-4 py-3 text-xs text-amber-900 dark:text-amber-200"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={15} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="font-semibold">
                Proteção automática ativa: nenhuma chave NF-e sincronizada neste período (exibindo todos os documentos do ERP).
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setAlertExpanded((v) => !v)}
                className="font-semibold underline cursor-pointer"
              >
                {alertExpanded ? 'Ocultar detalhes' : 'Ler detalhes'}
              </button>
              <button
                type="button"
                onClick={() => setApenasNfe(false)}
                className="px-2.5 py-1 rounded-lg bg-amber-600 text-white font-semibold hover:bg-amber-500 cursor-pointer"
              >
                Mudar filtro para Todos
              </button>
            </div>
          </div>

          {alertExpanded && (
            <p className="mt-2 pt-2 border-t border-amber-200/60 dark:border-amber-800/50 text-amber-800 dark:text-amber-300 leading-relaxed">
              O filtro &ldquo;Somente c/ NF-e&rdquo; está selecionado, porém o agente de sincronização desta empresa ainda não enviou número ou chave de acesso NF-e para este período. Para evitar que a tela fique zerada, o sistema exibe automaticamente todos os registros faturados do ERP.
            </p>
          )}
        </section>
      )}

      {/* =====================================================================
          5. DOCUMENTOS E LANÇAMENTOS (DETALHAMENTO SECUNDÁRIO)
      ===================================================================== */}
      <section
        ref={tabelaSectionRef}
        aria-label="Documentos e lançamentos fiscais"
        className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden"
      >
        {/* Cabeçalho Enxuto da Tabela (Sem replicar todos os totais do topo) */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Documentos e Lançamentos
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {formatNum(notasPage?.total || 0)} documentos
            </span>

            {selectedOperacao !== 'todos' && (
              <button
                type="button"
                onClick={() => setSelectedOperacao('todos')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-600 text-white text-xs font-semibold cursor-pointer shadow-2xs"
                title="Remover filtro de CFOP / Natureza"
              >
                <span>Filtrado por: {selectedOperacaoLabel}</span>
                <X size={13} />
              </button>
            )}
          </div>

          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl gap-1 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab('SAIDA')}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                activeTab === 'SAIDA'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              <span>Notas Emitidas</span>
              <span className="text-[11px] opacity-75">({formatNum(kpis.emitidas_qtd)})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ENTRADA')}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                activeTab === 'ENTRADA'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              <span>Notas de Entrada</span>
              <span className="text-[11px] opacity-75">({formatNum(kpis.entradas_qtd)})</span>
            </button>
          </div>
        </div>

        {/* Tabela de Documentos */}
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="py-3 px-4">
                  <button
                    type="button"
                    onClick={() => handleSortToggle('numero')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  >
                    <span>Nota / Série</span>
                    <ArrowUpDown size={12} />
                  </button>
                </th>
                <th className="py-3 px-3">
                  <button
                    type="button"
                    onClick={() => handleSortToggle('emissao')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  >
                    <span>Emissão</span>
                    <ArrowUpDown size={12} />
                  </button>
                </th>
                <th className="py-3 px-3 min-w-[200px]">
                  {activeTab === 'SAIDA' ? 'Cliente / Destinatário' : 'Fornecedor / Emitente'}
                </th>
                <th className="py-3 px-3 min-w-[220px]">CFOP / Natureza da Operação</th>
                <th className="py-3 px-3">Classificação</th>
                <th className="py-3 px-3 hidden xl:table-cell">Chave NF-e</th>
                <th className="py-3 px-3 text-right">
                  <button
                    type="button"
                    onClick={() => handleSortToggle('valor')}
                    className="inline-flex items-center justify-end gap-1 ml-auto hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  >
                    <span>Valor Total NF</span>
                    <ArrowUpDown size={12} />
                  </button>
                </th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800 text-xs sm:text-[13px]">
              {loadingNotas ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td colSpan={8} className="py-4 px-4">
                      <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : !displayedNotas.length ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    Nenhum documento encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                displayedNotas.map((row) => {
                  const isDevolucaoRow = activeTab === 'SAIDA' && (row.cfop.startsWith('1') || row.cfop.startsWith('2'))
                  const statusUpper = String(row.status || '').toUpperCase()
                  const isCancelada = statusUpper.includes('CANCEL')
                  return (
                    <tr
                      key={`${row.origem}-${row.registro_id}`}
                      onClick={() => setSelectedNota({ origem: row.origem, id: row.registro_id })}
                      className="hover:bg-slate-50/90 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-bold font-mono text-slate-900 dark:text-white">
                            Nº {row.numero_nota}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium">
                            Série {row.serie}
                          </span>
                        </div>
                        {row.numero_pedido && row.numero_pedido !== '-' && (
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Pedido {row.numero_pedido}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap font-mono text-slate-700 dark:text-slate-300">
                        {formatDate(row.data_emissao)}
                      </td>

                      <td className="py-3 px-3 max-w-[260px]">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 truncate" title={row.parceiro_nome}>
                          {row.parceiro_nome}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {row.parceiro_documento}
                          {(row.cidade || row.uf) ? ` • ${row.cidade ? `${row.cidade}/${row.uf}` : row.uf}` : ''}
                        </div>
                      </td>

                      <td className="py-3 px-3 max-w-[280px]" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5 min-w-0">
                          {row.cfop && (
                            <button
                              type="button"
                              onClick={() => handleSelectCfopCard(row.cfop)}
                              className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-slate-800 dark:text-slate-200 hover:text-blue-700 font-mono font-bold text-[11px] shrink-0 cursor-pointer border border-slate-200/80 dark:border-slate-700"
                              title={`Filtrar pelo CFOP ${row.cfop}`}
                            >
                              {row.cfop}
                            </button>
                          )}
                          <span className="text-slate-600 dark:text-slate-300 truncate text-xs" title={row.natureza_operacao}>
                            {row.natureza_operacao}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        {isCancelada ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[11px] font-semibold">
                            <AlertTriangle size={12} />
                            Cancelada
                          </span>
                        ) : isDevolucaoRow ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[11px] font-semibold">
                            <ArrowDownLeft size={12} />
                            Devolução
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold">
                            <CheckCircle2 size={12} />
                            {activeTab === 'SAIDA' ? 'Venda' : 'Entrada'}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 hidden xl:table-cell whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
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

                      <td className="py-3 px-3 text-right whitespace-nowrap font-bold font-mono tabular-nums">
                        <span className={clsx(isDevolucaoRow ? 'text-rose-700 dark:text-rose-400' : 'text-slate-900 dark:text-white')}>
                          {formatBRL(row.valor_total)}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setSelectedNota({ origem: row.origem, id: row.registro_id })}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:bg-blue-600 group-hover:text-white hover:bg-blue-600 hover:text-white text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <Eye size={13} />
                          <span>{row.qtd_itens > 0 ? `Itens (${row.qtd_itens})` : 'Ver'}</span>
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {notasPage && notasPage.total > 0 && (
          <div className="px-4 sm:px-5 py-3 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
            <div>
              Página <strong className="text-slate-800 dark:text-slate-200">{notasPage.page}</strong> de{' '}
              <strong className="text-slate-800 dark:text-slate-200">{notasPage.total_pages}</strong> •{' '}
              <strong className="text-slate-800 dark:text-slate-200">{formatNum(notasPage.total)}</strong> documentos
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
      </section>

      {/* =====================================================================
          MODAL DE DETALHES E ITENS DA NOTA FISCAL
      ===================================================================== */}
      {selectedNota && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150"
          onClick={() => setSelectedNota(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-slate-700 dark:text-slate-200">
                  <FileText size={19} />
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

            <div className="p-5 overflow-y-auto space-y-5 flex-1">
              {loadingDetalhe || !detalheNota ? (
                <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400 text-sm">
                  <RefreshCw size={22} className="animate-spin text-blue-600" />
                  <span>Carregando itens e dados fiscais...</span>
                </div>
              ) : (
                <>
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
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-blue-500 cursor-pointer self-start sm:self-center shrink-0"
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

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-200/60 dark:border-slate-800">
                      <div className="text-[11px] text-slate-500">Valor dos Produtos</div>
                      <div className="text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-0.5">
                        {formatBRL(detalheNota.valor_produtos)}
                      </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-200/60 dark:border-slate-800">
                      <div className="text-[11px] text-slate-500">Frete</div>
                      <div className="text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-0.5">
                        {formatBRL(detalheNota.valor_frete)}
                      </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-200/60 dark:border-slate-800">
                      <div className="text-[11px] text-slate-500">Descontos</div>
                      <div className="text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-0.5">
                        {formatBRL(detalheNota.valor_desconto)}
                      </div>
                    </div>
                    <div className="bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl p-3 border border-emerald-200/70 dark:border-emerald-800/50">
                      <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold">Valor Total da Nota</div>
                      <div className="text-sm font-extrabold font-mono tabular-nums text-emerald-700 dark:text-emerald-300 mt-0.5">
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
                                <td className="py-2.5 px-3 font-mono text-slate-500">{it.codigo}</td>
                                <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-100">
                                  {it.descricao}
                                </td>
                                <td className="py-2.5 px-2 font-mono text-slate-500">{it.ncm || '—'}</td>
                                <td className="py-2.5 px-2 font-mono font-semibold text-slate-700 dark:text-slate-300">
                                  {it.cfop || '—'}
                                </td>
                                <td className="py-2.5 px-2 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                                  {formatNum(it.quantidade)} {it.unidade}
                                </td>
                                <td className="py-2.5 px-2 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                                  {formatBRL(it.valor_unitario)}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-slate-900 dark:text-white">
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
