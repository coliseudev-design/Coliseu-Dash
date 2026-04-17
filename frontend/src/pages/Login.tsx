import { useEffect, useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'
import { LogIn, Building2 } from 'lucide-react'

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
    <div className="min-h-screen flex items-center justify-center bg-bg-secondary px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-500 text-white mb-3">
            <Building2 size={28} />
          </div>
          <h1 className="font-heading text-2xl font-semibold">Coliseu Dash</h1>
          <p className="text-text-secondary text-sm mt-1">
            Dashboard Gerencial · Compensados Mama
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Email</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@coliseu.com"
              required
              autoFocus
            />
          </div>

          {users.length > 0 && (
            <div className="bg-brand-50 border border-brand-100 rounded-lg p-3 text-xs space-y-1">
              <div className="font-semibold text-brand-700">Modo teste — sem senha</div>
              <div className="text-brand-600">Selecione um usuário:</div>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {users.map((u) => (
                  <button
                    key={u.email}
                    type="button"
                    onClick={() => setEmail(u.email)}
                    className={`px-2 py-1 rounded-md text-[11px] font-medium ${
                      email === u.email
                        ? 'bg-brand-500 text-white'
                        : 'bg-white text-brand-700 border border-brand-100 hover:bg-brand-50'
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

          <button type="submit" className="btn-primary w-full justify-center" disabled={loading}>
            {loading ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Entrando...
              </>
            ) : (
              <>
                <LogIn size={16} />
                Entrar
              </>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-text-secondary mt-4">
          © 2026 Coliseu Dash · v2.0
        </p>
      </div>
    </div>
  )
}
