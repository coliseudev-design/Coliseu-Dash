import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import clsx from 'clsx'
import {
  Menu, LogOut, RefreshCw, CheckCircle2, AlertCircle,
  LayoutDashboard, GitCompare, TrendingUp, BadgeCheck, UsersRound,
  Radar, Factory, Banknote, CircleDollarSign, Boxes, ShoppingCart, ChevronDown
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useSyncStatus } from '../../hooks/useSync'
import { formatDateTime } from '../../utils/format'
import ThemeToggle from '../../components/ThemeToggle'
import BranchSelector from '../../components/BranchSelector'
import api from '../../services/api'

interface Props {
  onMenuClick: () => void
  activeRoute: { label: string; icon: React.ElementType; color: string }
}

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
      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200 relative overflow-hidden"
      style={{
        background: isActive
          ? `linear-gradient(145deg, ${color}35 0%, ${color}15 100%)`
          : `linear-gradient(145deg, ${color}18 0%, ${color}08 100%)`,
        boxShadow: isActive
          ? `0 2px 6px ${color}30, 0 1px 0 rgba(255,255,255,0.15) inset`
          : `0 1px 2px rgba(0,0,0,0.05)`,
        border: `1px solid ${isActive ? color + '30' : color + '12'}`,
      }}
    >
      <Icon
        size={size}
        style={{ color: isActive ? color : `${color}bb` }}
        strokeWidth={isActive ? 2.2 : 1.8}
      />
    </div>
  )
}

const TOP_MENU_GROUPS = [
  {
    id: 'corporativas',
    label: 'Visão Executiva',
    icon: LayoutDashboard,
    color: '#3B82F6',
    items: [
      { to: '/', label: 'Cockpit de Resultados', icon: LayoutDashboard, exact: true, id: 'inicio', color: '#3B82F6' },
      { to: '/comparativo-vendas', label: 'Análise Comparativa', icon: GitCompare, exact: true, id: 'inicio', color: '#10B981' },
    ]
  },
  {
    id: 'comercial',
    label: 'Performance Comercial',
    icon: TrendingUp,
    color: '#F97316',
    items: [
      { to: '/bi', label: 'Monitor de Vendas', icon: TrendingUp, exact: true, id: 'bi_sales', color: '#10B981' },
      { to: '/hub-vendedor', label: 'Desempenho da Equipe', icon: BadgeCheck, exact: true, id: 'bi_sales', color: '#F97316' },
    ]
  },
  {
    id: 'clientes',
    label: 'Inteligência de Clientes',
    icon: UsersRound,
    color: '#EC4899',
    items: [
      { to: '/bi/customer-analytics', label: 'Visão Geral da Carteira', icon: UsersRound, id: 'bi_customer_analytics', color: '#14B8A6' },
      { to: '/bi/customer', label: 'Customer 360', icon: Radar, id: 'bi_customer', color: '#EC4899' },
    ]
  },
  {
    id: 'fornecedores',
    label: 'Gestão de Fornecedores',
    icon: Factory,
    color: '#F59E0B',
    items: [
      { to: '/bi/supplier', label: 'Performance de Parceiros', icon: Factory, id: 'bi_supplier', color: '#F59E0B' },
    ]
  },
  {
    id: 'controladoria',
    label: 'Saúde Financeira',
    icon: Banknote,
    color: '#22C55E',
    items: [
      { to: '/bi/finance', label: 'Gestão de Caixa', icon: Banknote, id: 'bi_finance', color: '#22C55E' },
      { to: '/bi/comparative', label: 'Análise de Rentabilidade', icon: CircleDollarSign, id: 'bi_comparative', color: '#84CC16' },
    ]
  },
  {
    id: 'operacoes',
    label: 'Supply Chain & Estoque',
    icon: Boxes,
    color: '#06B6D4',
    items: [
      { to: '/bi/abc', label: 'Dinâmica de Inventário', icon: Boxes, id: 'bi_abc', color: '#06B6D4' },
      { to: '/bi/compras-ia', label: 'Recomendações de Compra', icon: ShoppingCart, id: 'bi_compras_ia', color: '#A855F7', isComingSoon: true },
    ]
  }
]

export default function Header({ onMenuClick, activeRoute }: Props) {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const { status, lastSync, triggerSync, isSyncing, agentStatus } = useSyncStatus()
  const [menuOpen, setMenuOpen] = useState(false)
  const [empresaNome, setEmpresaNome] = useState<string>('')
  const [activeHoverGroup, setActiveHoverGroup] = useState<string | null>(null)
  const [isComingSoonOpen, setIsComingSoonOpen] = useState(false)
  const location = useLocation()

  const updateUserVersion = useAuthStore((s) => s.updateUserVersion)
  const [switching, setSwitching] = useState(false)

  const handleVersionChange = async (newVersion: string) => {
    if (!user?.id || switching) return
    setSwitching(true)
    try {
      await api.put(`/usuarios/${user.id}/layout`, { versao: newVersion })
      updateUserVersion(newVersion)
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao alternar versão')
    } finally {
      setSwitching(false)
    }
  }

  const hasAccess = (moduleId: string) => {
    if (user?.role === 'master') return true
    return user?.permissions?.includes(moduleId) || false
  }

  const allowedGroups = TOP_MENU_GROUPS.map(group => {
    const allowedItems = group.items.filter(item => {
      if (item.id === 'bi_compras_ia') return true
      return hasAccess(item.id)
    })
    return { ...group, items: allowedItems }
  }).filter(group => group.items.length > 0)

  useEffect(() => {
    const fetchEmpresa = async () => {
      try {
        const { data } = await api.get('/configuracoes/empresa')
        if (data && data.name) {
          setEmpresaNome(data.name)
        }
      } catch (err) {
        console.error('Erro ao buscar nome da empresa', err)
      }
    }
    fetchEmpresa()
  }, [])

  return (
    <>
      <header className="h-14 sm:h-16 bg-white/80 backdrop-blur-md border-b border-[#E0E0E0]/50 sticky top-0 z-20 flex items-center px-3 sm:px-4 lg:px-6 transition-all duration-300">
      <button
        className="lg:hidden p-2 -ml-2 text-text-secondary hover:bg-bg-secondary rounded-lg active:bg-bg-tertiary"
        onClick={onMenuClick}
        aria-label="Abrir menu"
      >
        <Menu size={22} />
      </button>

      <div className="flex items-center gap-2.5 ml-1 sm:ml-2 lg:ml-0 min-w-0 flex-shrink-0">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: `${activeRoute.color}15`,
            boxShadow: `0 2px 8px ${activeRoute.color}20`,
          }}
        >
          <activeRoute.icon size={16} style={{ color: activeRoute.color }} strokeWidth={2.2} />
        </div>
        <h1 className="font-heading text-xs sm:text-sm md:text-base font-extrabold text-text-primary uppercase tracking-wider truncate whitespace-nowrap">
          {activeRoute.label}
        </h1>
      </div>

      {/* Contêiner de Filtros Teleportados ao lado do título da tela */}
      <div id="page-filters-container" className="hidden lg:flex items-center gap-2 text-xs ml-4" />

      <div className="ml-auto flex items-center gap-1 sm:gap-2.5">
        {/* Glowing Agente status dot (no text to save space) */}
        <div 
          className="hidden lg:flex relative w-5 h-5 items-center justify-center rounded-full bg-slate-100/80 dark:bg-slate-800/80 cursor-help"
          title={agentStatus === 'ONLINE' ? 'Agente: Banco de Dados Conectado' : 'Agente: Falha na Conexão com o Banco'}
        >
          <span className={`absolute inline-flex h-2.5 w-2.5 rounded-full opacity-75 animate-ping ${agentStatus === 'ONLINE' ? 'bg-success' : 'bg-danger'}`} />
          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${agentStatus === 'ONLINE' ? 'bg-success' : 'bg-danger'}`} />
        </div>

        {empresaNome && (
          <div className="hidden xl:flex items-center px-2 border-r border-[#E0E0E0] mr-1 pr-3">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">
              {empresaNome}
            </span>
          </div>
        )}

        <div className="flex flex-col items-end shrink-0">
          <BranchSelector />
          <span className="text-[7.5px] font-bold text-text-secondary/60 uppercase tracking-wider leading-none mt-0.5 mr-1">
            Sync: {lastSync ? formatDateTime(lastSync) : 'nunca'}
          </span>
        </div>

        {/* Usuário */}
        <div className="relative">
          <button
            className="flex items-center gap-2 px-1.5 py-1 sm:px-2 sm:py-1.5 hover:bg-bg-secondary rounded-lg active:bg-bg-tertiary"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center text-sm font-semibold">
              {user?.nome?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-sm font-medium leading-tight">{user?.nome}</div>
              <div className="text-[11px] text-text-secondary leading-tight capitalize">{user?.role}</div>
            </div>
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 mt-1 w-52 bg-white border border-[#E0E0E0] rounded-lg shadow-card-hover z-40 py-1">
                <div className="px-3 py-2 border-b border-[#E0E0E0]">
                  <div className="text-sm font-medium truncate">{user?.nome}</div>
                  <div className="text-xs text-text-secondary truncate">{user?.email}</div>
                </div>
                <button
                  onClick={logout}
                  className="w-full text-left px-3 py-2 text-sm text-text-secondary hover:bg-bg-secondary flex items-center gap-2"
                >
                  <LogOut size={14} />
                  Sair
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>

    {/* Modal / Popup Inteligência de Compras com IA */}
    {isComingSoonOpen && (
      <div className="fixed inset-0 bg-slate-950/70 z-[9999] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
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
