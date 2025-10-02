import { RBACService, Role, Permission } from '../src/rbac/permissions';

describe('RBACService', () => {
  describe('hasPermission', () => {
    it('should grant ADMIN full permissions', () => {
      expect(RBACService.hasPermission(Role.ADMIN, Permission.VISITOR_DELETE)).toBe(true);
      expect(RBACService.hasPermission(Role.ADMIN, Permission.GDPR_DELETE)).toBe(true);
      expect(RBACService.hasPermission(Role.ADMIN, Permission.SYSTEM_ADMIN)).toBe(false); // Not in the matrix
    });

    it('should restrict RECEPTIONIST permissions', () => {
      expect(RBACService.hasPermission(Role.RECEPTIONIST, Permission.VISITOR_READ)).toBe(true);
      expect(RBACService.hasPermission(Role.RECEPTIONIST, Permission.VISITOR_PII_VIEW)).toBe(true);
      expect(RBACService.hasPermission(Role.RECEPTIONIST, Permission.VISITOR_DELETE)).toBe(false);
      expect(RBACService.hasPermission(Role.RECEPTIONIST, Permission.GDPR_DELETE)).toBe(false);
    });

    it('should restrict SECURITY permissions', () => {
      expect(RBACService.hasPermission(Role.SECURITY, Permission.VISITOR_READ)).toBe(true);
      expect(RBACService.hasPermission(Role.SECURITY, Permission.VISITOR_PII_VIEW)).toBe(false);
      expect(RBACService.hasPermission(Role.SECURITY, Permission.VISIT_CHECKIN)).toBe(true);
      expect(RBACService.hasPermission(Role.SECURITY, Permission.VISITOR_DELETE)).toBe(false);
    });

    it('should restrict MANAGER permissions', () => {
      expect(RBACService.hasPermission(Role.MANAGER, Permission.REPORT_READ)).toBe(true);
      expect(RBACService.hasPermission(Role.MANAGER, Permission.REPORT_ANALYTICS)).toBe(true);
      expect(RBACService.hasPermission(Role.MANAGER, Permission.VISITOR_PII_VIEW)).toBe(false);
      expect(RBACService.hasPermission(Role.MANAGER, Permission.VISITOR_DELETE)).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    it('should return true if user has any of the permissions', () => {
      const permissions = [Permission.VISITOR_DELETE, Permission.VISITOR_READ];
      
      expect(RBACService.hasAnyPermission(Role.ADMIN, permissions)).toBe(true);
      expect(RBACService.hasAnyPermission(Role.RECEPTIONIST, permissions)).toBe(true);
      expect(RBACService.hasAnyPermission(Role.SECURITY, permissions)).toBe(true);
    });

    it('should return false if user has none of the permissions', () => {
      const permissions = [Permission.VISITOR_DELETE, Permission.GDPR_DELETE];
      
      expect(RBACService.hasAnyPermission(Role.SECURITY, permissions)).toBe(false);
      expect(RBACService.hasAnyPermission(Role.MANAGER, permissions)).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('should return true if user has all permissions', () => {
      const permissions = [Permission.VISITOR_READ, Permission.VISIT_READ];
      
      expect(RBACService.hasAllPermissions(Role.ADMIN, permissions)).toBe(true);
      expect(RBACService.hasAllPermissions(Role.RECEPTIONIST, permissions)).toBe(true);
    });

    it('should return false if user is missing any permission', () => {
      const permissions = [Permission.VISITOR_READ, Permission.VISITOR_DELETE];
      
      expect(RBACService.hasAllPermissions(Role.RECEPTIONIST, permissions)).toBe(false);
      expect(RBACService.hasAllPermissions(Role.SECURITY, permissions)).toBe(false);
    });
  });

  describe('canAccessPII', () => {
    it('should allow PII access for authorized roles', () => {
      expect(RBACService.canAccessPII(Role.ADMIN)).toBe(true);
      expect(RBACService.canAccessPII(Role.RECEPTIONIST)).toBe(true);
    });

    it('should deny PII access for unauthorized roles', () => {
      expect(RBACService.canAccessPII(Role.SECURITY)).toBe(false);
      expect(RBACService.canAccessPII(Role.MANAGER)).toBe(false);
    });
  });

  describe('canPerformGDPR', () => {
    it('should allow GDPR operations for authorized roles', () => {
      expect(RBACService.canPerformGDPR(Role.ADMIN)).toBe(true);
    });

    it('should deny GDPR operations for unauthorized roles', () => {
      expect(RBACService.canPerformGDPR(Role.RECEPTIONIST)).toBe(false);
      expect(RBACService.canPerformGDPR(Role.SECURITY)).toBe(false);
      expect(RBACService.canPerformGDPR(Role.MANAGER)).toBe(false);
    });
  });

  describe('getDataScope', () => {
    it('should return correct data scope for each role', () => {
      expect(RBACService.getDataScope(Role.ADMIN, 'user-1')).toEqual({
        type: 'organization',
        canViewPII: true,
      });

      expect(RBACService.getDataScope(Role.RECEPTIONIST, 'user-2')).toEqual({
        type: 'organization',
        canViewPII: true,
      });

      expect(RBACService.getDataScope(Role.SECURITY, 'user-3')).toEqual({
        type: 'organization',
        canViewPII: false,
      });

      expect(RBACService.getDataScope(Role.MANAGER, 'user-4')).toEqual({
        type: 'organization',
        canViewPII: false,
      });
    });
  });

  describe('getRolePermissions', () => {
    it('should return all permissions for a role', () => {
      const adminPermissions = RBACService.getRolePermissions(Role.ADMIN);
      const securityPermissions = RBACService.getRolePermissions(Role.SECURITY);

      expect(adminPermissions.length).toBeGreaterThan(securityPermissions.length);
      expect(adminPermissions).toContain(Permission.VISITOR_DELETE);
      expect(securityPermissions).not.toContain(Permission.VISITOR_DELETE);
    });

    it('should return empty array for invalid role', () => {
      const permissions = RBACService.getRolePermissions('INVALID_ROLE' as Role);
      expect(permissions).toEqual([]);
    });
  });
});