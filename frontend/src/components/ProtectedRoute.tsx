import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

interface ProtectedRouteProps {
  permission: string
  children: JSX.Element
}

export default function ProtectedRoute({ permission, children }: ProtectedRouteProps) {
  const user = useAuthStore((s) => s.user)

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Admins com a role master passam direto por qualquer verificação
  if (user.role === 'master') {
    return children
  }

  // Usuários nos layouts 1, 2 e 3 têm acesso liberado no frontend
  return children
}
