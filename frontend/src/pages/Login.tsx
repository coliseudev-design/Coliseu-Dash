import { useState } from 'react'
import { useNavigate, Navigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { LogIn, TrendingUp, BarChart3, Users, LayoutDashboard } from 'lucide-react'

export default function Login() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const login = useAuthStore((s) => s.login)
  const loading = useAuthStore((s) => s.loading)
  const error = useAuthStore((s) => s.error)

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')

  if (user) return <Navigate to="/" replace />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const ok = await login(email, senha)
    if (ok) navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen flex w-full">
      
      {/* Esquerda: Showcase / Criativo (Escondido no Mobile) */}
      <div className="hidden lg:flex w-3/5 bg-gradient-to-br from-slate-900 via-brand-900 to-slate-900 relative overflow-hidden flex-col justify-between p-12">
        {/* Efeitos de fundo (Círculos desfocados) */}
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-brand-500/30 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
        
        {/* Topo da área criativa */}
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-12">
            <div className="bg-white/10 p-2 rounded-xl backdrop-blur-md border border-white/20">
              <img src="/coliseu-simbolo.png" className="w-6 h-6 object-contain" alt="Coliseu Symbol" />
            </div>
            <span className="text-white font-heading font-bold text-xl tracking-tight">Coliseu Dash</span>
          </div>
          
          <h1 className="text-4xl xl:text-5xl font-heading font-bold text-white leading-tight mb-6 max-w-2xl">
            Seus resultados,<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">em tempo real.</span>
          </h1>
          <p className="text-slate-300 text-lg max-w-xl leading-relaxed">
            A plataforma gerencial definitiva do ecossistema Coliseu. Transforme os dados do seu ERP em decisões estratégicas de qualquer lugar.
          </p>
        </div>

        {/* Centro/Widgets de Demonstração */}
        <div className="relative z-10 mt-12 grid grid-cols-2 gap-6 max-w-2xl">
          {/* Card 1 */}
          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-6 transform transition-transform hover:-translate-y-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-green-500/20 p-2 rounded-lg">
                <TrendingUp className="text-green-400 w-5 h-5" />
              </div>
              <span className="text-slate-300 font-medium">Faturamento Diário</span>
            </div>
            <div className="text-white font-bold text-2xl">R$ 12.450,00</div>
            <div className="text-green-400 text-sm font-medium mt-2 flex items-center gap-1">
              +15.2% <span className="text-slate-400 font-normal">vs ontem</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-6 transform transition-transform hover:-translate-y-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-500/20 p-2 rounded-lg">
                <Users className="text-blue-400 w-5 h-5" />
              </div>
              <span className="text-slate-300 font-medium">Clientes Ativos</span>
            </div>
            <div className="text-white font-bold text-2xl">4.861</div>
            <div className="text-blue-400 text-sm font-medium mt-2 flex items-center gap-1">
              +42 <span className="text-slate-400 font-normal">esta semana</span>
            </div>
          </div>
          
          {/* Card 3 (Span 2) */}
          <div className="col-span-2 bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 flex items-center justify-between transform transition-transform hover:-translate-y-1">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <BarChart3 className="text-cyan-400 w-5 h-5" />
                <span className="text-slate-300 font-medium">Ticket Médio Geral</span>
              </div>
              <div className="text-white font-bold text-3xl">R$ 643,27</div>
            </div>
            <div className="hidden sm:flex items-end gap-1 h-12">
               {/* Barras decorativas */}
               {[40, 70, 45, 90, 65, 80, 100].map((h, i) => (
                 <div key={i} className="w-3 bg-cyan-400/80 rounded-t-sm" style={{ height: `${h}%` }} />
               ))}
            </div>
          </div>
        </div>

        {/* Rodapé da área criativa */}
        <div className="relative z-10 mt-12 flex items-center justify-between text-slate-400 text-sm">
          <span>© 2026 Coliseu Sistemas</span>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Sistemas Operacionais
          </div>
        </div>
      </div>

      {/* Direita: Formulário de Login */}
      <div className="w-full lg:w-2/5 bg-white flex flex-col justify-center px-6 sm:px-12 lg:px-16 xl:px-24 relative">
        
        {/* Mobile Header (Sempre visível em mobile, oculto em Desktop porque tem a barra lateral) */}
        <div className="lg:hidden absolute top-8 left-6 sm:left-12 flex items-center gap-2">
          <div className="bg-white shadow-sm border border-slate-200 p-2 rounded-xl">
            <img src="/coliseu-simbolo.png" className="w-5 h-5 object-contain" alt="Coliseu Symbol" />
          </div>
          <span className="text-slate-900 font-heading font-bold text-lg">Coliseu Dash</span>
        </div>

        <div className="w-full max-w-sm mx-auto mt-16 lg:mt-0">
          <div className="mb-10 text-left">
            <img 
              src="/coliseu-logo-auth.png" 
              alt="Coliseu Sistemas" 
              className="h-12 sm:h-14 w-auto object-contain mb-8"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <h2 className="font-heading text-3xl font-bold text-slate-900 tracking-tight">Bem-vindo de volta.</h2>
            <p className="text-slate-500 mt-2 text-base">
              Entre para acessar seus dashboards gerenciais.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">E-mail de Acesso</label>
              <input
                type="email"
                className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-slate-900 bg-white"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@coliseusistemas.com.br"
                required
                autoFocus
                autoComplete="email"
                inputMode="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Senha de Segurança</label>
              <input
                type="password"
                className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-slate-900 bg-white"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
              <div className="flex justify-end mt-2">
                <a href="#" className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors">
                  Esqueceu a senha?
                </a>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg p-3.5 flex items-center gap-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                {error}
              </div>
            )}

            <button 
              type="submit" 
              className="w-full py-3.5 px-4 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white rounded-lg font-medium shadow-sm shadow-brand-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-4" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Autenticando...</span>
                </>
              ) : (
                <>
                  <span>Avançar</span>
                  <LogIn className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-10 text-center text-sm text-slate-500">
            Ainda não tem conta?{' '}
            <Link to="/register" className="font-semibold text-brand-600 hover:text-brand-700 transition-colors">
              Criar acesso ✨
            </Link>
          </div>
        </div>
      </div>

    </div>
  )
}
