import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, ShoppingCart, Wallet,
  Trophy, BarChart3, Users, X, LogOut, Shield, DollarSign,
  Truck, Map, BrainCircuit, Package, Settings, ChevronDown, ChevronUp, ChevronLeft, GitCompare
} from 'lucide-react'
import clsx from 'clsx'
import { useAuthStore } from '../../store/authStore'
import { useState } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  collapsed: boolean
  onToggleCollapse: () => void
}

const MODULES = [
  { to: '/', label: 'Visão Estratégica', icon: LayoutDashboard, exact: true, id: 'inicio', color: '#3B82F6' },
  { to: '/comparativo-vendas', label: 'Comparativo', icon: GitCompare, exact: true, id: 'inicio', color: '#10B981' },
]

const BI_MODULES = [
  { to: '/bi',                       label: 'Inteligência de Vendas', icon: BarChart3,     exact: true,  id: 'bi_sales',               color: '#10B981' },
  { to: '/bi/hub',                   label: 'Hub de Vendas',          icon: ShoppingCart,               id: 'bi_hub',                 color: '#F97316' },
  { to: '/bi/supplier',              label: 'Hub do Fornecedor',      icon: Truck,                       id: 'bi_supplier',            color: '#F59E0B' },
  { to: '/bi/abc',                   label: 'Gestão de Inventário',   icon: Package,                     id: 'bi_abc',                 color: '#06B6D4' },
  { to: '/bi/finance',               label: 'Financeiro',             icon: Wallet,                      id: 'bi_finance',             color: '#22C55E' },
  { to: '/bi/customer',              label: 'Radar 360',              icon: Users,                       id: 'bi_customer',            color: '#EC4899' },
  { to: '/bi/comparative',           label: 'Lucratividade',          icon: DollarSign,                  id: 'bi_comparative',         color: '#84CC16' },
  { to: '/bi/customer-analytics',    label: 'Análise de Clientes',    icon: Users,                       id: 'bi_customer_analytics',  color: '#14B8A6' },
  { to: '/bi/goals',                 label: 'Análise de Metas',       icon: Trophy,                      id: 'bi_goals',               color: '#EAB308' },
  { to: '/bi/heatmap',               label: 'Mapa de Calor',          icon: Map,                         id: 'bi_heatmap',             color: '#0EA5E9' },
  { to: '/bi/ai-insights',           label: 'Coliseu AI',             icon: BrainCircuit,                id: 'bi_ai_insights',         color: '#00A896' },
]

const CONFIG_MODULES = [
  { to: '/usuarios', label: 'Usuários',         icon: Shield, id: 'usuarios', color: '#EF4444' },
  { to: '/grupos',   label: 'Grupos de Acesso', icon: Shield, id: 'usuarios', color: '#EC4899' },
]

/** Ícone com badge colorido — padrão premium */
function IconBadge({
  icon: Icon,
  color,
  isActive,
  size = 16,
}: {
  icon: React.ElementType
  color: string
  isActive: boolean
  size?: number
}) {
  return (
    <div
      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-105 group-hover:rotate-3"
      style={{
        backgroundColor: isActive ? `${color}22` : `${color}10`,
        boxShadow: isActive ? `0 2px 10px ${color}35` : 'none',
      }}
    >
      <Icon
        size={size}
        style={{ color: isActive ? color : `${color}cc` }}
        strokeWidth={isActive ? 2.2 : 1.8}
      />
    </div>
  )
}

export default function Sidebar({ open, onClose, collapsed, onToggleCollapse }: Props) {
  const user = useAuthStore((s) => s.user)
  const [configOpen, setConfigOpen] = useState(false)

  const hasAccess = (moduleId: string) => {
    if (user?.role === 'master') return true
    return user?.permissions?.includes(moduleId) || false
  }

  const allowedModules      = MODULES.filter((m) => hasAccess(m.id))
  const allowedBiModules    = BI_MODULES.filter((m) => hasAccess(m.id))
  const allowedConfigModules = CONFIG_MODULES.filter((m) => hasAccess(m.id))

  const NavItem = ({ to, label, icon, exact, color }: { to: string; label: string; icon: React.ElementType; exact?: boolean; color: string }) => (
    <NavLink
      to={to}
      end={exact}
      onClick={onClose}
      className={({ isActive }) =>
        clsx(
          'group flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-300 mb-1 hover:scale-[1.01] active:scale-[0.99] border border-transparent',
          isActive 
            ? 'bg-bg-secondary text-text-primary shadow-[0_4px_16px_rgba(0,0,0,0.02)] border-divider/40' 
            : 'text-text-secondary hover:bg-bg-secondary/40 hover:text-text-primary hover:border-divider/10',
          collapsed ? 'lg:justify-center lg:px-0' : ''
        )
      }
    >
      {({ isActive }) => (
        <>
          <IconBadge icon={icon} color={color} isActive={isActive} />
          <span
            className={clsx(
              'truncate transition-colors duration-150',
              isActive
                ? 'text-text-primary font-bold'
                : 'text-text-secondary group-hover:text-text-primary',
              collapsed ? 'lg:hidden block' : 'block'
            )}
          >
            {label}
          </span>
          {isActive ? (
            <div
              className={clsx(
                "ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0",
                collapsed ? "lg:hidden block" : "block"
              )}
              style={{ backgroundColor: color }}
            />
          ) : (
            <div
              className={clsx(
                "ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                collapsed ? "lg:hidden block" : "block"
              )}
              style={{ backgroundColor: `${color}80` }}
            />
          )}
        </>
      )}
    </NavLink>
  )

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
          'fixed lg:sticky top-0 left-0 h-screen bg-bg-primary/95 backdrop-blur-xl border-r border-divider/40 z-40',
          'transform transition-transform duration-200 ease-out lg:translate-x-0',
          'flex flex-col shadow-card lg:shadow-none transition-all duration-300 ease-in-out',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          collapsed ? 'lg:w-20' : 'lg:w-64 w-64'
        )}
      >
        {/* Logo */}
        <div className={clsx(
          "px-4 border-b border-divider/40 bg-transparent transition-all duration-300 flex items-center justify-between",
          collapsed ? "h-20 justify-center" : "h-20"
        )}>
          {collapsed ? (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-secondary rounded-xl transition-all"
              title="Expandir menu"
            >
              <img
                src="/coliseu-simbolo.png"
                alt="Coliseu"
                className="w-8 h-8 object-contain"
              />
            </button>
          ) : (
            <>
              <div className="flex-1 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-divider/60 shadow-[0_4px_18px_rgba(0,0,0,0.04)] flex items-center justify-center max-w-[175px] transition-all duration-300">
                <img
                  src="/logo-coliseu.png"
                  alt="Coliseu Sistemas"
                  className="h-11 w-auto object-contain"
                />
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  className="hidden lg:flex p-1.5 text-text-secondary hover:text-text-primary hover:bg-bg-secondary rounded-lg transition-colors"
                  title="Recolher menu"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  className="lg:hidden p-1.5 text-text-secondary hover:bg-bg-secondary rounded"
                  onClick={onClose}
                  aria-label="Fechar menu"
                >
                  <X size={20} />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2 px-2.5 flex flex-col space-y-1">
          {/* Menu Principal */}
          <div>
            {allowedModules.map((m) => (
              <NavItem key={m.to} {...m} />
            ))}
          </div>

          {/* Business Intelligence */}
          {allowedBiModules.length > 0 && (
            <div className="mt-1">
              {allowedBiModules.map((m) => (
                <NavItem key={m.to} {...m} />
              ))}
            </div>
          )}

          {/* Configurações */}
          {allowedConfigModules.length > 0 && (
            <div className="mt-auto pt-3 border-t border-divider/40">
              <button
                type="button"
                onClick={() => {
                  if (collapsed) {
                    onToggleCollapse()
                  } else {
                    setConfigOpen(!configOpen)
                  }
                }}
                className={clsx(
                  "w-full flex items-center px-2.5 py-2 rounded-xl text-sm font-medium text-text-secondary hover:bg-bg-secondary/60 hover:text-text-primary transition-all duration-150 mb-0.5 group",
                  collapsed ? "lg:justify-center lg:px-0" : "justify-between"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-text-secondary/8 group-hover:bg-text-secondary/15 transition-colors">
                    <Settings size={16} className="text-text-secondary" strokeWidth={1.8} />
                  </div>
                  <span className={clsx("truncate", collapsed ? "lg:hidden block" : "block")}>Configurações</span>
                </div>
                {!collapsed && (configOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
              </button>

              {configOpen && !collapsed && (
                <div className="mt-1 space-y-0.5 pl-2">
                  {allowedConfigModules.map((m) => (
                    <NavItem key={m.to} {...m} />
                  ))}
                </div>
              )}
            </div>
          )}
        </nav>

        {/* Footer */}
        <div className={clsx(
          "px-4 py-4 border-t border-divider/40 text-[11px] text-text-secondary flex flex-col transition-all duration-300",
          collapsed ? "lg:items-center lg:justify-center gap-1" : "gap-4"
        )}>
          {/* Logo Card e Logout Button ao lado */}
          <div className="w-full flex items-center justify-between gap-3">
            {collapsed ? (
              <button
                type="button"
                onClick={() => {
                  useAuthStore.getState().logout()
                  window.location.href = '/login'
                }}
                className="p-2.5 text-text-secondary hover:text-danger hover:bg-danger/10 rounded-xl transition-colors flex items-center justify-center"
                title="Sair do sistema"
              >
                <LogOut size={16} />
              </button>
            ) : (
              <>
                <div className="flex-1 bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-divider/60 shadow-[0_4px_18px_rgba(0,0,0,0.04)] flex items-center justify-center">
                  <img
                    src="/logo-coliseu.png"
                    alt="Coliseu Sistemas"
                    className="h-8 w-auto object-contain"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    useAuthStore.getState().logout()
                    window.location.href = '/login'
                  }}
                  className="p-2.5 text-text-secondary hover:text-danger hover:bg-danger/10 border border-divider/60 rounded-xl transition-colors flex-shrink-0 flex items-center justify-center bg-bg-primary"
                  title="Sair do sistema"
                >
                  <LogOut size={18} />
                </button>
              </>
            )}
          </div>

          {/* Slogan Frase */}
          <div className={clsx(
            "w-full flex flex-col transition-all duration-300",
            collapsed ? "lg:hidden block" : "block"
          )}>
            <div className="px-1 text-left">
              <div className="text-[9px] font-bold text-text-secondary/60 uppercase tracking-widest mb-1">
                BUSINESS INTELLIGENCE
              </div>
              <div className="text-base font-bold text-text-primary leading-tight">
                Gerencie <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400">tudo.</span>
              </div>
              <div className="text-xs text-text-secondary mt-0.5 font-medium">
                Cresça mais rápido.
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
