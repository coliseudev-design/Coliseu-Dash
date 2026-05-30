import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, ShoppingCart, Wallet,
  Trophy, BarChart3, Users, X, LogOut, Shield, DollarSign,
  Truck
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
  { 
    to: '/', 
    label: 'Visão Estratégica', 
    icon: LayoutDashboard, 
    exact: true, 
    id: 'inicio',
    iconColor: 'text-indigo-500 dark:text-indigo-400',
    iconBg: 'bg-indigo-50 dark:bg-indigo-500/10'
  },
]

const BI_MODULES = [
  { 
    to: '/bi/vendedor', 
    label: 'Hub do Vendedor', 
    icon: Trophy, 
    id: 'bi_seller_hub',
    iconColor: 'text-amber-500 dark:text-amber-400',
    iconBg: 'bg-amber-50/80 dark:bg-amber-500/10'
  },
  { 
    to: '/bi', 
    label: 'Inteligência de Vendas', 
    icon: BarChart3, 
    exact: true, 
    id: 'bi_sales',
    iconColor: 'text-sky-500 dark:text-sky-400',
    iconBg: 'bg-sky-50 dark:bg-sky-500/10'
  },
  { 
    to: '/bi/hub', 
    label: 'Hub de Vendas', 
    icon: ShoppingCart, 
    id: 'bi_hub',
    iconColor: 'text-emerald-500 dark:text-emerald-400',
    iconBg: 'bg-emerald-50 dark:bg-emerald-500/10'
  },
  { 
    to: '/bi/supplier', 
    label: 'Hub do Fornecedor', 
    icon: Truck, 
    id: 'bi_supplier',
    iconColor: 'text-purple-500 dark:text-purple-400',
    iconBg: 'bg-purple-50 dark:bg-purple-500/10'
  },
  { 
    to: '/bi/abc', 
    label: 'Gestão de Inventário', 
    icon: Package, 
    id: 'bi_abc',
    iconColor: 'text-rose-500 dark:text-rose-400',
    iconBg: 'bg-rose-50 dark:bg-rose-500/10'
  },
  { 
    to: '/bi/finance', 
    label: 'Financeiro', 
    icon: Wallet, 
    id: 'bi_finance',
    iconColor: 'text-teal-500 dark:text-teal-400',
    iconBg: 'bg-teal-50 dark:bg-teal-500/10'
  },
  { 
    to: '/bi/customer', 
    label: 'Radar 360', 
    icon: Users, 
    id: 'bi_customer',
    iconColor: 'text-cyan-500 dark:text-cyan-400',
    iconBg: 'bg-cyan-50 dark:bg-cyan-500/10'
  },
  { 
    to: '/bi/comparative', 
    label: 'Lucratividade', 
    icon: DollarSign, 
    id: 'bi_comparative',
    iconColor: 'text-lime-500 dark:text-lime-400',
    iconBg: 'bg-lime-50 dark:bg-lime-500/10'
  },
  { 
    to: '/bi/customer-analytics', 
    label: 'Análise de Clientes', 
    icon: Users, 
    id: 'bi_customer_analytics',
    iconColor: 'text-blue-500 dark:text-blue-400',
    iconBg: 'bg-blue-50 dark:bg-blue-500/10'
  },
]

const CONFIG_MODULES = [
  { 
    to: '/usuarios', 
    label: 'Usuários', 
    icon: Shield, 
    id: 'usuarios',
    iconColor: 'text-red-500 dark:text-red-400',
    iconBg: 'bg-red-50 dark:bg-red-500/10'
  },
  { 
    to: '/grupos', 
    label: 'Grupos de Acesso', 
    icon: Shield, 
    id: 'usuarios',
    iconColor: 'text-violet-500 dark:text-violet-400',
    iconBg: 'bg-violet-50 dark:bg-violet-500/10'
  }
]

export default function Sidebar({ open, onClose }: Props) {
  const user = useAuthStore((s) => s.user)
  const [configOpen, setConfigOpen] = useState(false)

  // Filtra as rotas se o usuário não for master e tiver permissions configurado
  const hasAccess = (moduleId: string) => {
    if (!user) return false
    if (user.role === 'master' || !user.permissions) return true
    return user.permissions.includes(moduleId)
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
            src="/logo-coliseu.png" // We can use the same logo image
            alt="Siscom Vet"
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
          <div>
            <div className="px-3 mb-2 text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Menu Principal
            </div>
            {allowedModules.map(({ to, label, icon: Icon, exact, iconColor, iconBg }) => (
              <NavLink
                key={to}
                to={to}
                end={exact}
                onClick={onClose}
                className={({ isActive }) =>
                  clsx(
                    'group flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 mb-1 border',
                    isActive
                      ? 'bg-white dark:bg-slate-800/60 text-text-primary shadow-sm border-slate-200/60 dark:border-slate-700/60 font-semibold'
                      : 'text-text-secondary hover:bg-bg-secondary/60 hover:text-text-primary border-transparent',
                  )
                }
              >
                <div className={clsx("p-1.5 rounded-lg flex-shrink-0 transition-colors", iconBg)}>
                  <Icon size={16} className={clsx("transition-transform duration-200 group-hover:scale-110", iconColor)} />
                </div>
                <span className="truncate">{label}</span>
              </NavLink>
            ))}
          </div>

          {allowedBiModules.length > 0 && (
            <div className="mt-6">
              <div className="px-3 mb-2 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Business Intelligence (Vet)
              </div>
              {allowedBiModules.map(({ to, label, icon: Icon, exact, iconColor, iconBg }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={exact}
                  onClick={onClose}
                  className={({ isActive }) =>
                    clsx(
                      'group flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 mb-1 border',
                      isActive
                        ? 'bg-white dark:bg-slate-800/60 text-text-primary shadow-sm border-slate-200/60 dark:border-slate-700/60 font-semibold'
                        : 'text-text-secondary hover:bg-bg-secondary/60 hover:text-text-primary border-transparent',
                    )
                  }
                >
                  <div className={clsx("p-1.5 rounded-lg flex-shrink-0 transition-colors", iconBg)}>
                    <Icon size={16} className={clsx("transition-transform duration-200 group-hover:scale-110", iconColor)} />
                  </div>
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
                  {allowedConfigModules.map(({ to, label, icon: Icon, exact, iconColor, iconBg }) => (
                    <NavLink
                      key={to}
                      to={to}
                      end={exact}
                      onClick={onClose}
                      className={({ isActive }) =>
                        clsx(
                          'group flex items-center gap-3 px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 border',
                          isActive
                            ? 'bg-white dark:bg-slate-800/60 text-text-primary shadow-sm border-slate-200/60 dark:border-slate-700/60 font-semibold'
                            : 'text-text-secondary hover:bg-bg-secondary/60 hover:text-text-primary border-transparent',
                        )
                      }
                    >
                      <div className={clsx("p-1.5 rounded-lg flex-shrink-0 transition-colors", iconBg)}>
                        <Icon size={14} className={clsx("transition-transform duration-200 group-hover:scale-110", iconColor)} />
                      </div>
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
            <div className="font-semibold text-text-primary">Siscom Vet Dash v4.0</div>
            <div>© 2026 Siscom Sistemas</div>
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
