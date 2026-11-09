import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import {
  LayoutDashboard, GitCompare, TrendingUp, ShoppingCart, Factory,
  Boxes, Banknote, Radar, UsersRound, CircleDollarSign, BadgeCheck,
  Map, BrainCircuit, Shield, Target, FileText, SlidersHorizontal
} from 'lucide-react'

const ROUTE_CONFIGS: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  '/': { label: 'VISÃO ESTRATÉGICA', icon: LayoutDashboard, color: '#10B981' },
  '/comparativo-vendas': { label: 'ANÁLISE COMPARATIVA', icon: GitCompare, color: '#F59E0B' },
  '/hub-vendedor': { label: 'DESEMPENHO DA EQUIPE', icon: BadgeCheck, color: '#F97316' },
  '/bi': { label: 'MONITOR DE VENDAS', icon: TrendingUp, color: '#3B82F6' },
  '/bi/sales': { label: 'MONITOR DE VENDAS', icon: TrendingUp, color: '#3B82F6' },
  '/bi/hub': { label: 'HUB DE VENDAS', icon: ShoppingCart, color: '#F97316' },
  '/bi/supplier': { label: 'HUB DO FORNECEDOR', icon: Factory, color: '#0284C7' },
  '/bi/abc': { label: 'DINÂMICA DE INVENTÁRIO', icon: Boxes, color: '#06B6D4' },
  '/bi/finance': { label: 'GESTÃO DE CAIXA', icon: Banknote, color: '#22C55E' },
  '/bi/customer': { label: 'CLIENTE 360', icon: Radar, color: '#14B8A6' },
  '/bi/comparative': { label: 'ANÁLISE DE RENTABILIDADE', icon: CircleDollarSign, color: '#65A30D' },
  '/bi/customer-analytics': { label: 'VISÃO GERAL DA CARTEIRA', icon: UsersRound, color: '#0EA5E9' },
  '/bi/compras': { label: 'GESTÃO DE COMPRAS', icon: ShoppingCart, color: '#F43F5E' },
  '/bi/compras-ia': { label: 'GESTÃO DE COMPRAS', icon: ShoppingCart, color: '#F43F5E' },
  '/bi/fiscal': { label: 'FISCAL', icon: FileText, color: '#2563EB' },
  '/bi/parametros': { label: 'PARÂMETROS', icon: SlidersHorizontal, color: '#D97706' },
  '/bi/goals': { label: 'ANÁLISE DE METAS', icon: Target, color: '#EF4444' },
  '/bi/goals/manage': { label: 'CADASTRO DE METAS', icon: Target, color: '#EF4444' },
  '/bi/heatmap': { label: 'MAPA DE CALOR', icon: Map, color: '#0EA5E9' },
  '/bi/ai-insights': { label: 'COLISEU AI', icon: BrainCircuit, color: '#00A896' },
  '/usuarios': { label: 'USUÁRIOS', icon: Shield, color: '#475569' },
  '/grupos': { label: 'GRUPOS DE ACESSO', icon: Shield, color: '#0D9488' },
}

export default function DashboardLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('coliseu_sidebar_collapsed') === 'true'
  })
  const loc = useLocation()

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const newVal = !prev
      localStorage.setItem('coliseu_sidebar_collapsed', String(newVal))
      return newVal
    })
  }

  const activeRoute = ROUTE_CONFIGS[loc.pathname] || { label: 'Coliseu Dash', icon: LayoutDashboard, color: '#10B981' }

  return (
    <div className="min-h-screen bg-bg-secondary flex">
      <Sidebar
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenuClick={() => setMenuOpen(true)} activeRoute={activeRoute} />
        <main className="flex-1 p-2 md:p-3 max-w-[1600px] w-full mx-auto flex flex-col gap-2.5">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
