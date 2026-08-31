import { useState, useEffect, useMemo } from 'react'
import { usePeriodQuery, useApiQuery } from '../hooks/useApi'
import { useBranchParam } from '../contexts/BranchContext'
import { useLocation } from 'react-router-dom'
import KPICard from '../components/KPICard'
import PeriodFilter from '../components/PeriodFilter'
import {
  Wallet, Receipt, Scale, Banknote, Filter, ArrowDownCircle, ArrowUpCircle, ShoppingCart, CreditCard
} from 'lucide-react'
import { formatBRL, formatBRLCompact } from '../utils/format'

export default function Financeiro() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const location = useLocation()
  const isConsolidated = location.pathname.includes('/financeiro-consolidado')

  // Seletor de Caixas Real
  const [selectedCaixa, setSelectedCaixa] = useState('todos')
  const [apenasVendas, setApenasVendas] = useState(false)
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

  // Movimentações do caixa (Vendas e Lançamentos) no período
  const caixasMovimentos = usePeriodQuery<any>('/financeiro/contas', {
    status: 'PAGO',
    limit: 200,
    apenas_vendas: apenasVendas,
    ...(selectedCaixa !== 'todos' ? { caixa_id: selectedCaixa } : {}),
    ...branchParam
  })
  const movimentos = caixasMovimentos.data?.data || []

  // Constrói lista de espécies de saldo no caixa
  const saldosEspeciesList = caixa.data?.kpis?.saldos_especies || []
  const displayEspecies = useMemo(() => {
    const base = [
      { nome: 'DINHEIRO', total: 0 },
      { nome: 'CARTAO DEBITO', total: 0 },
      { nome: 'CARTAO CREDITO', total: 0 },
      { nome: 'PIX', total: 0 }
    ]
    return base.map(item => {
      const found = saldosEspeciesList.find((e: any) => e.nome === item.nome)
      return {
        nome: item.nome,
        total: found ? found.total : 0
      }
    })
  }, [saldosEspeciesList])

  // Vendas por espécie (Vista no Caixa vs A Prazo)
  const vendasVista = caixa.data?.vendas_por_especie?.vista_caixa || { itens: [], subtotal: 0 }
  const vendasPrazo = caixa.data?.vendas_por_especie?.prazo || { itens: [], subtotal: 0 }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:flex-wrap justify-between items-start sm:items-center gap-4 w-full min-w-0">
        {!isConsolidated && <PeriodFilter excludePeriods={['lastMonth', 'last12m']} />}
        
        {/* Seletor de Caixa */}
        <div className="flex items-center gap-2 bg-bg-primary rounded-lg border border-border p-1.5 shadow-sm">
          <Filter size={16} className="text-text-secondary ml-2" />
          <select 
            value={selectedCaixa}
            onChange={(e) => setSelectedCaixa(e.target.value)}
            className="bg-transparent border-none text-sm font-medium text-text-primary focus:ring-0 cursor-pointer pr-8"
            aria-label="Selecionar Caixa"
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-6">
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

        {/* Saldos por Espécie no Caixa */}
        <div className="bg-bg-primary rounded-xl border border-border p-5 mb-6 shadow-sm">
          <h3 className="font-heading font-semibold text-base sm:text-lg mb-4 text-text-primary flex items-center gap-2">
            <Wallet className="text-brand-500" size={20} />
            Saldos do Caixa por Espécie
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {displayEspecies.map((esp) => (
              <div key={esp.nome} className="flex flex-col p-4 rounded-xl bg-bg-secondary border border-divider hover:border-brand-200 transition-colors">
                <span className="text-xs font-extrabold text-text-secondary mb-1 truncate capitalize">
                  Saldo em {esp.nome.toLowerCase().replace('cartao ', '')}
                </span>
                <span className="font-black text-text-primary text-base sm:text-lg font-mono truncate" title={formatBRL(esp.total)}>
                  {formatBRL(esp.total)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Vendas por Espécie (À Vista no Caixa vs A Prazo) - Conforme Relatório ERP */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Vendas no Período por Espécie (À Vista / Caixa) */}
          <div className="bg-bg-primary rounded-xl border border-border p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-divider">
                <h3 className="font-extrabold text-slate-800 dark:text-white text-xs uppercase tracking-wider flex items-center gap-2">
                  <CreditCard size={16} className="text-blue-500" />
                  Vendas no Período por Espécie (Caixa)
                </h3>
                <span className="text-[10px] font-bold text-slate-400">À Vista</span>
              </div>
              <div className="space-y-2">
                {caixa.isLoading ? (
                  <div className="text-xs text-text-secondary py-4 text-center">Carregando espécies...</div>
                ) : vendasVista.itens.length === 0 ? (
                  <div className="text-xs text-text-secondary py-4 text-center">Nenhuma venda à vista no período.</div>
                ) : (
                  vendasVista.itens.map((v: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center text-xs py-1.5 px-2.5 rounded-lg hover:bg-bg-secondary transition-colors">
                      <span className="font-semibold text-text-primary uppercase truncate pr-2">{v.nome}</span>
                      <span className="font-mono font-bold text-text-primary shrink-0">{formatBRL(v.total)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-divider flex justify-between items-center bg-bg-secondary/40 p-2.5 rounded-lg">
              <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-200">Subtotal À Vista</span>
              <span className="font-mono font-black text-sm text-blue-600 dark:text-blue-400">{formatBRL(vendasVista.subtotal)}</span>
            </div>
          </div>

          {/* Vendas a Prazo no Período por Espécie */}
          <div className="bg-bg-primary rounded-xl border border-border p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-divider">
                <h3 className="font-extrabold text-slate-800 dark:text-white text-xs uppercase tracking-wider flex items-center gap-2">
                  <ShoppingCart size={16} className="text-emerald-500" />
                  Vendas a Prazo no Período por Espécie
                </h3>
                <span className="text-[10px] font-bold text-slate-400">Faturadas / Depósitos</span>
              </div>
              <div className="space-y-2">
                {caixa.isLoading ? (
                  <div className="text-xs text-text-secondary py-4 text-center">Carregando espécies a prazo...</div>
                ) : vendasPrazo.itens.length === 0 ? (
                  <div className="text-xs text-text-secondary py-4 text-center">Nenhuma venda a prazo no período.</div>
                ) : (
                  vendasPrazo.itens.map((v: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center text-xs py-1.5 px-2.5 rounded-lg hover:bg-bg-secondary transition-colors">
                      <span className="font-semibold text-text-primary uppercase truncate pr-2">{v.nome}</span>
                      <span className="font-mono font-bold text-text-primary shrink-0">{formatBRL(v.total)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-divider flex justify-between items-center bg-bg-secondary/40 p-2.5 rounded-lg">
              <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-200">Subtotal A Prazo</span>
              <span className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">{formatBRL(vendasPrazo.subtotal)}</span>
            </div>
          </div>
        </div>

        {/* Lista de Movimentações */}
        <div className="bg-bg-primary rounded-xl border border-border p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <h3 className="font-heading font-semibold text-base sm:text-lg text-text-primary flex items-center gap-2">
              <Receipt className="text-brand-500" size={20} />
              Movimentações do Caixa
            </h3>

            {/* Botão de Alternância: Todas vs Apenas Vendas */}
            <div className="flex items-center gap-1 bg-bg-secondary p-1 rounded-xl border border-divider">
              <button
                type="button"
                onClick={() => setApenasVendas(false)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${!apenasVendas ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Todas as Movimentações
              </button>
              <button
                type="button"
                onClick={() => setApenasVendas(true)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${apenasVendas ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                <ShoppingCart size={13} />
                Apenas Vendas
              </button>
            </div>
          </div>

          {caixasMovimentos.isLoading ? (
            <div className="text-sm text-text-secondary">Carregando movimentações...</div>
          ) : !movimentos || movimentos.length === 0 ? (
            <div className="text-sm text-text-secondary">Nenhuma movimentação registrada para este caixa no período.</div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-divider text-xs font-bold text-text-secondary uppercase">
                      <th className="py-2.5 px-3">Data</th>
                      <th className="py-2.5 px-3">Descrição / Cliente</th>
                      <th className="py-2.5 px-3">Doc / Pedido</th>
                      <th className="py-2.5 px-3">Tipo</th>
                      <th className="py-2.5 px-3">Espécie</th>
                      <th className="py-2.5 px-3 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-divider text-sm text-text-primary">
                    {movimentos.map((mov: any) => {
                      const isReceber = mov.tipo === 'RECEBER';
                      return (
                        <tr key={mov.id} className="hover:bg-bg-secondary">
                          <td className="py-2.5 px-3 text-text-secondary text-xs whitespace-nowrap">
                            {mov.data_pagamento ? new Date(mov.data_pagamento).toLocaleDateString('pt-BR') : ''}
                          </td>
                          <td className="py-2.5 px-3 max-w-[280px] truncate font-medium text-xs sm:text-sm" title={mov.descricao || mov.cliente || 'Lançamento'}>
                            {mov.descricao || mov.cliente || 'Lançamento'}
                          </td>
                          <td className="py-2.5 px-3 text-text-secondary text-xs font-mono">
                            {mov.numero_pedido || '-'}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${isReceber ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                              {mov.tipo}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-semibold uppercase text-xs">{mov.especie || 'DINHEIRO'}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-xs sm:text-sm whitespace-nowrap text-right">
                            <span className={isReceber ? 'text-success' : 'text-danger'}>
                              {formatBRL(mov.valor_pago || mov.valor)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards View */}
              <div className="md:hidden space-y-2">
                {movimentos.map((mov: any) => {
                  const isReceber = mov.tipo === 'RECEBER';
                  return (
                    <div key={mov.id} className="p-3 border border-divider rounded-xl bg-bg-secondary/10 flex flex-col gap-1.5">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0 pr-2">
                          <h4 className="text-xs font-bold text-text-primary truncate block" title={mov.descricao || mov.cliente || 'Lançamento'}>
                            {mov.descricao || mov.cliente || 'Lançamento'}
                          </h4>
                          <div className="text-[10px] text-text-muted mt-1 flex items-center gap-1.5 leading-none">
                            <span className="uppercase font-semibold">{mov.especie || 'DINHEIRO'}</span>
                            <span>•</span>
                            <span>
                              {mov.data_pagamento ? mov.data_pagamento.substring(0, 10).split('-').reverse().join('/') : '-'}
                            </span>
                          </div>
                        </div>
                        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold shrink-0 ${isReceber ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                          {mov.tipo}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-1.5 border-t border-divider mt-0.5">
                        <span className="text-[10px] text-text-muted font-medium">
                          {mov.numero_pedido ? `Pedido: ${mov.numero_pedido}` : 'Valor'}
                        </span>
                        <span className={`text-xs font-mono font-bold ${isReceber ? 'text-success' : 'text-danger'}`}>
                          {formatBRL(mov.valor_pago || mov.valor)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
