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

  // Verificar se o usuário possui a permissão requerida
  const userPermissions = user.permissions || [];
  if (userPermissions.includes(permission)) {
    return children;
  }

  // Se não tiver permissão, redireciona para acesso negado
  return <Navigate to="/acesso-negado" replace />
}
