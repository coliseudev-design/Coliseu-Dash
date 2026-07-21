import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Wallet, LogOut, Shield,
  Settings, ChevronDown, ChevronUp, ChevronLeft, GitCompare,
  X, TrendingUp, Radar, UsersRound,
  Factory, Banknote, CircleDollarSign, Boxes, BadgeCheck, ShoppingCart, Target
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
    label: 'Visão Executiva',
    icon: LayoutDashboard,
    color: '#3B82F6',
    items: [
      { to: '/', label: 'Visão Estratégica', icon: LayoutDashboard, exact: true, id: 'inicio', color: '#3B82F6', iconClass: 'icon-corporativo' },
      { to: '/comparativo-vendas', label: 'Análise Comparativa', icon: GitCompare, exact: true, id: 'inicio', color: '#10B981', iconClass: 'icon-corporativo' },
    ]
  },
  {
    id: 'comercial',
    label: 'Performance Comercial',
    icon: TrendingUp,
    color: '#F97316',
    items: [
      { to: '/bi', label: 'Monitor de Vendas', icon: TrendingUp, exact: true, id: 'bi_sales', color: '#10B981', iconClass: 'icon-comercial' },
      { to: '/hub-vendedor', label: 'Desempenho da Equipe', icon: BadgeCheck, exact: true, id: 'bi_sales', color: '#F97316', iconClass: 'icon-comercial' },
    ]
  },
  {
    id: 'clientes',
    label: 'Inteligência de Clientes',
    icon: UsersRound,
    color: '#EC4899',
    items: [
      { to: '/bi/customer-analytics', label: 'Visão Geral da Carteira', icon: UsersRound, id: 'bi_customer_analytics', color: '#14B8A6', iconClass: 'icon-clientes' },
      { to: '/bi/customer', label: 'Customer 360', icon: Radar, id: 'bi_customer', color: '#EC4899', iconClass: 'icon-clientes' },
    ]
  },
  {
    id: 'fornecedores',
    label: 'Gestão de Fornecedores',
    icon: Factory,
    color: '#F59E0B',
    items: [
      { to: '/bi/supplier', label: 'Hub do Fornecedor', icon: Factory, id: 'bi_supplier', color: '#F59E0B', iconClass: 'icon-fornecedores' },
    ]
  },
  {
    id: 'controladoria',
    label: 'Saúde Financeira',
    icon: Banknote,
    color: '#22C55E',
    items: [
      { to: '/bi/finance', label: 'Gestão de Caixa', icon: Banknote, id: 'bi_finance', color: '#22C55E', iconClass: 'icon-financas' },
      { to: '/bi/comparative', label: 'Análise de Rentabilidade', icon: CircleDollarSign, id: 'bi_comparative', color: '#84CC16', iconClass: 'icon-financas' },
    ]
  },
  {
    id: 'operacoes',
    label: 'Supply Chain & Estoque',
    icon: Boxes,
    color: '#06B6D4',
    items: [
      { to: '/bi/abc', label: 'Dinâmica de Inventário', icon: Boxes, id: 'bi_abc', color: '#06B6D4', iconClass: 'icon-operacoes' },
    ]
  },
  {
    id: 'compras',
    label: 'Compras Inteligentes (IA)',
    icon: ShoppingCart,
    color: '#A855F7',
    items: [
      { 
        to: '/bi/compras-ia', 
        label: 'Recomendações de Compra', 
        icon: ShoppingCart, 
        id: 'bi_compras_ia', 
        color: '#A855F7', 
        isComingSoon: true,
        iconClass: 'icon-compras'
      },
    ]
  }
]

const CONFIG_MODULES = [
  { to: '/bi/goals/manage', label: 'Cadastro de Metas', icon: Target, id: 'cadastro_metas', color: '#10B981' },
  { to: '/usuarios', label: 'Usuários',         icon: Shield, id: 'usuarios', color: '#EF4444' },
  { to: '/grupos',   label: 'Grupos de Acesso', icon: Shield, id: 'usuarios', color: '#EC4899' },
]

/** Ícone com badge 3D premium */
function IconBadge({
  icon: Icon,
  color,
  isActive,
  size = 14,
  iconClass,
}: {
  icon: React.ElementType
  color: string
  isActive: boolean
  size?: number
  iconClass?: string
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
        className={clsx("transition-transform duration-300 ease-in-out", iconClass)}
        style={{ color: isActive ? color : `${color}bb`, position: 'relative' }}
        strokeWidth={isActive ? 2.2 : 1.8}
      />
    </div>
  )
}

export default function Sidebar({ open, onClose, collapsed, onToggleCollapse }: Props) {
  const user = useAuthStore((s) => s.user)
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

  // Salvar posição de scroll ao rolar
  const handleScroll = (e: React.UIEvent<HTMLElement>) => {
    sessionStorage.setItem('sidebar-scroll', String(e.currentTarget.scrollTop))
  }

  const hasAccess = (moduleId: string) => {
    if (user?.role === 'master') return true
    return user?.permissions?.includes(moduleId) || false
  }

  const groupsWithAccess = MENU_GROUPS.map(group => {
    const allowedItems = group.items.filter(item => {
      if (item.id === 'bi_compras_ia') return true
      return hasAccess(item.id)
    })
    return { ...group, items: allowedItems }
  }).filter(group => group.items.length > 0)

  const allowedConfigModules = CONFIG_MODULES.filter((m) => hasAccess(m.id))

  const NavItem = ({ to, label, icon, exact, color, isComingSoon, iconClass }: { to: string; label: string; icon: React.ElementType; exact?: boolean; color: string; isComingSoon?: boolean; iconClass?: string }) => {
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
              ? 'bg-gradient-to-r from-[#0052D4] via-[#4364F7] to-[#6FB1FC] text-white border-transparent shadow-[0_4px_15px_rgba(67,100,247,0.35)]' 
              : 'text-text-secondary border-transparent hover:bg-bg-secondary/40 hover:text-text-primary hover:border-b-2 hover:border-b-divider/60',
            collapsed ? 'lg:justify-center lg:px-0' : ''
          )
        }
      >
        {({ isActive }) => {
          const activeState = isActive && !isComingSoon
          return (
            <>
              <IconBadge icon={icon} color={activeState ? '#ffffff' : color} isActive={activeState} iconClass={iconClass} />
              <span
                className={clsx(
                  'truncate transition-colors duration-150 flex items-center gap-1.5',
                  activeState
                    ? 'text-white font-extrabold'
                    : 'text-text-secondary group-hover:text-text-primary',
                  collapsed ? 'lg:hidden block' : 'block'
                )}
              >
                {label}
                {isComingSoon && (
                  <span className="bg-gradient-to-r from-purple-500 via-[#4364F7] to-cyan-400 text-white text-[7px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider scale-90 border border-purple-400/40 shadow-[0_0_8px_rgba(168,85,247,0.5)] animate-pulse flex-shrink-0">
                    PREDITIVO
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
      {/* Estilos de Microinterações de Ícones 3D */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes tilt3d {
          0%, 100% { transform: perspective(100px) rotateX(0deg) rotateY(0deg) scale(1); }
          50% { transform: perspective(100px) rotateX(12deg) rotateY(15deg) scale(1.05); }
        }
        @keyframes heartPulse {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.15) translateY(-1px); opacity: 1; }
        }
        @keyframes orbitRotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes swingTilt {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(5deg); }
          75% { transform: rotate(-5deg); }
        }
        @keyframes depthBounce {
          0%, 100% { transform: translateZ(0) scale(1); }
          50% { transform: translateZ(10px) scale(1.1); }
        }
        @keyframes glowPulse {
          0%, 100% { filter: drop-shadow(0 0 2px rgba(168, 85, 247, 0.4)); }
          50% { filter: drop-shadow(0 0 8px rgba(168, 85, 247, 0.8)); }
        }

        .group:hover .icon-corporativo {
          animation: tilt3d 0.8s ease-in-out infinite !important;
        }
        .group:hover .icon-comercial {
          animation: heartPulse 0.6s ease-in-out infinite !important;
        }
        .group:hover .icon-clientes {
          animation: orbitRotate 3s linear infinite !important;
        }
        .group:hover .icon-financas {
          animation: swingTilt 0.8s ease-in-out infinite !important;
        }
        .group:hover .icon-operacoes {
          animation: depthBounce 0.7s ease-in-out infinite !important;
        }
        .group:hover .icon-compras {
          animation: glowPulse 1s ease-in-out infinite !important;
        }
      `}} />

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
          className="flex-1 overflow-y-auto py-2 px-2 flex flex-col space-y-1.5"
        >
          {groupsWithAccess.map((group) => (
            <div key={group.id} className="mb-1">
              {!collapsed && (
                <div className="px-2.5 pt-2 pb-1 text-[9px] font-black text-text-secondary/60 uppercase tracking-widest flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: group.color }} />
                  {group.label}
                </div>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavItem key={item.to} {...item} />
                ))}
              </div>
            </div>
          ))}

          {/* Configurações */}
          {allowedConfigModules.length > 0 && (
            <div className="mt-auto pt-3 border-t border-divider/40">
              {!collapsed && (
                <div className="px-2.5 pb-1 text-[9px] font-black text-text-secondary/60 uppercase tracking-widest flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  CONFIGURAÇÕES
                </div>
              )}
              <div className="space-y-0.5">
                {allowedConfigModules.map((m) => (
                  <NavItem key={m.to} {...m} />
                ))}
              </div>
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
        <div className="fixed inset-0 bg-slate-950/70 z-[999] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-bg-primary border border-border/80 shadow-2xl rounded-2xl w-full max-w-md p-6 text-center animate-in zoom-in-95 duration-200 flex flex-col items-center relative overflow-hidden">
            {/* Holographic glowing dots in background */}
            <div className="absolute -top-12 -left-12 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -right-12 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

            {/* 3D Holographic Processing Widget */}
            <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
              <div className="absolute inset-0 border-2 border-dashed border-purple-500/30 rounded-full animate-[spin_8s_linear_infinite]" />
              <div className="absolute inset-2 border border-dotted border-cyan-400/40 rounded-full animate-[spin_5s_linear_infinite_reverse]" />
              <div className="absolute inset-4 bg-purple-500/5 rounded-full animate-ping duration-[2000ms]" />
              <div className="relative z-10 w-12 h-12 bg-gradient-to-tr from-purple-600 to-cyan-500 text-white rounded-2xl flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.5)] border border-white/20">
                <ShoppingCart size={22} className="animate-pulse" />
              </div>
            </div>

            <h3 className="text-base font-black text-text-primary uppercase tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-purple-500 via-[#4364F7] to-cyan-500">
              Inteligência de Compras Preditiva
            </h3>
            <p className="text-xs text-text-secondary mt-3 leading-relaxed max-w-[320px]">
              Estamos calibrando nossos modelos de IA para automatizar suas decisões de estoque, sugerir compras exatas e prever demandas futuras. Falta pouco!
            </p>
            <button 
              onClick={() => setIsComingSoonOpen(false)}
              className="mt-6 px-6 py-2 bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-700 hover:to-cyan-600 text-white font-black rounded-xl text-[10px] uppercase tracking-wider shadow-lg transition-all cursor-pointer hover:scale-[1.03] active:scale-[0.97]"
            >
              Entendido!
            </button>
          </div>
        </div>
      )}
    </>
  )
}
