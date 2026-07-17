import { useState, useEffect } from 'react'
import { Menu, LogOut, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useSyncStatus } from '../../hooks/useSync'
import { formatDateTime } from '../../utils/format'
import ThemeToggle from '../../components/ThemeToggle'
import BranchSelector from '../../components/BranchSelector'
import api from '../../services/api'

interface Props {
  onMenuClick: () => void
  activeRoute: { label: string; icon: React.ElementType; color: string }
}

export default function Header({ onMenuClick, activeRoute }: Props) {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const { status, lastSync, triggerSync, isSyncing, agentStatus } = useSyncStatus()
  const [menuOpen, setMenuOpen] = useState(false)
  const [empresaNome, setEmpresaNome] = useState<string>('')

  const updateUserVersion = useAuthStore((s) => s.updateUserVersion)
  const [switching, setSwitching] = useState(false)

  const handleVersionChange = async (newVersion: string) => {
    if (!user?.id || switching) return
    setSwitching(true)
    try {
      await api.put(`/usuarios/${user.id}/layout`, { versao: newVersion })
      updateUserVersion(newVersion)
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao alternar versão')
    } finally {
      setSwitching(false)
    }
  }

  const availableVersions = user?.available_versions || [user?.versao || 'Dash 1.0']

  useEffect(() => {
    const fetchEmpresa = async () => {
      try {
        const { data } = await api.get('/configuracoes/empresa')
        if (data && data.name) {
          setEmpresaNome(data.name)
        }
      } catch (err) {
        console.error('Erro ao buscar nome da empresa', err)
      }
    }
    fetchEmpresa()
  }, [])

  return (
    <header className="h-14 sm:h-16 bg-white/80 backdrop-blur-md border-b border-[#E0E0E0]/50 sticky top-0 z-20 flex items-center px-3 sm:px-4 lg:px-6 transition-all duration-300">
      <button
        className="lg:hidden p-2 -ml-2 text-text-secondary hover:bg-bg-secondary rounded-lg active:bg-bg-tertiary"
        onClick={onMenuClick}
        aria-label="Abrir menu"
      >
        <Menu size={22} />
      </button>

      <div className="flex items-center gap-2.5 ml-1 sm:ml-2 lg:ml-0 min-w-0 flex-shrink-0">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: `${activeRoute.color}15`,
            boxShadow: `0 2px 8px ${activeRoute.color}20`,
          }}
        >
          <activeRoute.icon size={16} style={{ color: activeRoute.color }} strokeWidth={2.2} />
        </div>
        <h1 className="font-heading text-xs sm:text-sm md:text-base font-extrabold text-text-primary uppercase tracking-wider truncate whitespace-nowrap">
          {activeRoute.label}
        </h1>
      </div>

      <div className="ml-auto flex items-center gap-1 sm:gap-2.5">
        {/* Glowing Agente status dot (no text to save space) */}
        <div 
          className="hidden lg:flex relative w-5 h-5 items-center justify-center rounded-full bg-slate-100/80 dark:bg-slate-800/80 cursor-help"
          title={agentStatus === 'ONLINE' ? 'Agente: Banco de Dados Conectado' : 'Agente: Falha na Conexão com o Banco'}
        >
          <span className={`absolute inline-flex h-2.5 w-2.5 rounded-full opacity-75 animate-ping ${agentStatus === 'ONLINE' ? 'bg-success' : 'bg-danger'}`} />
          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${agentStatus === 'ONLINE' ? 'bg-success' : 'bg-danger'}`} />
        </div>

        {/* Status sync (desktop) */}
        <div className="hidden md:flex items-center gap-2 text-xs text-text-secondary border-l border-[#E0E0E0] pl-3">
          {status === 'ok' ? (
            <CheckCircle2 size={14} className="text-success" />
          ) : (
            <AlertCircle size={14} className="text-warning" />
          )}
          <span className="flex flex-col text-[10px] leading-tight">
            <span>Última Sync:</span>
            <span className="mono font-medium">{lastSync ? formatDateTime(lastSync) : 'nunca'}</span>
          </span>
        </div>

        {/* Sync indicator mobile (só o ícone) */}
        <div className="md:hidden flex items-center relative">
          <div className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-white ${agentStatus === 'ONLINE' ? 'bg-success' : 'bg-danger animate-pulse'}`} />
          {status === 'ok' ? (
            <CheckCircle2 size={18} className="text-text-primary" />
          ) : (
            <AlertCircle size={18} className="text-warning" />
          )}
        </div>

        <button
          className="p-2 text-text-secondary hover:bg-bg-secondary rounded-lg active:bg-bg-tertiary"
          onClick={triggerSync}
          disabled={isSyncing}
          title="Forçar sincronização"
        >
          <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
        </button>

        {/* Separador */}
        <div className="w-px h-6 bg-divider mx-1"></div>

        {/* Layout Version Switcher is removed */}

        {empresaNome && (
          <div className="hidden xl:flex items-center px-2 border-r border-[#E0E0E0] mr-1 pr-3">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">
              {empresaNome}
            </span>
          </div>
        )}

        <BranchSelector />

        <ThemeToggle />

        {/* Usuário */}
        <div className="relative">
          <button
            className="flex items-center gap-2 px-1.5 py-1 sm:px-2 sm:py-1.5 hover:bg-bg-secondary rounded-lg active:bg-bg-tertiary"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center text-sm font-semibold">
              {user?.nome?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-sm font-medium leading-tight">{user?.nome}</div>
              <div className="text-[11px] text-text-secondary leading-tight capitalize">{user?.role}</div>
            </div>
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 mt-1 w-52 bg-white border border-[#E0E0E0] rounded-lg shadow-card-hover z-40 py-1">
                <div className="px-3 py-2 border-b border-[#E0E0E0]">
                  <div className="text-sm font-medium truncate">{user?.nome}</div>
                  <div className="text-xs text-text-secondary truncate">{user?.email}</div>
                </div>
                <button
                  onClick={logout}
                  className="w-full text-left px-3 py-2 text-sm text-text-secondary hover:bg-bg-secondary flex items-center gap-2"
                >
                  <LogOut size={14} />
                  Sair
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
