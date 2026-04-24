import { usePeriodStore, PERIOD_OPTIONS, type PeriodKey } from '../store/periodStore'
import { Calendar } from 'lucide-react'
import clsx from 'clsx'
import { useState } from 'react'

export default function PeriodFilter() {
  const period = usePeriodStore((s) => s.period)
  const startDate = usePeriodStore((s) => s.startDate)
  const endDate = usePeriodStore((s) => s.endDate)
  const setPeriod = usePeriodStore((s) => s.setPeriod)
  const setCustomRange = usePeriodStore((s) => s.setCustomRange)
  const [showCustom, setShowCustom] = useState(false)

  const handleClick = (p: PeriodKey) => {
    if (p === 'custom') {
      setShowCustom(true)
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
    <div className="card !p-2.5 sm:!p-3">
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 -mb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
        <Calendar size={16} className="text-text-secondary ml-1 flex-shrink-0" />
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => handleClick(opt.key)}
            className={clsx(
              'px-3 py-2 sm:py-1.5 rounded-lg text-xs font-medium transition-all duration-300 whitespace-nowrap flex-shrink-0',
              period === opt.key
                ? 'bg-brand-500 text-white shadow-md scale-105'
                : 'bg-transparent text-text-secondary hover:bg-bg-secondary/50 active:bg-bg-secondary',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {showCustom && period === 'custom' && (
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <label className="text-xs text-text-secondary">De:</label>
          <input
            type="date"
            className="input !py-1 !px-2 !text-xs !w-auto"
            value={startDate || ''}
            onChange={(e) => setCustomRange(e.target.value, endDate || e.target.value)}
          />
          <label className="text-xs text-text-secondary">Até:</label>
          <input
            type="date"
            className="input !py-1 !px-2 !text-xs !w-auto"
            value={endDate || ''}
            onChange={(e) => setCustomRange(startDate || e.target.value, e.target.value)}
          />
        </div>
      )}
    </div>
  )
}
