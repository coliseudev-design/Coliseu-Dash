import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { useThemeStore } from './store/themeStore'

import Login from './pages/Login'
import Register from './pages/Register'
import AcessoNegado from './pages/AcessoNegado'
import DashboardLayout from './components/DashboardLayout'
import ProtectedRoute from './components/ProtectedRoute'

import Home from './pages/Home'
import ComparativoVendas from './pages/ComparativoVendas'
import FinanceiroEmDesenvolvimento from './pages/FinanceiroEmDesenvolvimento'
import FluxoCaixa from './pages/Financeiro' // Usaremos a mesma página por enquanto ou podemos separar futuramente
import Comissoes from './pages/Comissoes'
import Ranking from './pages/Ranking'
import Estatisticas from './pages/Estatisticas'
import InteligenciaDashboard from './pages/inteligencia/InteligenciaDashboard'
import Produtos from './pages/Produtos'
import Clientes from './pages/Clientes'
import Estoque from './pages/Estoque'
import Vendas from './pages/Vendas'
import Usuarios from './pages/Usuarios'
import Grupos from './pages/Grupos'

// BI Modules
import BiDashboard from './pages/bi/BiDashboard'
import SalesIntelligenceDashboard from './pages/bi/SalesIntelligenceDashboard'
import SalesHubDashboard from './pages/bi/SalesHubDashboard'
import ABCAnalysisDashboard from './pages/bi/ABCAnalysisDashboard'
import FinancialIntelligenceDashboard from './pages/bi/FinancialIntelligenceDashboard'
import Radar360Dashboard from './pages/bi/Radar360Dashboard'
import ComparativeAnalysisDashboard from './pages/bi/ComparativeAnalysisDashboard'
import CustomerAnalyticsDashboard from './pages/bi/CustomerAnalyticsDashboard'
import GoalsPerformanceDashboard from './pages/bi/GoalsPerformanceDashboard'
import SupplierAnalyticsDashboard from './pages/bi/SupplierAnalyticsDashboard'
import HeatmapDashboard from './pages/bi/HeatmapDashboard'
import AIInsightsDashboard from './pages/bi/AIInsightsDashboard'
import SellerHubDashboard from './pages/bi/SellerHubDashboard'

function Protected({ children }: { children: JSX.Element }) {
  const user = useAuthStore((s) => s.user)
  if (!user) return <Navigate to="/login" replace />
  return children
}

import Comercial from './pages/Comercial'
import FinanceiroConsolidado from './pages/FinanceiroConsolidado'
import Titulos from './pages/Titulos'


export default function App() {
  const init = useAuthStore((s) => s.init)
  const initTheme = useThemeStore((s) => s.initTheme)

  useEffect(() => {
    init()
    initTheme()
    // Inicializa Web Worker de sincronização com token JWT
    if (typeof Worker !== 'undefined') {
      try {
        const w = new Worker(new URL('./workers/syncWorker.ts', import.meta.url), { type: 'module' })
        const token = localStorage.getItem('coliseu_token')
        w.postMessage({ type: 'INIT', token: token || undefined })
        // Guarda referência para atualizar o token quando o auth mudar
        ;(window as any).__syncWorker = w
      } catch {
        /* ignore */
      }
    }
  }, [init])

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/"
        element={
          <Protected>
            <DashboardLayout />
          </Protected>
        }
      >
        <Route index element={<Home />} />
        <Route path="comparativo-vendas" element={<ProtectedRoute permission="inicio"><ComparativoVendas /></ProtectedRoute>} />
        <Route path="hub-vendedor" element={<ProtectedRoute permission="bi_sales"><SellerHubDashboard /></ProtectedRoute>} />
        <Route path="financeiro" element={<ProtectedRoute permission="financeiro"><FinanceiroEmDesenvolvimento /></ProtectedRoute>} />
        <Route path="fluxo-caixa" element={<ProtectedRoute permission="fluxo-caixa"><FluxoCaixa /></ProtectedRoute>} />
        <Route path="estoque" element={<ProtectedRoute permission="estoque"><Estoque /></ProtectedRoute>} />
        <Route path="comissoes" element={<ProtectedRoute permission="comissoes"><Comissoes /></ProtectedRoute>} />
        <Route path="ranking" element={<ProtectedRoute permission="ranking"><Ranking /></ProtectedRoute>} />
        <Route path="estatisticas" element={<ProtectedRoute permission="estatisticas"><Estatisticas /></ProtectedRoute>} />
        <Route path="inteligencia" element={<ProtectedRoute permission="inteligencia"><InteligenciaDashboard /></ProtectedRoute>} />
        <Route path="produtos" element={<ProtectedRoute permission="produtos"><Produtos /></ProtectedRoute>} />
        <Route path="clientes" element={<ProtectedRoute permission="clientes"><Clientes /></ProtectedRoute>} />
        <Route path="vendas" element={<ProtectedRoute permission="vendas"><Vendas /></ProtectedRoute>} />
        <Route path="usuarios" element={<ProtectedRoute permission="usuarios"><Usuarios /></ProtectedRoute>} />
        <Route path="grupos" element={<ProtectedRoute permission="usuarios"><Grupos /></ProtectedRoute>} />
        
        {/* Rotas Consolidadas do Layout 1 */}
        <Route path="comercial" element={<Comercial />}>
          <Route index element={<SalesIntelligenceDashboard />} />
          <Route path="vendas" element={<SalesIntelligenceDashboard />} />
          <Route path="pedidos" element={<SalesHubDashboard />} />
          <Route path="equipe" element={<Comissoes />} />
          <Route path="vendedor" element={<SellerHubDashboard />} />
          <Route path="vendedor/:sellerId" element={<SellerHubDashboard />} />
          <Route path="rankings" element={<Ranking />} />
        </Route>

        <Route path="financeiro-consolidado" element={<FinanceiroConsolidado />}>
          <Route index element={<FinancialIntelligenceDashboard />} />
          <Route path="gestao" element={<FinancialIntelligenceDashboard />} />
          <Route path="fluxo-caixa" element={<FluxoCaixa />} />
          <Route path="titulos" element={<Titulos />} />
        </Route>

        {/* Novas Rotas de BI */}
        <Route path="bi" element={<BiDashboard />}>
          <Route index element={<ProtectedRoute permission="bi_sales"><SalesIntelligenceDashboard /></ProtectedRoute>} />
          <Route path="sales" element={<ProtectedRoute permission="bi_sales"><SalesIntelligenceDashboard /></ProtectedRoute>} />
          <Route path="vendedor" element={<ProtectedRoute permission="bi_seller_hub"><SellerHubDashboard /></ProtectedRoute>} />
          <Route path="hub" element={<ProtectedRoute permission="bi_hub"><SalesHubDashboard /></ProtectedRoute>} />
          <Route path="abc" element={<ProtectedRoute permission="bi_abc"><ABCAnalysisDashboard /></ProtectedRoute>} />
          <Route path="finance" element={<ProtectedRoute permission="bi_finance"><FinancialIntelligenceDashboard /></ProtectedRoute>} />
          <Route path="customer" element={<ProtectedRoute permission="bi_customer"><Radar360Dashboard /></ProtectedRoute>} />
          <Route path="comparative" element={<ProtectedRoute permission="bi_comparative"><ComparativeAnalysisDashboard /></ProtectedRoute>} />
          <Route path="customer-analytics" element={<ProtectedRoute permission="bi_customer_analytics"><CustomerAnalyticsDashboard /></ProtectedRoute>} />
          <Route path="goals" element={<ProtectedRoute permission="bi_goals"><GoalsPerformanceDashboard /></ProtectedRoute>} />
          <Route path="supplier" element={<ProtectedRoute permission="bi_supplier"><SupplierAnalyticsDashboard /></ProtectedRoute>} />
          <Route path="heatmap" element={<ProtectedRoute permission="bi_heatmap"><HeatmapDashboard /></ProtectedRoute>} />
          <Route path="ai-insights" element={<ProtectedRoute permission="bi_ai_insights"><AIInsightsDashboard /></ProtectedRoute>} />
        </Route>
      </Route>
      <Route path="/acesso-negado" element={<AcessoNegado />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
