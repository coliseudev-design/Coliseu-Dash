import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, LogOut, Shield, ChevronLeft, GitCompare,
  X, TrendingUp, Radar, UsersRound, Factory, Banknote,
  CircleDollarSign, Boxes, BadgeCheck, ShoppingCart, Target,
  FileText, SlidersHorizontal
} from 'lucide-react'
import clsx from 'clsx'
import { useAuthStore } from '../../store/authStore'
import { useEffect, useRef } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  collapsed: boolean
  onToggleCollapse: () => void
}

interface NavModuleItem {
  to: string
  label: string
  icon: React.ElementType
  exact?: boolean
  id: string
  color: string
}

const MAIN_MODULES: NavModuleItem[] = [
  { to: '/', label: 'Visão Estratégica', icon: LayoutDashboard, exact: true, id: 'inicio', color: '#10B981' },
  { to: '/comparativo-vendas', label: 'Análise Comparativa', icon: GitCompare, exact: true, id: 'inicio', color: '#F59E0B' },
  { to: '/bi', label: 'Monitor de Vendas', icon: TrendingUp, exact: true, id: 'bi_sales', color: '#3B82F6' },
  { to: '/hub-vendedor', label: 'Desempenho da Equipe', icon: BadgeCheck, exact: true, id: 'bi_sales', color: '#F97316' },
  { to: '/bi/customer-analytics', label: 'Visão Geral da Carteira', icon: UsersRound, id: 'bi_customer_analytics', color: '#0EA5E9' },
  { to: '/bi/customer', label: 'Cliente 360', icon: Radar, id: 'bi_customer', color: '#14B8A6' },
  { to: '/bi/supplier', label: 'Hub do Fornecedor', icon: Factory, id: 'bi_supplier', color: '#0284C7' },
  { to: '/bi/finance', label: 'Gestão de Caixa', icon: Banknote, id: 'bi_finance', color: '#22C55E' },
  { to: '/bi/comparative', label: 'Análise de Rentabilidade', icon: CircleDollarSign, id: 'bi_comparative', color: '#65A30D' },
  { to: '/bi/abc', label: 'Dinâmica de Inventário', icon: Boxes, id: 'bi_abc', color: '#06B6D4' },
  { to: '/bi/compras', label: 'Gestão de Compras', icon: ShoppingCart, id: 'bi_compras', color: '#F43F5E' },
  { to: '/bi/fiscal', label: 'Fiscal', icon: FileText, id: 'bi_fiscal', color: '#2563EB' },
]

const CONFIG_MODULES: NavModuleItem[] = [
  { to: '/bi/parametros', label: 'Parâmetros', icon: SlidersHorizontal, id: 'config_parametros', color: '#D97706' },
  { to: '/bi/goals/manage', label: 'Cadastro de Metas', icon: Target, id: 'cadastro_metas', color: '#EF4444' },
  { to: '/usuarios', label: 'Usuários', icon: Shield, id: 'usuarios', color: '#475569' },
  { to: '/grupos', label: 'Grupos de Acesso', icon: Shield, id: 'usuarios', color: '#0D9488' },
]

/** Badge circular pastel clean (fiel à referência moderna) */
function IconBadge({
  icon: Icon,
  color,
  isActive,
  size = 18,
}: {
  icon: React.ElementType
  color: string
  isActive: boolean
  size?: number
}) {
  return (
    <div
      className={clsx(
        'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-transform duration-200',
        'group-hover:scale-[1.04]'
      )}
      style={{
        backgroundColor: isActive ? `${color}18` : `${color}12`,
        border: `1px solid ${isActive ? `${color}38` : `${color}2B`}`,
      }}
    >
      <Icon
        size={size}
        style={{ color }}
        strokeWidth={isActive ? 2 : 1.8}
      />
    </div>
  )
}

export default function Sidebar({ open, onClose, collapsed, onToggleCollapse }: Props) {
  const user = useAuthStore((s) => s.user)
  const location = useLocation()
  const navRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const savedScroll = sessionStorage.getItem('sidebar-scroll')
    if (savedScroll && navRef.current) {
      navRef.current.scrollTop = Number(savedScroll)
    }
  }, [location.pathname])

  const handleScroll = (e: React.UIEvent<HTMLElement>) => {
    sessionStorage.setItem('sidebar-scroll', String(e.currentTarget.scrollTop))
  }

  const hasAccess = (moduleId: string) => {
    if (user?.role === 'master') return true
    const perms = user?.permissions || []
    if (moduleId === 'bi_compras' || moduleId === 'bi_compras_ia') return true
    if (moduleId === 'bi_fiscal') {
      return user?.role === 'admin' || perms.includes('bi_fiscal')
    }
    if (moduleId === 'config_parametros') {
      return user?.role === 'admin' || perms.includes('config_parametros') || perms.includes('usuarios')
    }
    return perms.includes(moduleId)
  }

  const allowedMainModules = MAIN_MODULES.filter((m) => hasAccess(m.id))
  const allowedConfigModules = CONFIG_MODULES.filter((m) => hasAccess(m.id))

  const NavItem = ({ to, label, icon, exact, color }: NavModuleItem) => (
    <NavLink
      to={to}
      end={exact}
      onClick={onClose}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        clsx(
          'group flex items-center gap-3 px-3 py-2 rounded-2xl text-[13.5px] transition-all duration-200 border w-full',
          isActive
            ? 'bg-white dark:bg-slate-800 text-[#0F172A] dark:text-white font-semibold border-slate-200/85 dark:border-slate-700/80 shadow-[0_4px_14px_rgba(15,23,42,0.06)]'
            : 'text-[#334155] dark:text-slate-300 font-medium border-transparent hover:bg-white/75 dark:hover:bg-slate-800/50 hover:text-[#0F172A] dark:hover:text-white',
          collapsed ? 'lg:justify-center lg:px-0' : ''
        )
      }
    >
      {({ isActive }) => (
        <>
          <IconBadge icon={icon} color={color} isActive={isActive} />
          <span
            className={clsx(
              'truncate leading-snug transition-colors duration-150',
              collapsed ? 'lg:hidden block' : 'block'
            )}
          >
            {label}
          </span>
        </>
      )}
    </NavLink>
  )

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-30 lg:hidden backdrop-blur-sm transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      <aside
        className={clsx(
          'fixed lg:sticky top-0 left-0 h-screen bg-[#F5F8FB] dark:bg-slate-900/95 border-r border-slate-200/80 dark:border-slate-800 z-40',
          'transform transition-all duration-200 ease-out lg:translate-x-0 flex flex-col shadow-card lg:shadow-none',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          collapsed ? 'lg:w-20 w-[266px]' : 'lg:w-[266px] w-[266px]'
        )}
      >
        {/* Topo: Logo Única + Botão Recolher */}
        <div
          className={clsx(
            'px-4 border-b border-slate-200/70 dark:border-slate-800 flex items-center justify-between flex-shrink-0',
            collapsed ? 'h-16 lg:justify-center' : 'h-18 py-3'
          )}
        >
          {collapsed ? (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
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
              <div className="flex-1 bg-white dark:bg-slate-800/90 px-3 py-2 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 shadow-[0_2px_10px_rgba(15,23,42,0.04)] flex items-center justify-center max-w-[180px]">
                <img
                  src="/logo-coliseu.png"
                  alt="Coliseu Sistemas"
                  className="h-9 w-auto object-contain"
                />
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  className="hidden lg:flex p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                  title="Recolher menu"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  className="lg:hidden p-1.5 text-slate-500 hover:bg-white dark:hover:bg-slate-800 rounded-xl"
                  onClick={onClose}
                  aria-label="Fechar menu"
                >
                  <X size={20} />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Lista de Navegação Clean e Arejada (Solução A) */}
        <nav
          ref={navRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto py-3 px-3 flex flex-col gap-1"
        >
          {allowedMainModules.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}

          {allowedConfigModules.length > 0 && (
            <div className="mt-auto pt-3 border-t border-slate-200/80 dark:border-slate-800 flex flex-col gap-1">
              {!collapsed && (
                <div className="px-3 pb-1 text-[10.5px] font-semibold text-slate-400 dark:text-slate-500 tracking-wide">
                  Configurações
                </div>
              )}
              {allowedConfigModules.map((m) => (
                <NavItem key={m.to} {...m} />
              ))}
            </div>
          )}
        </nav>

        {/* Rodapé Enxuto sem Logo Duplicada (Item 2) */}
        <div
          className={clsx(
            'px-3.5 py-3 border-t border-slate-200/80 dark:border-slate-800 flex items-center flex-shrink-0',
            collapsed ? 'lg:justify-center' : 'justify-between gap-2'
          )}
        >
          {!collapsed && (
            <div className="min-w-0 pl-1">
              <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 truncate">
                Coliseu B.I IA.
              </div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                Inteligência Corporativa
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={async () => {
              await useAuthStore.getState().logout()
              window.location.href = '/login'
            }}
            className={clsx(
              'text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors flex items-center justify-center cursor-pointer',
              collapsed ? 'p-2.5' : 'px-3 py-2 gap-1.5 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700'
            )}
            title="Sair do sistema"
          >
            <LogOut size={15} />
            {!collapsed && <span>Sair</span>}
          </button>
        </div>
      </aside>
    </>
  )
}
