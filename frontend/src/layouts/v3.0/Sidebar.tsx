import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, ShoppingCart, Wallet,
  Trophy, BarChart3, Users, X, LogOut, Shield, DollarSign,
  Truck, Map, BrainCircuit
} from 'lucide-react'
import clsx from 'clsx'
import { useAuthStore } from '../../store/authStore'
import { Package, Settings, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

interface Props {
  open: boolean
  onClose: () => void
}

const MODULES = [
  { to: '/',              label: 'Visão Estratégica',        icon: LayoutDashboard,  exact: true,  id: 'inicio' },
]

const BI_MODULES = [
  { to: '/bi',            label: 'Inteligência de Vendas',   icon: BarChart3,        exact: true,  id: 'bi_sales' },
  { to: '/bi/hub',        label: 'Hub de Vendas',     icon: ShoppingCart,                   id: 'bi_hub' },
  { to: '/bi/supplier',   label: 'Hub do Fornecedor', icon: Truck,                          id: 'bi_supplier' },
  { to: '/bi/abc',        label: 'Gestão de Inventário', icon: Package,                        id: 'bi_abc' },
  { to: '/bi/finance',    label: 'Financeiro',    icon: Wallet,                         id: 'bi_finance' },
  { to: '/bi/customer',   label: 'Radar 360',     icon: Users,                          id: 'bi_customer' },
  { to: '/bi/comparative',label: 'Lucratividade',   icon: DollarSign,                     id: 'bi_comparative' },
  { to: '/bi/customer-analytics',label: 'Análise de Clientes', icon: Users,             id: 'bi_customer_analytics' },
  { to: '/bi/goals',      label: 'Análise de Metas',icon: Trophy,                       id: 'bi_goals' },
  { to: '/bi/heatmap',    label: 'Mapa de Calor', icon: Map,                            id: 'bi_heatmap' },
  { to: '/bi/ai-insights',label: 'Coliseu AI',    icon: BrainCircuit,                   id: 'bi_ai_insights' },
]

const CONFIG_MODULES = [
  { to: '/usuarios',      label: 'Usuários',      icon: Shield,                         id: 'usuarios' },
  { to: '/grupos',        label: 'Grupos de Acesso', icon: Shield,                      id: 'usuarios' }
]

export default function Sidebar({ open, onClose }: Props) {
  const user = useAuthStore((s) => s.user)
  const [configOpen, setConfigOpen] = useState(false)

  // Filtra as rotas (sempre ativo para layouts 1, 2 e 3)
  const hasAccess = (moduleId: string) => {
    if (user?.role === 'master') return true
    return user?.permissions?.includes(moduleId) || false
  }

  const allowedModules = MODULES.filter((m) => hasAccess(m.id))
  const allowedBiModules = BI_MODULES.filter((m) => hasAccess(m.id))
  const allowedConfigModules = CONFIG_MODULES.filter((m) => hasAccess(m.id))

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
          'fixed lg:sticky top-0 left-0 h-screen w-64 bg-bg-primary/95 backdrop-blur-xl border-r border-divider z-40',
          'transform transition-transform duration-200 ease-out lg:translate-x-0',
          'flex flex-col shadow-card lg:shadow-none',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        {/* Logo */}
        <div className="h-20 px-4 flex items-center justify-between border-b border-divider bg-transparent">
          <img
            src="/logo-coliseu.png"
            alt="Coliseu Sistemas"
            className="h-14 w-auto object-contain"
          />
          <button
            className="lg:hidden p-1.5 text-text-secondary hover:bg-bg-secondary rounded"
            onClick={onClose}
            aria-label="Fechar menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 flex flex-col">
          <div className="flex-1">
            <div className="px-3 mb-2 text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Menu Principal
            </div>
            {allowedModules.map(({ to, label, icon: Icon, exact }) => (
              <NavLink
                key={to}
                to={to}
                end={exact}
                onClick={onClose}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-1',
                    isActive
                      ? 'bg-brand-500/10 text-brand-500'
                      : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary',
                  )
                }
              >
                <Icon size={18} className="flex-shrink-0" />
                <span className="truncate">{label}</span>
              </NavLink>
            ))}
          </div>

          {allowedBiModules.length > 0 && (
            <div className="flex-1 mt-4">
              <div className="px-3 mb-2 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Business Intelligence
              </div>
              {allowedBiModules.map(({ to, label, icon: Icon, exact }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={exact}
                  onClick={onClose}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-1',
                      isActive
                        ? 'bg-brand-500/10 text-brand-500'
                        : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary',
                    )
                  }
                >
                  <Icon size={18} className="flex-shrink-0" />
                  <span className="truncate">{label}</span>
                </NavLink>
              ))}
            </div>
          )}

          {allowedConfigModules.length > 0 && (
            <div className="mt-auto pt-4 border-t border-divider">
              <button
                onClick={() => setConfigOpen(!configOpen)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:bg-bg-secondary hover:text-text-primary transition-colors mb-1"
              >
                <div className="flex items-center gap-3">
                  <Settings size={18} className="flex-shrink-0" />
                  <span className="truncate">Configurações</span>
                </div>
                {configOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              
              {configOpen && (
                <div className="pl-4 mt-1 space-y-1 border-l-2 border-divider ml-3">
                  {allowedConfigModules.map(({ to, label, icon: Icon, exact }) => (
                    <NavLink
                      key={to}
                      to={to}
                      end={exact}
                      onClick={onClose}
                      className={({ isActive }) =>
                        clsx(
                          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-brand-500/10 text-brand-500'
                            : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary',
                        )
                      }
                    >
                      <Icon size={16} className="flex-shrink-0" />
                      <span className="truncate">{label}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )}
        </nav>

        {/* Footer com Sair */}
        <div className="px-4 py-3 border-t border-divider text-[11px] text-text-secondary flex items-center justify-between">
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
