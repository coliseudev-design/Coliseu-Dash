import { usePeriodStore, PERIOD_OPTIONS, type PeriodKey } from '../store/periodStore'
import { Calendar } from 'lucide-react'
import clsx from 'clsx'
import { useState } from 'react'

interface Props {
  excludePeriods?: PeriodKey[]
}

export default function PeriodFilter({ excludePeriods = [] }: Props) {
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
    <div className="w-full sm:w-auto max-w-full min-w-0 bg-bg-primary rounded-xl border border-divider shadow-sm p-2 px-3">
      <div 
        className="flex items-center gap-1.5 overflow-x-auto pb-0.5 sm:pb-0 w-full sm:flex-wrap scrollbar-none" 
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        <style dangerouslySetInnerHTML={{__html: `::-webkit-scrollbar { display: none; }`}} />
        <Calendar size={15} className="text-text-secondary ml-1 hidden sm:block flex-shrink-0" />
        {PERIOD_OPTIONS.filter(opt => !excludePeriods.includes(opt.key)).map((opt) => (
          <button
            key={opt.key}
            onClick={() => handleClick(opt.key)}
            className={clsx(
              'px-3 py-1.5 sm:py-1 rounded-lg text-xs font-semibold transition-all duration-200 whitespace-nowrap flex items-center justify-center flex-shrink-0 cursor-pointer',
              period === opt.key
                ? 'bg-brand-500 text-white shadow-sm hover:bg-brand-600 scale-[1.02]'
                : 'bg-bg-secondary text-text-secondary hover:text-text-primary border border-divider/60 hover:bg-bg-tertiary shadow-sm',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {showCustom && period === 'custom' && (
        <div className="mt-3 pt-3 border-t border-divider/40 flex items-center gap-3 flex-wrap animate-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-1.5 flex-1 min-w-[120px]">
            <span className="text-[10px] font-bold text-text-secondary uppercase">De:</span>
            <input
              type="date"
              className="px-2.5 py-1.5 bg-bg-secondary border border-divider text-text-primary rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-500 transition-all duration-300 w-full cursor-pointer"
              value={startDate || ''}
              onChange={(e) => setCustomRange(e.target.value, endDate || e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1.5 flex-1 min-w-[120px]">
            <span className="text-[10px] font-bold text-text-secondary uppercase">Até:</span>
            <input
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
