// Tipos compartilhados do backend

export type Bindings = {
  DB: D1Database
  JWT_SECRET: string
  SYNC_API_KEY: string
  ASSETS: { fetch: (req: Request) => Promise<Response> }
}

export type JwtPayload = {
  sub: number       // user id
  email: string
  nome: string
  role: string
  iat: number
  exp: number
}

export type Variables = {
  user?: JwtPayload
}

export type Period =
  | 'today'
  | 'yesterday'
  | 'last7'
  | 'thisMonth'
  | 'lastMonth'
  | 'last12m'
  | 'custom'

export interface PeriodRange {
  start: string // ISO datetime
  end: string   // ISO datetime
  label: string
}
