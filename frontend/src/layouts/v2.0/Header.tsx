import { useState, useEffect } from 'react'
import { Menu, LogOut, RefreshCw, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useSyncStatus } from '../../hooks/useSync'
import ThemeToggle from '../../components/ThemeToggle'
import BranchSelector from '../../components/BranchSelector'
import api from '../../services/api'

interface Props {
  onMenuClick: () => void
  title: string
  isCollapsed: boolean
  onToggleCollapse: () => void
}

export default function Header({ onMenuClick, title, isCollapsed, onToggleCollapse }: Props) {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const { status, lastSync, triggerSync, isSyncing, agentStatus } = useSyncStatus()
  const [menuOpen, setMenuOpen] = useState(false)
  const [empresaNome, setEmpresaNome] = useState<string>('')
  const [friendlyTime, setFriendlyTime] = useState('Nunca')

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

  useEffect(() => {
    const updateFriendlyTime = () => {
      if (!lastSync) {
        setFriendlyTime('nunca')
        return
      }
      const d = new Date(lastSync)
      const diffMin = Math.round((Date.now() - d.getTime()) / 60000)
      if (isNaN(diffMin) || diffMin < 0) {
        setFriendlyTime('agora')
        return
      }
      if (diffMin === 0) {
        setFriendlyTime('agora')
        return
      }
      if (diffMin < 60) {
        setFriendlyTime(`há ${diffMin} min`)
        return
      }
      const diffHours = Math.floor(diffMin / 60)
      if (diffHours < 24) {
        setFriendlyTime(`há ${diffHours}h`)
        return
      }
      setFriendlyTime(d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
    }

    updateFriendlyTime()
    const interval = setInterval(updateFriendlyTime, 30000)
    return () => clearInterval(interval)
  }, [lastSync])

  return (
    <header className="h-16 bg-bg-primary/80 backdrop-blur-md border-b border-divider sticky top-0 z-20 flex items-center px-4 lg:px-6 transition-all duration-300">
      {/* Mobile Drawer Trigger */}
      <button
        className="lg:hidden p-2 -ml-2 text-text-secondary hover:bg-bg-secondary rounded-xl active:bg-bg-tertiary transition-colors"
        onClick={onMenuClick}
        aria-label="Abrir menu"
      >
        <Menu size={22} />
      </button>

      {/* Collapse Sidebar Button for Desktop/Tablet */}
      <button
        onClick={onToggleCollapse}
        className="hidden lg:flex p-2 text-text-secondary hover:bg-bg-secondary hover:text-text-primary rounded-xl mr-3 transition-colors cursor-pointer"
        title={isCollapsed ? "Expandir Menu" : "Recolher Menu"}
      >
        {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
      </button>

      <h1 className="font-heading text-lg font-bold text-text-primary truncate max-w-[200px] sm:max-w-xs">{title}</h1>

      <div className="ml-auto flex items-center gap-2 sm:gap-4">
        {/* Status Indicators Group */}
        <div className="hidden sm:flex items-center gap-3 bg-bg-secondary/40 border border-divider/60 rounded-2xl px-3.5 py-1.5 shadow-sm text-xs">
          {/* Database Agent Connection */}
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${agentStatus === 'ONLINE' ? 'bg-success' : 'bg-danger animate-pulse'}`} />
            <span className="font-bold text-text-secondary whitespace-nowrap">
              {agentStatus === 'ONLINE' ? 'Agente OK' : 'Banco Offline'}
            </span>
          </div>

          <div className="w-px h-3.5 bg-divider"></div>

          {/* Sincronização */}
          <div className="flex items-center gap-1.5 text-text-secondary">
            {status === 'ok' ? (
              <CheckCircle2 size={14} className="text-success" />
            ) : (
              <AlertCircle size={14} className="text-warning" />
            )}
            <span className="font-bold text-text-muted">
              Sincronizado: <span className="text-text-secondary font-mono font-medium">{friendlyTime}</span>
            </span>
          </div>
        </div>

        {/* Sync Status Mobile Indicator */}
        <div className="sm:hidden flex items-center relative gap-1 p-1 bg-bg-secondary/60 border border-divider/50 rounded-xl">
          <div className={`w-2 h-2 rounded-full ${agentStatus === 'ONLINE' ? 'bg-success' : 'bg-danger animate-pulse'}`} />
          {status === 'ok' ? (
            <CheckCircle2 size={15} className="text-success" />
          ) : (
            <AlertCircle size={15} className="text-warning" />
          )}
        </div>

        {/* Force Sync button */}
        <button
          className="p-2 text-text-secondary hover:text-brand-500 hover:bg-bg-secondary rounded-xl active:bg-bg-tertiary transition-all duration-200"
          onClick={triggerSync}
          disabled={isSyncing}
          title="Forçar sincronização"
        >
          <RefreshCw size={16} className={isSyncing ? 'animate-spin text-brand-500' : ''} />
        </button>

        {empresaNome && (
          <div className="hidden md:flex items-center border-l border-divider pl-4">
            <span className="text-xs font-black text-brand-600 bg-brand-500/10 border border-brand-500/10 px-2.5 py-1 rounded-full uppercase tracking-wider">
              {empresaNome}
            </span>
          </div>
        )}

        {/* Layout Version Switcher */}
        {availableVersions.length > 1 ? (
          <select
            className="bg-bg-secondary text-text-primary border border-divider/60 rounded-lg px-2 py-1 text-xs outline-none focus:border-brand-500 transition-colors cursor-pointer font-semibold"
            value={user?.versao || 'Dash 1.0'}
            disabled={switching}
            onChange={(e) => handleVersionChange(e.target.value)}
          >
            {availableVersions.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        ) : (
          <div className="hidden sm:flex items-center px-1.5 h-6 rounded-md border border-divider bg-bg-tertiary/30 text-[10px] font-mono text-text-muted cursor-default" title="Versão do Layout Ativo">
            {user?.versao || 'Dash 1.0'}
          </div>
        )}

        <BranchSelector />

        <ThemeToggle />

        {/* User profile dropdown button */}
        <div className="relative">
          <button
            className="flex items-center gap-2.5 p-1 sm:px-2.5 sm:py-1.5 hover:bg-bg-secondary rounded-2xl active:bg-bg-tertiary transition-all duration-200"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <div className="w-8 h-8 rounded-full bg-brand-500/10 text-brand-600 border border-brand-500/10 flex items-center justify-center text-sm font-black shadow-sm">
              {user?.nome?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="text-left hidden lg:block">
              <div className="text-xs font-bold leading-none text-text-primary">{user?.nome}</div>
              <div className="text-[10px] text-text-muted font-bold tracking-wide uppercase mt-0.5 leading-none">{user?.role}</div>
            </div>
          </button>
          
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 mt-2 w-52 bg-bg-primary border border-divider rounded-xl shadow-card-hover z-40 py-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-2.5 border-b border-divider">
                  <div className="text-xs font-bold text-text-primary truncate">{user?.nome}</div>
                  <div className="text-[10px] text-text-muted truncate mt-0.5">{user?.email}</div>
                </div>
                <button
                  onClick={logout}
                  className="w-full text-left px-4 py-2.5 text-xs font-bold text-text-secondary hover:text-danger hover:bg-danger/10 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <LogOut size={14} />
                  Sair da Conta
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
