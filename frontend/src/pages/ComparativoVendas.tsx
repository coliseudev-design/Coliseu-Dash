import { useState, useMemo } from 'react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts'
import {
  DollarSign, ShoppingBag, Award, GitCompare, Play, Maximize2, ChevronDown
} from 'lucide-react'
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
  // Filtros de cabeçalho
  const [empresa, setEmpresa] = useState('Todas as Empresas')
  const [status, setStatus] = useState('Processado')
  const [tipo, setTipo] = useState('Venda - Devolucao')
  const [tipoPeriodo, setTipoPeriodo] = useState<'mes' | 'personalizado'>('mes')

  // Períodos de Comparação
  const [analiseMes, setAnaliseMes] = useState(6) // Junho
  const [analiseAno, setAnaliseAno] = useState(2026)
  const [comparacaoMes, setComparacaoMes] = useState(6) // Junho
  const [comparacaoAno, setComparacaoAno] = useState(2025)

  // Filtros inferiores
  const [vendedor, setVendedor] = useState('Todos')
  const [cidade, setCidade] = useState('Todas')
  const [marca, setMarca] = useState('Todas')
  const [categoria, setCategoria] = useState('Todas')

  // Estado do gráfico
  const [graficoFiltro, setGraficoFiltro] = useState<'marca' | 'categoria' | 'vendedor' | 'cidade'>('marca')
  const [tipoGrafico, setTipoGrafico] = useState<'barras' | 'linhas'>('barras')

  // Controle de simulação de dados dinâmicos ao clicar em "COMPARAR"
  const [compararTrigger, setCompararTrigger] = useState(0)

  const handleComparar = () => {
    setCompararTrigger((prev) => prev + 1)
  }

  // Geração de dados de simulação consistentes e baseados nas seleções de período
  const mockKPIs = useMemo(() => {
    // Fatores de escala baseados no ano/mês para dinamismo
    const scaleAnalise = (analiseMes * 0.05) + (analiseAno === 2026 ? 1.05 : 0.95)
    const scaleComparacao = (comparacaoMes * 0.05) + (comparacaoAno === 2026 ? 1.05 : 0.95)

    const fatAnalise = 1914275.40 * scaleAnalise
    const fatComparacao = 1914275.40 * scaleComparacao
    const fatDiff = fatAnalise - fatComparacao
    const fatPct = fatComparacao > 0 ? (fatDiff / fatComparacao) * 100 : 0

    const pedAnalise = Math.round(568 * scaleAnalise)
    const pedComparacao = Math.round(568 * scaleComparacao)
    const pedDiff = pedAnalise - pedComparacao
    const pedPct = pedComparacao > 0 ? (pedDiff / pedComparacao) * 100 : 0

    const tktAnalise = fatAnalise / pedAnalise
    const tktComparacao = fatComparacao / pedComparacao
    const tktDiff = tktAnalise - tktComparacao
    const tktPct = tktComparacao > 0 ? (tktDiff / tktComparacao) * 100 : 0

    return {
      faturamento: { analise: fatAnalise, comparacao: fatComparacao, diff: fatDiff, pct: fatPct },
      pedidos: { analise: pedAnalise, comparacao: pedComparacao, diff: pedDiff, pct: pedPct },
      ticket: { analise: tktAnalise, comparacao: tktComparacao, diff: tktDiff, pct: tktPct }
    }
  }, [analiseMes, analiseAno, comparacaoMes, comparacaoAno, compararTrigger])

  // Dados do Gráfico e da Tabela
  const chartAndTableData = useMemo(() => {
    const scaleAnalise = (analiseMes * 0.05) + (analiseAno === 2026 ? 1.05 : 0.95)
    const scaleComparacao = (comparacaoMes * 0.05) + (comparacaoAno === 2026 ? 1.05 : 0.95)

    let items: string[] = []
    if (graficoFiltro === 'marca') {
      items = [
        'TOPSEED GARDEN', 'ZOETIS GRANDES', 'VAXXINOVA GRANDE ANIMAIS', 'UCB VET',
        'ENVU ENVIRONMENTAL SCIENCE', 'OUROFINO SAUDE ANIMAL', 'MSD GRANDES ANIMAIS',
        'CALBOS VETERINARIA', 'HOFFNER', 'JA SAUDE ANIMAL', 'PEARSON SAUDE ANIMAL',
        'TOPSEED SEMENTES', 'AGENAS UNIAO', 'BRAVET', 'ELANCO GRANDES ANIMAIS',
        'BIMEDA', 'SALDANHA RODRIGUES', 'BIOFARM', 'BOEHRINGER INGELHEIM', 'SANTA MARINA INDUSTRIA'
      ]
    } else if (graficoFiltro === 'categoria') {
      items = ['ANTIBIOTICOS', 'ECTOPARASITICIDAS', 'ENDOPARASITICIDAS', 'VACINAS', 'VITAMINAS', 'SUPLEMENTOS', 'HIGIENE', 'RACAO']
    } else if (graficoFiltro === 'vendedor') {
      items = ['JAIME FERNANDES', 'PRISCILLA MIRANDA', 'MARCOS SANTO', 'ALEXANDRE SOARES', 'JOYCE LYNNE', 'THIAGO YOSHIMOTO', 'PAMELA MOTTA']
    } else {
      items = ['CAMPO GRANDE', 'COXIM', 'CORUMBA', 'PONTA PORA', 'SAO GABRIEL DO OESTE', 'SIDROLANDIA', 'NAVIRAI', 'BONITO']
    }

    // Base values
    return items.map((name, index) => {
      const baseValue = 350000 / (index + 1)
      const valueAnalise = baseValue * scaleAnalise * (1 + (Math.sin(index) * 0.1))
      const valueComparacao = baseValue * scaleComparacao * (1 + (Math.cos(index) * 0.1))
      const diff = valueAnalise - valueComparacao
      const pct = valueComparacao > 0 ? (diff / valueComparacao) * 100 : 0

      return {
        name,
        analise: valueAnalise,
        comparacao: valueComparacao,
        diff,
        pct
      }
    })
  }, [graficoFiltro, analiseMes, analiseAno, comparacaoMes, comparacaoAno, compararTrigger])

  const labelAnalise = `${MONTHS.find(m => m.value === analiseMes)?.label}/${analiseAno}`
  const labelComparacao = `${MONTHS.find(m => m.value === comparacaoMes)?.label}/${comparacaoAno}`

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <GitCompare className="text-brand-500" /> Comparativo de Vendas
          </h2>
          <p className="text-xs text-text-secondary mt-1">
            Analise o desempenho entre dois períodos distintos.
          </p>
        </div>
      </div>

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
                  value={empresa}
                  onChange={(e) => setEmpresa(e.target.value)}
                  className="bg-bg-secondary border border-border rounded-xl px-4 py-2 text-xs font-semibold text-text-primary outline-none pr-8 cursor-pointer focus:border-brand-500"
                >
                  <option>Todas as Empresas</option>
                  <option>Vetmais</option>
                  <option>Vetseed</option>
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
                  className="bg-bg-secondary border border-border rounded-xl px-4 py-2 text-xs font-semibold text-text-primary outline-none pr-8 cursor-pointer focus:border-brand-500"
                >
                  <option>Processado</option>
                  <option>Faturado</option>
                  <option>Cancelado</option>
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
                  className="bg-bg-secondary border border-border rounded-xl px-4 py-2 text-xs font-semibold text-text-primary outline-none pr-8 cursor-pointer focus:border-brand-500"
                >
                  <option>Venda - Devolucao</option>
                  <option>Apenas Venda</option>
                  <option>Apenas Devolucao</option>
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
              <span className="text-[10px] text-text-secondary">({labelAnalise})</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="select-analise-mes" className="text-[9px] text-text-secondary/70 font-semibold pl-0.5">MÊS</label>
                <div className="relative">
                  <select
                    id="select-analise-mes"
                    aria-label="Mês de Análise"
                    value={analiseMes}
                    onChange={(e) => setAnaliseMes(Number(e.target.value))}
                    className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-xs font-medium text-text-primary outline-none pr-8 cursor-pointer focus:border-brand-500"
                  >
                    {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
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
                    className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-xs font-medium text-text-primary outline-none pr-8 cursor-pointer focus:border-brand-500"
                  >
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
                </div>
              </div>
            </div>
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
              <span className="text-[10px] text-text-secondary">({labelComparacao})</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="select-comparacao-mes" className="text-[9px] text-text-secondary/70 font-semibold pl-0.5">MÊS</label>
                <div className="relative">
                  <select
                    id="select-comparacao-mes"
                    aria-label="Mês de Comparação"
                    value={comparacaoMes}
                    onChange={(e) => setComparacaoMes(Number(e.target.value))}
                    className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-xs font-medium text-text-primary outline-none pr-8 cursor-pointer focus:border-brand-500"
                  >
                    {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
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
                    className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-xs font-medium text-text-primary outline-none pr-8 cursor-pointer focus:border-brand-500"
                  >
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
                </div>
              </div>
            </div>
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
                className="w-full bg-bg-secondary border border-border rounded-xl px-3 py-2 text-xs font-semibold text-text-primary outline-none pr-8 cursor-pointer focus:border-brand-500"
              >
                <option>Todos</option>
                <option>Jaime Fernandes</option>
                <option>Priscilla Miranda</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
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
                className="w-full bg-bg-secondary border border-border rounded-xl px-3 py-2 text-xs font-semibold text-text-primary outline-none pr-8 cursor-pointer focus:border-brand-500"
              >
                <option>Todas</option>
                <option>Campo Grande</option>
                <option>Coxim</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
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
                className="w-full bg-bg-secondary border border-border rounded-xl px-3 py-2 text-xs font-semibold text-text-primary outline-none pr-8 cursor-pointer focus:border-brand-500"
              >
                <option>Todas</option>
                <option>Topseed</option>
                <option>Zoetis</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
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
                className="w-full bg-bg-secondary border border-border rounded-xl px-3 py-2 text-xs font-semibold text-text-primary outline-none pr-8 cursor-pointer focus:border-brand-500"
              >
                <option>Todas</option>
                <option>Antibioticos</option>
                <option>Ectoparasiticidas</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
            </div>
          </div>

          {/* Green Comparar Button */}
          <button
            onClick={handleComparar}
            className="col-span-2 md:col-span-1 bg-[#10B981] hover:bg-emerald-600 text-white font-bold rounded-xl px-4 py-2 flex items-center justify-center gap-2 text-xs transition-all duration-150 h-[36px] shadow-sm active:scale-[0.98] cursor-pointer"
          >
            <Play size={14} fill="white" />
            COMPARAR
          </button>
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
              <span className="text-xs text-text-muted font-semibold">({labelAnalise})</span>
            </div>
            <div className="text-xl font-black text-text-primary">{formatBRL(mockKPIs.faturamento.analise)}</div>

            <div className="flex justify-between items-center pt-2">
              <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                <span className="w-2 h-2 rounded-full bg-orange-500" /> COMPARAÇÃO
              </div>
              <span className="text-xs text-text-muted font-semibold">({labelComparacao})</span>
            </div>
            <div className="text-xl font-black text-text-primary">{formatBRL(mockKPIs.faturamento.comparacao)}</div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <div className={clsx(
              "px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1",
              mockKPIs.faturamento.pct >= 0 ? "bg-success/15 text-success" : "bg-danger/15 text-danger"
            )}>
              {mockKPIs.faturamento.pct >= 0 ? '+' : ''}{mockKPIs.faturamento.pct.toFixed(2)}%
            </div>
            <div className="text-[10px] text-text-secondary font-bold">
              Dif: <span className={clsx("font-extrabold", mockKPIs.faturamento.diff >= 0 ? "text-success" : "text-danger")}>
                {mockKPIs.faturamento.diff >= 0 ? '+' : ''}{formatBRL(mockKPIs.faturamento.diff)}
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
              <span className="text-xs text-text-muted font-semibold">({labelAnalise})</span>
            </div>
            <div className="text-xl font-black text-text-primary">{formatNum(mockKPIs.pedidos.analise)}</div>

            <div className="flex justify-between items-center pt-2">
              <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                <span className="w-2 h-2 rounded-full bg-orange-500" /> COMPARAÇÃO
              </div>
              <span className="text-xs text-text-muted font-semibold">({labelComparacao})</span>
            </div>
            <div className="text-xl font-black text-text-primary">{formatNum(mockKPIs.pedidos.comparacao)}</div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <div className={clsx(
              "px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1",
              mockKPIs.pedidos.pct >= 0 ? "bg-success/15 text-success" : "bg-danger/15 text-danger"
            )}>
              {mockKPIs.pedidos.pct >= 0 ? '+' : ''}{mockKPIs.pedidos.pct.toFixed(2)}%
            </div>
            <div className="text-[10px] text-text-secondary font-bold">
              Dif: <span className={clsx("font-extrabold", mockKPIs.pedidos.diff >= 0 ? "text-success" : "text-danger")}>
                {mockKPIs.pedidos.diff >= 0 ? '+' : ''}{formatNum(mockKPIs.pedidos.diff)} ped.
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
              <span className="text-xs text-text-muted font-semibold">({labelAnalise})</span>
            </div>
            <div className="text-xl font-black text-text-primary">{formatBRL(mockKPIs.ticket.analise)}</div>

            <div className="flex justify-between items-center pt-2">
              <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                <span className="w-2 h-2 rounded-full bg-orange-500" /> COMPARAÇÃO
              </div>
              <span className="text-xs text-text-muted font-semibold">({labelComparacao})</span>
            </div>
            <div className="text-xl font-black text-text-primary">{formatBRL(mockKPIs.ticket.comparacao)}</div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <div className={clsx(
              "px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1",
              mockKPIs.ticket.pct >= 0 ? "bg-success/15 text-success" : "bg-danger/15 text-danger"
            )}>
              {mockKPIs.ticket.pct >= 0 ? '+' : ''}{mockKPIs.ticket.pct.toFixed(2)}%
            </div>
            <div className="text-[10px] text-text-secondary font-bold">
              Dif: <span className={clsx("font-extrabold", mockKPIs.ticket.diff >= 0 ? "text-success" : "text-danger")}>
                {mockKPIs.ticket.diff >= 0 ? '+' : ''}{formatBRL(mockKPIs.ticket.diff)}
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
              Variação de Faturamento ({labelAnalise.toUpperCase()} VS {labelComparacao.toUpperCase()})
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
            <span className="text-text-secondary">Período de Análise ({labelAnalise})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-orange-500 rounded" />
            <span className="text-text-secondary">Período de Comparação ({labelComparacao})</span>
          </div>
        </div>

        {/* Recharts variation chart */}
        <div className="h-[250px] sm:h-[350px] lg:h-[400px]">
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
                <Bar dataKey="analise" name={`Análise (${labelAnalise})`} fill="#3B82F6" radius={[3, 3, 0, 0]} maxBarSize={16} />
                <Bar dataKey="comparacao" name={`Comparação (${labelComparacao})`} fill="#F97316" radius={[3, 3, 0, 0]} maxBarSize={16} />
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
                <Line type="monotone" dataKey="analise" name={`Análise (${labelAnalise})`} stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="comparacao" name={`Comparação (${labelComparacao})`} stroke="#F97316" strokeWidth={2.5} dot={{ r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} />
              </LineChart>
            )}
          </ResponsiveContainer>
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
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-divider text-[10px] text-text-secondary/70 uppercase font-black tracking-wider">
                <th className="pb-3 px-2">
                  {graficoFiltro === 'marca' ? 'MARCA' : graficoFiltro === 'categoria' ? 'CATEGORIA' : graficoFiltro === 'vendedor' ? 'VENDEDOR' : 'CIDADE'}
                </th>
                <th className="pb-3 px-2 text-right">PERÍODO DE ANÁLISE ({labelAnalise})</th>
                <th className="pb-3 px-2 text-right">PERÍODO DE COMPARAÇÃO ({labelComparacao})</th>
                <th className="pb-3 px-2 text-right font-black">DIFERENÇA (R$)</th>
                <th className="pb-3 px-2 text-right font-black">VARIAÇÃO (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider/30 text-[11px]">
              {chartAndTableData.map((row, idx) => (
                <tr key={idx} className="hover:bg-bg-secondary/40 transition-colors">
                  <td className="py-3 px-2 font-bold text-text-primary">{row.name}</td>
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
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
