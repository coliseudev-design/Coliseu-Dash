import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Wallet, LogOut, Shield,
  Settings, ChevronDown, ChevronUp, ChevronLeft, GitCompare,
  X, TrendingUp, Radar, UsersRound,
  Factory, Banknote, CircleDollarSign, Boxes, BadgeCheck, ShoppingCart
} from 'lucide-react'
import clsx from 'clsx'
import { useAuthStore } from '../../store/authStore'
import { useState, useEffect, useRef } from 'react'


interface Props {
  open: boolean
  onClose: () => void
  collapsed: boolean
  onToggleCollapse: () => void
}

const MENU_GROUPS = [
  {
    id: 'corporativas',
    label: 'Visões Corporativas',
    icon: LayoutDashboard,
    color: '#3B82F6',
    items: [
      { to: '/', label: 'Visão Estratégica', icon: LayoutDashboard, exact: true, id: 'inicio', color: '#3B82F6' },
      { to: '/comparativo-vendas', label: 'Análise Comparativa', icon: GitCompare, exact: true, id: 'inicio', color: '#10B981' },
    ]
  },
  {
    id: 'comercial',
    label: 'Inteligência Comercial',
    icon: TrendingUp,
    color: '#F97316',
    items: [
      { to: '/bi', label: 'Inteligência de Vendas', icon: TrendingUp, exact: true, id: 'bi_sales', color: '#10B981' },
      { to: '/hub-vendedor', label: 'Central do Vendedor', icon: BadgeCheck, exact: true, id: 'bi_sales', color: '#F97316' },
    ]
  },
  {
    id: 'clientes',
    label: 'Clientes & Parceiros',
    icon: UsersRound,
    color: '#EC4899',
    items: [
      { to: '/bi/customer-analytics', label: 'Painel de Clientes', icon: UsersRound, id: 'bi_customer_analytics', color: '#14B8A6' },
      { to: '/bi/customer', label: 'Perfil 360° do Cliente', icon: Radar, id: 'bi_customer', color: '#EC4899' },
      { to: '/bi/supplier', label: 'Central do Fornecedor', icon: Factory, id: 'bi_supplier', color: '#F59E0B' },
    ]
  },
  {
    id: 'controladoria',
    label: 'Controladoria & Performance',
    icon: Banknote,
    color: '#22C55E',
    items: [
      { to: '/bi/finance', label: 'Gestão Financeira', icon: Banknote, id: 'bi_finance', color: '#22C55E' },
      { to: '/bi/comparative', label: 'Análise de Lucratividade', icon: CircleDollarSign, id: 'bi_comparative', color: '#84CC16' },
    ]
  },
  {
    id: 'operacoes',
    label: 'Operações & Estoque',
    icon: Boxes,
    color: '#06B6D4',
    items: [
      { to: '/bi/abc', label: 'Inteligência de Estoque', icon: Boxes, id: 'bi_abc', color: '#06B6D4' },
    ]
  },
  {
    id: 'compras',
    label: 'Inteligência de Compras',
    icon: ShoppingCart,
    color: '#A855F7',
    items: [
      { 
        to: '/bi/compras-ia', 
        label: 'Gestão de Compras & IA', 
        icon: ShoppingCart, 
        id: 'bi_compras_ia', 
        color: '#A855F7', 
        isComingSoon: true 
      },
    ]
  }
]

const CONFIG_MODULES = [
  { to: '/usuarios', label: 'Usuários',         icon: Shield, id: 'usuarios', color: '#EF4444' },
  { to: '/grupos',   label: 'Grupos de Acesso', icon: Shield, id: 'usuarios', color: '#EC4899' },
]

/** Ícone com badge 3D premium */
function IconBadge({
  icon: Icon,
  color,
  isActive,
  size = 14,
}: {
  icon: React.ElementType
  color: string
  isActive: boolean
  size?: number
}) {
  return (
    <div
      className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 relative overflow-hidden"
      style={{
        background: isActive
          ? `linear-gradient(145deg, ${color}35 0%, ${color}15 100%)`
          : `linear-gradient(145deg, ${color}18 0%, ${color}08 100%)`,
        boxShadow: isActive
          ? `0 2px 8px ${color}40, 0 1px 0 rgba(255,255,255,0.15) inset, 0 -1px 0 ${color}30 inset`
          : `0 1px 3px rgba(0,0,0,0.06), 0 1px 0 rgba(255,255,255,0.12) inset`,
        border: `1px solid ${isActive ? color + '30' : color + '12'}`,
      }}
    >
      {/* Inner top-left highlight for 3D depth */}
      <div
        className="absolute inset-0 opacity-40 rounded-xl pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, transparent 60%)',
        }}
      />
      <Icon
        size={size}
        style={{ color: isActive ? color : `${color}bb`, position: 'relative' }}
        strokeWidth={isActive ? 2.2 : 1.8}
      />
    </div>
  )
}

export default function Sidebar({ open, onClose, collapsed, onToggleCollapse }: Props) {
  const user = useAuthStore((s) => s.user)
  const [configOpen, setConfigOpen] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    corporativas: true,
    comercial: false,
    clientes: false,
    controladoria: false,
    operacoes: false,
    compras: false,
  })
  const [isComingSoonOpen, setIsComingSoonOpen] = useState(false)
  const location = useLocation()
  const navRef = useRef<HTMLElement>(null)

  // Restaurar posição de scroll ao navegar
  useEffect(() => {
    const savedScroll = sessionStorage.getItem('sidebar-scroll')
    if (savedScroll && navRef.current) {
      navRef.current.scrollTop = Number(savedScroll)
    }
  }, [location.pathname])

  // Auto-expandir grupo que possui a rota ativa
  useEffect(() => {
    const activeGroup = MENU_GROUPS.find(g => 
      g.items.some(item => location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to)))
    )
    if (activeGroup) {
      setExpandedGroups(prev => ({
        ...prev,
        [activeGroup.id]: true
      }))
    }
  }, [location.pathname])

  // Salvar posição de scroll ao rolar
  const handleScroll = (e: React.UIEvent<HTMLElement>) => {
    sessionStorage.setItem('sidebar-scroll', String(e.currentTarget.scrollTop))
  }

  const hasAccess = (moduleId: string) => {
    if (user?.role === 'master') return true
    return user?.permissions?.includes(moduleId) || false
  }

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }))
  }

  const groupsWithAccess = MENU_GROUPS.map(group => {
    const allowedItems = group.items.filter(item => {
      if (item.id === 'bi_compras_ia') return true
      return hasAccess(item.id)
    })
    return { ...group, items: allowedItems }
  }).filter(group => group.items.length > 0)

  const allowedConfigModules = CONFIG_MODULES.filter((m) => hasAccess(m.id))

  const NavItem = ({ to, label, icon, exact, color, isComingSoon }: { to: string; label: string; icon: React.ElementType; exact?: boolean; color: string; isComingSoon?: boolean }) => {
    const handleNavItemClick = (e: React.MouseEvent) => {
      if (isComingSoon) {
        e.preventDefault()
        setIsComingSoonOpen(true)
      } else {
        onClose()
      }
    }

    return (
      <NavLink
        to={to}
        end={exact}
        onClick={handleNavItemClick}
        className={({ isActive }) =>
          clsx(
            'group flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 mb-0.5 hover:-translate-y-[1px] active:translate-y-[0.5px] border w-full',
            isActive && !isComingSoon
              ? 'bg-white text-text-primary border-slate-200/60 border-b-[3px] border-b-brand-500 shadow-[0_2px_4px_rgba(0,0,0,0.04)]' 
              : 'text-text-secondary border-transparent hover:bg-bg-secondary/40 hover:text-text-primary hover:border-b-2 hover:border-b-divider/60',
            collapsed ? 'lg:justify-center lg:px-0' : ''
          )
        }
      >
        {({ isActive }) => {
          const activeState = isActive && !isComingSoon
          return (
            <>
              <IconBadge icon={icon} color={color} isActive={activeState} />
              <span
                className={clsx(
                  'truncate transition-colors duration-150 flex items-center gap-1.5',
                  activeState
                    ? 'text-text-primary font-extrabold'
                    : 'text-text-secondary group-hover:text-text-primary',
                  collapsed ? 'lg:hidden block' : 'block'
                )}
              >
                {label}
                {isComingSoon && (
                  <span className="bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider scale-90 border border-purple-500/20">
                    IA
                  </span>
                )}
              </span>
              {activeState ? (
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
          )
        }}
      </NavLink>
    )
  }

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
        <nav 
          ref={navRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto py-2 px-2 flex flex-col space-y-0.5"
        >
          {groupsWithAccess.map((group) => {
            const isExpanded = expandedGroups[group.id]
            const hasActiveRoute = group.items.some(item => location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to)))
            
            return (
              <div key={group.id} className="mb-1">
                {/* Header do Grupo Accordion */}
                <button
                  type="button"
                  onClick={() => {
                    if (collapsed) {
                      onToggleCollapse()
                    } else {
                      toggleGroup(group.id)
                    }
                  }}
                  title={group.label}
                  className={clsx(
                    "w-full flex items-center px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 mb-0.5 group border border-transparent cursor-pointer",
                    hasActiveRoute && !collapsed
                      ? "text-text-primary bg-bg-secondary/40 font-extrabold"
                      : "text-text-secondary hover:bg-bg-secondary/20 hover:text-text-primary",
                    collapsed ? "lg:justify-center lg:px-0" : "justify-between"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <IconBadge icon={group.icon} color={group.color} isActive={hasActiveRoute} />
                    <span className={clsx("truncate text-left font-black tracking-wide", collapsed ? "lg:hidden block" : "block")}>
                      {group.label}
                    </span>
                  </div>
                  {!collapsed && (isExpanded ? <ChevronUp size={12} className="text-text-muted" /> : <ChevronDown size={12} className="text-text-muted" />)}
                </button>

                {/* Submenus Retráteis */}
                {!collapsed && isExpanded && (
                  <div className="mt-0.5 pl-2.5 space-y-0.5 border-l border-divider/40 ml-4 animate-in slide-in-from-top-1 duration-150">
                    {group.items.map((item) => (
                      <NavItem key={item.to} {...item} />
                    ))}
                  </div>
                )}
              </div>
            )
          })}

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
                  "w-full flex items-center px-2.5 py-2 rounded-xl text-sm font-medium text-text-secondary hover:bg-bg-secondary/60 hover:text-text-primary transition-all duration-150 mb-0.5 group cursor-pointer",
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

      {/* Modal / Popup Inteligência de Compras com IA */}
      {isComingSoonOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-[999] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-bg-primary border border-border shadow-2xl rounded-2xl w-full max-w-md p-6 text-center animate-in zoom-in-95 duration-200 flex flex-col items-center">
            {/* 3D Premium IA Icon badge */}
            <div className="w-16 h-16 bg-purple-500/10 text-purple-500 rounded-2xl flex items-center justify-center mb-4 border border-purple-500/20 shadow-md">
              <ShoppingCart size={32} />
            </div>
            <h3 className="text-lg font-extrabold text-text-primary">Inteligência de Compras com IA</h3>
            <p className="text-xs text-text-secondary mt-2 leading-relaxed">
              Estamos preparando uma experiência incrível para otimizar seus pedidos e prever demandas com Inteligência Artificial. Esta funcionalidade estará disponível em breve!
            </p>
            <button 
              onClick={() => setIsComingSoonOpen(false)}
              className="mt-6 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              Entendido!
            </button>
          </div>
        </div>
      )}
    </>
  )
}
