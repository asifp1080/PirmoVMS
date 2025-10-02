import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard, RequirePermissions } from '../auth/guards/permission.guard';
import { Permission } from '@vms/security';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AnalyticsService, AnalyticsFilters } from './analytics.service';
import { ExportService } from './export.service';

@Controller('analytics')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly exportService: ExportService,
  ) {}

  @Get('overview')
  @RequirePermissions(Permission.REPORT_READ)
  async getOverview(
    @CurrentUser() user: any,
    @Query('locationIds') locationIds?: string,
    @Query('hostIds') hostIds?: string,
    @Query('purposes') purposes?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    const filters: AnalyticsFilters = {
      orgId: user.orgId,
      locationIds: locationIds ? locationIds.split(',') : undefined,
      hostIds: hostIds ? hostIds.split(',') : undefined,
      purposes: purposes ? purposes.split(',') : undefined,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
    };

    const [
      visitMetrics,
      locationMetrics,
      hostMetrics,
      purposeMetrics,
      visitorRetention,
    ] = await Promise.all([
      this.analyticsService.getVisitMetrics(filters),
      this.analyticsService.getLocationMetrics(filters),
      this.analyticsService.getHostMetrics(filters),
      this.analyticsService.getPurposeMetrics(filters),
      this.analyticsService.getVisitorRetentionData(filters),
    ]);

    return {
      visitMetrics,
      locationMetrics,
      hostMetrics,
      purposeMetrics,
      visitorRetention,
    };
  }

  @Get('visits/daily')
  @RequirePermissions(Permission.REPORT_READ)
  async getDailyVisits(
    @CurrentUser() user: any,
    @Query('locationIds') locationIds?: string,
    @Query('hostIds') hostIds?: string,
    @Query('purposes') purposes?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    const filters: AnalyticsFilters = {
      orgId: user.orgId,
      locationIds: locationIds ? locationIds.split(',') : undefined,
      hostIds: hostIds ? hostIds.split(',') : undefined,
      purposes: purposes ? purposes.split(',') : undefined,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
    };

    return this.analyticsService.getDailyVisitCounts(filters);
  }

  @Get('visits/weekly')
  @RequirePermissions(Permission.REPORT_READ)
  async getWeeklyVisits(
    @CurrentUser() user: any,
    @Query('locationIds') locationIds?: string,
    @Query('hostIds') hostIds?: string,
    @Query('purposes') purposes?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    const filters: AnalyticsFilters = {
      orgId: user.orgId,
      locationIds: locationIds ? locationIds.split(',') : undefined,
      hostIds: hostIds ? hostIds.split(',') : undefined,
      purposes: purposes ? purposes.split(',') : undefined,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
    };

    return this.analyticsService.getWeeklyVisitCounts(filters);
  }

  @Get('visits/monthly')
  @RequirePermissions(Permission.REPORT_READ)
  async getMonthlyVisits(
    @CurrentUser() user: any,
    @Query('locationIds') locationIds?: string,
    @Query('hostIds') hostIds?: string,
    @Query('purposes') purposes?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    const filters: AnalyticsFilters = {
      orgId: user.orgId,
      locationIds: locationIds ? locationIds.split(',') : undefined,
      hostIds: hostIds ? hostIds.split(',') : undefined,
      purposes: purposes ? purposes.split(',') : undefined,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
    };

    return this.analyticsService.getMonthlyVisitCounts(filters);
  }

  @Get('heatmap')
  @RequirePermissions(Permission.REPORT_READ)
  async getHeatmapData(
    @CurrentUser() user: any,
    @Query('locationIds') locationIds?: string,
    @Query('hostIds') hostIds?: string,
    @Query('purposes') purposes?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    const filters: AnalyticsFilters = {
      orgId: user.orgId,
      locationIds: locationIds ? locationIds.split(',') : undefined,
      hostIds: hostIds ? hostIds.split(',') : undefined,
      purposes: purposes ? purposes.split(',') : undefined,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
    };

    return this.analyticsService.getHeatmapData(filters);
  }

  @Get('locations')
  @RequirePermissions(Permission.REPORT_READ)
  async getLocationMetrics(
    @CurrentUser() user: any,
    @Query('locationIds') locationIds?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    const filters: AnalyticsFilters = {
      orgId: user.orgId,
      locationIds: locationIds ? locationIds.split(',') : undefined,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
    };

    return this.analyticsService.getLocationMetrics(filters);
  }

  @Get('hosts')
  @RequirePermissions(Permission.REPORT_READ)
  async getHostMetrics(
    @CurrentUser() user: any,
    @Query('hostIds') hostIds?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    const filters: AnalyticsFilters = {
      orgId: user.orgId,
      hostIds: hostIds ? hostIds.split(',') : undefined,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
    };

    return this.analyticsService.getHostMetrics(filters);
  }

  @Get('purposes')
  @RequirePermissions(Permission.REPORT_READ)
  async getPurposeMetrics(
    @CurrentUser() user: any,
    @Query('purposes') purposes?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    const filters: AnalyticsFilters = {
      orgId: user.orgId,
      purposes: purposes ? purposes.split(',') : undefined,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
    };

    return this.analyticsService.getPurposeMetrics(filters);
  }

  @Get('retention')
  @RequirePermissions(Permission.REPORT_READ)
  async getVisitorRetention(
    @CurrentUser() user: any,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    const filters: AnalyticsFilters = {
      orgId: user.orgId,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
    };

    return this.analyticsService.getVisitorRetentionData(filters);
  }

  @Get('export/csv')
  @RequirePermissions(Permission.REPORT_EXPORT)
  async exportCSV(
    @CurrentUser() user: any,
    @Query('type') type: string,
    @Query('locationIds') locationIds?: string,
    @Query('hostIds') hostIds?: string,
    @Query('purposes') purposes?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Res() res?: Response,
  ) {
    const filters: AnalyticsFilters = {
      orgId: user.orgId,
      locationIds: locationIds ? locationIds.split(',') : undefined,
      hostIds: hostIds ? hostIds.split(',') : undefined,
      purposes: purposes ? purposes.split(',') : undefined,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
    };

    const csvData = await this.exportService.exportToCSV(type, filters);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${type}-analytics-${new Date().toISOString().split('T')[0]}.csv"`);
    
    return res.send(csvData);
  }

  @Get('export/pdf')
  @RequirePermissions(Permission.REPORT_EXPORT)
  async exportPDF(
    @CurrentUser() user: any,
    @Query('type') type: string,
    @Query('locationIds') locationIds?: string,
    @Query('hostIds') hostIds?: string,
    @Query('purposes') purposes?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Res() res?: Response,
  ) {
    const filters: AnalyticsFilters = {
      orgId: user.orgId,
      locationIds: locationIds ? locationIds.split(',') : undefined,
      hostIds: hostIds ? hostIds.split(',') : undefined,
      purposes: purposes ? purposes.split(',') : undefined,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
    };

    const pdfBuffer = await this.exportService.exportToPDF(type, filters);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${type}-analytics-${new Date().toISOString().split('T')[0]}.pdf"`);
    
    return res.send(pdfBuffer);
  }
}