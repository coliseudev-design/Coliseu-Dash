import { useEffect, useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'
import { LogIn } from 'lucide-react'

interface UserOption {
  email: string
  nome: string
  role: string
}

export default function Login() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const login = useAuthStore((s) => s.login)
  const loading = useAuthStore((s) => s.loading)
  const error = useAuthStore((s) => s.error)

  const [email, setEmail] = useState('')
  const [users, setUsers] = useState<UserOption[]>([])

  useEffect(() => {
    api.get<{ usuarios: UserOption[] }>('/auth/usuarios')
      .then((r) => {
        setUsers(r.data.usuarios)
        if (r.data.usuarios[0]?.email) setEmail(r.data.usuarios[0].email)
      })
      .catch(() => {})
  }, [])

  // Se já logado, redireciona
  if (user) return <Navigate to="/" replace />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const ok = await login(email)
    if (ok) navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo no topo */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <img
              src="/coliseu-logo.png"
              alt="Coliseu Sistemas"
              className="h-14 sm:h-16 w-auto object-contain"
            />
          </div>
          <h1 className="font-heading text-xl sm:text-2xl font-semibold text-white">Coliseu Dash</h1>
          <p className="text-white/60 text-sm mt-1">
            Dashboard Gerencial · Compensados Mama
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Email</label>
            <input
              type="email"
              className="input text-base"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@coliseu.com"
              required
              autoFocus
              autoComplete="email"
              inputMode="email"
            />
          </div>

          {users.length > 0 && (
            <div className="bg-brand-50 border border-brand-100 rounded-lg p-3 text-xs space-y-1.5">
              <div className="font-semibold text-brand-700">Modo teste — sem senha</div>
              <div className="text-brand-600">Selecione um usuário:</div>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {users.map((u) => (
                  <button
                    key={u.email}
                    type="button"
                    onClick={() => setEmail(u.email)}
                    className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                      email === u.email
                        ? 'bg-brand-500 text-white'
                        : 'bg-white text-brand-700 border border-brand-100 hover:bg-brand-50 active:bg-brand-100'
                    }`}
                  >
                    {u.nome}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary w-full justify-center py-3 text-base" disabled={loading}>
            {loading ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Entrando...
              </>
            ) : (
              <>
                <LogIn size={18} />
                Entrar
              </>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-white/50 mt-4">
          © 2026 Coliseu Sistemas · v2.0
        </p>
      </div>
    </div>
  )
}
