import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { LogIn } from 'lucide-react'

export default function Login() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const login = useAuthStore((s) => s.login)
  const loading = useAuthStore((s) => s.loading)
  const error = useAuthStore((s) => s.error)

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')

  // Se já logado, redireciona
  if (user) return <Navigate to="/" replace />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const ok = await login(email, senha)
    if (ok) navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 py-8">
      <div className="w-full max-w-md">
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
            Dashboard Gerencial · Ecossistema Coliseu
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Email</label>
            <input
              type="email"
              className="input text-base w-full p-2 border rounded"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ex: admin@coliseusistemas.com.br"
              required
              autoFocus
              autoComplete="email"
              inputMode="email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Senha</label>
            <input
              type="password"
              className="input text-base w-full p-2 border rounded"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Sua senha"
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary w-full justify-center py-3 text-base flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors" disabled={loading}>
            {loading ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Entrando...
              </>
            ) : (
              <>
                <LogIn size={18} />
                Entrar no Dashboard
              </>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-white/50 mt-4">
          © 2026 Coliseu Sistemas · v2.0 API Integrada
        </p>
      </div>
    </div>
  )
}
