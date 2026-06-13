import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

const TITLES: Record<string, string> = {
  '/': 'Visão Geral',
  '/comercial': 'Comercial - Visão Consolidada',
  '/comercial/vendas': 'Comercial - Visão Consolidada',
  '/comercial/equipe': 'Comercial - Equipe',
  '/comercial/rankings': 'Comercial - Rankings',
  '/financeiro-consolidado': 'Financeiro - Gestão',
  '/financeiro-consolidado/gestao': 'Financeiro - Gestão',
  '/financeiro-consolidado/fluxo-caixa': 'Financeiro - Fluxo de Caixa',
  '/vendas': 'Vendas',
  '/comissoes': 'Vendedores',
  '/ranking': 'Ranking',
  '/estatisticas': 'Estatísticas',
  '/produtos': 'Produtos',
  '/clientes': 'Clientes',
}

export default function DashboardLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const loc = useLocation()
  
  let title = TITLES[loc.pathname]
  if (!title && loc.pathname.startsWith('/comercial/vendedor')) {
    title = 'Comercial - Detalhamento de Vendedor'
  }
  title = title || 'Coliseu Dash'

  return (
    <div className="min-h-screen bg-bg-secondary flex">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenuClick={() => setMenuOpen(true)} title={title} />
        <main className="flex-1 p-3 sm:p-4 lg:p-6 max-w-[1600px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
