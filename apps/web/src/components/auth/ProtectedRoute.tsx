import { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'

interface ProtectedRouteProps {
  children: ReactNode
  requiredPermissions?: string[]
  requiredRole?: string
  fallback?: ReactNode
}

export function ProtectedRoute({ 
  children, 
  requiredPermissions = [], 
  requiredRole,
  fallback 
}: ProtectedRouteProps) {
  const { isAuthenticated, hasAnyPermission, hasRole } = useAuthStore()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Check role requirement
  if (requiredRole && !hasRole(requiredRole)) {
    return fallback || <Navigate to="/unauthorized" replace />
  }

  // Check permission requirements
  if (requiredPermissions.length > 0 && !hasAnyPermission(requiredPermissions)) {
    return fallback || <Navigate to="/unauthorized" replace />
  }

  return <>{children}</>
}

interface ConditionalRenderProps {
  children: ReactNode
  requiredPermissions?: string[]
  requiredRole?: string
  fallback?: ReactNode
}

export function ConditionalRender({ 
  children, 
  requiredPermissions = [], 
  requiredRole,
  fallback = null 
}: ConditionalRenderProps) {
  const { hasAnyPermission, hasRole } = useAuthStore()

  // Check role requirement
  if (requiredRole && !hasRole(requiredRole)) {
    return <>{fallback}</>
  }

  // Check permission requirements
  if (requiredPermissions.length > 0 && !hasAnyPermission(requiredPermissions)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}