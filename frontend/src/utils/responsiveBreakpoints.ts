/** Breakpoints do Coliseu Dash (em pixels) */
export const BREAKPOINTS = {
  xs:  320,
  sm:  360,
  md:  480,
  lg:  768,
  xl:  1024,
  '2xl': 1280,
} as const

export type Breakpoint = keyof typeof BREAKPOINTS

export const isMobile  = (w: number) => w < BREAKPOINTS.md
export const isTablet  = (w: number) => w >= BREAKPOINTS.md && w < BREAKPOINTS.lg
export const isDesktop = (w: number) => w >= BREAKPOINTS.lg

/** Hook para width atual da janela */
import { useState, useEffect } from 'react'
export function useWindowWidth() {
  const [width, setWidth] = useState(() => typeof window !== 'undefined' ? window.innerWidth : BREAKPOINTS.xl)
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth)
    window.addEventListener('resize', handler, { passive: true })
    return () => window.removeEventListener('resize', handler)
  }, [])
  return width
}
