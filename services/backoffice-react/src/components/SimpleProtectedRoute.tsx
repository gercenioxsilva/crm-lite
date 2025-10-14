import { Navigate } from 'react-router-dom'
import { useSimpleAuth } from '../hooks/useSimpleAuth'

interface SimpleProtectedRouteProps {
  children: React.ReactNode
}

export function SimpleProtectedRoute({ children }: SimpleProtectedRouteProps) {
  const { user } = useSimpleAuth()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}