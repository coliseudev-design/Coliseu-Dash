// JWT com Web Crypto API (Cloudflare Workers compatible)
import type { JwtPayload } from './types'

const enc = new TextEncoder()
const dec = new TextDecoder()

function b64urlEncode(data: Uint8Array | string): string {
  const bytes = typeof data === 'string' ? enc.encode(data) : data
  let s = ''
  bytes.forEach((b) => (s += String.fromCharCode(b)))
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64urlDecode(str: string): Uint8Array {
  const pad = 4 - (str.length % 4)
  const padded = str + (pad < 4 ? '='.repeat(pad) : '')
  const b = atob(padded.replace(/-/g, '+').replace(/_/g, '/'))
  const out = new Uint8Array(b.length)
  for (let i = 0; i < b.length; i++) out[i] = b.charCodeAt(i)
  return out
}

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data))
  return b64urlEncode(new Uint8Array(sig))
}

export async function signJwt(payload: Omit<JwtPayload, 'iat' | 'exp'>, secret: string, expiresInHours = 24): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' }
  const iat = Math.floor(Date.now() / 1000)
  const exp = iat + expiresInHours * 3600
  const full: JwtPayload = { ...payload, iat, exp }
  const h = b64urlEncode(JSON.stringify(header))
  const p = b64urlEncode(JSON.stringify(full))
  const sig = await hmac(secret, `${h}.${p}`)
  return `${h}.${p}.${sig}`
}

export async function verifyJwt(token: string, secret: string): Promise<JwtPayload | null> {
  try {
    const [h, p, s] = token.split('.')
    if (!h || !p || !s) return null
    const expected = await hmac(secret, `${h}.${p}`)
    if (expected !== s) return null
    const payload = JSON.parse(dec.decode(b64urlDecode(p))) as JwtPayload
    if (payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}
