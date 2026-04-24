import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, ShoppingCart, Wallet,
  Trophy, BarChart3, Users, X, LogOut
} from 'lucide-react'
import clsx from 'clsx'
import { useAuthStore } from '../store/authStore'

interface Props {
  open: boolean
  onClose: () => void
}

const MODULES = [
  { to: '/',              label: 'Início',        icon: LayoutDashboard,  exact: true },
  { to: '/financeiro',    label: 'Financeiro',    icon: Wallet },
  { to: '/comissoes',     label: 'Vendedores',    icon: Users },
  { to: '/ranking',       label: 'Ranking',       icon: Trophy },
  { to: '/estatisticas',  label: 'Estatísticas',  icon: BarChart3 }
]

export default function Sidebar({ open, onClose }: Props) {
  return (
    <>
      {/* Backdrop mobile */}
      {open && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-30 lg:hidden backdrop-blur-sm transition-opacity duration-300"
          onClick={onClose}
        />
      )}
      <aside
        className={clsx(
          'fixed lg:sticky top-0 left-0 h-screen w-64 bg-white/95 backdrop-blur-xl border-r border-[#E0E0E0]/50 z-40',
          'transform transition-transform duration-200 ease-out lg:translate-x-0',
          'flex flex-col shadow-xl lg:shadow-none',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        {/* Logo */}
        <div className="h-20 px-4 flex items-center justify-between border-b border-[#E0E0E0] bg-gradient-to-br from-slate-900 to-slate-800">
          <img
            src="/logobranco.jpg"
            alt="Coliseu Sistemas"
            className="h-10 w-auto object-contain"
          />
          <button
            className="lg:hidden p-1.5 text-white/70 hover:bg-white/10 rounded"
            onClick={onClose}
            aria-label="Fechar menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {MODULES.map(({ to, label, icon: Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              onClick={onClose}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-1',
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary',
                )
              }
            >
              <Icon size={18} className="flex-shrink-0" />
              <span className="truncate">{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer com Sair */}
        <div className="px-4 py-3 border-t border-[#E0E0E0] text-[11px] text-text-secondary flex items-center justify-between">
          <div>
            <div className="font-semibold text-text-primary">Coliseu Dash v2.0</div>
            <div>© 2026 Coliseu Sistemas</div>
          </div>
          <button
            onClick={() => {
              useAuthStore.getState().logout()
              window.location.href = '/login'
            }}
            className="p-2 text-text-secondary hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
            title="Sair do sistema"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>
    </>
  )
}
