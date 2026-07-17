import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import {
  LayoutDashboard, GitCompare, BarChart3, ShoppingCart, Truck,
  Package, Wallet, Users, DollarSign, Trophy, Map, BrainCircuit, Shield
} from 'lucide-react'

const ROUTE_CONFIGS: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  '/': { label: 'Visão Estratégica', icon: LayoutDashboard, color: '#3B82F6' },
  '/comparativo-vendas': { label: 'Comparativo', icon: GitCompare, color: '#10B981' },
  '/bi': { label: 'Hub do Vendedor', icon: Users, color: '#10B981' },
  '/bi/sales': { label: 'Inteligência de Vendas', icon: BarChart3, color: '#10B981' },
  '/bi/hub': { label: 'Hub de Vendas', icon: ShoppingCart, color: '#F97316' },
  '/bi/supplier': { label: 'Hub do Fornecedor', icon: Truck, color: '#F59E0B' },
  '/bi/abc': { label: 'Gestão de Inventário', icon: Package, color: '#06B6D4' },
  '/bi/finance': { label: 'Financeiro', icon: Wallet, color: '#22C55E' },
  '/bi/customer': { label: 'Radar 360', icon: Users, color: '#EC4899' },
  '/bi/comparative': { label: 'Lucratividade', icon: DollarSign, color: '#84CC16' },
  '/bi/customer-analytics': { label: 'Análise de Clientes', icon: Users, color: '#14B8A6' },
  '/bi/goals': { label: 'Análise de Metas', icon: Trophy, color: '#EAB308' },
  '/bi/heatmap': { label: 'Mapa de Calor', icon: Map, color: '#0EA5E9' },
  '/bi/ai-insights': { label: 'Coliseu AI', icon: BrainCircuit, color: '#00A896' },
  '/usuarios': { label: 'Usuários', icon: Shield, color: '#EF4444' },
  '/grupos': { label: 'Grupos de Acesso', icon: Shield, color: '#EC4899' },
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

  // Get active route configuration or fallback
  const activeRoute = ROUTE_CONFIGS[loc.pathname] || { label: 'Coliseu Dash', icon: LayoutDashboard, color: '#3B82F6' }

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
        <main className="flex-1 p-3 sm:p-4 md:p-5 lg:p-6 max-w-[1600px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
