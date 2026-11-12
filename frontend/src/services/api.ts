import axios, { AxiosError } from 'axios'

// Base URL: em dev usa proxy do Vite para localhost:3000, em produção usa mesma origem
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('coliseu_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  config.headers['X-Target-App'] = 'coliseu-dash'

  try {
    const rawUser = localStorage.getItem('coliseu_user')
    let userKey = 'default'
    if (rawUser) {
      const parsedUser = JSON.parse(rawUser)
      const activeVersion = parsedUser?.versao || parsedUser?.layout_version
      if (activeVersion) {
        config.headers['X-Layout-Version'] = activeVersion
      }
      userKey = String(parsedUser?.email || parsedUser?.id || 'default').toLowerCase()
      config.headers['X-User-Key'] = userKey
    }
    const perUserOnlyNf = localStorage.getItem(`coliseu_only_nf_sales:${userKey}`)
    if (perUserOnlyNf === 'true' || perUserOnlyNf === 'false') {
      config.headers['X-Only-Nf-Sales'] = perUserOnlyNf
    }
  } catch {
    // ignore
  }

  // Inject client's timezone offset (in minutes, sign reversed to represent offset from UTC)
  const offsetMinutes = -new Date().getTimezoneOffset()
  config.headers['X-Timezone-Offset'] = offsetMinutes.toString()

  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (tz) {
      config.headers['X-User-Timezone'] = tz
    }
  } catch {
    // ignore
  }

  return config
})

api.interceptors.response.use(
  (r) => r,
  (err: AxiosError) => {
    const reqUrl = err.config?.url || ''
    const isAuthAttempt =
      reqUrl.includes('/auth/login') ||
      reqUrl.includes('/auth/register') ||
      reqUrl.includes('/auth/change-default-password')

    if (err.response?.status === 401 && !isAuthAttempt) {
      // Token expirado/inválido em rota autenticada
      localStorage.removeItem('coliseu_token')
      localStorage.removeItem('coliseu_user')
      const w = (window as any).__syncWorker
      if (w) {
        try {
          w.postMessage({ type: 'STOP' })
        } catch {
          // ignore
        }
      }
      if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  },
)

export default api
