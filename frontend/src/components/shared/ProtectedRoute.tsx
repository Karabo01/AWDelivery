import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

import LoadingSpinner from '@/components/shared/LoadingSpinner'
import useAuth from '@/hooks/useAuth'

type ProtectedRouteProps = {
  children: ReactNode
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export default ProtectedRoute
