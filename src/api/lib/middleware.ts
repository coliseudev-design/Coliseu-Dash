// Middleware de autenticação JWT
import type { Context, Next } from 'hono'
import { verifyJwt } from './jwt'
import type { Bindings, Variables } from './types'

type AppContext = Context<{ Bindings: Bindings; Variables: Variables }>

export async function authMiddleware(c: AppContext, next: Next) {
  const auth = c.req.header('Authorization')
  if (!auth || !auth.startsWith('Bearer ')) {
    return c.json({ error: 'Não autenticado' }, 401)
  }
  const token = auth.slice(7)
  const payload = await verifyJwt(token, c.env.JWT_SECRET)
  if (!payload) {
    return c.json({ error: 'Token inválido ou expirado' }, 401)
  }
  c.set('user', payload)
  await next()
}

export function syncApiKeyMiddleware(c: AppContext, next: Next) {
  const key = c.req.header('X-Sync-Api-Key')
  if (!key || key !== c.env.SYNC_API_KEY) {
    return c.json({ error: 'Chave de sincronização inválida' }, 401)
  }
  return next()
}
