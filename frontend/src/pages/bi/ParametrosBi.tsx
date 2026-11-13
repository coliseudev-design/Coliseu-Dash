import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  SlidersHorizontal, FileCheck2, CheckCircle2, Info, ArrowRight, RefreshCw, ShieldCheck, AlertTriangle, CheckSquare, Square, Save, Layers
} from 'lucide-react'
import clsx from 'clsx'
import api from '../../services/api'
import { formatDateTime, formatBRL, formatNum } from '../../utils/format'
import { useAuthStore } from '../../store/authStore'

interface CfopDisponivelItem {
  cfop: string
  descricao: string
  natureza_operacao: string
  qtd_notas: number
  valor_produtos: number
  valor_total: number
}

interface TenantParametros {
  somente_vendas_com_nf: boolean
  cfops_faturamento?: string[] | null
  cfops_disponiveis?: CfopDisponivelItem[]
  has_synced_nf?: boolean
  efetivo_somente_nf?: boolean
  updated_at: string | null
  updated_by: string | null
}

export default function ParametrosBi() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const activeUser = useAuthStore((s) => s.user)
  const [feedback, setFeedback] = useState<string | null>(null)

  const getUserKey = () => {
    if (activeUser?.email || activeUser?.id) {
      return String(activeUser.email || activeUser.id).toLowerCase()
    }
    try {
      const rawUser = localStorage.getItem('coliseu_user')
      if (rawUser) {
        const parsed = JSON.parse(rawUser)
        return String(parsed?.email || parsed?.id || 'default').toLowerCase()
      }
    } catch {
      // ignore
    }
    return 'default'
  }

  const userKey = getUserKey()

  const { data, isLoading } = useQuery<TenantParametros>({
    queryKey: ['tenant-parametros', userKey],
    queryFn: async () => {
      const res = await api.get('/configuracoes/parametros')
      const payload = res.data as TenantParametros
      try {
        localStorage.setItem(`coliseu_only_nf_sales:${userKey}`, String(Boolean(payload?.somente_vendas_com_nf)))
      } catch {
        // ignore
      }
      return payload
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (nextValue: boolean) => {
      try {
        localStorage.setItem(`coliseu_only_nf_sales:${userKey}`, String(Boolean(nextValue)))
      } catch {
        // ignore
      }
      const res = await api.put('/configuracoes/parametros', {
        somente_vendas_com_nf: nextValue,
      })
      return res.data as TenantParametros
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['tenant-parametros', userKey], updated)
      // Invalida todos os caches de consultas do React Query para atualizar imediatamente todos os painéis do BI
      queryClient.invalidateQueries({
        predicate: (q) => q.queryKey[0] !== 'tenant-parametros',
      })
      if (updated.somente_vendas_com_nf && updated.has_synced_nf === false) {
        setFeedback(
          'Parâmetro salvo! Como o SyncAgent desta empresa ainda não sincroniza NF-e (0 notas detectadas), a proteção inteligente mantém todas as vendas faturadas visíveis até a atualização do agente.'
        )
      } else {
        setFeedback(
          updated.somente_vendas_com_nf
            ? 'Filtro ativado: todos os painéis de vendas do B.I IA. exibem agora somente vendas com Nota Fiscal vinculada.'
            : 'Filtro desativado: todos os painéis de vendas voltaram a exibir todas as vendas faturadas.'
        )
      }
      setTimeout(() => setFeedback(null), 6500)
    },
  })

  const isOnlyNf = Boolean(data?.somente_vendas_com_nf)
  const hasSyncedNf = data?.has_synced_nf !== false
  const cfopsDisponiveis = data?.cfops_disponiveis || []

  const [selectedCfops, setSelectedCfops] = useState<string[]>([])
  const [cfopInitialized, setCfopInitialized] = useState(false)

  useEffect(() => {
    if (!data || cfopInitialized) return
    const allCodes = (data.cfops_disponiveis || []).map((c) => c.cfop)
    if (Array.isArray(data.cfops_faturamento) && data.cfops_faturamento.length > 0) {
      setSelectedCfops(data.cfops_faturamento)
    } else if (allCodes.length > 0) {
      setSelectedCfops(allCodes)
    }
    if (allCodes.length > 0 || data.cfops_faturamento) {
      setCfopInitialized(true)
    }
  }, [data, cfopInitialized])

  const saveCfopsMutation = useMutation({
    mutationFn: async (cfopsToSave: string[] | null) => {
      const res = await api.put('/configuracoes/parametros', {
        cfops_faturamento: cfopsToSave,
      })
      return res.data as TenantParametros
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['tenant-parametros', userKey], updated)
      queryClient.invalidateQueries({
        predicate: (q) => q.queryKey[0] !== 'tenant-parametros',
      })
      setFeedback('CFOPs que contabilizam no projeto salvos com sucesso!')
      setTimeout(() => setFeedback(null), 6500)
    },
  })

  const toggleCfop = (code: string) => {
    setSelectedCfops((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    )
  }

  const selectAllCfops = () => {
    setSelectedCfops(cfopsDisponiveis.map((c) => c.cfop))
  }

  const selectOnlySalesCfops = () => {
    const commercial = cfopsDisponiveis
      .filter((c) =>
        [
          '5101', '5102', '5117', '5401', '5403', '5405', '5922',
          '6101', '6102', '6108', '6403', '6404',
          '1201', '1202', '1411', '2201', '2202', '2411',
        ].includes(c.cfop)
      )
      .map((c) => c.cfop)
    setSelectedCfops(commercial.length > 0 ? commercial : cfopsDisponiveis.map((c) => c.cfop))
  }

  const selectedSummary = useMemo(() => {
    let qtd = 0
    let valorProdutos = 0
    let valorTotal = 0
    for (const item of cfopsDisponiveis) {
      if (selectedCfops.includes(item.cfop)) {
        const isDevolucao = item.cfop.startsWith('1') || item.cfop.startsWith('2')
        qtd += Number(item.qtd_notas || 0)
        valorProdutos += isDevolucao ? -Number(item.valor_produtos || 0) : Number(item.valor_produtos || 0)
        valorTotal += isDevolucao ? -Number(item.valor_total || 0) : Number(item.valor_total || 0)
      }
    }
    return { qtd, valorProdutos, valorTotal }
  }, [cfopsDisponiveis, selectedCfops])

  return (
    <div className="max-w-4xl mx-auto w-full py-2 sm:py-4 space-y-5">
      {/* Cabeçalho */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-[0_4px_16px_rgba(15,23,42,0.04)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              backgroundColor: '#D9770614',
              border: '1px solid #D9770633',
            }}
          >
            <SlidersHorizontal size={20} style={{ color: '#D97706' }} strokeWidth={1.9} />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
              Parâmetros do B.I IA.
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Defina sua preferência individual entre apuração Gerencial ou Fiscal sem afetar os demais usuários logados.
            </p>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold self-start sm:self-auto">
          <ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-400" />
          <span>
            Usuário: {activeUser?.nome || 'Atual'} ({activeUser?.email || userKey})
          </span>
        </div>
      </div>

      {/* Feedback Toast Inline */}
      {feedback && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl px-4 py-3 flex items-center gap-2.5 text-xs sm:text-sm font-medium text-emerald-800 dark:text-emerald-300 animate-in fade-in duration-200">
          <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Card Principal do Parâmetro Fiscal */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-[0_4px_16px_rgba(15,23,42,0.04)] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{
                backgroundColor: isOnlyNf ? (hasSyncedNf ? '#10B98116' : '#F59E0B16') : '#2563EB14',
                border: `1px solid ${isOnlyNf ? (hasSyncedNf ? '#10B98136' : '#F59E0B36') : '#2563EB30'}`,
              }}
            >
              <FileCheck2
                size={19}
                style={{ color: isOnlyNf ? (hasSyncedNf ? '#10B981' : '#D97706') : '#2563EB' }}
                strokeWidth={1.9}
              />
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
                  Visualizar somente vendas com Nota Fiscal vinculada
                </h3>
                <span
                  className={clsx(
                    'text-[11px] font-semibold px-2.5 py-0.5 rounded-full border',
                    isOnlyNf && !hasSyncedNf
                      ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                      : isOnlyNf
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                        : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                  )}
                >
                  {isOnlyNf
                    ? hasSyncedNf
                      ? 'Ativo — Somente c/ NF'
                      : 'Ativo — Proteção Inteligente (Agente s/ NF)'
                    : 'Desativado — Todas as Vendas'}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl">
                Quando habilitado, todos os indicadores de faturamento, rankings, comparativos e desempenho de equipe no{' '}
                <strong className="text-slate-700 dark:text-slate-200">B.I IA.</strong> passam a contabilizar apenas vendas que possuam{' '}
                <strong className="text-slate-700 dark:text-slate-200">Número da Nota Fiscal</strong> ou{' '}
                <strong className="text-slate-700 dark:text-slate-200">Chave de Acesso NF-e / NFC-e</strong> vinculados no ERP.
              </p>
            </div>
          </div>

          {/* Toggle Switch */}
          <div className="flex items-center gap-3 self-end sm:self-center flex-shrink-0">
            {isLoading || updateMutation.isPending ? (
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium px-3 py-1.5">
                <RefreshCw size={15} className="animate-spin text-blue-600" />
                <span>Salvando...</span>
              </div>
            ) : null}

            <button
              type="button"
              role="switch"
              aria-checked={isOnlyNf}
              disabled={isLoading || updateMutation.isPending}
              onClick={() => updateMutation.mutate(!isOnlyNf)}
              className={clsx(
                'relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500/40 disabled:opacity-50',
                isOnlyNf ? (hasSyncedNf ? 'bg-emerald-500' : 'bg-amber-500') : 'bg-slate-300 dark:bg-slate-700'
              )}
              title={isOnlyNf ? 'Desativar filtro de Nota Fiscal' : 'Ativar filtro de Nota Fiscal'}
            >
              <span
                className={clsx(
                  'pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out',
                  isOnlyNf ? 'translate-x-6' : 'translate-x-0'
                )}
              />
            </button>
          </div>
        </div>

        {/* Alerta de Proteção Inteligente quando a empresa ainda possui 0 NFs sincronizadas pelo SyncAgent */}
        {!isLoading && !hasSyncedNf && (
          <div className="bg-amber-50/90 dark:bg-amber-950/35 border border-amber-200 dark:border-amber-800/70 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 dark:text-amber-200 space-y-1 leading-relaxed">
              <p className="font-bold">
                SyncAgent local ainda não sincroniza número/chave de NF-e nesta empresa (0 notas fiscais detectadas)
              </p>
              <p className="text-amber-800/90 dark:text-amber-200/85">
                <strong>Proteção inteligente ativa:</strong> enquanto o agente instalado no servidor desta empresa não enviar os campos{' '}
                <code>numero_nota</code> / <code>chave_nfe</code> ou XMLs fiscais, os painéis comerciais continuam exibindo normalmente{' '}
                <strong>todas as vendas faturadas</strong> (evitando zerar os indicadores). Assim que o SyncAgent for atualizado e sincronizar as NF-es, a filtragem passará a atuar automaticamente.
              </p>
            </div>
          </div>
        )}

        {/* Detalhamento técnico claro */}
        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60 rounded-xl p-4 flex items-start gap-3">
          <Info size={16} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1 leading-relaxed">
            <p>
              <strong>Módulos impactados:</strong> Visão Estratégica, Análise Comparativa, Monitor de Vendas, Desempenho da Equipe, Visão Geral da Carteira, Cliente 360, Estatísticas, Ranking, Vendas e filtro padrão do Módulo Fiscal.
            </p>
            <p>
              <strong>Regras de apuração ERP Coliseu:</strong> Contabiliza exclusivamente vendas comerciais efetivas com NF-e / NFC-e autorizada vinculada ao pedido, descontando devoluções de vendas com NF e ignorando automaticamente transferências entre matriz e filiais.
            </p>
          </div>
        </div>

        {/* Rodapé com auditoria e atalho para Usuários e Módulo Fiscal */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div>
            {data?.updated_at ? (
              <span>
                Preferência do usuário <strong>{activeUser?.email || data.updated_by || userKey}</strong> atualizada em{' '}
                <strong>{formatDateTime(data.updated_at)}</strong>
              </span>
            ) : (
              <span>
                Padrão individual ativo para <strong>{activeUser?.email || userKey}</strong>: Visão Gerencial (Todas as Vendas).
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => navigate('/bi/usuarios')}
              className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300 hover:text-blue-600 font-semibold transition-colors cursor-pointer"
            >
              <span>Ver / Definir por Usuário</span>
              <ArrowRight size={14} />
            </button>

            <button
              type="button"
              onClick={() => navigate('/bi/fiscal')}
              className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-700 font-semibold transition-colors cursor-pointer"
            >
              <span>Consultar Módulo Fiscal</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Card de Configuração Administrativa: CFOPs que Somam no Projeto */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-[0_4px_16px_rgba(15,23,42,0.04)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{
                backgroundColor: '#10B98116',
                border: '1px solid #10B98136',
              }}
            >
              <Layers size={19} style={{ color: '#10B981' }} strokeWidth={1.9} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                CFOPs que Somam no Projeto (Configuração Administrativa Fiscal)
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Selecione quais CFOPs emitidos devem ser contabilizados por padrão na apuração Fiscal do projeto.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
            <button
              type="button"
              onClick={selectAllCfops}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Marcar Todos ({cfopsDisponiveis.length})
            </button>
            <button
              type="button"
              onClick={selectOnlySalesCfops}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors cursor-pointer"
            >
              Vendas Líquidas (Com Devoluções • Sem 5949)
            </button>
            <button
              type="button"
              disabled={saveCfopsMutation.isPending}
              onClick={() => {
                const allSelected = cfopsDisponiveis.length > 0 && selectedCfops.length === cfopsDisponiveis.length
                saveCfopsMutation.mutate(allSelected ? null : selectedCfops)
              }}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              {saveCfopsMutation.isPending ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
              <span>Salvar CFOPs no Projeto</span>
            </button>
          </div>
        </div>

        {/* Resumo dos CFOPs Marcados */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60 rounded-xl p-3.5">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              CFOPs Selecionados / Notas
            </span>
            <span className="text-sm font-black text-slate-900 dark:text-white font-mono">
              {selectedCfops.length} de {cfopsDisponiveis.length} CFOPs ({formatNum(selectedSummary.qtd)} NFs)
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Total Valor Produtos (Histórico Geral)
            </span>
            <span className="text-sm font-black text-blue-600 dark:text-blue-400 font-mono">
              {formatBRL(selectedSummary.valorProdutos)}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Total Valor NF Emitido (Histórico Geral)
            </span>
            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {formatBRL(selectedSummary.valorTotal)}
            </span>
          </div>
        </div>

        {/* Tabela de Seleção de CFOPs */}
        <div className="overflow-x-auto border border-slate-200/80 dark:border-slate-800 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200/80 dark:border-slate-800 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                <th className="py-2.5 px-3 w-10 text-center">SOMAR</th>
                <th className="py-2.5 px-3">CFOP</th>
                <th className="py-2.5 px-3">NATUREZA / DESCRIÇÃO</th>
                <th className="py-2.5 px-3 text-right">QTD NOTAS</th>
                <th className="py-2.5 px-3 text-right">VALOR PRODUTOS</th>
                <th className="py-2.5 px-3 text-right">VALOR TOTAL NF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/70">
              {cfopsDisponiveis.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400 font-medium">
                    Nenhum CFOP sincronizado encontrado para esta empresa.
                  </td>
                </tr>
              ) : (
                cfopsDisponiveis.map((item) => {
                  const checked = selectedCfops.includes(item.cfop)
                  const isDevolucao = item.cfop.startsWith('1') || item.cfop.startsWith('2')
                  return (
                    <tr
                      key={item.cfop}
                      onClick={() => toggleCfop(item.cfop)}
                      className={clsx(
                        'transition-colors cursor-pointer',
                        checked
                          ? isDevolucao
                            ? 'bg-rose-500/5 hover:bg-rose-500/10'
                            : 'bg-emerald-500/5 hover:bg-emerald-500/10'
                          : 'opacity-60 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      )}
                    >
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleCfop(item.cfop)
                          }}
                          className={clsx(
                            'inline-flex items-center justify-center',
                            isDevolucao
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          )}
                        >
                          {checked ? <CheckSquare size={16} /> : <Square size={16} className="text-slate-400" />}
                        </button>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-black text-slate-900 dark:text-white">
                        {item.cfop}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>{item.natureza_operacao}</span>
                          {isDevolucao && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 text-[10px] font-extrabold uppercase shrink-0">
                              Devolução (Deduz)
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">{item.descricao}</div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                        {formatNum(item.qtd_notas)}
                      </td>
                      <td
                        className={clsx(
                          'py-2.5 px-3 text-right font-mono font-semibold',
                          isDevolucao ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'
                        )}
                      >
                        {isDevolucao ? `- ${formatBRL(item.valor_produtos)}` : formatBRL(item.valor_produtos)}
                      </td>
                      <td
                        className={clsx(
                          'py-2.5 px-3 text-right font-mono font-black',
                          isDevolucao ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                        )}
                      >
                        {isDevolucao ? `- ${formatBRL(item.valor_total)}` : formatBRL(item.valor_total)}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
