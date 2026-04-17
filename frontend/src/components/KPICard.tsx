import { LucideIcon } from 'lucide-react'
import clsx from 'clsx'

interface Props {
  label: string
  value: string | number
  icon?: LucideIcon
  iconColor?: string
  hint?: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  loading?: boolean
}

export default function KPICard({
  label, value, icon: Icon, iconColor = 'text-brand-500',
  hint, trend, trendValue, loading,
}: Props) {
  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div className="kpi-label">{label}</div>
        {Icon && (
          <div className={clsx('w-8 h-8 rounded-lg bg-bg-tertiary flex items-center justify-center', iconColor)}>
            <Icon size={16} />
          </div>
        )}
      </div>
      <div className="mt-2">
        {loading ? (
          <div className="h-8 w-32 bg-bg-tertiary animate-pulse rounded" />
        ) : (
          <div className="kpi-value">{value}</div>
        )}
        {(hint || trendValue) && (
          <div className="mt-1 text-xs text-text-secondary flex items-center gap-1">
            {trend === 'up' && <span className="text-success">▲</span>}
            {trend === 'down' && <span className="text-danger">▼</span>}
            {trendValue && <span>{trendValue}</span>}
            {hint && <span>{hint}</span>}
          </div>
        )}
      </div>
    </div>
  )
}
