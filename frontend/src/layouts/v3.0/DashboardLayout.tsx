import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

const TITLES: Record<string, string> = {
  '/': 'Visão Estratégica',
  '/vendas': 'Vendas',
  '/financeiro': 'Fluxo de Caixa',
  '/comissoes': 'Vendas',
  '/ranking': 'Ranking',
  '/estatisticas': 'Estatísticas',
  '/produtos': 'Produtos',
  '/clientes': 'Clientes',
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
  const title = TITLES[loc.pathname] || 'Coliseu Dash'

  return (
    <div className="min-h-screen bg-bg-secondary flex">
      <Sidebar 
        open={menuOpen} 
        onClose={() => setMenuOpen(false)} 
        collapsed={collapsed} 
        onToggleCollapse={toggleCollapse} 
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenuClick={() => setMenuOpen(true)} title={title} />
        <main className="flex-1 p-3 sm:p-4 md:p-5 lg:p-6 max-w-[1600px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
