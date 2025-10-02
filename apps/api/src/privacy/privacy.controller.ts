import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard, RequirePermissions } from '../auth/guards/permission.guard';
import { PIIAuditInterceptor } from '../common/interceptors/pii-audit.interceptor';
import { Permission } from '@vms/security';
import { PIIAuditService, GDPRRequestType } from '@vms/security';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('privacy')
@UseGuards(JwtAuthGuard, PermissionGuard)
@UseInterceptors(PIIAuditInterceptor)
export class PrivacyController {
  constructor(private readonly piiAuditService: PIIAuditService) {}

  @Get('pii-access-logs')
  @RequirePermissions(Permission.AUDIT_READ)
  async getPIIAccessLogs(
    @CurrentUser() user: any,
    @Query('resourceType') resourceType?: string,
    @Query('resourceId') resourceId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    const from = fromDate ? new Date(fromDate) : undefined;
    const to = toDate ? new Date(toDate) : undefined;

    return this.piiAuditService.getPIIAccessLogs(
      user.orgId,
      resourceType,
      resourceId,
      from,
      to,
    );
  }

  @Post('gdpr-requests/export')
  @RequirePermissions(Permission.GDPR_EXPORT)
  async createGDPRExportRequest(
    @CurrentUser() user: any,
    @Body() body: { email: string; phone?: string },
  ) {
    return this.piiAuditService.createGDPRExportRequest(
      user.orgId,
      body.email,
      body.phone,
      user.id,
    );
  }

  @Post('gdpr-requests/delete')
  @RequirePermissions(Permission.GDPR_DELETE)
  async createGDPRDeletionRequest(
    @CurrentUser() user: any,
    @Body() body: { email: string; phone?: string },
  ) {
    return this.piiAuditService.createGDPRDeletionRequest(
      user.orgId,
      body.email,
      body.phone,
      user.id,
    );
  }

  @Post('gdpr-requests/:token/verify')
  async verifyGDPRRequest(@Param('token') token: string) {
    return this.piiAuditService.verifyGDPRRequest(token);
  }

  @Get('gdpr-requests')
  @RequirePermissions(Permission.GDPR_EXPORT, Permission.GDPR_DELETE)
  async getGDPRRequests(@CurrentUser() user: any) {
    // Implementation to get GDPR requests for the organization
    return [];
  }

  @Put('data-retention')
  @RequirePermissions(Permission.DATA_RETENTION)
  async updateDataRetentionPolicy(
    @CurrentUser() user: any,
    @Body() policy: {
      resourceType: string;
      retentionPeriodDays: number;
      autoDeleteEnabled: boolean;
      legalHoldExemption: boolean;
    },
  ) {
    return this.piiAuditService.setDataRetentionPolicy({
      orgId: user.orgId,
      resourceType: policy.resourceType,
      retentionPeriodDays: policy.retentionPeriodDays,
      autoDeleteEnabled: policy.autoDeleteEnabled,
      legalHoldExemption: policy.legalHoldExemption,
      updatedBy: user.id,
    });
  }

  @Post('data-retention/cleanup')
  @RequirePermissions(Permission.DATA_RETENTION)
  async runDataRetentionCleanup(@CurrentUser() user: any) {
    return this.piiAuditService.runDataRetentionCleanup(user.orgId);
  }
}