import { Controller, Get, Post, Query, Body, Param, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger'

import { AnalyticsService } from './analytics.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard, Permissions } from '../auth/guards/roles.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { AnalyticsQuerySchema, ExportSchema } from '@vms/contracts'

@ApiTags('Analytics')
@Controller('organizations/:orgId/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('visits')
  @Permissions('report:read', 'report:analytics')
  @ApiOperation({ summary: 'Get visit analytics' })
  @ApiResponse({ status: 200, description: 'Visit analytics data' })
  async getVisitAnalytics(
    @Param('orgId') orgId: string,
    @Query() query: any,
    @CurrentUser() user: any,
  ) {
    // Ensure user can only access their org's data
    if (user.org_id !== orgId) {
      throw new ForbiddenException('Access denied')
    }

    return this.analyticsService.getVisitAnalytics(orgId, query)
  }

  @Post('export')
  @Permissions('report:export')
  @ApiOperation({ summary: 'Export analytics data' })
  @ApiResponse({ 
    status: 200, 
    description: 'Export file',
    content: {
      'application/octet-stream': {
        schema: {
          type: 'string',
          format: 'binary'
        }
      }
    }
  })
  async exportAnalytics(
    @Param('orgId') orgId: string,
    @Body() exportParams: any,
    @CurrentUser() user: any,
  ) {
    // Ensure user can only access their org's data
    if (user.org_id !== orgId) {
      throw new ForbiddenException('Access denied')
    }

    const validatedParams = ExportSchema.parse(exportParams)
    return this.analyticsService.exportAnalytics(orgId, validatedParams)
  }
}