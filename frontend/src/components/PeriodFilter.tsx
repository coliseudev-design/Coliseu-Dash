import { usePeriodStore, PERIOD_OPTIONS, type PeriodKey } from '../store/periodStore'
import { Calendar } from 'lucide-react'
import clsx from 'clsx'
import React, { useState, useRef } from 'react'

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

  const scrollRef = useRef<HTMLDivElement>(null)
  const hasDragged = useRef(false)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeftState, setScrollLeftState] = useState(0)

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return
    setIsDragging(true)
    setStartX(e.pageX)
    setScrollLeftState(scrollRef.current.scrollLeft)
    hasDragged.current = false
  }

  const handleMouseLeave = () => {
    setIsDragging(false)
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return
    e.preventDefault()
    const x = e.pageX
    const walk = (x - startX) * 1.5 // Scroll sensitivity factor
    scrollRef.current.scrollLeft = scrollLeftState - walk
    if (Math.abs(x - startX) > 5) {
      hasDragged.current = true
    }
  }

  const handleClick = (p: PeriodKey) => {
    if (hasDragged.current) return // Prevent click if we were dragging
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
      "w-full sm:w-auto max-w-full min-w-0 bg-bg-tertiary/40 dark:bg-bg-secondary/80 border border-divider/40 shadow-sm overflow-hidden",
      compact ? "p-0.5 rounded-lg" : "p-1 rounded-xl"
    )}>
      <div 
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        className={clsx(
          "flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden select-none [WebkitOverflowScrolling:touch]",
          isDragging ? "cursor-grabbing" : "cursor-grab"
        )}
      >
        {PERIOD_OPTIONS.filter(opt => !excludePeriods.includes(opt.key)).map((opt) => (
          <button
            key={opt.key}
            onClick={() => handleClick(opt.key)}
            className={clsx(
              'font-bold tracking-wide uppercase transition-all duration-200 whitespace-nowrap flex items-center justify-center flex-shrink-0 cursor-pointer',
              compact 
                ? 'px-2.5 py-1 text-[9px] rounded-md' 
                : 'px-3.5 py-1.5 text-[10px] md:text-xs rounded-lg flex-1 sm:flex-initial',
              period === opt.key
                ? 'bg-bg-primary dark:bg-bg-tertiary text-brand-600 dark:text-brand-400 shadow-sm'
                : 'bg-transparent text-text-secondary hover:text-text-primary hover:bg-bg-primary/30 border border-transparent active:scale-[0.98]',
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
