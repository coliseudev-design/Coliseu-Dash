import { useEffect, lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { useThemeStore } from './store/themeStore'

import Login from './pages/Login'
import Register from './pages/Register'
import AcessoNegado from './pages/AcessoNegado'
import DashboardLayout from './components/DashboardLayout'
import ProtectedRoute from './components/ProtectedRoute'

import Home from './pages/Home'

// Lazy Loading para otimização de Bundle Size (Code Splitting)
const ComparativoVendas = lazy(() => import('./pages/ComparativoVendas'))
const FinanceiroEmDesenvolvimento = lazy(() => import('./pages/FinanceiroEmDesenvolvimento'))
const FluxoCaixa = lazy(() => import('./pages/Financeiro'))
const Comissoes = lazy(() => import('./pages/Comissoes'))
const Ranking = lazy(() => import('./pages/Ranking'))
const Estatisticas = lazy(() => import('./pages/Estatisticas'))
const InteligenciaDashboard = lazy(() => import('./pages/inteligencia/InteligenciaDashboard'))
const Produtos = lazy(() => import('./pages/Produtos'))
const Clientes = lazy(() => import('./pages/Clientes'))
const Estoque = lazy(() => import('./pages/Estoque'))
const Vendas = lazy(() => import('./pages/Vendas'))
const Usuarios = lazy(() => import('./pages/Usuarios'))
const Grupos = lazy(() => import('./pages/Grupos'))
const GerenciadorMetas = lazy(() => import('./components/GerenciadorMetas'))

const Comercial = lazy(() => import('./pages/Comercial'))
const FinanceiroConsolidado = lazy(() => import('./pages/FinanceiroConsolidado'))
const Titulos = lazy(() => import('./pages/Titulos'))

// BI Modules (Lazy Loaded)
const BiDashboard = lazy(() => import('./pages/bi/BiDashboard'))
const SalesIntelligenceDashboard = lazy(() => import('./pages/bi/SalesIntelligenceDashboard'))
const SalesHubDashboard = lazy(() => import('./pages/bi/SalesHubDashboard'))
const ABCAnalysisDashboard = lazy(() => import('./pages/bi/ABCAnalysisDashboard'))
const FinancialIntelligenceDashboard = lazy(() => import('./pages/bi/FinancialIntelligenceDashboard'))
const Radar360Dashboard = lazy(() => import('./pages/bi/Radar360Dashboard'))
const ComparativeAnalysisDashboard = lazy(() => import('./pages/bi/ComparativeAnalysisDashboard'))
const CustomerAnalyticsDashboard = lazy(() => import('./pages/bi/CustomerAnalyticsDashboard'))
const GoalsPerformanceDashboard = lazy(() => import('./pages/bi/GoalsPerformanceDashboard'))
const SupplierAnalyticsDashboard = lazy(() => import('./pages/bi/SupplierAnalyticsDashboard'))
const HeatmapDashboard = lazy(() => import('./pages/bi/HeatmapDashboard'))
const AIInsightsDashboard = lazy(() => import('./pages/bi/AIInsightsDashboard'))
const SellerHubDashboard = lazy(() => import('./pages/bi/SellerHubDashboard'))

function Protected({ children }: { children: JSX.Element }) {
  const user = useAuthStore((s) => s.user)
  if (!user) return <Navigate to="/login" replace />
  return children
}

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="h-8 w-8 border-4 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
  </div>
)

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
        ;(window as any).__syncWorker = w
      } catch {
        /* ignore */
      }
    }
  }, [init])

  return (
    <Suspense fallback={<PageLoader />}>
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
            <Route path="goals/manage" element={<ProtectedRoute permission="cadastro_metas"><GerenciadorMetas /></ProtectedRoute>} />
            <Route path="supplier" element={<ProtectedRoute permission="bi_supplier"><SupplierAnalyticsDashboard /></ProtectedRoute>} />
            <Route path="heatmap" element={<ProtectedRoute permission="bi_heatmap"><HeatmapDashboard /></ProtectedRoute>} />
            <Route path="ai-insights" element={<ProtectedRoute permission="bi_ai_insights"><AIInsightsDashboard /></ProtectedRoute>} />
          </Route>
        </Route>
        <Route path="/acesso-negado" element={<AcessoNegado />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
