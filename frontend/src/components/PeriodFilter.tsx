import { usePeriodStore, PERIOD_OPTIONS, type PeriodKey } from '../store/periodStore'
import clsx from 'clsx'
import { useState } from 'react'

interface Props {
  excludePeriods?: PeriodKey[]
  compact?: boolean
  className?: string
}

export default function PeriodFilter({ excludePeriods = [], compact = false, className }: Props) {
  const period = usePeriodStore((s) => s.period)
  const startDate = usePeriodStore((s) => s.startDate)
  const endDate = usePeriodStore((s) => s.endDate)
  const setPeriod = usePeriodStore((s) => s.setPeriod)
  const setCustomRange = usePeriodStore((s) => s.setCustomRange)
  const [showCustom, setShowCustom] = useState(period === 'custom')

  const handleClick = (p: PeriodKey) => {
    if (p === 'custom') {
      setShowCustom(true)
      setPeriod('custom')
      if (!startDate || !endDate) {
        const today = new Date().toISOString().slice(0, 10)
        const monthAgo = new Date()
        monthAgo.setDate(monthAgo.getDate() - 30)
        setCustomRange(monthAgo.toISOString().slice(0, 10), today)
      }
    } else {
      setShowCustom(false)
      setPeriod(p)
    }
  }

  return (
    <div
      className={clsx(
        'max-w-full min-w-0 bg-slate-100/80 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/70',
        compact ? 'p-0.5 rounded-lg' : 'p-1 rounded-xl',
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-1 select-none">
        {PERIOD_OPTIONS.filter((opt) => !excludePeriods.includes(opt.key)).map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => handleClick(opt.key)}
            className={clsx(
              'font-bold tracking-wide uppercase transition-all duration-150 whitespace-nowrap flex items-center justify-center cursor-pointer leading-tight',
              compact
                ? 'px-2 py-1 text-[10px] rounded-md'
                : 'px-2.5 py-1 text-[10px] xl:text-[11px] rounded-lg',
              period === opt.key
                ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-700'
                : 'bg-transparent text-text-secondary hover:text-text-primary hover:bg-white/60 dark:hover:bg-slate-700/50'
            )}
          >
            {opt.label}
          </button>
        ))}

        {(showCustom || period === 'custom') && period === 'custom' && (() => {
          const startMonth = startDate ? parseInt(startDate.split('-')[1], 10) : new Date().getMonth() + 1
          const startYear = startDate ? parseInt(startDate.split('-')[0], 10) : new Date().getFullYear()
          const endMonth = endDate ? parseInt(endDate.split('-')[1], 10) : new Date().getMonth() + 1
          const endYear = endDate ? parseInt(endDate.split('-')[0], 10) : new Date().getFullYear()
          const years = Array.from({ length: 10 }, (_, i) => 2020 + i)

          const handleCustomDateChange = (sM: number, sY: number, eM: number, eY: number) => {
            const startStr = `${sY}-${String(sM).padStart(2, '0')}-01`
            const lastDay = new Date(eY, eM, 0).getDate()
            const endStr = `${eY}-${String(eM).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
            setCustomRange(startStr, endStr)
          }

          return (
            <div className="flex items-center gap-1.5 flex-wrap pl-1.5 ml-0.5 border-l border-slate-300/70 dark:border-slate-600 text-[11px]">
              <span className="font-bold text-text-secondary uppercase text-[9.5px]">De</span>
              <select
                value={startMonth}
                onChange={(e) => handleCustomDateChange(parseInt(e.target.value, 10), startYear, endMonth, endYear)}
                className="h-6 bg-white dark:bg-slate-900 border border-divider text-text-primary rounded-md px-1.5 text-[11px] outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer font-bold"
                aria-label="Mês de Início"
              >
                {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].map((m, idx) => (
                  <option key={m} value={idx + 1}>{m}</option>
                ))}
              </select>
              <select
                value={startYear}
                onChange={(e) => handleCustomDateChange(startMonth, parseInt(e.target.value, 10), endMonth, endYear)}
                className="h-6 bg-white dark:bg-slate-900 border border-divider text-text-primary rounded-md px-1.5 text-[11px] outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer font-bold"
                aria-label="Ano de Início"
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>

              <span className="font-bold text-text-secondary uppercase text-[9.5px]">Até</span>
              <select
                value={endMonth}
                onChange={(e) => handleCustomDateChange(startMonth, startYear, parseInt(e.target.value, 10), endYear)}
                className="h-6 bg-white dark:bg-slate-900 border border-divider text-text-primary rounded-md px-1.5 text-[11px] outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer font-bold"
                aria-label="Mês de Término"
              >
                {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].map((m, idx) => (
                  <option key={m} value={idx + 1}>{m}</option>
                ))}
              </select>
              <select
                value={endYear}
                onChange={(e) => handleCustomDateChange(startMonth, startYear, endMonth, parseInt(e.target.value, 10))}
                className="h-6 bg-white dark:bg-slate-900 border border-divider text-text-primary rounded-md px-1.5 text-[11px] outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer font-bold"
                aria-label="Ano de Término"
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
