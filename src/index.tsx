import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'

import type { Bindings, Variables } from './api/lib/types'
import { authMiddleware } from './api/lib/middleware'

import auth from './api/routes/auth'
import sync from './api/routes/sync'
import vendas from './api/routes/vendas'
import financeiro from './api/routes/financeiro'
import lucratividade from './api/routes/lucratividade'
import comissoes from './api/routes/comissoes'
import ranking from './api/routes/ranking'
import estatisticas from './api/routes/estatisticas'
import compras from './api/routes/compras'
import devolucoes from './api/routes/devolucoes'
import produtos from './api/routes/produtos'
import clientes from './api/routes/clientes'
import log from './api/routes/log'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

app.use('*', logger())
app.use('/api/*', cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'Authorization', 'X-Sync-Api-Key'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}))

// Healthcheck
app.get('/api/health', (c) => c.json({
  ok: true,
  service: 'Coliseu Dash API',
  version: '2.0',
  timestamp: new Date().toISOString(),
}))

// Auth (não requer JWT)
app.route('/api/auth', auth)

// Sync (usa X-Sync-Api-Key, sem JWT, para agente Python)
app.route('/api/sync', sync)

// Rotas protegidas por JWT
const api = new Hono<{ Bindings: Bindings; Variables: Variables }>()
api.use('*', authMiddleware)
api.route('/vendas', vendas)
api.route('/financeiro', financeiro)
api.route('/lucratividade', lucratividade)
api.route('/comissoes', comissoes)
api.route('/ranking', ranking)
api.route('/estatisticas', estatisticas)
api.route('/compras', compras)
api.route('/devolucoes', devolucoes)
api.route('/produtos', produtos)
api.route('/clientes', clientes)
api.route('/log', log)

app.route('/api', api)

// SPA fallback + assets servidos pelo binding ASSETS do Cloudflare Pages
app.notFound(async (c) => {
  const url = new URL(c.req.url)

  // API: 404 JSON
  if (url.pathname.startsWith('/api/')) {
    return c.json({ error: 'Rota não encontrada' }, 404)
  }

  // Tenta servir o asset diretamente (index.html, /assets/*, /static/*, favicon.svg, etc)
  if (c.env.ASSETS) {
    const assetReq = new Request(c.req.url, c.req.raw)
    const assetRes = await c.env.ASSETS.fetch(assetReq)
    if (assetRes.status !== 404) {
      return assetRes
    }
    // Asset não encontrado → SPA fallback servindo index.html
    const indexUrl = new URL('/index.html', url.origin)
    return c.env.ASSETS.fetch(new Request(indexUrl.toString(), c.req.raw))
  }

  return c.text('Not Found', 404)
})

export default app
