import { useState, useEffect } from 'react'
import { useNavigate, Navigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { 
  BarChart3, LayoutDashboard, Eye, EyeOff, ShieldCheck, 
  Mail, Lock, Globe, Instagram, ArrowRight 
} from 'lucide-react'

export default function Login() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const login = useAuthStore((s) => s.login)
  const loading = useAuthStore((s) => s.loading)
  const error = useAuthStore((s) => s.error)

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [requiresSelection, setRequiresSelection] = useState(false)
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([])
  const [selectedTenantId, setSelectedTenantId] = useState('')

  // Estados de Configuração e Lembrar
  const [versao, setVersao] = useState<'Dash 1.0' | 'B.I IA.'>('Dash 1.0')
  const [salvarSenha, setSalvarSenha] = useState(false)
  const [requiresPasswordChange, setRequiresPasswordChange] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null)
  const [changePasswordLoading, setChangePasswordLoading] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Recupera credenciais e último sistema selecionado do localStorage
  useEffect(() => {
    const savedVersion = localStorage.getItem('coliseu_saved_version') as 'Dash 1.0' | 'B.I IA.' | null
    if (savedVersion) {
      setVersao(savedVersion)
    }

    const savedEmail = localStorage.getItem('coliseu_saved_email')
    const savedPassword = localStorage.getItem('coliseu_saved_password')
    const savedRemember = localStorage.getItem('coliseu_saved_remember') === 'true'
    
    if (savedRemember && savedEmail) {
      setEmail(savedEmail)
      if (savedPassword) {
        setSenha(savedPassword)
      }
      setSalvarSenha(true)
    }
  }, [])

  if (user) return <Navigate to="/" replace />

  const handleVersionSelect = (v: 'Dash 1.0' | 'B.I IA.') => {
    setVersao(v)
    localStorage.setItem('coliseu_saved_version', v)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Salvar sempre o último sistema selecionado
    localStorage.setItem('coliseu_saved_version', versao)

    if (requiresSelection) {
      if (!selectedTenantId) {
        alert('Por favor, selecione uma empresa para continuar.')
        return
      }
      localStorage.setItem('coliseu_saved_tenant_id', selectedTenantId)
      const res = await login(email, senha, selectedTenantId, versao)
      if (res.success && !res.requiresSelection) {
        if (salvarSenha) {
          localStorage.setItem('coliseu_saved_email', email)
          localStorage.setItem('coliseu_saved_password', senha)
          localStorage.setItem('coliseu_saved_remember', 'true')
        } else {
          localStorage.removeItem('coliseu_saved_email')
          localStorage.removeItem('coliseu_saved_password')
          localStorage.removeItem('coliseu_saved_remember')
        }
        navigate('/', { replace: true })
      }
      return
    }

    const res = await login(email, senha, undefined, versao)
    if (res.success) {
      if (res.requiresSelection) {
        setRequiresSelection(true)
        setCompanies(res.companies || [])
        if (res.companies && res.companies.length > 0) {
          const savedTenantId = localStorage.getItem('coliseu_saved_tenant_id')
          if (savedTenantId && res.companies.some(c => c.id === savedTenantId)) {
            setSelectedTenantId(savedTenantId)
          } else {
            setSelectedTenantId(res.companies[0].id)
          }
        }
      } else {
        if (salvarSenha) {
          localStorage.setItem('coliseu_saved_email', email)
          localStorage.setItem('coliseu_saved_password', senha)
          localStorage.setItem('coliseu_saved_remember', 'true')
        } else {
          localStorage.removeItem('coliseu_saved_email')
          localStorage.removeItem('coliseu_saved_password')
          localStorage.removeItem('coliseu_saved_remember')
        }
        navigate('/', { replace: true })
      }
    } else if (res.requiresPasswordChange) {
      setRequiresPasswordChange(true)
    }
  }

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setChangePasswordError(null)

    if (!newPassword) {
      setChangePasswordError('Por favor, informe a nova senha.')
      return
    }

    if (newPassword === '123456') {
      setChangePasswordError('A nova senha não pode ser a senha padrão "123456".')
      return
    }

    if (newPassword !== confirmNewPassword) {
      setChangePasswordError('As senhas não coincidem.')
      return
    }

    if (newPassword.length < 6) {
      setChangePasswordError('A nova senha deve ter pelo menos 6 caracteres.')
      return
    }

    setChangePasswordLoading(true)
    try {
      const changeDefaultPassword = useAuthStore.getState().changeDefaultPassword
      const success = await changeDefaultPassword(email, senha, newPassword, selectedTenantId || undefined, versao)
      if (success) {
        if (salvarSenha) {
          localStorage.setItem('coliseu_saved_email', email)
          localStorage.setItem('coliseu_saved_password', newPassword)
          localStorage.setItem('coliseu_saved_remember', 'true')
        } else {
          localStorage.removeItem('coliseu_saved_email')
          localStorage.removeItem('coliseu_saved_password')
          localStorage.removeItem('coliseu_saved_remember')
        }
        navigate('/', { replace: true })
      } else {
        const storeError = useAuthStore.getState().error
        setChangePasswordError(storeError || 'Erro ao gravar a nova senha.')
      }
    } catch (err) {
      setChangePasswordError('Erro de conexão ao alterar a senha.')
    } finally {
      setChangePasswordLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      
      {/* Soft Ambient Glow Elements */}
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-teal-500/5 dark:bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Content Container */}
      <div className="w-full max-w-md mx-auto relative z-10 flex flex-col items-center">
        
        {!requiresPasswordChange ? (
          <>
            {/* Header: Logo, Headline, Social Links */}
            <div className="text-center mb-8 flex flex-col items-center">
              {/* Logo */}
              <div className="mb-6 flex items-center justify-center">
                <img 
                  src="/logo-coliseu.png" 
                  alt="Coliseu Sistemas" 
                  className="h-16 sm:h-20 w-auto object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>

              {/* Headline */}
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight mb-3">
                Gerencie <span className="text-[#0d9488]">tudo.</span> Cresça<br />mais rápido.
              </h1>

              {/* Links Row: Site & Instagram */}
              <div className="flex items-center justify-center gap-4 text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
                <a 
                  href="https://www.coliseusistemas.com.br" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 hover:text-[#0d9488] transition-colors"
                >
                  <Globe className="w-3.5 h-3.5 text-[#0d9488]" />
                  <span>www.coliseusistemas.com.br</span>
                </a>
                <a 
                  href="https://www.instagram.com/coliseusistemas/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 hover:text-pink-600 transition-colors"
                >
                  <Instagram className="w-3.5 h-3.5 text-pink-500" />
                  <span>Instagram</span>
                </a>
              </div>
            </div>

            {/* Login Card Form */}
            <form onSubmit={handleSubmit} className="w-full space-y-5">
              
              {/* Seletor do Sistema (Tipo do Sistema - Padrão Salvo) */}
              {!requiresSelection && (
                <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-900/80 p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleVersionSelect('Dash 1.0')}
                    className={`py-2 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      versao === 'Dash 1.0'
                        ? 'bg-[#0d9488] text-white shadow-md shadow-teal-700/20'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800'
                    }`}
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    <span>Dash 1.0</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleVersionSelect('B.I IA.')}
                    className={`py-2 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      versao === 'B.I IA.'
                        ? 'bg-[#0d9488] text-white shadow-md shadow-teal-700/20'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800'
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>B.I IA.</span>
                  </button>
                </div>
              )}

              {!requiresSelection ? (
                <>
                  {/* Field: E-MAIL DE ACESSO */}
                  <div>
                    <label className="block text-[10.5px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      E-MAIL DE ACESSO
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                        <Mail className="w-5 h-5" />
                      </div>
                      <input
                        type="email"
                        className="w-full pl-11 pr-4 py-3 rounded-2xl border-2 border-slate-200 dark:border-slate-800 focus:border-[#0d9488] focus:ring-4 focus:ring-[#0d9488]/10 outline-none transition-all text-slate-900 dark:text-white bg-white dark:bg-slate-900 font-medium text-sm"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="email@coliseusistemas.com.br"
                        required
                        autoFocus
                        autoComplete="email"
                        inputMode="email"
                      />
                    </div>
                  </div>

                  {/* Field: SENHA */}
                  <div>
                    <label className="block text-[10.5px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      SENHA
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                        <Lock className="w-5 h-5" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className="w-full pl-11 pr-12 py-3 rounded-2xl border-2 border-slate-200 dark:border-slate-800 focus:border-[#0d9488] focus:ring-4 focus:ring-[#0d9488]/10 outline-none transition-all text-slate-900 dark:text-white bg-white dark:bg-slate-900 font-medium text-sm"
                        value={senha}
                        onChange={(e) => setSenha(e.target.value)}
                        placeholder="••••••••"
                        required
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Checkbox: Salvar Senha */}
                  <div className="flex items-center gap-2 pt-0.5">
                    <input
                      type="checkbox"
                      id="salvarSenhaCheck"
                      checked={salvarSenha}
                      onChange={(e) => setSalvarSenha(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-[#0d9488] focus:ring-[#0d9488] cursor-pointer"
                    />
                    <label htmlFor="salvarSenhaCheck" className="text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                      Salvar Senha
                    </label>
                  </div>
                </>
              ) : (
                /* Seleção de Empresa */
                <div>
                  <label className="block text-[10.5px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    SELECIONE A EMPRESA
                  </label>
                  <select
                    className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 dark:border-slate-800 focus:border-[#0d9488] focus:ring-4 focus:ring-[#0d9488]/10 outline-none transition-all text-slate-900 dark:text-white bg-white dark:bg-slate-900 font-medium text-sm cursor-pointer mb-2"
                    value={selectedTenantId}
                    onChange={(e) => {
                      setSelectedTenantId(e.target.value)
                      localStorage.setItem('coliseu_saved_tenant_id', e.target.value)
                    }}
                    required
                  >
                    {companies.map((company) => (
                      <option key={company.id} value={company.id} className="text-slate-900 bg-white dark:bg-slate-900 dark:text-white">
                        {company.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setRequiresSelection(false)
                      setCompanies([])
                      setSelectedTenantId('')
                    }}
                    className="mt-2 text-xs text-[#0d9488] hover:underline font-bold transition-colors"
                  >
                    ← Voltar para login
                  </button>
                </div>
              )}

              {/* Mensagem de Erro */}
              {error && (
                <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold rounded-xl p-3.5 flex items-center gap-2">
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              )}

              {/* Botão Principal: Entrar */}
              <button 
                type="submit" 
                className="w-full py-3.5 px-4 bg-[#0d9488] hover:bg-[#0f766e] active:bg-[#115e59] text-white rounded-2xl font-bold shadow-lg shadow-teal-700/25 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer text-sm tracking-wide mt-2" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Autenticando...</span>
                  </>
                ) : (
                  <>
                    <span>{requiresSelection ? 'Confirmar Acesso' : 'Entrar'}</span>
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </>
                )}
              </button>
            </form>

            {/* Footer Sign-up Link */}
            <div className="mt-8 text-center text-xs font-medium text-slate-500 dark:text-slate-400">
              Ainda não tem conta?{' '}
              <Link to="/register" className="font-bold text-[#0d9488] hover:underline transition-colors">
                Criar acesso ✨
              </Link>
            </div>
          </>
        ) : (
          /* Form de Troca de Senha Padrão (123456) */
          <>
            <div className="text-center mb-8 flex flex-col items-center">
              <img 
                src="/logo-coliseu.png" 
                alt="Coliseu Sistemas" 
                className="h-16 sm:h-20 w-auto object-contain mb-4"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-full text-xs font-bold mb-3">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                Senha Padrão Detectada
              </div>

              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Alteração de Senha</h2>
              <p className="text-slate-500 dark:text-slate-400 mt-1.5 text-xs leading-relaxed max-w-sm">
                Sua senha atual é temporária. Por favor, defina uma nova senha segura para continuar.
              </p>
            </div>

            <form onSubmit={handleChangePasswordSubmit} className="w-full space-y-4">
              <div>
                <label className="block text-[10.5px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  NOVA SENHA
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    className="w-full pl-11 pr-12 py-3 rounded-2xl border-2 border-slate-200 dark:border-slate-800 focus:border-[#0d9488] focus:ring-4 focus:ring-[#0d9488]/10 outline-none transition-all text-slate-900 dark:text-white bg-white dark:bg-slate-900 font-medium text-sm"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
                    tabIndex={-1}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10.5px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  CONFIRMAR NOVA SENHA
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="w-full pl-11 pr-12 py-3 rounded-2xl border-2 border-slate-200 dark:border-slate-800 focus:border-[#0d9488] focus:ring-4 focus:ring-[#0d9488]/10 outline-none transition-all text-slate-900 dark:text-white bg-white dark:bg-slate-900 font-medium text-sm"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {changePasswordError && (
                <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold rounded-xl p-3.5 flex items-center gap-2">
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {changePasswordError}
                </div>
              )}

              <button 
                type="submit" 
                className="w-full py-3.5 px-4 bg-[#0d9488] hover:bg-[#0f766e] active:bg-[#115e59] text-white rounded-2xl font-bold shadow-lg shadow-teal-700/25 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer text-sm mt-2" 
                disabled={changePasswordLoading}
              >
                {changePasswordLoading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Gravando nova senha...</span>
                  </>
                ) : (
                  <>
                    <span>Gravar e Entrar</span>
                    <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setRequiresPasswordChange(false)
                  setNewPassword('')
                  setConfirmNewPassword('')
                  setChangePasswordError(null)
                }}
                className="w-full py-2.5 px-4 bg-transparent border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-center text-xs"
              >
                Voltar ao Login
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
