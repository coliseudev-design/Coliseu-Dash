import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  SlidersHorizontal, FileCheck2, CheckCircle2, Info, ArrowRight, RefreshCw, ShieldCheck, AlertTriangle
} from 'lucide-react'
import clsx from 'clsx'
import api from '../../services/api'
import { formatDateTime } from '../../utils/format'

interface TenantParametros {
  somente_vendas_com_nf: boolean
  has_synced_nf?: boolean
  efetivo_somente_nf?: boolean
  updated_at: string | null
  updated_by: string | null
}

export default function ParametrosBi() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [feedback, setFeedback] = useState<string | null>(null)

  const { data, isLoading } = useQuery<TenantParametros>({
    queryKey: ['tenant-parametros'],
    queryFn: async () => {
      const res = await api.get('/configuracoes/parametros')
      return res.data
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (nextValue: boolean) => {
      const res = await api.put('/configuracoes/parametros', {
        somente_vendas_com_nf: nextValue,
      })
      return res.data as TenantParametros
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['tenant-parametros'], updated)
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
              Defina critérios corporativos de apuração comercial e fiscal aplicados globalmente para sua empresa.
            </p>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold self-start sm:self-auto">
          <ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-400" />
          Escopo Global da Empresa
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
              <strong>Módulos impactados no B.I IA.:</strong> Visão Estratégica, Análise Comparativa, Monitor de Vendas, Desempenho da Equipe, Visão Geral da Carteira, Cliente 360 e Análise de Rentabilidade.
            </p>
            <p>
              <strong>Isolamento garantido:</strong> A versão <em>Dash 1.0</em> e o módulo <em>Fiscal</em> (que consulta diretamente todas as notas emitidas e de entrada) permanecem inalterados.
            </p>
          </div>
        </div>

        {/* Rodapé com auditoria e atalho para o Módulo Fiscal */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div>
            {data?.updated_at ? (
              <span>
                Última atualização em <strong>{formatDateTime(data.updated_at)}</strong>
                {data.updated_by ? ` por ${data.updated_by}` : ''}
              </span>
            ) : (
              <span>Configuração padrão ativa para a empresa.</span>
            )}
          </div>

          <button
            type="button"
            onClick={() => navigate('/bi/fiscal')}
            className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-700 font-semibold transition-colors cursor-pointer self-start sm:self-auto"
          >
            <span>Consultar Notas Emitidas e de Entrada no Módulo Fiscal</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
