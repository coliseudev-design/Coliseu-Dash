// Helpers de período. Opera em TZ America/Sao_Paulo (UTC-3) de forma aproximada.
import type { Period, PeriodRange } from './types'

// Para simplicidade e previsibilidade, trabalhamos em UTC e deixamos o frontend lidar com TZ.
// Todas as datas no banco estão em UTC.
function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setUTCHours(0, 0, 0, 0)
  return x
}
function endOfDay(d: Date): Date {
  const x = new Date(d)
  x.setUTCHours(23, 59, 59, 999)
  return x
}

function fmt(d: Date): string {
  return d.toISOString().replace('T', ' ').slice(0, 19)
}

export function resolvePeriod(period: Period, startDate?: string, endDate?: string): PeriodRange {
  const now = new Date()
  let start: Date
  let end: Date
  let label = ''

  switch (period) {
    case 'today':
      start = startOfDay(now)
      end = endOfDay(now)
      label = 'Hoje'
      break
    case 'yesterday': {
      const y = new Date(now)
      y.setUTCDate(y.getUTCDate() - 1)
      start = startOfDay(y)
      end = endOfDay(y)
      label = 'Ontem'
      break
    }
    case 'last7': {
      const s = new Date(now)
      s.setUTCDate(s.getUTCDate() - 6)
      start = startOfDay(s)
      end = endOfDay(now)
      label = 'Últimos 7 dias'
      break
    }
    case 'thisMonth': {
      const s = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
      const e = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999))
      start = s
      end = e
      label = 'Mês atual'
      break
    }
    case 'lastMonth': {
      const s = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
      const e = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59, 999))
      start = s
      end = e
      label = 'Mês anterior'
      break
    }
    case 'last12m': {
      const s = new Date(now)
      s.setUTCDate(s.getUTCDate() - 365)
      start = startOfDay(s)
      end = endOfDay(now)
      label = 'Últimos 12 meses'
      break
    }
    case 'custom': {
      if (!startDate || !endDate) {
        // Fallback: últimos 30 dias
        const s = new Date(now)
        s.setUTCDate(s.getUTCDate() - 30)
        start = startOfDay(s)
        end = endOfDay(now)
      } else {
        start = startOfDay(new Date(startDate))
        end = endOfDay(new Date(endDate))
      }
      label = 'Personalizado'
      break
    }
    default:
      start = startOfDay(now)
      end = endOfDay(now)
      label = 'Hoje'
  }

  return {
    start: fmt(start),
    end: fmt(end),
    label,
  }
}
