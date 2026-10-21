import { create } from 'zustand';

export type PeriodKey = 'today' | 'yesterday' | 'thisMonth' | 'lastMonth' | 'custom';

export interface PeriodOption {
  key: PeriodKey;
  label: string;
}

export const PERIOD_OPTIONS: PeriodOption[] = [
  { key: 'today', label: 'Hoje' },
  { key: 'yesterday', label: 'Ontem' },
  { key: 'thisMonth', label: 'Este Mês' },
  { key: 'lastMonth', label: 'Mês Anterior' },
  { key: 'custom', label: 'Personalizado' },
];

export interface PeriodState {
  period: PeriodKey;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  setPeriod: (period: PeriodKey) => void;
  setCustomRange: (start: string, end: string) => void;
  getQueryParams: () => Record<string, string>;
}

export const usePeriodStore = create<PeriodState>((set, get) => ({
  period: 'today',
  startDate: undefined,
  endDate: undefined,
  setPeriod: (period) => set({ period }),
  setCustomRange: (start, end) => set({ period: 'custom', startDate: start, endDate: end }),
  getQueryParams: (): Record<string, string> => {
    const { period, startDate, endDate } = get();
    const params: Record<string, string> = { period };
    if (period === 'custom' && startDate && endDate) {
      params.start_date = startDate;
      params.end_date = endDate;
    }
    return params;
  },
}));
