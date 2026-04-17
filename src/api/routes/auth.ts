import { Hono } from 'hono'
import { signJwt } from '../lib/jwt'
import { authMiddleware } from '../lib/middleware'
import type { Bindings, Variables } from '../lib/types'

const auth = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// POST /api/auth/login
// Modo "sem senha" para teste: basta enviar um email existente em usuarios_web.
// Se a senha for obrigatória no futuro, o backend já ignora por ora.
auth.post('/login', async (c) => {
  const body = await c.req.json().catch(() => ({})) as { email?: string }
  const email = (body.email || '').trim().toLowerCase()
  if (!email) return c.json({ error: 'Email é obrigatório' }, 400)

  const user = await c.env.DB.prepare(
    'SELECT id, email, nome, role, ativo FROM usuarios_web WHERE LOWER(email) = ? LIMIT 1'
  ).bind(email).first<{ id: number; email: string; nome: string; role: string; ativo: number }>()

  if (!user) {
    return c.json({ error: 'Usuário não encontrado. Tente admin@coliseu.com' }, 404)
  }
  if (!user.ativo) {
    return c.json({ error: 'Usuário inativo' }, 403)
  }

  const token = await signJwt(
    { sub: user.id, email: user.email, nome: user.nome, role: user.role },
    c.env.JWT_SECRET,
    24
  )

  // Registra na tabela sessoes (best-effort)
  const expiraEm = new Date(Date.now() + 24 * 3600 * 1000).toISOString().replace('T', ' ').slice(0, 19)
  await c.env.DB.prepare(
    'INSERT INTO sessoes (usuario_id, token_jwt, ip_address, user_agent, expira_em, ativa) VALUES (?, ?, ?, ?, ?, 1)'
  ).bind(
    user.id,
    token.slice(-60), // só armazena fim do token
    c.req.header('cf-connecting-ip') || '',
    c.req.header('user-agent') || '',
    expiraEm
  ).run().catch(() => {})

  // Log de login
  await c.env.DB.prepare(
    "INSERT INTO auditoria (usuario_id, acao, tabela, ip_address) VALUES (?, 'LOGIN', 'usuarios_web', ?)"
  ).bind(user.id, c.req.header('cf-connecting-ip') || '').run().catch(() => {})

  return c.json({
    token,
    user: { id: user.id, email: user.email, nome: user.nome, role: user.role },
    expiresIn: 24 * 3600,
  })
})

// POST /api/auth/logout
auth.post('/logout', authMiddleware, async (c) => {
  const user = c.get('user')
  if (user) {
    await c.env.DB.prepare(
      'UPDATE sessoes SET ativa = 0 WHERE usuario_id = ? AND ativa = 1'
    ).bind(user.sub).run().catch(() => {})
  }
  return c.json({ ok: true })
})

// POST /api/auth/refresh
auth.post('/refresh', authMiddleware, async (c) => {
  const u = c.get('user')!
  const token = await signJwt(
    { sub: u.sub, email: u.email, nome: u.nome, role: u.role },
    c.env.JWT_SECRET,
    24
  )
  return c.json({ token, expiresIn: 24 * 3600 })
})

// GET /api/auth/me
auth.get('/me', authMiddleware, async (c) => {
  const u = c.get('user')!
  return c.json({ id: u.sub, email: u.email, nome: u.nome, role: u.role })
})

// GET /api/auth/usuarios - lista usuários disponíveis (modo teste sem senha)
auth.get('/usuarios', async (c) => {
  const rows = await c.env.DB.prepare(
    'SELECT email, nome, role FROM usuarios_web WHERE ativo = 1 ORDER BY id'
  ).all()
  return c.json({ usuarios: rows.results })
})

export default auth
