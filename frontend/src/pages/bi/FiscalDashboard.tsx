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
  Scale,
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
  Layers,
  Calendar,
  ArrowUpDown,
  CheckCircle2,
  Info,
  CornerDownRight,
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
  const cfopSectionRef = useRef<HTMLDivElement | null>(null)

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
  const [checkedCfops, setCheckedCfops] = useState<string[] | null>(null)
  const [cfopSaveMsg, setCfopSaveMsg] = useState<string | null>(null)
  const [showCfopPanel, setShowCfopPanel] = useState(true)
  const [page, setPage] = useState(1)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [selectedNota, setSelectedNota] = useState<{ origem: 'cargas' | 'vendas'; id: number } | null>(null)

  // Controles locais de visualização da tabela (baseados apenas em campos já existentes)
  const [tableQuickFilter, setTableQuickFilter] = useState<'TODOS' | 'SAIDAS_NORMAIS' | 'DEVOLUCOES' | 'COM_CHAVE'>('TODOS')
  const [tableSortField, setTableSortField] = useState<'emissao' | 'numero' | 'valor'>('emissao')
  const [tableSortDir, setTableSortDir] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    if (tenantParams && tenantParams.somente_vendas_com_nf === true) {
      setApenasNfe(true)
    }
    if (tenantParams && Array.isArray(tenantParams.cfops_faturamento) && tenantParams.cfops_faturamento.length > 0 && checkedCfops === null) {
      setCheckedCfops(tenantParams.cfops_faturamento)
    }
  }, [tenantParams?.somente_vendas_com_nf, tenantParams?.cfops_faturamento])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim())
      setPage(1)
    }, 350)
    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    setPage(1)
    setTableQuickFilter('TODOS')
  }, [activeTab, apenasNfe, selectedOperacao, checkedCfops, periodState.period, periodState.startDate, periodState.endDate, branchParam.depto_id])

  const activeBranchInfo = useMemo(() => {
    if (selectedBranch === 'todas') {
      return {
        label: filiais.length > 1 ? `Todas as Filiais (${filiais.length} unidades)` : 'Todas as Filiais',
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
    if (checkedCfops !== null) {
      p.cfops = checkedCfops.length > 0 ? checkedCfops.join(',') : 'nenhum'
    } else {
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

  const effectiveCheckedCfops = useMemo(
    () => (checkedCfops !== null ? checkedCfops : allHistoricalCfopCodes),
    [checkedCfops, allHistoricalCfopCodes]
  )

  const toggleCfopCheck = (code: string) => {
    const current = checkedCfops !== null ? checkedCfops : allHistoricalCfopCodes
    const next = current.includes(code)
      ? current.filter((c) => c !== code)
      : [...current, code]
    setCheckedCfops(next.length >= allHistoricalCfopCodes.length && allHistoricalCfopCodes.every((c) => next.includes(c)) ? null : next)
  }

  const cfopTotals = useMemo(() => {
    let totalQtd = 0
    let totalProd = 0
    let totalNf = 0
    let checkedQtd = 0
    let checkedSaidaQtd = 0
    let checkedDevolQtd = 0
    let checkedSaidaProd = 0
    let checkedSaidaNf = 0
    let checkedDevolProd = 0
    let checkedDevolNf = 0
    let checkedProd = 0
    let checkedNf = 0
    let checkedNetProd = 0
    let checkedNetNf = 0
    let uncheckedQtd = 0
    let uncheckedNf = 0
    const uncheckedCfopCodes: string[] = []
    const devolucaoCfopCodes: string[] = []

    for (const item of cfopsEmitidosResumo) {
      const isDevolucao = item.cfop.startsWith('1') || item.cfop.startsWith('2')
      if (isDevolucao) devolucaoCfopCodes.push(item.cfop)
      totalQtd += item.qtd
      totalProd += isDevolucao ? -item.valor_produtos : item.valor_produtos
      totalNf += isDevolucao ? -item.valor : item.valor
      if (effectiveCheckedCfops.includes(item.cfop)) {
        checkedQtd += item.qtd
        checkedProd += item.valor_produtos
        checkedNf += item.valor
        if (isDevolucao) {
          checkedDevolQtd += item.qtd
          checkedDevolProd += item.valor_produtos
          checkedDevolNf += item.valor
          checkedNetProd -= item.valor_produtos
          checkedNetNf -= item.valor
        } else {
          checkedSaidaQtd += item.qtd
          checkedSaidaProd += item.valor_produtos
          checkedSaidaNf += item.valor
          checkedNetProd += item.valor_produtos
          checkedNetNf += item.valor
        }
      } else {
        uncheckedQtd += item.qtd
        uncheckedNf += item.valor
        uncheckedCfopCodes.push(item.cfop)
      }
    }
    const checkedDesc = Math.max(0, checkedProd - checkedNf)
    const checkedSaidaDesc = Math.max(0, checkedSaidaProd - checkedSaidaNf)
    const checkedDevolDesc = Math.max(0, checkedDevolProd - checkedDevolNf)
    const checkedNetDesc = Math.max(0, checkedNetProd - checkedNetNf)
    return {
      totalQtd,
      totalProd,
      totalNf,
      checkedQtd,
      checkedSaidaQtd,
      checkedDevolQtd,
      checkedSaidaProd,
      checkedSaidaDesc,
      checkedSaidaNf,
      checkedDevolProd,
      checkedDevolDesc,
      checkedDevolNf,
      checkedProd,
      checkedDesc,
      checkedNf,
      checkedNetProd,
      checkedNetDesc,
      checkedNetNf,
      uncheckedQtd,
      uncheckedNf,
      uncheckedCfopCodes,
      devolucaoCfopCodes,
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
    const pctDescontoMedio = saidasBrutasProd > 0 ? (descontosEmissao / saidasBrutasProd) * 100 : 0
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
      pctDescontoMedio,
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
      setCfopSaveMsg('Configuração de CFOPs salva como padrão do projeto.')
      setTimeout(() => setCfopSaveMsg(null), 5000)
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

  // Situações reais que exigem atenção (baseadas exclusivamente nos dados existentes)
  const attentionItems = useMemo(() => {
    const list: Array<{
      id: string
      priority: 'alta' | 'media' | 'info'
      badgeLabel: string
      title: string
      description: string
      affectedCount?: string
      relatedValue?: string
      actionLabel: string
      onAction: () => void
    }> = []

    if (apenasNfe && resumo && resumo.has_synced_nf === false) {
      list.push({
        id: 'sync-nfe-fallback',
        priority: 'alta',
        badgeLabel: 'Atenção • Sincronização NF-e',
        title: 'Ausência de chaves NF-e / XML sincronizadas neste período',
        description:
          'O SyncAgent desta empresa ainda não enviou número/chave de NF-e para o período. O sistema ativou a proteção automática e está exibindo todos os documentos do ERP.',
        affectedCount: `${formatNum(kpis.total_documentos)} registros exibidos`,
        actionLabel: 'Alternar filtro para Todos',
        onAction: () => setApenasNfe(false),
      })
    }

    if (emitidasComp.devolucoesQtd > 0) {
      const firstReturnCfop = cfopTotals.devolucaoCfopCodes[0]
      list.push({
        id: 'devolucoes-periodo',
        priority: 'alta',
        badgeLabel: 'Dedução Fiscal • Devoluções',
        title: 'Notas fiscais de devolução deduzidas do faturamento emitido',
        description:
          'Existem notas de entrada por devolução (CFOPs iniciados em 1 ou 2) abatendo o total de produtos e o valor líquido emitido no período.',
        affectedCount: `${formatNum(emitidasComp.devolucoesQtd)} NF(s) de devolução`,
        relatedValue: `− ${formatBRL(emitidasComp.devolucoesNfLiquida)} (Prod.: − ${formatBRL(emitidasComp.devolucoesProd)})`,
        actionLabel: firstReturnCfop ? `Investigar CFOP ${firstReturnCfop}` : 'Ver devoluções na tabela',
        onAction: () => {
          setActiveTab('SAIDA')
          if (firstReturnCfop && cfopTotals.devolucaoCfopCodes.length === 1) {
            setSelectedOperacao(`cfop:${firstReturnCfop}`)
          } else {
            setTableQuickFilter('DEVOLUCOES')
          }
          tabelaSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        },
      })
    }

    if (cfopTotals.uncheckedQtd > 0) {
      const firstUnchecked = cfopTotals.uncheckedCfopCodes[0]
      list.push({
        id: 'cfops-desmarcados',
        priority: 'info',
        badgeLabel: 'Regra de Contabilização • CFOP',
        title: `CFOPs desmarcados da apuração líquida (${cfopTotals.uncheckedCfopCodes.join(', ')})`,
        description:
          'Documentos com CFOPs desmarcados (como transferências entre filiais ou simples remessas) não compõem o total líquido dos indicadores acima.',
        affectedCount: `${formatNum(cfopTotals.uncheckedQtd)} NF(s) fora da soma`,
        relatedValue: formatBRL(cfopTotals.uncheckedNf),
        actionLabel: firstUnchecked ? `Revisar CFOP ${firstUnchecked}` : 'Revisar CFOPs',
        onAction: () => {
          setShowCfopPanel(true)
          cfopSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        },
      })
    }

    return list
  }, [apenasNfe, resumo, kpis.total_documentos, emitidasComp, cfopTotals])

  // Filtragem e ordenação da página atual da tabela
  const displayedNotas = useMemo(() => {
    const raw = notasPage?.data || []
    let filtered = raw

    if (tableQuickFilter === 'DEVOLUCOES') {
      filtered = raw.filter((r) => r.cfop.startsWith('1') || r.cfop.startsWith('2'))
    } else if (tableQuickFilter === 'SAIDAS_NORMAIS') {
      filtered = raw.filter((r) => !r.cfop.startsWith('1') && !r.cfop.startsWith('2'))
    } else if (tableQuickFilter === 'COM_CHAVE') {
      filtered = raw.filter((r) => Boolean(r.chave_nfe))
    }

    return [...filtered].sort((a, b) => {
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
  }, [notasPage?.data, tableQuickFilter, tableSortField, tableSortDir])

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

  const hasActiveFilters =
    selectedOperacao !== 'todos' ||
    Boolean(debouncedSearch) ||
    checkedCfops !== null ||
    tableQuickFilter !== 'TODOS'

  return (
    <div className="space-y-5 pb-10">
      {/* =====================================================================
          1. CABEÇALHO DA ÁREA FISCAL (CONTEXTO + FILTROS ORGANIZADOS)
      ===================================================================== */}
      <section
        aria-label="Cabeçalho e contexto fiscal"
        className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4"
      >
        {/* Linha 1: Título, descrição curta, contexto ativo e ações utilitárias */}
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 pb-3.5 border-b border-slate-100 dark:border-slate-800/80">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Escrituração e Resumo Fiscal
              </h1>
              <span
                className={clsx(
                  'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border',
                  apenasNfe
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/70'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                )}
              >
                <FileCheck2 size={13} />
                <span>{apenasNfe ? 'Modo Fiscal (Somente c/ NF-e)' : 'Modo Gerencial (Todos os Documentos)'}</span>
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Visão consolidada de notas fiscais emitidas, entradas, deduções de devolução e consulta individual de documentos.
            </p>

            {/* Pílulas de Contexto Ativo (Empresa/Filial + Período + CFOPs) */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 font-medium">
                <Building2 size={13} className="text-slate-500 dark:text-slate-400 shrink-0" />
                <span>Unidade:</span>
                <strong className="font-semibold text-slate-900 dark:text-white">{activeBranchInfo.label}</strong>
                {activeBranchInfo.documento && (
                  <span className="font-mono text-[11px] text-slate-500">({activeBranchInfo.documento})</span>
                )}
              </div>

              {resumo?.period && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 font-medium">
                  <Calendar size={13} className="text-slate-500 dark:text-slate-400 shrink-0" />
                  <span>Período:</span>
                  <strong className="font-semibold text-slate-900 dark:text-white">{resumo.period.label}</strong>
                  <span className="text-slate-500 dark:text-slate-400">
                    ({formatDate(resumo.period.start)} a {formatDate(resumo.period.end)})
                  </span>
                </div>
              )}

              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 font-medium">
                <Layers size={13} className="text-slate-500 dark:text-slate-400 shrink-0" />
                <span>CFOPs somados:</span>
                <strong className="font-semibold text-slate-900 dark:text-white">
                  {cfopsEmitidosResumo.filter((c) => effectiveCheckedCfops.includes(c.cfop)).length} de {cfopsEmitidosResumo.length}
                </strong>
              </div>
            </div>
          </div>

          {/* Ações utilitárias secundárias */}
          <div className="flex items-center gap-2 shrink-0 self-start">
            <button
              type="button"
              onClick={() => {
                refetchResumo()
                refetchNotas()
              }}
              className="inline-flex items-center gap-1.5 h-9 px-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              title="Recarregar resumo e listagem de notas"
            >
              <RefreshCw size={14} className={clsx((loadingResumo || fetchingNotas) && 'animate-spin text-blue-600')} />
              <span>Atualizar</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={!displayedNotas.length}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
              title="Exportar registros exibidos na tabela para CSV"
            >
              <Download size={14} />
              <span>Exportar CSV</span>
            </button>
          </div>
        </div>

        {/* Linha 2: Barra de Filtros Compacta */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="min-w-0 overflow-x-auto">
            <PeriodFilter />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Alternador: Todos vs Somente c/ NF-e */}
            <div
              role="group"
              aria-label="Filtro de tipo de documento"
              className="inline-flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl h-9"
            >
              <button
                type="button"
                onClick={() => setApenasNfe(false)}
                className={clsx(
                  'px-3 h-full rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap',
                  !apenasNfe
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                )}
                title="Exibe todas as vendas faturadas e notas de entrada sincronizadas do ERP"
              >
                Todos os Docs
              </button>
              <button
                type="button"
                onClick={() => setApenasNfe(true)}
                className={clsx(
                  'px-3 h-full rounded-lg text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap',
                  apenasNfe
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                )}
                title="Filtra exclusivamente documentos com número ou chave NF-e / XML vinculado"
              >
                <FileCheck2 size={13} />
                <span>Somente c/ NF-e</span>
              </button>
            </div>

            {/* Seletor de Natureza de Operação / CFOP */}
            <div className="relative flex items-center">
              <Filter size={13} className="absolute left-3 text-slate-400 pointer-events-none" />
              <select
                value={selectedOperacao}
                onChange={(e) => setSelectedOperacao(e.target.value)}
                className="h-9 pl-8 pr-8 bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 appearance-none max-w-[260px] truncate outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer"
                aria-label="Filtrar por Natureza de Operação ou CFOP"
              >
                <option value="todos">Todas as Naturezas e CFOPs</option>
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
              <ChevronDown size={13} className="absolute right-2.5 text-slate-400 pointer-events-none" />
            </div>

            {/* Busca por documento, pedido, chave ou parceiro */}
            <div className="relative flex-1 sm:flex-none sm:w-64 min-w-[210px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Buscar Nº nota, pedido, chave ou cliente..."
                className="w-full h-9 pl-8 pr-7 bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500/30"
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

            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setSelectedOperacao('todos')
                  setSearchInput('')
                  setDebouncedSearch('')
                  setTableQuickFilter('TODOS')
                }}
                className="inline-flex items-center gap-1 h-9 px-3 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <X size={13} />
                <span>Limpar filtros</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Tratamento de Erro de Carregamento */}
      {(errorResumo || errorNotas) && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs sm:text-sm text-rose-900 dark:text-rose-200">
          <div className="flex items-center gap-2.5">
            <AlertTriangle size={18} className="text-rose-600 dark:text-rose-400 shrink-0" />
            <span>
              Não foi possível carregar todos os dados fiscais no momento. Verifique sua conexão e tente novamente.
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              refetchResumo()
              refetchNotas()
            }}
            className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-semibold text-xs hover:bg-rose-500 cursor-pointer shrink-0"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* =====================================================================
          2. RESUMO DOS INDICADORES PRINCIPAIS (4 CARTÕES EXECUTIVOS)
      ===================================================================== */}
      <section aria-label="Resumo dos indicadores fiscais" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Cartão 1: Notas Fiscais Emitidas (Saídas Líquidas + Memória de Cálculo) */}
        <div
          onClick={() => {
            setActiveTab('SAIDA')
            tabelaSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setActiveTab('SAIDA')
          }}
          className={clsx(
            'bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border transition-all cursor-pointer flex flex-col justify-between min-w-0',
            activeTab === 'SAIDA'
              ? 'border-slate-900 dark:border-blue-500 ring-1 ring-slate-900/10 dark:ring-blue-500/20 shadow-sm'
              : 'border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
          )}
        >
          <div>
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Notas Fiscais Emitidas
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Total NF líquido emitido no período
                </span>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold shrink-0">
                <ArrowUpRight size={13} />
                Saídas
              </span>
            </div>

            <div className="mt-2.5 text-2xl sm:text-[26px] font-extrabold font-mono tabular-nums text-slate-900 dark:text-white tracking-tight">
              {loadingResumo ? '...' : formatBRL(emitidasComp.totalLiquidoNf)}
            </div>

            {/* Composição Contábil Vertical Limpa */}
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-slate-600 dark:text-slate-400">Saídas — produtos brutos:</span>
                <span className="font-mono tabular-nums font-medium text-slate-800 dark:text-slate-200">
                  {loadingResumo ? '...' : `+ ${formatBRL(emitidasComp.saidasBrutasProd)}`}
                </span>
              </div>

              <div className="flex items-baseline justify-between gap-2">
                <span className="text-slate-600 dark:text-slate-400">Devoluções — valor dos produtos:</span>
                <span className="font-mono tabular-nums font-medium text-rose-700 dark:text-rose-400">
                  {loadingResumo ? '...' : `− ${formatBRL(emitidasComp.devolucoesProd)}`}
                </span>
              </div>

              <div className="flex items-baseline justify-between gap-2 pt-1 border-t border-dashed border-slate-200 dark:border-slate-800">
                <span className="font-medium text-slate-700 dark:text-slate-300">Produtos após devoluções:</span>
                <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-white">
                  {loadingResumo ? '...' : formatBRL(emitidasComp.produtosAposDevol)}
                </span>
              </div>

              <div className="flex items-baseline justify-between gap-2">
                <span className="text-slate-600 dark:text-slate-400">Descontos/ajustes na emissão:</span>
                <span className="font-mono tabular-nums font-medium text-slate-700 dark:text-slate-300">
                  {loadingResumo ? '...' : `− ${formatBRL(emitidasComp.descontosEmissao)}`}
                </span>
              </div>

              <div className="flex items-baseline justify-between gap-2 pt-1 border-t border-slate-200 dark:border-slate-800">
                <span className="font-bold text-slate-900 dark:text-white">Total NF líquido emitido:</span>
                <span className="font-mono tabular-nums font-bold text-emerald-700 dark:text-emerald-400">
                  {loadingResumo ? '...' : formatBRL(emitidasComp.totalLiquidoNf)}
                </span>
              </div>

              {emitidasComp.devolucoesQtd > 0 && (
                <div className="flex items-baseline justify-between gap-2 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <span>Valor líquido da NF de devolução ({formatNum(emitidasComp.devolucoesQtd)}):</span>
                  <span className="font-mono tabular-nums font-semibold text-rose-700 dark:text-rose-400">
                    − {formatBRL(emitidasComp.devolucoesNfLiquida)}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>
              <strong className="text-slate-800 dark:text-slate-200">{formatNum(kpis.emitidas_qtd)}</strong> NFs (
              {formatNum(emitidasComp.saidasBrutasQtd)} saídas
              {emitidasComp.devolucoesQtd > 0 ? ` • ${formatNum(emitidasComp.devolucoesQtd)} devol.` : ''})
            </span>
            <span className="font-mono tabular-nums">Ticket: {formatBRL(kpis.emitidas_ticket_medio)}</span>
          </div>
        </div>

        {/* Cartão 2: Notas de Entrada */}
        <div
          onClick={() => {
            setActiveTab('ENTRADA')
            tabelaSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setActiveTab('ENTRADA')
          }}
          className={clsx(
            'bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border transition-all cursor-pointer flex flex-col justify-between min-w-0',
            activeTab === 'ENTRADA'
              ? 'border-slate-900 dark:border-blue-500 ring-1 ring-slate-900/10 dark:ring-blue-500/20 shadow-sm'
              : 'border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
          )}
        >
          <div>
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Notas de Entrada
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Compras e aquisições registradas no ERP
                </span>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[11px] font-semibold shrink-0">
                <ArrowDownLeft size={13} />
                Entradas
              </span>
            </div>

            <div className="mt-2.5 text-2xl sm:text-[26px] font-extrabold font-mono tabular-nums text-slate-900 dark:text-white tracking-tight">
              {loadingResumo ? '...' : formatBRL(kpis.entradas_valor)}
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-slate-600 dark:text-slate-400">Documentos de entrada:</span>
                <span className="font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-200">
                  {formatNum(kpis.entradas_qtd)} NFs
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-slate-600 dark:text-slate-400">Valor dos produtos (entradas):</span>
                <span className="font-mono tabular-nums font-medium text-slate-800 dark:text-slate-200">
                  {formatBRL(kpis.entradas_valor_produtos ?? kpis.entradas_valor)}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-slate-600 dark:text-slate-400">Chaves NF-e vinculadas:</span>
                <span className="font-mono tabular-nums font-medium text-slate-800 dark:text-slate-200">
                  {formatNum(kpis.entradas_chave_qtd)} chaves
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Clique para listar as entradas</span>
            <span className="font-mono tabular-nums">Média: {formatBRL(kpis.entradas_ticket_medio)}</span>
          </div>
        </div>

        {/* Cartão 3: Saldo Fiscal (Saídas − Entradas) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Saldo Fiscal do Período
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Diferença entre saídas líquidas e entradas
                </span>
              </div>
              <span
                className={clsx(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold shrink-0',
                  kpis.saldo_fiscal >= 0
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                    : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                )}
              >
                <Scale size={13} />
                {kpis.saldo_fiscal >= 0 ? 'Superávit' : 'Déficit'}
              </span>
            </div>

            <div className="mt-2.5 text-2xl sm:text-[26px] font-extrabold font-mono tabular-nums text-slate-900 dark:text-white tracking-tight">
              {loadingResumo ? '...' : formatBRL(kpis.saldo_fiscal)}
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-slate-600 dark:text-slate-400">Total NF líquido emitido (+):</span>
                <span className="font-mono tabular-nums font-medium text-slate-800 dark:text-slate-200">
                  {formatBRL(emitidasComp.totalLiquidoNf)}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-slate-600 dark:text-slate-400">Total notas de entrada (−):</span>
                <span className="font-mono tabular-nums font-medium text-slate-800 dark:text-slate-200">
                  {formatBRL(kpis.entradas_valor)}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-slate-600 dark:text-slate-400">Situação do saldo:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {kpis.saldo_fiscal >= 0 ? 'Saídas superam entradas' : 'Entradas superam saídas'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Total: {formatNum(kpis.total_documentos)} docs</span>
            <span>Chaves XML: {formatNum(kpis.emitidas_chave_qtd + kpis.entradas_chave_qtd)}</span>
          </div>
        </div>

        {/* Cartão 4: Descontos na Emissão e Principais Naturezas */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Descontos / Ajustes na Emissão
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Diferença entre valor de tabela e NF líquida
                </span>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold shrink-0">
                {emitidasComp.pctDescontoMedio.toFixed(1)}% s/ bruto
              </span>
            </div>

            <div className="mt-2.5 text-2xl sm:text-[26px] font-extrabold font-mono tabular-nums text-slate-900 dark:text-white tracking-tight">
              {loadingResumo ? '...' : formatBRL(emitidasComp.descontosEmissao)}
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Principais operações ({activeTab === 'SAIDA' ? 'Saída' : 'Entrada'}) — clique p/ filtrar:
              </div>
              {topOperacoesTab.length === 0 ? (
                <div className="text-xs text-slate-400 py-1">Nenhuma operação registrada no período.</div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
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
                        {item.shortLabel} <span className="opacity-75">({formatNum(item.qtd)})</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Produtos líq.: {formatBRL(emitidasComp.produtosAposDevol)}</span>
            <button
              type="button"
              onClick={() => {
                setShowCfopPanel(true)
                cfopSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
              className="font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              Configurar CFOPs
            </button>
          </div>
        </div>
      </section>

      {/* =====================================================================
          3. ALERTAS E ITENS QUE EXIGEM ATENÇÃO (EXIBIDO APENAS SE EXISTIREM)
      ===================================================================== */}
      {attentionItems.length > 0 && (
        <section
          aria-label="Alertas e itens que exigem atenção"
          className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Pontos de Atenção e Deduções no Período ({attentionItems.length})
              </h2>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
              Itens identificados automaticamente nas notas e regras de CFOP
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {attentionItems.map((alert) => (
              <div
                key={alert.id}
                className={clsx(
                  'rounded-xl p-3.5 border flex flex-col sm:flex-row sm:items-center justify-between gap-3',
                  alert.priority === 'alta'
                    ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/90 dark:border-amber-800/60'
                    : 'bg-slate-50/80 dark:bg-slate-800/40 border-slate-200/90 dark:border-slate-700/70'
                )}
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={clsx(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wide',
                        alert.priority === 'alta'
                          ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                      )}
                    >
                      {alert.priority === 'alta' ? <AlertTriangle size={11} /> : <Info size={11} />}
                      {alert.badgeLabel}
                    </span>
                    {alert.affectedCount && (
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        • {alert.affectedCount}
                      </span>
                    )}
                    {alert.relatedValue && (
                      <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                        • {alert.relatedValue}
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">{alert.title}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{alert.description}</p>
                </div>

                <button
                  type="button"
                  onClick={alert.onAction}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 shrink-0 self-start sm:self-center cursor-pointer shadow-2xs"
                >
                  <CornerDownRight size={13} />
                  <span>{alert.actionLabel}</span>
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* =====================================================================
          3B. APURAÇÃO E SELEÇÃO DINÂMICA POR CFOP (RECOLHÍVEL E ORGANIZADA)
      ===================================================================== */}
      <section
        ref={cfopSectionRef}
        aria-label="Apuração emitida por CFOP"
        className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden"
      >
        <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => setShowCfopPanel((v) => !v)}
              className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center shrink-0 mt-0.5 text-slate-700 dark:text-slate-200 cursor-pointer"
              aria-label={showCfopPanel ? 'Recolher tabela de CFOPs' : 'Expandir tabela de CFOPs'}
            >
              {showCfopPanel ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
            </button>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Apuração Emitida por CFOP — Seleção de Contabilização
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {formatNum(cfopTotals.checkedQtd)} de {formatNum(cfopTotals.totalQtd)} NFs somadas
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Marque quais CFOPs entram no cálculo de vendas líquidas e salve a regra padrão para todo o sistema.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setCheckedCfops(null)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
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
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/70 hover:bg-blue-100 transition-colors cursor-pointer"
            >
              Padrão Vendas Líquidas (Sem 5949)
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
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Save size={13} />
              <span>Salvar CFOPs no Projeto</span>
            </button>
          </div>
        </div>

        {cfopSaveMsg && (
          <div className="mx-4 sm:mx-5 mt-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl px-3.5 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <Check size={14} className="text-emerald-600" />
            <span>{cfopSaveMsg}</span>
          </div>
        )}

        {showCfopPanel && (
          <div className="p-4 sm:p-5 space-y-4">
            {/* Tabela Limpa de CFOPs Emitidos */}
            <div className="overflow-x-auto border border-slate-200/80 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="py-2.5 px-3 w-12 text-center">Somar</th>
                    <th className="py-2.5 px-3 w-20">CFOP</th>
                    <th className="py-2.5 px-3">Natureza de Operação</th>
                    <th className="py-2.5 px-3 w-36">Papel no Cálculo</th>
                    <th className="py-2.5 px-3 text-right">Qtd. Notas</th>
                    <th className="py-2.5 px-3 text-right">Valor Produtos</th>
                    <th className="py-2.5 px-3 text-right">Desconto / Ajuste</th>
                    <th className="py-2.5 px-3 text-right">Valor Total NF</th>
                    <th className="py-2.5 px-3 text-right w-20">% Part.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/70">
                  {cfopsEmitidosResumo.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-6 text-center text-slate-400">
                        {loadingResumo ? 'Carregando resumo por CFOP...' : 'Nenhum CFOP emitido no período selecionado.'}
                      </td>
                    </tr>
                  ) : (
                    cfopsEmitidosResumo.map((item) => {
                      const isChecked = effectiveCheckedCfops.includes(item.cfop)
                      const isDevolucao = item.cfop.startsWith('1') || item.cfop.startsWith('2')
                      const pct = cfopTotals.totalNf > 0 ? ((isDevolucao ? -item.valor : item.valor) / cfopTotals.totalNf) * 100 : 0
                      const descontoItem = Math.max(0, item.valor_produtos - item.valor)
                      const descPct = item.valor_produtos > 0 ? (descontoItem / item.valor_produtos) * 100 : 0
                      return (
                        <tr
                          key={item.cfop}
                          onClick={() => toggleCfopCheck(item.cfop)}
                          className={clsx(
                            'transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50',
                            !isChecked && 'opacity-60 bg-slate-50/40 dark:bg-slate-900/40'
                          )}
                        >
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleCfopCheck(item.cfop)
                              }}
                              className="inline-flex items-center justify-center text-slate-700 dark:text-slate-200"
                              aria-label={`Alternar contabilização do CFOP ${item.cfop}`}
                            >
                              {isChecked ? (
                                <CheckSquare size={16} className="text-blue-600 dark:text-blue-400" />
                              ) : (
                                <Square size={16} className="text-slate-400" />
                              )}
                            </button>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white">
                            {item.cfop}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200 max-w-[340px]" title={item.natureza}>
                            <span className="block truncate">{item.natureza}</span>
                          </td>
                          <td className="py-2.5 px-3">
                            {!isChecked ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[11px] font-semibold">
                                Ignorado na soma
                              </span>
                            ) : isDevolucao ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[11px] font-semibold">
                                <ArrowDownLeft size={12} />
                                Devolução (Deduz)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold">
                                <ArrowUpRight size={12} />
                                Saída (Soma)
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-700 dark:text-slate-300">
                            {formatNum(item.qtd)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                            {isDevolucao ? `− ${formatBRL(item.valor_produtos)}` : formatBRL(item.valor_produtos)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400">
                            {descontoItem > 0.009 ? (
                              <span>
                                − {formatBRL(descontoItem)}{' '}
                                <span className="text-[10px] text-slate-400">({descPct.toFixed(1)}%)</span>
                              </span>
                            ) : (
                              <span className="text-slate-400">R$ 0,00</span>
                            )}
                          </td>
                          <td
                            className={clsx(
                              'py-2.5 px-3 text-right font-mono tabular-nums font-bold',
                              isDevolucao ? 'text-rose-700 dark:text-rose-400' : 'text-slate-900 dark:text-white'
                            )}
                          >
                            {isDevolucao ? `− ${formatBRL(item.valor)}` : formatBRL(item.valor)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[11px] text-slate-500">
                            {pct.toFixed(1)}%
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
                {cfopsEmitidosResumo.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-50/90 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 font-mono text-xs font-bold text-slate-900 dark:text-white">
                      <td colSpan={4} className="py-2.5 px-3 font-sans font-bold text-slate-700 dark:text-slate-200">
                        Total Contabilizado nos CFOPs Marcados ({formatNum(cfopTotals.checkedSaidaQtd)} saídas
                        {cfopTotals.checkedDevolQtd > 0 ? ` − ${formatNum(cfopTotals.checkedDevolQtd)} devoluções` : ''})
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums">{formatNum(cfopTotals.checkedQtd)}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums">{formatBRL(cfopTotals.checkedNetProd)}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-slate-600 dark:text-slate-300">
                        − {formatBRL(cfopTotals.checkedNetDesc)}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-emerald-700 dark:text-emerald-400">
                        {formatBRL(cfopTotals.checkedNetNf)}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums">100%</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}
      </section>

      {/* =====================================================================
          4. TABELA DE DOCUMENTOS E LANÇAMENTOS FISCAIS
      ===================================================================== */}
      <section
        ref={tabelaSectionRef}
        aria-label="Tabela de documentos fiscais"
        className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden"
      >
        {/* Cabeçalho da Seção da Tabela */}
        <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Documentos e Lançamentos Fiscais
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                  {formatNum(notasPage?.total || 0)} registros
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Clique em qualquer linha ou no botão &ldquo;Detalhes&rdquo; para abrir o espelho da nota fiscal e seus itens.
              </p>
            </div>

            {/* Alternador de Aba: Saídas vs Entradas */}
            <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl gap-1 self-start">
              <button
                type="button"
                onClick={() => setActiveTab('SAIDA')}
                className={clsx(
                  'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                  activeTab === 'SAIDA'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                )}
              >
                <ArrowUpRight size={14} className="text-emerald-600" />
                <span>Notas Emitidas (Saída)</span>
                <span className="px-2 py-0.5 rounded-full text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                  {formatNum(kpis.emitidas_qtd)}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('ENTRADA')}
                className={clsx(
                  'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                  activeTab === 'ENTRADA'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                )}
              >
                <ArrowDownLeft size={14} className="text-blue-600" />
                <span>Notas de Entrada</span>
                <span className="px-2 py-0.5 rounded-full text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                  {formatNum(kpis.entradas_qtd)}
                </span>
              </button>
            </div>
          </div>

          {/* Barra Secundária: Resumo Financeiro da Listagem + Filtros Rápidos de Situação */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            {/* Totais da Listagem Filtrada */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600 dark:text-slate-400">
              {selectedOperacao !== 'todos' && (
                <button
                  type="button"
                  onClick={() => setSelectedOperacao('todos')}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-semibold cursor-pointer"
                >
                  <span>Filtro: {selectedOperacaoLabel}</span>
                  <X size={12} />
                </button>
              )}
              <span>
                {activeTab === 'SAIDA' ? 'Produtos após devoluções:' : 'Valor dos produtos:'}{' '}
                <strong className="font-mono tabular-nums text-slate-900 dark:text-white">
                  {formatBRL(notasPage?.soma_valor_produtos ?? notasPage?.soma_valor ?? 0)}
                </strong>
              </span>
              {activeTab === 'SAIDA' && (
                <span>
                  Descontos/ajustes:{' '}
                  <strong className="font-mono tabular-nums text-slate-700 dark:text-slate-300">
                    − {formatBRL(notasPage?.soma_descontos ?? Math.max(0, (notasPage?.soma_valor_produtos ?? 0) - (notasPage?.soma_valor ?? 0)))}
                  </strong>
                </span>
              )}
              <span>
                {activeTab === 'SAIDA' ? 'Total NF líquido emitido:' : 'Valor Total NF:'}{' '}
                <strong className="font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                  {formatBRL(notasPage?.soma_valor || 0)}
                </strong>
              </span>
              {activeTab === 'SAIDA' && (notasPage?.qtd_devolucoes || 0) > 0 && (
                <span>
                  NF devolução líquida ({formatNum(notasPage?.qtd_devolucoes || 0)}):{' '}
                  <strong className="font-mono tabular-nums text-rose-700 dark:text-rose-400">
                    − {formatBRL(notasPage?.soma_devolucoes || 0)}
                  </strong>
                </span>
              )}
            </div>

            {/* Filtros Rápidos por Tipo/Situação na Página */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-400 mr-1">Exibir:</span>
              <button
                type="button"
                onClick={() => setTableQuickFilter('TODOS')}
                className={clsx(
                  'px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer',
                  tableQuickFilter === 'TODOS'
                    ? 'bg-slate-900 dark:bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                )}
              >
                Todos
              </button>
              {activeTab === 'SAIDA' && (
                <>
                  <button
                    type="button"
                    onClick={() => setTableQuickFilter('SAIDAS_NORMAIS')}
                    className={clsx(
                      'px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer',
                      tableQuickFilter === 'SAIDAS_NORMAIS'
                        ? 'bg-slate-900 dark:bg-blue-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    )}
                  >
                    Saídas Comerciais
                  </button>
                  <button
                    type="button"
                    onClick={() => setTableQuickFilter('DEVOLUCOES')}
                    className={clsx(
                      'px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer',
                      tableQuickFilter === 'DEVOLUCOES'
                        ? 'bg-rose-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    )}
                  >
                    Devoluções
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setTableQuickFilter('COM_CHAVE')}
                className={clsx(
                  'px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer',
                  tableQuickFilter === 'COM_CHAVE'
                    ? 'bg-slate-900 dark:bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                )}
              >
                Com Chave XML
              </button>
            </div>
          </div>
        </div>

        {/* Tabela de Documentos com Cabeçalho Fixo na Rolagem */}
        <div className="overflow-x-auto max-h-[680px] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-2xs">
              <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="py-3 px-4">
                  <button
                    type="button"
                    onClick={() => handleSortToggle('numero')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  >
                    <span>Documento / Série</span>
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
                <th className="py-3 px-3 min-w-[220px]">CFOP e Natureza da Operação</th>
                <th className="py-3 px-3">Situação / Tipo</th>
                <th className="py-3 px-3 hidden xl:table-cell">Chave de Acesso NF-e</th>
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
                    Nenhum documento fiscal encontrado para os filtros selecionados.
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
                      {/* Coluna 1: Nº Nota / Série / Pedido */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-bold font-mono text-slate-900 dark:text-white">
                            Nº {row.numero_nota}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                            Série {row.serie}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                          <span>{row.modelo_doc}</span>
                          {row.numero_pedido && row.numero_pedido !== '-' && (
                            <span>• Pedido {row.numero_pedido}</span>
                          )}
                        </div>
                      </td>

                      {/* Coluna 2: Data de Emissão */}
                      <td className="py-3.5 px-3 whitespace-nowrap font-mono text-slate-700 dark:text-slate-300">
                        {formatDate(row.data_emissao)}
                      </td>

                      {/* Coluna 3: Cliente / Fornecedor + Cidade/UF */}
                      <td className="py-3.5 px-3 max-w-[280px]">
                        <div
                          className="font-semibold text-slate-900 dark:text-slate-100 leading-snug line-clamp-1"
                          title={row.parceiro_nome}
                        >
                          {row.parceiro_nome}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-x-2">
                          {row.parceiro_documento && <span className="font-mono">{row.parceiro_documento}</span>}
                          {(row.cidade || row.uf) && (
                            <span>
                              • {row.cidade ? `${row.cidade}${row.uf ? `/${row.uf}` : ''}` : row.uf}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Coluna 4: CFOP e Natureza da Operação */}
                      <td className="py-3.5 px-3 max-w-[300px]" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-start gap-2 min-w-0">
                          {row.cfop && (
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedOperacao(selectedOperacao === `cfop:${row.cfop}` ? 'todos' : `cfop:${row.cfop}`)
                              }
                              className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-slate-800 dark:text-slate-200 hover:text-blue-700 font-mono font-bold text-[11px] shrink-0 cursor-pointer border border-slate-200/80 dark:border-slate-700 transition-colors"
                              title={`Filtrar pelo CFOP ${row.cfop}`}
                            >
                              {row.cfop}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedOperacao(
                                selectedOperacao === `nat:${row.natureza_operacao}` ? 'todos' : `nat:${row.natureza_operacao}`
                              )
                            }
                            className="text-left text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 text-xs leading-snug line-clamp-2 cursor-pointer transition-colors"
                            title={`Filtrar pela natureza: ${row.natureza_operacao}`}
                          >
                            {row.natureza_operacao}
                          </button>
                        </div>
                      </td>

                      {/* Coluna 5: Situação / Estado Fiscal (Texto + Ícone, nunca apenas cor) */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="flex flex-col items-start gap-1">
                          {isCancelada ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[11px] font-semibold">
                              <AlertTriangle size={12} />
                              Cancelada
                            </span>
                          ) : isDevolucaoRow ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[11px] font-semibold">
                              <ArrowDownLeft size={12} />
                              Devolução (Deduz)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold">
                              <CheckCircle2 size={12} />
                              {row.status || 'Autorizada'}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">
                            {row.chave_nfe ? 'Com chave NF-e' : 'Registro interno ERP'}
                          </span>
                        </div>
                      </td>

                      {/* Coluna 6: Chave de Acesso NF-e */}
                      <td className="py-3.5 px-3 hidden xl:table-cell whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        {row.chave_nfe ? (
                          <div className="inline-flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 px-2.5 py-1 rounded-lg">
                            <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300" title={row.chave_nfe}>
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
                          <span className="text-[11px] text-slate-400">Sem chave XML</span>
                        )}
                      </td>

                      {/* Coluna 7: Valor Total NF (Alinhado à Direita) */}
                      <td className="py-3.5 px-3 text-right whitespace-nowrap">
                        <div
                          className={clsx(
                            'font-bold font-mono tabular-nums',
                            isDevolucaoRow ? 'text-rose-700 dark:text-rose-400' : 'text-slate-900 dark:text-white'
                          )}
                        >
                          {isDevolucaoRow ? `− ${formatBRL(row.valor_total)}` : formatBRL(row.valor_total)}
                        </div>
                        {row.valor_produtos !== undefined && Math.abs(row.valor_produtos - row.valor_total) > 0.01 && (
                          <div className="text-[10px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                            Prod.: {formatBRL(row.valor_produtos)}
                          </div>
                        )}
                      </td>

                      {/* Coluna 8: Botão de Detalhes Previsível */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setSelectedNota({ origem: row.origem, id: row.registro_id })}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:bg-blue-600 group-hover:text-white hover:bg-blue-600 hover:text-white text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                          title="Abrir espelho da nota fiscal e lista de itens"
                        >
                          <Eye size={14} />
                          <span>Detalhes {row.qtd_itens > 0 ? `(${row.qtd_itens})` : ''}</span>
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
          <div className="px-4 sm:px-5 py-3.5 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
            <div>
              Exibindo página <strong className="text-slate-800 dark:text-slate-200">{notasPage.page}</strong> de{' '}
              <strong className="text-slate-800 dark:text-slate-200">{notasPage.total_pages}</strong> •{' '}
              <strong className="text-slate-800 dark:text-slate-200">{formatNum(notasPage.total)}</strong> documentos no período
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
            {/* Header do Modal */}
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
