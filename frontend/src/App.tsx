import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'

import Login from './pages/Login'
import DashboardLayout from './components/DashboardLayout'

import Home from './pages/Home'
import Vendas from './pages/Vendas'
import Financeiro from './pages/Financeiro'
import Lucratividade from './pages/Lucratividade'
import Comissoes from './pages/Comissoes'
import Ranking from './pages/Ranking'
import Estatisticas from './pages/Estatisticas'
import Compras from './pages/Compras'
import Devolucoes from './pages/Devolucoes'
import Produtos from './pages/Produtos'
import Clientes from './pages/Clientes'
import LogPage from './pages/Log'

function Protected({ children }: { children: JSX.Element }) {
  const user = useAuthStore((s) => s.user)
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const init = useAuthStore((s) => s.init)

  useEffect(() => {
    init()
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
      <Route
        path="/"
        element={
          <Protected>
            <DashboardLayout />
          </Protected>
        }
      >
        <Route index element={<Home />} />
        <Route path="vendas" element={<Vendas />} />
        <Route path="financeiro" element={<Financeiro />} />
        <Route path="lucratividade" element={<Lucratividade />} />
        <Route path="comissoes" element={<Comissoes />} />
        <Route path="ranking" element={<Ranking />} />
        <Route path="estatisticas" element={<Estatisticas />} />
        <Route path="compras" element={<Compras />} />
        <Route path="devolucoes" element={<Devolucoes />} />
        <Route path="produtos" element={<Produtos />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="log" element={<LogPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
