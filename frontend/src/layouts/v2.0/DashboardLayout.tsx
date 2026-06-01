import { useState, useEffect } from 'react'
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
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('v2_sidebar_collapsed') === 'true'
  })
  const loc = useLocation()
  const title = TITLES[loc.pathname] || 'Coliseu Dash'

  const handleToggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev
      localStorage.setItem('v2_sidebar_collapsed', String(next))
      return next
    })
  }

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && window.innerWidth < 1200) {
        setIsCollapsed(true)
      } else if (window.innerWidth >= 1200) {
        setIsCollapsed(false)
      }
    }
    window.addEventListener('resize', handleResize)
    handleResize() // run initially
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div className="min-h-screen bg-bg-secondary flex">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} isCollapsed={isCollapsed} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header 
          onMenuClick={() => setMenuOpen(true)} 
          title={title} 
          isCollapsed={isCollapsed} 
          onToggleCollapse={handleToggleCollapse} 
        />
        <main className="flex-1 p-3 sm:p-4 lg:p-6 max-w-[1600px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
