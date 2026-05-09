import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { useThemeStore } from './store/themeStore'

import Login from './pages/Login'
import Register from './pages/Register'
import DashboardLayout from './components/DashboardLayout'

import Home from './pages/Home'
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

function Protected({ children }: { children: JSX.Element }) {
  const user = useAuthStore((s) => s.user)
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const init = useAuthStore((s) => s.init)
  const initTheme = useThemeStore((s) => s.initTheme)

  useEffect(() => {
    init()
    initTheme()
    // Inicializa Web Worker de sincronização (opcional em dev)
    if (typeof Worker !== 'undefined') {
      try {
        const w = new Worker(new URL('./workers/syncWorker.ts', import.meta.url), { type: 'module' })
        w.postMessage({ type: 'INIT' })
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
        <Route path="financeiro" element={<FinanceiroEmDesenvolvimento />} />
        <Route path="fluxo-caixa" element={<FluxoCaixa />} />
        <Route path="estoque" element={<Estoque />} />
        <Route path="comissoes" element={<Comissoes />} />
        <Route path="ranking" element={<Ranking />} />
        <Route path="estatisticas" element={<Estatisticas />} />
        <Route path="inteligencia" element={<InteligenciaDashboard />} />
        <Route path="produtos" element={<Produtos />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="vendas" element={<Vendas />} />
        <Route path="usuarios" element={<Usuarios />} />
        
        {/* Novas Rotas de BI */}
        <Route path="bi" element={<BiDashboard />}>
          <Route index element={<SalesIntelligenceDashboard />} />
          <Route path="sales" element={<SalesIntelligenceDashboard />} />
          <Route path="hub" element={<SalesHubDashboard />} />
          <Route path="abc" element={<ABCAnalysisDashboard />} />
          <Route path="finance" element={<FinancialIntelligenceDashboard />} />
          <Route path="customer" element={<Radar360Dashboard />} />
          <Route path="comparative" element={<ComparativeAnalysisDashboard />} />
          <Route path="customer-analytics" element={<CustomerAnalyticsDashboard />} />
          <Route path="goals" element={<GoalsPerformanceDashboard />} />
          <Route path="supplier" element={<SupplierAnalyticsDashboard />} />
          <Route path="heatmap" element={<HeatmapDashboard />} />
          <Route path="ai-insights" element={<AIInsightsDashboard />} />
          {/* Adicionaremos as sub-rotas nas Fases futuras */}
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
