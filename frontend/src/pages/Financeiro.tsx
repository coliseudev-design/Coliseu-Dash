import { useState, useEffect } from 'react'
import { usePeriodQuery, useApiQuery } from '../hooks/useApi'
import { useBranchParam } from '../contexts/BranchContext'
import { useLocation } from 'react-router-dom'
import KPICard from '../components/KPICard'
import PeriodFilter from '../components/PeriodFilter'
import {
  Wallet, Receipt, Scale, Banknote, Filter, ArrowDownCircle, ArrowUpCircle
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
    limit: 100,
    ...(selectedCaixa !== 'todos' ? { caixa_id: selectedCaixa } : {}),
  })
  const movimentos = caixasMovimentos.data?.data || []

  // Constrói lista de espécies garantindo que as principais sempre apareçam (para evitar confusão de R$ 0,00)
  const especiesList = caixa.data?.kpis?.especies || []
  const displayEspecies: Array<{ nome: string, total: number }> = [
    { nome: 'DINHEIRO', total: 0 },
    { nome: 'CARTAO DEBITO', total: 0 },
    { nome: 'CARTAO CREDITO', total: 0 },
    { nome: 'PIX', total: 0 }
  ].map(item => {
    const found = especiesList.find((e: any) => e.nome === item.nome)
    return {
      nome: item.nome,
      total: found ? found.total : 0
    }
  })
  // Adiciona outras espécies que existam no banco e não estejam na lista padrão
  especiesList.forEach((e: any) => {
    if (!['DINHEIRO', 'CARTAO DEBITO', 'CARTAO CREDITO', 'PIX'].includes(e.nome)) {
      displayEspecies.push({ nome: e.nome, total: e.total })
    }
  })

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

        {/* Saldos por Espécie */}
        <div className="bg-bg-primary rounded-xl border border-border p-6 mb-6 shadow-sm">
          <h3 className="font-heading font-semibold text-base sm:text-lg mb-4 text-text-primary flex items-center gap-2">
            <Wallet className="text-brand-500" size={20} />
            Saldos do Caixa por Espécie
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

        {/* Lista de Movimentações */}
        <div className="bg-bg-primary rounded-xl border border-border p-6 shadow-sm">
          <h3 className="font-heading font-semibold text-base sm:text-lg mb-4 text-text-primary flex items-center gap-2">
            <Receipt className="text-brand-500" size={20} />
            Últimas Movimentações (Vendas e Lançamentos)
          </h3>
          {caixasMovimentos.isLoading ? (
            <div className="text-sm text-text-secondary">Carregando movimentações...</div>
          ) : !movimentos || movimentos.length === 0 ? (
            <div className="text-sm text-text-secondary">Nenhuma movimentação registrada para este caixa no período.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-divider text-xs font-bold text-text-secondary uppercase">
                    <th className="py-2.5 px-2 md:px-4">Descrição / Cliente</th>
                    <th className="py-2.5 px-2 md:px-4">Tipo</th>
                    <th className="py-2.5 px-2 md:px-4">Espécie</th>
                    <th className="py-2.5 px-2 md:px-4">Valor</th>
                    <th className="py-2.5 px-2 md:px-4">Data Pagamento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-divider text-sm text-text-primary">
                  {movimentos.map((mov: any) => (
                    <tr key={mov.id} className="hover:bg-bg-secondary">
                      <td className="py-2.5 px-2 md:px-4 max-w-[100px] sm:max-w-none truncate font-medium text-xs sm:text-sm" title={mov.descricao || mov.cliente || 'Lançamento'}>
                        {mov.descricao || mov.cliente || 'Lançamento'}
                      </td>
                      <td className="py-2.5 px-2 md:px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${mov.tipo === 'RECEBER' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                          {mov.tipo}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 md:px-4 font-semibold capitalize text-xs">{mov.especie?.toLowerCase() || 'Outro'}</td>
                      <td className="py-2.5 px-2 md:px-4 font-mono font-bold text-xs sm:text-sm whitespace-nowrap">{formatBRL(mov.valor_pago || mov.valor)}</td>
                      <td className="py-2.5 px-2 md:px-4 text-text-secondary text-xs">
                        {mov.data_pagamento ? (isMobile ? mov.data_pagamento.substring(5, 10).split('-').reverse().join('/') : new Date(mov.data_pagamento).toLocaleDateString('pt-BR')) : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>


      </div>
    </div>
  )
}
