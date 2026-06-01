import { usePeriodStore, PERIOD_OPTIONS, type PeriodKey } from '../store/periodStore'
import { Calendar } from 'lucide-react'
import clsx from 'clsx'
import { useState } from 'react'

interface Props {
  excludePeriods?: PeriodKey[]
  compact?: boolean
}

export default function PeriodFilter({ excludePeriods = [], compact = false }: Props) {
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
    <div className={clsx(
      "w-full sm:w-auto max-w-full min-w-0 bg-bg-secondary/40 border border-divider/50 shadow-sm",
      compact ? "p-1 rounded-xl" : "p-1.5 rounded-2xl"
    )}>
      <div className="flex flex-wrap items-center gap-1.5 w-full">
        {PERIOD_OPTIONS.filter(opt => !excludePeriods.includes(opt.key)).map((opt) => (
          <button
            key={opt.key}
            onClick={() => handleClick(opt.key)}
            className={clsx(
              'font-black tracking-wider uppercase transition-all duration-200 whitespace-nowrap flex items-center justify-center flex-shrink-0 cursor-pointer',
              compact 
                ? 'px-2.5 py-1.5 text-[9px] rounded-lg' 
                : 'px-4 py-2.5 sm:py-2 text-[11px] md:text-xs rounded-xl',
              period === opt.key
                ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/15 scale-[1.02]'
                : 'bg-transparent text-text-secondary hover:text-text-primary hover:bg-bg-primary/40 border border-transparent active:scale-[0.98]',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {showCustom && period === 'custom' && (
        <div className="mt-3 pt-3 border-t border-divider/40 flex items-center gap-3 flex-wrap animate-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-1.5 flex-1 min-w-[120px]">
            <label htmlFor="start-date" className="text-[10px] font-bold text-text-secondary uppercase">De:</label>
            <input
              id="start-date"
              type="date"
              className="px-2.5 py-1.5 bg-bg-secondary border border-divider text-text-primary rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-500 transition-all duration-300 w-full cursor-pointer"
              value={startDate || ''}
              onChange={(e) => setCustomRange(e.target.value, endDate || e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1.5 flex-1 min-w-[120px]">
            <label htmlFor="end-date" className="text-[10px] font-bold text-text-secondary uppercase">Até:</label>
            <input
              id="end-date"
              type="date"
              className="px-2.5 py-1.5 bg-bg-secondary border border-divider text-text-primary rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-500 transition-all duration-300 w-full cursor-pointer"
              value={endDate || ''}
              onChange={(e) => setCustomRange(startDate || e.target.value, e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
