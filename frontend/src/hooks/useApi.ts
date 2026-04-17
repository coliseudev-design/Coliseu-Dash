import { useQuery, UseQueryOptions } from '@tanstack/react-query'
import api from '../services/api'
import { usePeriodStore, periodToParams } from '../store/periodStore'

export function useApiQuery<T = any>(
  endpoint: string,
  params?: Record<string, any>,
  options?: Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<T>({
    queryKey: [endpoint, params],
    queryFn: async () => {
      const { data } = await api.get<T>(endpoint, { params })
      return data
    },
    ...options,
  })
}

/** Usa periodo global da store para adicionar params automaticamente */
export function usePeriodQuery<T = any>(endpoint: string, extra?: Record<string, any>) {
  const state = usePeriodStore()
  const params = { ...periodToParams(state), ...(extra || {}) }
  return useApiQuery<T>(endpoint, params)
}
