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
  title: string
}

export default function Header({ onMenuClick, title }: Props) {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const { status, lastSync, triggerSync, isSyncing, agentStatus } = useSyncStatus()
  const [menuOpen, setMenuOpen] = useState(false)
  const [empresaNome, setEmpresaNome] = useState<string>('')

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
    <header className="h-14 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-divider/60 sticky top-0 z-20 flex items-center px-3 sm:px-4 lg:px-6 transition-all duration-300">
      <button
        className="lg:hidden p-2 -ml-2 text-text-secondary hover:bg-bg-secondary rounded-lg active:bg-bg-tertiary"
        onClick={onMenuClick}
        aria-label="Abrir menu"
      >
        <Menu size={20} />
      </button>

      <h1 className="font-heading text-sm sm:text-base font-bold ml-1 sm:ml-2 lg:ml-0 truncate">{title}</h1>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
        
        {/* Indicador de Status com Tooltip (Consolidado) */}
        <div className="group relative flex items-center justify-center p-1.5 rounded-lg bg-bg-secondary/60 hover:bg-bg-secondary border border-divider/30 cursor-help transition-all duration-200">
          <div className="relative">
            <div className={`w-3 h-3 rounded-full flex items-center justify-center`}>
              <div className={`w-2 h-2 rounded-full ${agentStatus === 'ONLINE' ? (status === 'ok' ? 'bg-success' : 'bg-warning') : 'bg-danger animate-pulse'}`} />
            </div>
            {agentStatus !== 'ONLINE' && (
              <div className="absolute inset-0 bg-danger/30 rounded-full animate-ping" />
            )}
          </div>
          
          {/* Tooltip Content */}
          <div className="absolute top-full mt-2 right-0 hidden group-hover:flex flex-col bg-bg-primary border border-divider shadow-card p-3 rounded-2xl min-w-[240px] text-xs space-y-2 z-50 animate-in fade-in duration-200">
            <div className="flex items-center justify-between gap-3">
              <span className="text-text-secondary font-bold">Agente ERP:</span>
              <span className={`font-black ${agentStatus === 'ONLINE' ? 'text-success' : 'text-danger'}`}>
                {agentStatus === 'ONLINE' ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>
            
            <div className="flex items-center justify-between gap-3 border-t border-divider/30 pt-2">
              <span className="text-text-secondary font-bold">Última Sync:</span>
              <span className="mono font-bold text-text-primary">
                {lastSync ? formatDateTime(lastSync) : 'nunca'}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-divider/30 pt-2 text-[10px]">
              <span className="text-text-secondary font-bold">Status dos Dados:</span>
              <span className={status === 'ok' ? 'text-success font-black' : 'text-warning font-black'}>
                {status === 'ok' ? 'Sincronizado' : 'Pendente'}
              </span>
            </div>
          </div>
        </div>

        <button
          className="p-2 text-text-secondary hover:bg-bg-secondary rounded-lg active:bg-bg-tertiary transition-colors duration-200"
          onClick={triggerSync}
          disabled={isSyncing}
          title="Forçar sincronização"
        >
          <RefreshCw size={15} className={isSyncing ? 'animate-spin' : ''} />
        </button>

        {/* Separador */}
        <div className="w-px h-5 bg-divider mx-0.5"></div>

        {/* Layout Version */}
        <div className="hidden sm:flex items-center px-1.5 h-5 rounded-md border border-divider bg-bg-tertiary/30 text-[10px] font-mono text-text-muted cursor-default" title="Versão do Layout Ativo">
          {user?.layout_version || 'v1.0'}
        </div>

        {empresaNome && (
          <div className="hidden sm:flex items-center px-2 border-r border-[#E0E0E0] mr-1 pr-3">
            <span className="text-sm font-bold text-slate-700 uppercase tracking-wide">
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
