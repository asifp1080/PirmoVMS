import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Employee } from '@vms/contracts'

export interface User extends Employee {
  permissions: string[]
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (user: User, token: string) => void
  logout: () => void
  setLoading: (loading: boolean) => void
  hasPermission: (permission: string) => boolean
  hasAnyPermission: (permissions: string[]) => boolean
  hasRole: (role: string) => boolean
}

// Role-based permissions mapping
const ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: [
    'visitor:read', 'visitor:create', 'visitor:update', 'visitor:delete', 'visitor:pii:view', 'visitor:export',
    'visit:read', 'visit:create', 'visit:update', 'visit:delete', 'visit:checkin', 'visit:checkout',
    'employee:read', 'employee:create', 'employee:update', 'employee:delete', 'employee:invite',
    'org:read', 'org:update', 'org:settings', 'org:billing',
    'location:read', 'location:create', 'location:update', 'location:delete',
    'audit:read', 'audit:export',
    'report:read', 'report:export', 'report:analytics',
    'webhook:read', 'webhook:create', 'webhook:update', 'webhook:delete',
    'data:retention', 'gdpr:export', 'gdpr:delete'
  ],
  RECEPTIONIST: [
    'visitor:read', 'visitor:create', 'visitor:update', 'visitor:pii:view',
    'visit:read', 'visit:create', 'visit:update', 'visit:checkin', 'visit:checkout',
    'employee:read',
    'org:read', 'location:read',
    'report:read'
  ],
  SECURITY: [
    'visitor:read', 'visit:read', 'visit:checkin', 'visit:checkout',
    'employee:read', 'org:read', 'location:read',
    'audit:read', 'report:read'
  ],
  MANAGER: [
    'visitor:read', 'visit:read', 'employee:read',
    'org:read', 'location:read',
    'report:read', 'report:export', 'report:analytics',
    'audit:read', 'audit:export', 'visitor:export'
  ]
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: (user: User, token: string) => {
        const permissions = ROLE_PERMISSIONS[user.role] || []
        const userWithPermissions = { ...user, permissions }
        
        set({
          user: userWithPermissions,
          token,
          isAuthenticated: true,
          isLoading: false,
        })
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        })
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading })
      },

      hasPermission: (permission: string) => {
        const { user } = get()
        return user?.permissions.includes(permission) || false
      },

      hasAnyPermission: (permissions: string[]) => {
        const { user } = get()
        if (!user) return false
        return permissions.some(permission => user.permissions.includes(permission))
      },

      hasRole: (role: string) => {
        const { user } = get()
        return user?.role === role
      },
    }),
    {
      name: 'vms-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)