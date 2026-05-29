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

  const permissions = user.permissions || []
  if (!permissions.includes(permission)) {
    return <Navigate to="/acesso-negado" replace />
  }

  return children
}
