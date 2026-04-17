import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, ShoppingCart, Wallet, TrendingUp, Percent,
  Trophy, BarChart3, Truck, RotateCcw, Package, Users, FileClock, X,
} from 'lucide-react'
import clsx from 'clsx'

interface Props {
  open: boolean
  onClose: () => void
}

const MODULES = [
  { to: '/', label: 'Início',        icon: LayoutDashboard,  exact: true },
  { to: '/vendas',        label: 'Vendas',        icon: ShoppingCart },
  { to: '/financeiro',    label: 'Financeiro',    icon: Wallet },
  { to: '/lucratividade', label: 'Lucratividade', icon: TrendingUp },
  { to: '/comissoes',     label: 'Comissões',     icon: Percent },
  { to: '/ranking',       label: 'Ranking',       icon: Trophy },
  { to: '/estatisticas',  label: 'Estatísticas',  icon: BarChart3 },
  { to: '/compras',       label: 'Compras',       icon: Truck },
  { to: '/devolucoes',    label: 'Devoluções',    icon: RotateCcw },
  { to: '/produtos',      label: 'Produtos',      icon: Package },
  { to: '/clientes',      label: 'Clientes',      icon: Users },
  { to: '/log',           label: 'Log',           icon: FileClock },
]

export default function Sidebar({ open, onClose }: Props) {
  return (
    <>
      {/* Backdrop mobile */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={clsx(
          'fixed lg:sticky top-0 left-0 h-screen w-64 bg-white border-r border-[#E0E0E0] z-40',
          'transform transition-transform duration-200 ease-out lg:translate-x-0',
          'flex flex-col',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        {/* Logo */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-[#E0E0E0]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white font-bold font-heading">
              C
            </div>
            <div>
              <div className="font-heading font-semibold text-sm leading-tight">Coliseu</div>
              <div className="text-[11px] text-text-secondary leading-tight">Dash Gerencial</div>
            </div>
          </div>
          <button
            className="lg:hidden p-1 text-text-secondary hover:bg-bg-secondary rounded"
            onClick={onClose}
            aria-label="Fechar menu"
          >
            <X size={18} />
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
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-0.5',
                  isActive
                    ? 'bg-brand-50 text-brand-600'
                    : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary',
                )
              }
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#E0E0E0] text-[11px] text-text-secondary">
          v2.0 · Coliseu Dash
        </div>
      </aside>
    </>
  )
}
