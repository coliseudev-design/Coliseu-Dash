import { useState, useMemo, useEffect } from 'react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts'
import {
  DollarSign, ShoppingBag, Award, GitCompare, Play, Maximize2, ChevronDown
} from 'lucide-react'
import { useBranchPeriodQuery } from '../hooks/useApi'
import { useBranch } from '../contexts/BranchContext'
import { formatBRL, formatBRLCompact, formatNum } from '../utils/format'
import clsx from 'clsx'

// Tooltip customizado premium
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-bg-primary border border-border shadow-card-hover p-3 rounded-xl z-50">
        <p className="text-text-primary font-bold text-xs mb-2 border-b border-divider/40 pb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-xs mb-1">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-text-secondary font-medium">{entry.name}:</span>
            <span className="text-text-primary font-bold">
              {entry.name.includes('Faturamento') || entry.name.includes('Ticket')
                ? formatBRL(entry.value)
                : formatNum(entry.value)}
            </span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

const MONTHS = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' }
]

const YEARS = [2026, 2025, 2024]

export default function ComparativoVendas() {
  const { filiais, selectedBranch, setSelectedBranch } = useBranch()

  // Filtros de cabeçalho
  const [status, setStatus] = useState('Processado')
  const [tipo, setTipo] = useState('Venda - Devolucao')
  const [tipoPeriodo, setTipoPeriodo] = useState<'mes' | 'personalizado'>('mes')

  // Períodos de Comparação
  const [analiseMes, setAnaliseMes] = useState(6) // Junho
  const [analiseAno, setAnaliseAno] = useState(2026)
  const [comparacaoMes, setComparacaoMes] = useState(6) // Junho
  const [comparacaoAno, setComparacaoAno] = useState(2025)

  // Intervalos Personalizados
  const [customAnaliseStart, setCustomAnaliseStart] = useState('')
  const [customAnaliseEnd, setCustomAnaliseEnd] = useState('')
  const [customComparacaoStart, setCustomComparacaoStart] = useState('')
  const [customComparacaoEnd, setCustomComparacaoEnd] = useState('')

  // Filtros inferiores
  const [vendedor, setVendedor] = useState('todas')
  const [cidade, setCidade] = useState('todas')
  const [marca, setMarca] = useState('todas')
  const [categoria, setCategoria] = useState('todas')

  // Estado do gráfico
  const [graficoFiltro, setGraficoFiltro] = useState<'marca' | 'categoria' | 'vendedor' | 'cidade'>('marca')
  const [tipoGrafico, setTipoGrafico] = useState<'barras' | 'linhas'>('barras')

  // Queries para popular os seletores dinamicamente
  const sellersDropdown = useBranchPeriodQuery<any>('/ranking/vendedores', { limit: 100 })
  const brandsDropdown = useBranchPeriodQuery<any>('/ranking/marcas', { limit: 100 })
  const citiesDropdown = useBranchPeriodQuery<any>('/ranking/cidades', { limit: 100 })
  const categoriesDropdown = useBranchPeriodQuery<any>('/ranking/categorias', { limit: 100 })

  // Inicializar datas padrão para o período personalizado
  useEffect(() => {
    if (!customAnaliseStart) {
      const today = new Date().toISOString().slice(0, 10)
      const start = new Date()
      start.setDate(1)
      setCustomAnaliseStart(start.toISOString().slice(0, 10))
      setCustomAnaliseEnd(today)
    }
    if (!customComparacaoStart) {
      const start = new Date()
      start.setFullYear(start.getFullYear() - 1)
      start.setDate(1)
      const end = new Date()
      end.setFullYear(end.getFullYear() - 1)
      setCustomComparacaoStart(start.toISOString().slice(0, 10))
      setCustomComparacaoEnd(end.toISOString().slice(0, 10))
    }
  }, [])

  // Geração de parâmetros de filtro de período com base na seleção
  const buildDateParams = (month: number, year: number) => {
    const pad = (n: number) => String(n).padStart(2, '0')
    const lastDay = new Date(year, month, 0).getDate()
    return {
      start_date: `${year}-${pad(month)}-01`,
      end_date: `${year}-${pad(month)}-${pad(lastDay)}`
    }
  }

  const analiseParams = useMemo(() => {
    const base = tipoPeriodo === 'mes'
      ? buildDateParams(analiseMes, analiseAno)
      : { start_date: customAnaliseStart, end_date: customAnaliseEnd }
    return {
      ...base,
      period: 'custom',
      depto_id: selectedBranch !== 'todas' ? selectedBranch : undefined,
      vendedor: vendedor !== 'todas' ? vendedor : undefined,
      cidade: cidade !== 'todas' ? cidade : undefined,
      marca: marca !== 'todas' ? marca : undefined,
      categoria: categoria !== 'todas' ? categoria : undefined,
      status: status !== 'Todos' ? status : undefined,
      tipo: tipo !== 'Todos' ? tipo : undefined
    }
  }, [tipoPeriodo, analiseMes, analiseAno, customAnaliseStart, customAnaliseEnd, selectedBranch, vendedor, cidade, marca, categoria, status, tipo])

  const comparacaoParams = useMemo(() => {
    const base = tipoPeriodo === 'mes'
      ? buildDateParams(comparacaoMes, comparacaoAno)
      : { start_date: customComparacaoStart, end_date: customComparacaoEnd }
    return {
      ...base,
      period: 'custom',
      depto_id: selectedBranch !== 'todas' ? selectedBranch : undefined,
      vendedor: vendedor !== 'todas' ? vendedor : undefined,
      cidade: cidade !== 'todas' ? cidade : undefined,
      marca: marca !== 'todas' ? marca : undefined,
      categoria: categoria !== 'todas' ? categoria : undefined,
      status: status !== 'Todos' ? status : undefined,
      tipo: tipo !== 'Todos' ? tipo : undefined
    }
  }, [tipoPeriodo, comparacaoMes, comparacaoAno, customComparacaoStart, customComparacaoEnd, selectedBranch, vendedor, cidade, marca, categoria, status, tipo])

  // Queries Reais de Dados do BI para os dois períodos
  const ovAnalise = useBranchPeriodQuery<any>('/estatisticas/overview', analiseParams)
  const ovComparacao = useBranchPeriodQuery<any>('/estatisticas/overview', comparacaoParams)

  const kpiAnalise = useBranchPeriodQuery<any>('/estatisticas/kpis', analiseParams)
  const kpiComparacao = useBranchPeriodQuery<any>('/estatisticas/kpis', comparacaoParams)

  // Ranking Query dinâmica dependendo do filtro selecionado
  const getRankingEndpoint = () => {
    if (graficoFiltro === 'marca') return '/ranking/marcas'
    if (graficoFiltro === 'categoria') return '/ranking/categorias'
    if (graficoFiltro === 'vendedor') return '/ranking/vendedores'
    return '/ranking/cidades'
  }

  const rankAnalise = useBranchPeriodQuery<any>(getRankingEndpoint(), { ...analiseParams, limit: 15 })
  const rankComparacao = useBranchPeriodQuery<any>(getRankingEndpoint(), { ...comparacaoParams, limit: 15 })

  // KPI Faturamento
  const fatAnalise = ovAnalise.data?.mes?.total || 0
  const fatComparacao = ovComparacao.data?.mes?.total || 0
  const fatDiff = fatAnalise - fatComparacao
  const fatPct = fatComparacao > 0 ? (fatDiff / fatComparacao) * 100 : 0

  // KPI Pedidos
  const pedAnalise = kpiAnalise.data?.vendas?.qtd_pedidos || ovAnalise.data?.mes?.qtd || 0
  const pedComparacao = kpiComparacao.data?.vendas?.qtd_pedidos || ovComparacao.data?.mes?.qtd || 0
  const pedDiff = pedAnalise - pedComparacao
  const pedPct = pedComparacao > 0 ? (pedDiff / pedComparacao) * 100 : 0

  // KPI Ticket Médio
  const tktAnalise = kpiAnalise.data?.vendas?.ticket_medio || (pedAnalise > 0 ? fatAnalise / pedAnalise : 0)
  const tktComparacao = kpiComparacao.data?.vendas?.ticket_medio || (pedComparacao > 0 ? fatComparacao / pedComparacao : 0)
  const tktDiff = tktAnalise - tktComparacao
  const tktPct = tktComparacao > 0 ? (tktDiff / tktComparacao) * 100 : 0

  // Combinação dos dados para Gráfico e Tabela
  const chartAndTableData = useMemo(() => {
    const mapAnalise = new Map<string, number>()
    const mapComparacao = new Map<string, number>()

    const listAnalise = rankAnalise.data?.data || []
    const listComparacao = rankComparacao.data?.data || []

    listAnalise.forEach((item: any) => {
      const name = item.nome || item.marca || item.categoria || item.cidade || 'NÃO INFORMADO'
      mapAnalise.set(name, item.total || 0)
    })

    listComparacao.forEach((item: any) => {
      const name = item.nome || item.marca || item.categoria || item.cidade || 'NÃO INFORMADO'
      mapComparacao.set(name, item.total || 0)
    })

    const allNames = Array.from(new Set([
      ...listAnalise.map((item: any) => item.nome || item.marca || item.categoria || item.cidade || 'NÃO INFORMADO'),
      ...listComparacao.map((item: any) => item.nome || item.marca || item.categoria || item.cidade || 'NÃO INFORMADO')
    ]))

    return allNames.map(name => {
      const valAnalise = mapAnalise.get(name) || 0
      const valComparacao = mapComparacao.get(name) || 0
      const diff = valAnalise - valComparacao
      const pct = valComparacao > 0 ? (diff / valComparacao) * 100 : 0

      return {
        name,
        analise: valAnalise,
        comparacao: valComparacao,
        diff,
        pct
      }
    }).sort((a, b) => b.analise - a.analise)
  }, [rankAnalise.data, rankComparacao.data])

  const labelAnalise = tipoPeriodo === 'mes'
    ? `${MONTHS.find(m => m.value === analiseMes)?.label}/${analiseAno}`
    : `${customAnaliseStart?.split('-').reverse().join('/')} - ${customAnaliseEnd?.split('-').reverse().join('/')}`

  const labelComparacao = tipoPeriodo === 'mes'
    ? `${MONTHS.find(m => m.value === comparacaoMes)?.label}/${comparacaoAno}`
    : `${customComparacaoStart?.split('-').reverse().join('/')} - ${customComparacaoEnd?.split('-').reverse().join('/')}`

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      


      {/* FILTER PANEL */}
      <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 space-y-4">
        {/* Top Dropdowns & Pill Mode Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-divider/40 pb-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Empresa */}
            <div className="flex flex-col gap-1">
              <label htmlFor="select-empresa" className="text-[10px] text-text-secondary/70 font-bold uppercase tracking-wider pl-1">EMPRESA</label>
              <div className="relative">
                <select
                  id="select-empresa"
                  aria-label="Empresa"
                  value={selectedBranch}
                  onChange={(e) => {
                    const val = e.target.value
                    setSelectedBranch(val === 'todas' ? 'todas' : parseInt(val, 10))
                  }}
                  className="appearance-none bg-bg-secondary border border-border rounded-xl px-3 py-1.5 text-[11px] font-bold text-text-primary outline-none pr-8 cursor-pointer focus:border-brand-500"
                >
                  <option value="todas">Todas as Empresas</option>
                  {filiais.map(f => <option key={f.depto_id} value={f.depto_id}>{f.nome}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
              </div>
            </div>

            {/* Status */}
            <div className="flex flex-col gap-1">
              <label htmlFor="select-status" className="text-[10px] text-text-secondary/70 font-bold uppercase tracking-wider pl-1">STATUS</label>
              <div className="relative">
                <select
                  id="select-status"
                  aria-label="Status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="appearance-none bg-bg-secondary border border-border rounded-xl px-3 py-1.5 text-[11px] font-bold text-text-primary outline-none pr-8 cursor-pointer focus:border-brand-500"
                >
                  <option value="Todos">Todos os Status</option>
                  <option value="Processado">Processado</option>
                  <option value="Faturado">Faturado</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
              </div>
            </div>

            {/* Tipo */}
            <div className="flex flex-col gap-1">
              <label htmlFor="select-tipo" className="text-[10px] text-text-secondary/70 font-bold uppercase tracking-wider pl-1">TIPO</label>
              <div className="relative">
                <select
                  id="select-tipo"
                  aria-label="Tipo de Venda"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  className="appearance-none bg-bg-secondary border border-border rounded-xl px-3 py-1.5 text-[11px] font-bold text-text-primary outline-none pr-8 cursor-pointer focus:border-brand-500"
                >
                  <option value="Todos">Todos os Tipos</option>
                  <option value="Venda - Devolucao">Venda - Devolucao</option>
                  <option value="Apenas Venda">Apenas Venda</option>
                  <option value="Apenas Devolucao">Apenas Devolucao</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Period Mode Toggle */}
          <div className="bg-bg-secondary p-0.5 rounded-lg flex items-center border border-border">
            <button
              onClick={() => setTipoPeriodo('mes')}
              className={clsx(
                "px-3.5 py-1.5 text-[10px] font-bold rounded-md uppercase tracking-wider transition-all duration-200 cursor-pointer",
                tipoPeriodo === 'mes'
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              )}
            >
              POR MÊS
            </button>
            <button
              onClick={() => setTipoPeriodo('personalizado')}
              className={clsx(
                "px-3.5 py-1.5 text-[10px] font-bold rounded-md uppercase tracking-wider transition-all duration-200 cursor-pointer",
                tipoPeriodo === 'personalizado'
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              )}
            >
              PERSONALIZADO
            </button>
          </div>
        </div>

        {/* Comparison Period Selection Row (Análise vs Comparação) */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 py-2">
          {/* Análise Card */}
          <div className="flex-1 w-full bg-bg-secondary border border-border/80 rounded-2xl p-4 flex flex-col gap-3 relative">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <label className="text-xs font-bold text-text-primary uppercase tracking-widest">PERÍODO DE ANÁLISE</label>
              <span className="text-[10px] text-text-secondary">({tipoPeriodo === 'mes' ? labelAnalise : 'Personalizado'})</span>
            </div>
            
            {tipoPeriodo === 'mes' ? (
              <div className="grid grid-cols-2 gap-3 animate-in fade-in duration-200">
                <div className="flex flex-col gap-1">
                  <label htmlFor="select-analise-mes" className="text-[9px] text-text-secondary/70 font-semibold pl-0.5">MÊS</label>
                  <div className="relative">
                    <select
                      id="select-analise-mes"
                      aria-label="Mês de Análise"
                      value={analiseMes}
                      onChange={(e) => setAnaliseMes(Number(e.target.value))}
                      className="w-full appearance-none bg-bg-primary border border-border rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-text-primary outline-none pr-7 cursor-pointer focus:border-brand-500"
                    >
                      {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                    <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="select-analise-ano" className="text-[9px] text-text-secondary/70 font-semibold pl-0.5">ANO</label>
                  <div className="relative">
                    <select
                      id="select-analise-ano"
                      aria-label="Ano de Análise"
                      value={analiseAno}
                      onChange={(e) => setAnaliseAno(Number(e.target.value))}
                      className="w-full appearance-none bg-bg-primary border border-border rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-text-primary outline-none pr-7 cursor-pointer focus:border-brand-500"
                    >
                      {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 animate-in fade-in duration-200">
                <div className="flex flex-col gap-1">
                  <label htmlFor="input-analise-de" className="text-[9px] text-text-secondary/70 font-semibold pl-0.5">DE</label>
                  <input
                    id="input-analise-de"
                    type="date"
                    value={customAnaliseStart}
                    onChange={(e) => setCustomAnaliseStart(e.target.value)}
                    className="w-full bg-bg-primary border border-border rounded-lg px-3 py-1.5 text-xs font-medium text-text-primary outline-none cursor-pointer focus:border-brand-500"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="input-analise-ate" className="text-[9px] text-text-secondary/70 font-semibold pl-0.5">ATÉ</label>
                  <input
                    id="input-analise-ate"
                    type="date"
                    value={customAnaliseEnd}
                    onChange={(e) => setCustomAnaliseEnd(e.target.value)}
                    className="w-full bg-bg-primary border border-border rounded-lg px-3 py-1.5 text-xs font-medium text-text-primary outline-none cursor-pointer focus:border-brand-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* VS Circle Badge */}
          <div className="w-10 h-10 rounded-full border border-border bg-bg-primary text-text-secondary font-black text-xs flex items-center justify-center shadow-sm select-none shrink-0 lg:my-0 my-2">
            VS
          </div>

          {/* Comparação Card */}
          <div className="flex-1 w-full bg-bg-secondary border border-border/80 rounded-2xl p-4 flex flex-col gap-3 relative">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
              <label className="text-xs font-bold text-text-primary uppercase tracking-widest">PERÍODO DE COMPARAÇÃO</label>
              <span className="text-[10px] text-text-secondary">({tipoPeriodo === 'mes' ? labelComparacao : 'Personalizado'})</span>
            </div>

            {tipoPeriodo === 'mes' ? (
              <div className="grid grid-cols-2 gap-3 animate-in fade-in duration-200">
                <div className="flex flex-col gap-1">
                  <label htmlFor="select-comparacao-mes" className="text-[9px] text-text-secondary/70 font-semibold pl-0.5">MÊS</label>
                  <div className="relative">
                    <select
                      id="select-comparacao-mes"
                      aria-label="Mês de Comparação"
                      value={comparacaoMes}
                      onChange={(e) => setComparacaoMes(Number(e.target.value))}
                      className="w-full appearance-none bg-bg-primary border border-border rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-text-primary outline-none pr-7 cursor-pointer focus:border-brand-500"
                    >
                      {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                    <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="select-comparacao-ano" className="text-[9px] text-text-secondary/70 font-semibold pl-0.5">ANO</label>
                  <div className="relative">
                    <select
                      id="select-comparacao-ano"
                      aria-label="Ano de Comparação"
                      value={comparacaoAno}
                      onChange={(e) => setComparacaoAno(Number(e.target.value))}
                      className="w-full appearance-none bg-bg-primary border border-border rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-text-primary outline-none pr-7 cursor-pointer focus:border-brand-500"
                    >
                      {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 animate-in fade-in duration-200">
                <div className="flex flex-col gap-1">
                  <label htmlFor="input-comparacao-de" className="text-[9px] text-text-secondary/70 font-semibold pl-0.5">DE</label>
                  <input
                    id="input-comparacao-de"
                    type="date"
                    value={customComparacaoStart}
                    onChange={(e) => setCustomComparacaoStart(e.target.value)}
                    className="w-full bg-bg-primary border border-border rounded-lg px-3 py-1.5 text-xs font-medium text-text-primary outline-none cursor-pointer focus:border-brand-500"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="input-comparacao-ate" className="text-[9px] text-text-secondary/70 font-semibold pl-0.5">ATÉ</label>
                  <input
                    id="input-comparacao-ate"
                    type="date"
                    value={customComparacaoEnd}
                    onChange={(e) => setCustomComparacaoEnd(e.target.value)}
                    className="w-full bg-bg-primary border border-border rounded-lg px-3 py-1.5 text-xs font-medium text-text-primary outline-none cursor-pointer focus:border-brand-500"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Filter Row & "COMPARAR" Button */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-3 border-t border-divider/40 items-end">
          {/* Vendedor */}
          <div className="flex flex-col gap-1">
            <label htmlFor="select-vendedor" className="text-[10px] text-text-secondary/70 font-bold uppercase tracking-wider pl-1">VENDEDOR</label>
            <div className="relative">
              <select
                id="select-vendedor"
                aria-label="Vendedor"
                value={vendedor}
                onChange={(e) => setVendedor(e.target.value)}
                className="w-full appearance-none bg-bg-secondary border border-border rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-text-primary outline-none pr-7 cursor-pointer focus:border-brand-500 text-left capitalize"
              >
                <option value="todas">Todos os Vendedores</option>
                {sellersDropdown.data?.data?.map((s: any) => (
                  <option key={s.id || s.nome} value={s.nome}>{s.nome.toLowerCase()}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
            </div>
          </div>

          {/* Cidade */}
          <div className="flex flex-col gap-1">
            <label htmlFor="select-cidade" className="text-[10px] text-text-secondary/70 font-bold uppercase tracking-wider pl-1">CIDADE</label>
            <div className="relative">
              <select
                id="select-cidade"
                aria-label="Cidade"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                className="w-full appearance-none bg-bg-secondary border border-border rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-text-primary outline-none pr-7 cursor-pointer focus:border-brand-500 uppercase"
              >
                <option value="todas">Todas as Cidades</option>
                {citiesDropdown.data?.data?.map((c: any) => (
                  <option key={c.nome || c.cidade} value={c.nome || c.cidade}>{c.nome || c.cidade}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
            </div>
          </div>

          {/* Marca */}
          <div className="flex flex-col gap-1">
            <label htmlFor="select-marca" className="text-[10px] text-text-secondary/70 font-bold uppercase tracking-wider pl-1">MARCA</label>
            <div className="relative">
              <select
                id="select-marca"
                aria-label="Marca"
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
                className="w-full appearance-none bg-bg-secondary border border-border rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-text-primary outline-none pr-7 cursor-pointer focus:border-brand-500 uppercase"
              >
                <option value="todas">Todas as Marcas</option>
                {brandsDropdown.data?.data?.map((m: any) => (
                  <option key={m.nome || m.marca} value={m.nome || m.marca}>{m.nome || m.marca}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
            </div>
          </div>

          {/* Grupo (Categoria) */}
          <div className="flex flex-col gap-1">
            <label htmlFor="select-categoria" className="text-[10px] text-text-secondary/70 font-bold uppercase tracking-wider pl-1">CATEGORIA</label>
            <div className="relative">
              <select
                id="select-categoria"
                aria-label="Categoria"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full appearance-none bg-bg-secondary border border-border rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-text-primary outline-none pr-7 cursor-pointer focus:border-brand-500 uppercase"
              >
                <option value="todas">Todas as Categorias</option>
                {categoriesDropdown.data?.data?.map((c: any) => (
                  <option key={c.nome || c.categoria} value={c.nome || c.categoria}>{c.nome || c.categoria}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
            </div>
          </div>

          {/* Green Comparar Button */}
          <div className="col-span-2 md:col-span-1 h-[36px]">
            <button
              onClick={() => {
                ovAnalise.refetch();
                ovComparacao.refetch();
                kpiAnalise.refetch();
                kpiComparacao.refetch();
                rankAnalise.refetch();
                rankComparacao.refetch();
              }}
              className="w-full h-full bg-[#10B981] hover:bg-emerald-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 text-xs shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer select-none"
            >
              <Play size={14} fill="white" />
              Comparar
            </button>
          </div>
        </div>
      </div>

      {/* TIER 3: COMPARISON KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Faturamento KPI */}
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 flex flex-col justify-between hover:border-blue-500/30 transition-colors">
          <div className="flex items-center gap-2 text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-4 border-b border-divider/30 pb-2">
            <div className="p-1 bg-blue-500/10 rounded-lg text-blue-500"><DollarSign size={14} /></div> FATURAMENTO TOTAL
          </div>
          <div className="space-y-2 flex-1">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                <span className="w-2 h-2 rounded-full bg-blue-500" /> ANÁLISE
              </div>
              <span className="text-xs text-text-muted font-semibold">({tipoPeriodo === 'mes' ? labelAnalise : 'Análise'})</span>
            </div>
            <div className="text-xl font-black text-text-primary">{formatBRL(fatAnalise)}</div>

            <div className="flex justify-between items-center pt-2">
              <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                <span className="w-2 h-2 rounded-full bg-orange-500" /> COMPARAÇÃO
              </div>
              <span className="text-xs text-text-muted font-semibold">({tipoPeriodo === 'mes' ? labelComparacao : 'Comparação'})</span>
            </div>
            <div className="text-xl font-black text-text-primary">{formatBRL(fatComparacao)}</div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <div className={clsx(
              "px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1",
              fatPct >= 0 ? "bg-success/15 text-success" : "bg-danger/15 text-danger"
            )}>
              {fatPct >= 0 ? '+' : ''}{fatPct.toFixed(2)}%
            </div>
            <div className="text-[10px] text-text-secondary font-bold">
              Dif: <span className={clsx("font-extrabold", fatDiff >= 0 ? "text-success" : "text-danger")}>
                {fatDiff >= 0 ? '+' : ''}{formatBRL(fatDiff)}
              </span>
            </div>
          </div>
        </div>

        {/* Quantidade Pedidos KPI */}
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 flex flex-col justify-between hover:border-emerald-500/30 transition-colors">
          <div className="flex items-center gap-2 text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-4 border-b border-divider/30 pb-2">
            <div className="p-1 bg-emerald-500/10 rounded-lg text-emerald-500"><ShoppingBag size={14} /></div> QUANTIDADE DE PEDIDOS
          </div>
          <div className="space-y-2 flex-1">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                <span className="w-2 h-2 rounded-full bg-blue-500" /> ANÁLISE
              </div>
              <span className="text-xs text-text-muted font-semibold">({tipoPeriodo === 'mes' ? labelAnalise : 'Análise'})</span>
            </div>
            <div className="text-xl font-black text-text-primary">{formatNum(pedAnalise)}</div>

            <div className="flex justify-between items-center pt-2">
              <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                <span className="w-2 h-2 rounded-full bg-orange-500" /> COMPARAÇÃO
              </div>
              <span className="text-xs text-text-muted font-semibold">({tipoPeriodo === 'mes' ? labelComparacao : 'Comparação'})</span>
            </div>
            <div className="text-xl font-black text-text-primary">{formatNum(pedComparacao)}</div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <div className={clsx(
              "px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1",
              pedPct >= 0 ? "bg-success/15 text-success" : "bg-danger/15 text-danger"
            )}>
              {pedPct >= 0 ? '+' : ''}{pedPct.toFixed(2)}%
            </div>
            <div className="text-[10px] text-text-secondary font-bold">
              Dif: <span className={clsx("font-extrabold", pedDiff >= 0 ? "text-success" : "text-danger")}>
                {pedDiff >= 0 ? '+' : ''}{formatNum(pedDiff)} ped.
              </span>
            </div>
          </div>
        </div>

        {/* Ticket Médio KPI */}
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 flex flex-col justify-between hover:border-warning/30 transition-colors">
          <div className="flex items-center gap-2 text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-4 border-b border-divider/30 pb-2">
            <div className="p-1 bg-warning/10 rounded-lg text-warning"><Award size={14} /></div> TICKET MÉDIO
          </div>
          <div className="space-y-2 flex-1">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                <span className="w-2 h-2 rounded-full bg-blue-500" /> ANÁLISE
              </div>
              <span className="text-xs text-text-muted font-semibold">({tipoPeriodo === 'mes' ? labelAnalise : 'Análise'})</span>
            </div>
            <div className="text-xl font-black text-text-primary">{formatBRL(tktAnalise)}</div>

            <div className="flex justify-between items-center pt-2">
              <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                <span className="w-2 h-2 rounded-full bg-orange-500" /> COMPARAÇÃO
              </div>
              <span className="text-xs text-text-muted font-semibold">({tipoPeriodo === 'mes' ? labelComparacao : 'Comparação'})</span>
            </div>
            <div className="text-xl font-black text-text-primary">{formatBRL(tktComparacao)}</div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <div className={clsx(
              "px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1",
              tktPct >= 0 ? "bg-success/15 text-success" : "bg-danger/15 text-danger"
            )}>
              {tktPct >= 0 ? '+' : ''}{tktPct.toFixed(2)}%
            </div>
            <div className="text-[10px] text-text-secondary font-bold">
              Dif: <span className={clsx("font-extrabold", tktDiff >= 0 ? "text-success" : "text-danger")}>
                {tktDiff >= 0 ? '+' : ''}{formatBRL(tktDiff)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* TIER 4: VARIATION CHART CARD */}
      <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 flex flex-col">
        {/* Header Tabs for Chart selection */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6 border-b border-divider/40 pb-4">
          <div>
            <h3 className="font-extrabold text-text-primary text-xs uppercase tracking-widest">
              Variação de Faturamento ({tipoPeriodo === 'mes' ? `${labelAnalise.toUpperCase()} VS ${labelComparacao.toUpperCase()}` : 'Período Personalizado'})
            </h3>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Group selectors */}
            <div className="bg-bg-secondary p-0.5 rounded-lg flex items-center border border-border">
              <button
                onClick={() => setGraficoFiltro('marca')}
                className={clsx(
                  "px-3 py-1.5 text-[9px] font-extrabold rounded-md uppercase tracking-wider transition-all duration-150 cursor-pointer",
                  graficoFiltro === 'marca' ? "bg-bg-primary text-brand-600 dark:text-brand-400 shadow-sm" : "text-text-secondary hover:text-text-primary"
                )}
              >
                POR MARCA
              </button>
              <button
                onClick={() => setGraficoFiltro('categoria')}
                className={clsx(
                  "px-3 py-1.5 text-[9px] font-extrabold rounded-md uppercase tracking-wider transition-all duration-150 cursor-pointer",
                  graficoFiltro === 'categoria' ? "bg-bg-primary text-brand-600 dark:text-brand-400 shadow-sm" : "text-text-secondary hover:text-text-primary"
                )}
              >
                POR CATEGORIA
              </button>
              <button
                onClick={() => setGraficoFiltro('vendedor')}
                className={clsx(
                  "px-3 py-1.5 text-[9px] font-extrabold rounded-md uppercase tracking-wider transition-all duration-150 cursor-pointer",
                  graficoFiltro === 'vendedor' ? "bg-bg-primary text-brand-600 dark:text-brand-400 shadow-sm" : "text-text-secondary hover:text-text-primary"
                )}
              >
                POR VENDEDOR
              </button>
              <button
                onClick={() => setGraficoFiltro('cidade')}
                className={clsx(
                  "px-3 py-1.5 text-[9px] font-extrabold rounded-md uppercase tracking-wider transition-all duration-150 cursor-pointer",
                  graficoFiltro === 'cidade' ? "bg-bg-primary text-brand-600 dark:text-brand-400 shadow-sm" : "text-text-secondary hover:text-text-primary"
                )}
              >
                POR CIDADE
              </button>
            </div>

            {/* Type Chart Toggle */}
            <div className="bg-bg-secondary p-0.5 rounded-lg flex items-center border border-border">
              <button
                onClick={() => setTipoGrafico('barras')}
                className={clsx(
                  "px-3 py-1.5 text-[9px] font-extrabold rounded-md uppercase tracking-wider transition-all duration-150 cursor-pointer",
                  tipoGrafico === 'barras' ? "bg-bg-primary text-brand-600 dark:text-brand-400 shadow-sm" : "text-text-secondary hover:text-text-primary"
                )}
              >
                GRÁFICO DE BARRAS
              </button>
              <button
                onClick={() => setTipoGrafico('linhas')}
                className={clsx(
                  "px-3 py-1.5 text-[9px] font-extrabold rounded-md uppercase tracking-wider transition-all duration-150 cursor-pointer",
                  tipoGrafico === 'linhas' ? "bg-bg-primary text-brand-600 dark:text-brand-400 shadow-sm" : "text-text-secondary hover:text-text-primary"
                )}
              >
                GRÁFICO DE LINHAS
              </button>
            </div>
            
            <button className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-secondary rounded-lg border border-border transition-colors">
              <Maximize2 size={12} />
            </button>
          </div>
        </div>

        {/* Legend container */}
        <div className="flex flex-wrap items-center justify-center gap-6 mb-4 text-xs font-bold select-none">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-blue-500 rounded" />
            <span className="text-text-secondary">Período de Análise ({tipoPeriodo === 'mes' ? labelAnalise : 'Análise'})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-orange-500 rounded" />
            <span className="text-text-secondary">Período de Comparação ({tipoPeriodo === 'mes' ? labelComparacao : 'Comparação'})</span>
          </div>
        </div>

        {/* Recharts variation chart */}
        <div className="h-[250px] sm:h-[350px] lg:h-[400px]">
          {rankAnalise.isLoading || rankComparacao.isLoading ? (
            <div className="h-full flex items-center justify-center text-xs text-text-secondary">Carregando dados comparativos...</div>
          ) : chartAndTableData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-text-secondary">Sem faturamento registrado para os parâmetros selecionados</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {tipoGrafico === 'barras' ? (
                <BarChart data={chartAndTableData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.4} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 9, fill: 'var(--color-text-secondary)', fontWeight: 700 }}
                    angle={-25}
                    textAnchor="end"
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 9, fill: 'var(--color-text-secondary)', fontWeight: 700 }} 
                    tickFormatter={formatBRLCompact}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-bg-tertiary)', opacity: 0.3 }} />
                  <Bar dataKey="analise" name={`Análise (${tipoPeriodo === 'mes' ? labelAnalise : 'Análise'})`} fill="#3B82F6" radius={[3, 3, 0, 0]} maxBarSize={16} />
                  <Bar dataKey="comparacao" name={`Comparação (${tipoPeriodo === 'mes' ? labelComparacao : 'Comparação'})`} fill="#F97316" radius={[3, 3, 0, 0]} maxBarSize={16} />
                </BarChart>
              ) : (
                <LineChart data={chartAndTableData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.4} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 9, fill: 'var(--color-text-secondary)', fontWeight: 700 }}
                    angle={-25}
                    textAnchor="end"
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 9, fill: 'var(--color-text-secondary)', fontWeight: 700 }}
                    tickFormatter={formatBRLCompact}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="analise" name={`Análise (${tipoPeriodo === 'mes' ? labelAnalise : 'Análise'})`} stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="comparacao" name={`Comparação (${tipoPeriodo === 'mes' ? labelComparacao : 'Comparação'})`} stroke="#F97316" strokeWidth={2.5} dot={{ r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} />
                </LineChart>
              )}
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* TIER 5: DATA TABLE */}
      <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 flex flex-col">
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-divider/40">
          <h3 className="font-extrabold text-text-primary text-xs uppercase tracking-widest">
            Detalhamento do Comparativo
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap" aria-label="Tabela Comparativa Detalhada">
            <thead>
              <tr className="border-b border-divider text-[10px] text-text-secondary/70 uppercase font-black tracking-wider">
                <th className="pb-3 px-2">
                  {graficoFiltro === 'marca' ? 'MARCA' : graficoFiltro === 'categoria' ? 'CATEGORIA' : graficoFiltro === 'vendedor' ? 'VENDEDOR' : 'CIDADE'}
                </th>
                <th className="pb-3 px-2 text-right">PERÍODO DE ANÁLISE</th>
                <th className="pb-3 px-2 text-right">PERÍODO DE COMPARAÇÃO</th>
                <th className="pb-3 px-2 text-right font-black">DIFERENÇA (R$)</th>
                <th className="pb-3 px-2 text-right font-black">VARIAÇÃO (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider/30 text-[11px]">
              {rankAnalise.isLoading || rankComparacao.isLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-text-secondary">Carregando detalhamento...</td>
                </tr>
              ) : chartAndTableData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-text-secondary">Nenhum dado comercial encontrado para esta seleção.</td>
                </tr>
              ) : (
                chartAndTableData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-bg-secondary/40 transition-colors">
                    <td className="py-3 px-2 font-bold text-text-primary uppercase">{row.name}</td>
                    <td className="py-3 px-2 text-right text-text-secondary">{formatBRL(row.analise)}</td>
                    <td className="py-3 px-2 text-right text-text-secondary">{formatBRL(row.comparacao)}</td>
                    <td className={clsx(
                      "py-3 px-2 text-right font-extrabold",
                      row.diff >= 0 ? "text-success" : "text-danger"
                    )}>
                      {row.diff >= 0 ? '+' : ''}{formatBRL(row.diff)}
                    </td>
                    <td className="py-3 px-2 text-right font-bold">
                      <div className="flex items-center justify-end gap-2">
                        <span className={row.pct >= 0 ? "text-success" : "text-danger"}>
                          {row.pct >= 0 ? '+' : ''}{row.pct.toFixed(2)}%
                        </span>
                        {/* Pequeno indicador visual de variação */}
                        <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shrink-0 hidden sm:block">
                          <div 
                            className={clsx("h-full rounded-full", row.pct >= 0 ? "bg-success" : "bg-danger")}
                            style={{ width: `${Math.min(Math.abs(row.pct), 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
