/** Padrões de classes Tailwind padronizados para responsividade */
export const RP = {
  // Grids
  gridKPI:    'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4',
  gridKPI4:   'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4',
  gridKPI3:   'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4',
  gridCards:  'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4',
  gridHalf:   'grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4',
  gridThird:  'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4',

  // Padding
  padBase:   'p-3 sm:p-4 md:p-5 lg:p-6',
  padCard:   'p-3 sm:p-4 md:p-5',
  padInline: 'px-3 sm:px-4 py-2 sm:py-2.5',

  // Text
  textLabel:  'text-[11px] sm:text-xs md:text-sm',
  textValue:  'text-base sm:text-xl md:text-2xl',
  textTitle:  'text-sm sm:text-base md:text-lg font-bold',

  // Filters
  filterWrap: 'flex flex-col sm:flex-row gap-2 sm:gap-3 flex-wrap',
  filterItem: 'w-full sm:w-44 md:w-52 lg:w-56',

  // Chart heights
  chartH:     'min-h-[200px] sm:min-h-[260px] lg:min-h-[320px]',
  chartHSm:   'min-h-[180px] sm:min-h-[240px] lg:min-h-[300px]',

  // Icon badge wrapper
  iconSm:    'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0',
  iconMd:    'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
  iconLg:    'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
} as const
