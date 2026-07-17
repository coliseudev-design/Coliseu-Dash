import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Wallet, Trophy, BarChart3, Users, X, LogOut, Shield,
  Package, Settings, ChevronDown, ChevronUp, ChevronLeft
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
  { to: '/',                        label: 'Visão Estratégica',    icon: LayoutDashboard, exact: true,  id: 'inicio',     color: '#3B82F6' },
  { to: '/comercial',               label: 'Visão Consolidada',    icon: BarChart3,       exact: true,  id: 'bi_sales',   color: '#10B981' },
  { to: '/comercial/equipe',        label: 'Equipes',              icon: Users,           exact: true,  id: 'bi_sales',   color: '#F97316' },
  { to: '/comercial/rankings',      label: 'Rankings',             icon: Trophy,          exact: true,  id: 'bi_sales',   color: '#EAB308' },
  { to: '/financeiro-consolidado',  label: 'Financeiro',           icon: Wallet,          exact: false, id: 'bi_finance', color: '#22C55E' },
  { to: '/bi/abc',                  label: 'Gestão de Inventário', icon: Package,         exact: true,  id: 'bi_abc',     color: '#06B6D4' },
]

const CONFIG_MODULES = [
  { to: '/usuarios', label: 'Usuários',        icon: Shield, id: 'usuarios', color: '#EF4444' },
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

export default function Sidebar({ open, onClose, collapsed, onToggleCollapse }: Props) {
  const user = useAuthStore((s) => s.user)
  const [configOpen, setConfigOpen] = useState(false)

  const hasAccess = (moduleId: string) => {
    if (user?.role === 'master') return true
    return user?.permissions?.includes(moduleId) || false
  }

  const allowedModules = MODULES.filter((m) => hasAccess(m.id))
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
          'fixed lg:sticky top-0 left-0 h-screen bg-bg-primary/95 backdrop-blur-xl border-r border-divider/40 z-40',
          'transform transition-transform duration-250 ease-out lg:translate-x-0',
          'flex flex-col shadow-2xl lg:shadow-[8px_0_32px_rgba(0,0,0,0.02)] transition-all duration-300 ease-in-out',
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
              <div className="flex-1 bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-divider/60 shadow-[0_4px_18px_rgba(0,0,0,0.04)] flex items-center justify-center max-w-[145px]">
                <img
                  src="/logo-coliseu.png"
                  alt="Coliseu Sistemas"
                  className="h-8 w-auto object-contain"
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
        <nav className="flex-1 overflow-y-auto py-4 px-2.5 flex flex-col">
          <div className="flex-1">
            <div className={clsx(
              "px-3 mb-3 text-[10px] font-bold text-text-secondary/60 uppercase tracking-widest transition-all duration-300",
              collapsed ? "lg:hidden block" : "block"
            )}>
              Menu Principal
            </div>

            {allowedModules.map(({ to, label, icon, exact, color }) => (
              <NavLink
                key={to}
                to={to}
                end={exact}
                onClick={onClose}
                className={({ isActive }) =>
                  clsx(
                    'group flex items-center gap-3 px-2.5 py-2 rounded-xl text-sm font-medium transition-all duration-150 mb-0.5',
                    isActive
                      ? 'bg-bg-secondary shadow-sm'
                      : 'hover:bg-bg-secondary/60',
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
                          ? 'text-text-primary font-semibold'
                          : 'text-text-secondary group-hover:text-text-primary',
                        collapsed ? 'lg:hidden block' : 'block'
                      )}
                    >
                      {label}
                    </span>
                    {isActive && (
                      <div
                        className={clsx(
                          "ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0",
                          collapsed ? "lg:hidden block" : "block"
                        )}
                        style={{ backgroundColor: color }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>

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
                  {allowedConfigModules.map(({ to, label, icon, color }) => (
                    <NavLink
                      key={to}
                      to={to}
                      onClick={onClose}
                      className={({ isActive }) =>
                        clsx(
                          'group flex items-center gap-3 px-2.5 py-2 rounded-xl text-sm font-medium transition-all duration-150',
                          isActive
                            ? 'bg-bg-secondary shadow-sm'
                            : 'hover:bg-bg-secondary/60',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <IconBadge icon={icon} color={color} isActive={isActive} size={14} />
                          <span
                            className={clsx(
                              'truncate transition-colors',
                              isActive
                                ? 'text-text-primary font-semibold'
                                : 'text-text-secondary group-hover:text-text-primary',
                            )}
                          >
                            {label}
                          </span>
                        </>
                      )}
                    </NavLink>
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
                PORTAL GERENCIAL
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
