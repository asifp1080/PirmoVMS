import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'

export const ROLES_KEY = 'roles'
export const PERMISSIONS_KEY = 'permissions'

export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles)
export const Permissions = (...permissions: string[]) => SetMetadata(PERMISSIONS_KEY, permissions)

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (!requiredRoles && !requiredPermissions) {
      return true
    }

    const { user } = context.switchToHttp().getRequest()
    
    if (!user) {
      throw new ForbiddenException('User not authenticated')
    }

    // Check roles
    if (requiredRoles && !requiredRoles.includes(user.role)) {
      throw new ForbiddenException(`Insufficient permissions. Required roles: ${requiredRoles.join(', ')}`)
    }

    // Check permissions (based on role)
    if (requiredPermissions) {
      const userPermissions = getRolePermissions(user.role)
      const hasPermission = requiredPermissions.some(permission => 
        userPermissions.includes(permission)
      )
      
      if (!hasPermission) {
        throw new ForbiddenException(`Insufficient permissions. Required: ${requiredPermissions.join(', ')}`)
      }
    }

    return true
  }
}

// Role-based permissions mapping
function getRolePermissions(role: string): string[] {
  const rolePermissions: Record<string, string[]> = {
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

  return rolePermissions[role] || []
}