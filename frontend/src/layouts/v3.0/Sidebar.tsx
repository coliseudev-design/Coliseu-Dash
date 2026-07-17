import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, ShoppingCart, Wallet,
  Trophy, BarChart3, Users, X, LogOut, Shield, DollarSign,
  Truck, Map, BrainCircuit, Package, Settings, ChevronDown, ChevronUp
} from 'lucide-react'
import clsx from 'clsx'
import { useAuthStore } from '../../store/authStore'
import { useState } from 'react'

interface Props {
  open: boolean
  onClose: () => void
}

const MODULES = [
  { to: '/', label: 'Visão Estratégica', icon: LayoutDashboard, exact: true, id: 'inicio', color: '#3B82F6' },
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
  { to: '/bi/ai-insights',           label: 'Coliseu AI',             icon: BrainCircuit,                id: 'bi_ai_insights',         color: '#8B5CF6' },
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
      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200"
      style={{
        backgroundColor: isActive ? `${color}22` : `${color}10`,
        boxShadow: isActive ? `0 2px 10px ${color}35` : 'none',
      }}
    >
      <Icon
        size={size}
        style={{ color: isActive ? color : `${color}95` }}
        strokeWidth={isActive ? 2.2 : 1.8}
      />
    </div>
  )
}

export default function Sidebar({ open, onClose }: Props) {
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
          'group flex items-center gap-3 px-2.5 py-2 rounded-xl text-sm font-medium transition-all duration-150 mb-0.5',
          isActive ? 'bg-bg-secondary shadow-sm' : 'hover:bg-bg-secondary/60',
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
                ? 'text-text-primary font-semibold'
                : 'text-text-secondary group-hover:text-text-primary',
            )}
          >
            {label}
          </span>
          {isActive && (
            <div
              className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: color }}
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
          'fixed lg:sticky top-0 left-0 h-screen w-64 bg-bg-primary/95 backdrop-blur-xl border-r border-divider/40 z-40',
          'transform transition-transform duration-200 ease-out lg:translate-x-0',
          'flex flex-col shadow-card lg:shadow-none',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        {/* Logo */}
        <div className="px-4 py-5 flex flex-col border-b border-divider/40 bg-transparent">
          <div className="flex items-center justify-between">
            <img
              src="/logo-coliseu.png"
              alt="Coliseu Sistemas"
              className="h-12 w-auto object-contain"
            />
            <button
              className="lg:hidden p-1.5 text-text-secondary hover:bg-bg-secondary rounded"
              onClick={onClose}
              aria-label="Fechar menu"
            >
              <X size={20} />
            </button>
          </div>
          <div className="mt-4 px-1">
            <div className="text-[10px] font-bold text-text-secondary/60 uppercase tracking-widest mb-1.5">
              BUSINESS INTELLIGENCE
            </div>
            <div className="text-base font-bold text-text-primary leading-tight">
              Gerencie <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400">tudo.</span>
            </div>
            <div className="text-xs text-text-secondary mt-1 font-medium">
              Cresça mais rápido.
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-2.5 flex flex-col">
          {/* Menu Principal */}
          <div>
            <div className="px-3 mb-3 text-[10px] font-bold text-text-secondary/60 uppercase tracking-widest">
              Menu Principal
            </div>
            {allowedModules.map((m) => (
              <NavItem key={m.to} {...m} />
            ))}
          </div>

          {/* Business Intelligence */}
          {allowedBiModules.length > 0 && (
            <div className="mt-5">
              <div className="px-3 mb-3 text-[10px] font-bold text-text-secondary/60 uppercase tracking-widest">
                Business Intelligence
              </div>
              {allowedBiModules.map((m) => (
                <NavItem key={m.to} {...m} />
              ))}
            </div>
          )}

          {/* Configurações */}
          {allowedConfigModules.length > 0 && (
            <div className="mt-auto pt-3 border-t border-divider/40">
              <button
                onClick={() => setConfigOpen(!configOpen)}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-sm font-medium text-text-secondary hover:bg-bg-secondary/60 hover:text-text-primary transition-all duration-150 mb-0.5 group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-text-secondary/8 group-hover:bg-text-secondary/15 transition-colors">
                    <Settings size={16} className="text-text-secondary" strokeWidth={1.8} />
                  </div>
                  <span className="truncate">Configurações</span>
                </div>
                {configOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {configOpen && (
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
        <div className="px-4 py-3 border-t border-divider/40 text-[11px] text-text-secondary flex items-center justify-between">
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
