import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Loading } from './Loading'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <Loading message="Verificando autenticação..." />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}