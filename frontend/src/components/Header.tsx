import { useState } from 'react'
import { Menu, LogOut, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useSyncStatus } from '../hooks/useSync'
import { formatDateTime } from '../utils/format'

interface Props {
  onMenuClick: () => void
  title: string
}

export default function Header({ onMenuClick, title }: Props) {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const { status, lastSync, triggerSync, isSyncing } = useSyncStatus()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="h-16 bg-white border-b border-[#E0E0E0] sticky top-0 z-20 flex items-center px-4 lg:px-6">
      <button
        className="lg:hidden p-2 -ml-2 text-text-secondary hover:bg-bg-secondary rounded"
        onClick={onMenuClick}
        aria-label="Abrir menu"
      >
        <Menu size={20} />
      </button>

      <h1 className="font-heading text-lg font-semibold ml-2 lg:ml-0">{title}</h1>

      <div className="ml-auto flex items-center gap-3">
        {/* Status sync */}
        <div className="hidden md:flex items-center gap-2 text-xs text-text-secondary">
          {status === 'ok' ? (
            <CheckCircle2 size={14} className="text-success" />
          ) : (
            <AlertCircle size={14} className="text-warning" />
          )}
          <span>
            Última sync:{' '}
            <span className="mono">{lastSync ? formatDateTime(lastSync) : 'nunca'}</span>
          </span>
        </div>

        <button
          className="btn-ghost !px-2 !py-2"
          onClick={triggerSync}
          disabled={isSyncing}
          title="Forçar sincronização"
        >
          <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
        </button>

        {/* Usuário */}
        <div className="relative">
          <button
            className="flex items-center gap-2 px-2 py-1.5 hover:bg-bg-secondary rounded-lg"
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
              <div className="absolute right-0 mt-1 w-48 bg-white border border-[#E0E0E0] rounded-lg shadow-card-hover z-40 py-1">
                <div className="px-3 py-2 border-b border-[#E0E0E0]">
                  <div className="text-sm font-medium">{user?.nome}</div>
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
