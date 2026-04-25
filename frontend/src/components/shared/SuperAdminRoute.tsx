import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

import LoadingSpinner from '@/components/shared/LoadingSpinner'
import useAuth from '@/hooks/useAuth'

type SuperAdminRouteProps = {
  children: ReactNode
}

function SuperAdminRoute({ children }: SuperAdminRouteProps) {
  const { isAuthenticated, isSuperAdmin, isLoading } = useAuth()

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!isSuperAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

export default SuperAdminRoute
