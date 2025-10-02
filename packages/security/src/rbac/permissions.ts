export enum Permission {
  // Visitor permissions
  VISITOR_READ = 'visitor:read',
  VISITOR_CREATE = 'visitor:create',
  VISITOR_UPDATE = 'visitor:update',
  VISITOR_DELETE = 'visitor:delete',
  VISITOR_PII_VIEW = 'visitor:pii:view',
  VISITOR_EXPORT = 'visitor:export',

  // Visit permissions
  VISIT_READ = 'visit:read',
  VISIT_CREATE = 'visit:create',
  VISIT_UPDATE = 'visit:update',
  VISIT_DELETE = 'visit:delete',
  VISIT_CHECKIN = 'visit:checkin',
  VISIT_CHECKOUT = 'visit:checkout',

  // Employee permissions
  EMPLOYEE_READ = 'employee:read',
  EMPLOYEE_CREATE = 'employee:create',
  EMPLOYEE_UPDATE = 'employee:update',
  EMPLOYEE_DELETE = 'employee:delete',
  EMPLOYEE_INVITE = 'employee:invite',

  // Organization permissions
  ORG_READ = 'org:read',
  ORG_UPDATE = 'org:update',
  ORG_SETTINGS = 'org:settings',
  ORG_BILLING = 'org:billing',

  // Location permissions
  LOCATION_READ = 'location:read',
  LOCATION_CREATE = 'location:create',
  LOCATION_UPDATE = 'location:update',
  LOCATION_DELETE = 'location:delete',

  // Audit permissions
  AUDIT_READ = 'audit:read',
  AUDIT_EXPORT = 'audit:export',

  // Report permissions
  REPORT_READ = 'report:read',
  REPORT_EXPORT = 'report:export',
  REPORT_ANALYTICS = 'report:analytics',

  // Webhook permissions
  WEBHOOK_READ = 'webhook:read',
  WEBHOOK_CREATE = 'webhook:create',
  WEBHOOK_UPDATE = 'webhook:update',
  WEBHOOK_DELETE = 'webhook:delete',

  // System permissions
  SYSTEM_ADMIN = 'system:admin',
  DATA_RETENTION = 'data:retention',
  GDPR_EXPORT = 'gdpr:export',
  GDPR_DELETE = 'gdpr:delete',
}

export enum Role {
  ADMIN = 'ADMIN',
  RECEPTIONIST = 'RECEPTIONIST',
  SECURITY = 'SECURITY',
  MANAGER = 'MANAGER',
}

// Role-based permission matrix
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.ADMIN]: [
    // Full access to everything
    Permission.VISITOR_READ,
    Permission.VISITOR_CREATE,
    Permission.VISITOR_UPDATE,
    Permission.VISITOR_DELETE,
    Permission.VISITOR_PII_VIEW,
    Permission.VISITOR_EXPORT,
    Permission.VISIT_READ,
    Permission.VISIT_CREATE,
    Permission.VISIT_UPDATE,
    Permission.VISIT_DELETE,
    Permission.VISIT_CHECKIN,
    Permission.VISIT_CHECKOUT,
    Permission.EMPLOYEE_READ,
    Permission.EMPLOYEE_CREATE,
    Permission.EMPLOYEE_UPDATE,
    Permission.EMPLOYEE_DELETE,
    Permission.EMPLOYEE_INVITE,
    Permission.ORG_READ,
    Permission.ORG_UPDATE,
    Permission.ORG_SETTINGS,
    Permission.ORG_BILLING,
    Permission.LOCATION_READ,
    Permission.LOCATION_CREATE,
    Permission.LOCATION_UPDATE,
    Permission.LOCATION_DELETE,
    Permission.AUDIT_READ,
    Permission.AUDIT_EXPORT,
    Permission.REPORT_READ,
    Permission.REPORT_EXPORT,
    Permission.REPORT_ANALYTICS,
    Permission.WEBHOOK_READ,
    Permission.WEBHOOK_CREATE,
    Permission.WEBHOOK_UPDATE,
    Permission.WEBHOOK_DELETE,
    Permission.DATA_RETENTION,
    Permission.GDPR_EXPORT,
    Permission.GDPR_DELETE,
  ],

  [Role.RECEPTIONIST]: [
    // Visitor management with PII access
    Permission.VISITOR_READ,
    Permission.VISITOR_CREATE,
    Permission.VISITOR_UPDATE,
    Permission.VISITOR_PII_VIEW,
    // Visit management
    Permission.VISIT_READ,
    Permission.VISIT_CREATE,
    Permission.VISIT_UPDATE,
    Permission.VISIT_CHECKIN,
    Permission.VISIT_CHECKOUT,
    // Limited employee access
    Permission.EMPLOYEE_READ,
    // Basic org info
    Permission.ORG_READ,
    Permission.LOCATION_READ,
    // Basic reporting
    Permission.REPORT_READ,
  ],

  [Role.SECURITY]: [
    // Read-only access to visitors and visits
    Permission.VISITOR_READ,
    Permission.VISIT_READ,
    // Can check people in/out
    Permission.VISIT_CHECKIN,
    Permission.VISIT_CHECKOUT,
    // Employee info for verification
    Permission.EMPLOYEE_READ,
    // Org and location info
    Permission.ORG_READ,
    Permission.LOCATION_READ,
    // Audit access for security monitoring
    Permission.AUDIT_READ,
    // Basic reporting
    Permission.REPORT_READ,
  ],

  [Role.MANAGER]: [
    // Read access to most data
    Permission.VISITOR_READ,
    Permission.VISIT_READ,
    Permission.EMPLOYEE_READ,
    Permission.ORG_READ,
    Permission.LOCATION_READ,
    // Full reporting and analytics
    Permission.REPORT_READ,
    Permission.REPORT_EXPORT,
    Permission.REPORT_ANALYTICS,
    // Audit access
    Permission.AUDIT_READ,
    Permission.AUDIT_EXPORT,
    // Can export visitor data for business purposes
    Permission.VISITOR_EXPORT,
  ],
};

export class RBACService {
  /**
   * Check if a role has a specific permission
   */
  static hasPermission(role: Role, permission: Permission): boolean {
    const rolePermissions = ROLE_PERMISSIONS[role];
    return rolePermissions.includes(permission);
  }

  /**
   * Check if a role has any of the specified permissions
   */
  static hasAnyPermission(role: Role, permissions: Permission[]): boolean {
    return permissions.some(permission => this.hasPermission(role, permission));
  }

  /**
   * Check if a role has all of the specified permissions
   */
  static hasAllPermissions(role: Role, permissions: Permission[]): boolean {
    return permissions.every(permission => this.hasPermission(role, permission));
  }

  /**
   * Get all permissions for a role
   */
  static getRolePermissions(role: Role): Permission[] {
    return ROLE_PERMISSIONS[role] || [];
  }

  /**
   * Check if a role can access PII data
   */
  static canAccessPII(role: Role): boolean {
    return this.hasPermission(role, Permission.VISITOR_PII_VIEW);
  }

  /**
   * Check if a role can perform GDPR operations
   */
  static canPerformGDPR(role: Role): boolean {
    return this.hasAnyPermission(role, [Permission.GDPR_EXPORT, Permission.GDPR_DELETE]);
  }

  /**
   * Get permission scope for data filtering
   */
  static getDataScope(role: Role, userId: string): DataScope {
    switch (role) {
      case Role.ADMIN:
        return { type: 'organization', canViewPII: true };
      case Role.RECEPTIONIST:
        return { type: 'organization', canViewPII: true };
      case Role.SECURITY:
        return { type: 'organization', canViewPII: false };
      case Role.MANAGER:
        return { type: 'organization', canViewPII: false };
      default:
        return { type: 'none', canViewPII: false };
    }
  }
}

export interface DataScope {
  type: 'organization' | 'location' | 'self' | 'none';
  canViewPII: boolean;
  locationIds?: string[];
}

// Decorator for permission-based access control
export function RequirePermission(...permissions: Permission[]) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const user = this.getCurrentUser(); // Implement this in your service
      
      if (!user || !RBACService.hasAllPermissions(user.role, permissions)) {
        throw new Error('Insufficient permissions');
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

// Decorator for PII access logging
export function LogPIIAccess(resourceType: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const user = this.getCurrentUser();
      const result = await originalMethod.apply(this, args);

      // Log PII access
      if (user && RBACService.canAccessPII(user.role)) {
        await this.auditService.logPIIAccess({
          userId: user.id,
          orgId: user.orgId,
          resourceType,
          resourceId: result?.id || 'unknown',
          action: 'VIEW_PII',
          timestamp: new Date(),
          ipAddress: this.getClientIP(),
          userAgent: this.getUserAgent(),
        });
      }

      return result;
    };

    return descriptor;
  };
}