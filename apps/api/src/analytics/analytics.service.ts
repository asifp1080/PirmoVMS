import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface AnalyticsFilters {
  orgId: string;
  locationIds?: string[];
  hostIds?: string[];
  purposes?: string[];
  fromDate?: Date;
  toDate?: Date;
}

export interface VisitMetrics {
  totalVisits: number;
  checkedInVisits: number;
  checkedOutVisits: number;
  noShowVisits: number;
  averageWaitTime: number;
  averageVisitDuration: number;
  peakHour: number;
  peakDay: string;
}

export interface LocationMetrics {
  locationId: string;
  locationName: string;
  totalVisits: number;
  averageDuration: number;
  peakHour: number;
}

export interface HostMetrics {
  hostId: string;
  hostName: string;
  totalVisits: number;
  averageWaitTime: number;
  averageDuration: number;
}

export interface PurposeMetrics {
  purpose: string;
  totalVisits: number;
  percentage: number;
  averageDuration: number;
}

export interface HeatmapData {
  hour: number;
  day: string;
  visits: number;
}

export interface VisitorRetentionData {
  period: string;
  newVisitors: number;
  returningVisitors: number;
  totalVisitors: number;
  retentionRate: number;
}

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getVisitMetrics(filters: AnalyticsFilters): Promise<VisitMetrics> {
    const whereClause = this.buildWhereClause(filters);

    const [
      totalVisits,
      statusCounts,
      avgWaitTime,
      avgDuration,
      peakHourData,
      peakDayData,
    ] = await Promise.all([
      this.prisma.visit.count({ where: whereClause }),
      this.getVisitStatusCounts(whereClause),
      this.getAverageWaitTime(whereClause),
      this.getAverageVisitDuration(whereClause),
      this.getPeakHour(whereClause),
      this.getPeakDay(whereClause),
    ]);

    return {
      totalVisits,
      checkedInVisits: statusCounts.CHECKED_IN || 0,
      checkedOutVisits: statusCounts.CHECKED_OUT || 0,
      noShowVisits: statusCounts.NO_SHOW || 0,
      averageWaitTime: avgWaitTime || 0,
      averageVisitDuration: avgDuration || 0,
      peakHour: peakHourData?.hour || 9,
      peakDay: peakDayData?.day || 'Monday',
    };
  }

  async getLocationMetrics(filters: AnalyticsFilters): Promise<LocationMetrics[]> {
    const whereClause = this.buildWhereClause(filters);

    const locationData = await this.prisma.$queryRaw`
      SELECT 
        l.id as "locationId",
        l.name as "locationName",
        COUNT(v.id)::int as "totalVisits",
        COALESCE(AVG(EXTRACT(EPOCH FROM (v.check_out_time - v.check_in_time))/60), 0)::int as "averageDuration",
        COALESCE(
          (SELECT EXTRACT(HOUR FROM v2.check_in_time)::int
           FROM "Visit" v2 
           WHERE v2.location_id = l.id AND v2.check_in_time IS NOT NULL
           GROUP BY EXTRACT(HOUR FROM v2.check_in_time)
           ORDER BY COUNT(*) DESC
           LIMIT 1), 9
        ) as "peakHour"
      FROM "Location" l
      LEFT JOIN "Visit" v ON v.location_id = l.id
      WHERE l.org_id = ${filters.orgId}
        ${filters.locationIds?.length ? `AND l.id = ANY(${filters.locationIds})` : ''}
        ${filters.fromDate ? `AND v.scheduled_start >= ${filters.fromDate}` : ''}
        ${filters.toDate ? `AND v.scheduled_start <= ${filters.toDate}` : ''}
      GROUP BY l.id, l.name
      ORDER BY "totalVisits" DESC
    `;

    return locationData as LocationMetrics[];
  }

  async getHostMetrics(filters: AnalyticsFilters): Promise<HostMetrics[]> {
    const whereClause = this.buildWhereClause(filters);

    const hostData = await this.prisma.$queryRaw`
      SELECT 
        e.id as "hostId",
        CONCAT(e.first_name, ' ', e.last_name) as "hostName",
        COUNT(v.id)::int as "totalVisits",
        COALESCE(AVG(EXTRACT(EPOCH FROM (v.check_in_time - v.scheduled_start))/60), 0)::int as "averageWaitTime",
        COALESCE(AVG(EXTRACT(EPOCH FROM (v.check_out_time - v.check_in_time))/60), 0)::int as "averageDuration"
      FROM "Employee" e
      LEFT JOIN "Visit" v ON v.host_id = e.id
      WHERE e.org_id = ${filters.orgId} AND e.is_host = true
        ${filters.hostIds?.length ? `AND e.id = ANY(${filters.hostIds})` : ''}
        ${filters.fromDate ? `AND v.scheduled_start >= ${filters.fromDate}` : ''}
        ${filters.toDate ? `AND v.scheduled_start <= ${filters.toDate}` : ''}
      GROUP BY e.id, e.first_name, e.last_name
      HAVING COUNT(v.id) > 0
      ORDER BY "totalVisits" DESC
    `;

    return hostData as HostMetrics[];
  }

  async getPurposeMetrics(filters: AnalyticsFilters): Promise<PurposeMetrics[]> {
    const whereClause = this.buildWhereClause(filters);

    const purposeData = await this.prisma.$queryRaw`
      SELECT 
        v.purpose,
        COUNT(v.id)::int as "totalVisits",
        ROUND((COUNT(v.id) * 100.0 / SUM(COUNT(v.id)) OVER()), 2)::float as percentage,
        COALESCE(AVG(EXTRACT(EPOCH FROM (v.check_out_time - v.check_in_time))/60), 0)::int as "averageDuration"
      FROM "Visit" v
      WHERE v.org_id = ${filters.orgId}
        ${filters.locationIds?.length ? `AND v.location_id = ANY(${filters.locationIds})` : ''}
        ${filters.hostIds?.length ? `AND v.host_id = ANY(${filters.hostIds})` : ''}
        ${filters.purposes?.length ? `AND v.purpose = ANY(${filters.purposes})` : ''}
        ${filters.fromDate ? `AND v.scheduled_start >= ${filters.fromDate}` : ''}
        ${filters.toDate ? `AND v.scheduled_start <= ${filters.toDate}` : ''}
      GROUP BY v.purpose
      ORDER BY "totalVisits" DESC
    `;

    return purposeData as PurposeMetrics[];
  }

  async getHeatmapData(filters: AnalyticsFilters): Promise<HeatmapData[]> {
    const whereClause = this.buildWhereClause(filters);

    const heatmapData = await this.prisma.$queryRaw`
      SELECT 
        EXTRACT(HOUR FROM v.check_in_time)::int as hour,
        TO_CHAR(v.check_in_time, 'Day') as day,
        COUNT(v.id)::int as visits
      FROM "Visit" v
      WHERE v.org_id = ${filters.orgId}
        AND v.check_in_time IS NOT NULL
        ${filters.locationIds?.length ? `AND v.location_id = ANY(${filters.locationIds})` : ''}
        ${filters.hostIds?.length ? `AND v.host_id = ANY(${filters.hostIds})` : ''}
        ${filters.purposes?.length ? `AND v.purpose = ANY(${filters.purposes})` : ''}
        ${filters.fromDate ? `AND v.check_in_time >= ${filters.fromDate}` : ''}
        ${filters.toDate ? `AND v.check_in_time <= ${filters.toDate}` : ''}
      GROUP BY EXTRACT(HOUR FROM v.check_in_time), TO_CHAR(v.check_in_time, 'Day')
      ORDER BY hour, day
    `;

    return heatmapData as HeatmapData[];
  }

  async getVisitorRetentionData(filters: AnalyticsFilters): Promise<VisitorRetentionData[]> {
    const retentionData = await this.prisma.$queryRaw`
      WITH visitor_first_visit AS (
        SELECT 
          visitor_id,
          MIN(scheduled_start) as first_visit_date
        FROM "Visit"
        WHERE org_id = ${filters.orgId}
        GROUP BY visitor_id
      ),
      period_visits AS (
        SELECT 
          DATE_TRUNC('week', v.scheduled_start) as period,
          v.visitor_id,
          vfv.first_visit_date,
          CASE 
            WHEN DATE_TRUNC('week', v.scheduled_start) = DATE_TRUNC('week', vfv.first_visit_date) 
            THEN 'new' 
            ELSE 'returning' 
          END as visitor_type
        FROM "Visit" v
        JOIN visitor_first_visit vfv ON v.visitor_id = vfv.visitor_id
        WHERE v.org_id = ${filters.orgId}
          ${filters.fromDate ? `AND v.scheduled_start >= ${filters.fromDate}` : ''}
          ${filters.toDate ? `AND v.scheduled_start <= ${filters.toDate}` : ''}
        GROUP BY DATE_TRUNC('week', v.scheduled_start), v.visitor_id, vfv.first_visit_date
      )
      SELECT 
        TO_CHAR(period, 'YYYY-MM-DD') as period,
        COUNT(CASE WHEN visitor_type = 'new' THEN 1 END)::int as "newVisitors",
        COUNT(CASE WHEN visitor_type = 'returning' THEN 1 END)::int as "returningVisitors",
        COUNT(DISTINCT visitor_id)::int as "totalVisitors",
        ROUND(
          COUNT(CASE WHEN visitor_type = 'returning' THEN 1 END) * 100.0 / 
          NULLIF(COUNT(DISTINCT visitor_id), 0), 2
        )::float as "retentionRate"
      FROM period_visits
      GROUP BY period
      ORDER BY period
    `;

    return retentionData as VisitorRetentionData[];
  }

  async getDailyVisitCounts(filters: AnalyticsFilters): Promise<{ date: string; visits: number }[]> {
    const whereClause = this.buildWhereClause(filters);

    const dailyData = await this.prisma.$queryRaw`
      SELECT 
        DATE(scheduled_start) as date,
        COUNT(*)::int as visits
      FROM "Visit"
      WHERE org_id = ${filters.orgId}
        ${filters.locationIds?.length ? `AND location_id = ANY(${filters.locationIds})` : ''}
        ${filters.hostIds?.length ? `AND host_id = ANY(${filters.hostIds})` : ''}
        ${filters.purposes?.length ? `AND purpose = ANY(${filters.purposes})` : ''}
        ${filters.fromDate ? `AND scheduled_start >= ${filters.fromDate}` : ''}
        ${filters.toDate ? `AND scheduled_start <= ${filters.toDate}` : ''}
      GROUP BY DATE(scheduled_start)
      ORDER BY date
    `;

    return dailyData as { date: string; visits: number }[];
  }

  async getWeeklyVisitCounts(filters: AnalyticsFilters): Promise<{ week: string; visits: number }[]> {
    const whereClause = this.buildWhereClause(filters);

    const weeklyData = await this.prisma.$queryRaw`
      SELECT 
        TO_CHAR(DATE_TRUNC('week', scheduled_start), 'YYYY-MM-DD') as week,
        COUNT(*)::int as visits
      FROM "Visit"
      WHERE org_id = ${filters.orgId}
        ${filters.locationIds?.length ? `AND location_id = ANY(${filters.locationIds})` : ''}
        ${filters.hostIds?.length ? `AND host_id = ANY(${filters.hostIds})` : ''}
        ${filters.purposes?.length ? `AND purpose = ANY(${filters.purposes})` : ''}
        ${filters.fromDate ? `AND scheduled_start >= ${filters.fromDate}` : ''}
        ${filters.toDate ? `AND scheduled_start <= ${filters.toDate}` : ''}
      GROUP BY DATE_TRUNC('week', scheduled_start)
      ORDER BY week
    `;

    return weeklyData as { week: string; visits: number }[];
  }

  async getMonthlyVisitCounts(filters: AnalyticsFilters): Promise<{ month: string; visits: number }[]> {
    const whereClause = this.buildWhereClause(filters);

    const monthlyData = await this.prisma.$queryRaw`
      SELECT 
        TO_CHAR(DATE_TRUNC('month', scheduled_start), 'YYYY-MM') as month,
        COUNT(*)::int as visits
      FROM "Visit"
      WHERE org_id = ${filters.orgId}
        ${filters.locationIds?.length ? `AND location_id = ANY(${filters.locationIds})` : ''}
        ${filters.hostIds?.length ? `AND host_id = ANY(${filters.hostIds})` : ''}
        ${filters.purposes?.length ? `AND purpose = ANY(${filters.purposes})` : ''}
        ${filters.fromDate ? `AND scheduled_start >= ${filters.fromDate}` : ''}
        ${filters.toDate ? `AND scheduled_start <= ${filters.toDate}` : ''}
      GROUP BY DATE_TRUNC('month', scheduled_start)
      ORDER BY month
    `;

    return monthlyData as { month: string; visits: number }[];
  }

  // Precomputed rollups - run via cron jobs
  @Cron(CronExpression.EVERY_HOUR)
  async computeHourlyRollups() {
    console.log('Computing hourly analytics rollups...');
    
    const organizations = await this.prisma.organization.findMany({
      select: { id: true },
    });

    for (const org of organizations) {
      await this.computeOrganizationRollups(org.id);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async computeDailyRollups() {
    console.log('Computing daily analytics rollups...');
    
    const organizations = await this.prisma.organization.findMany({
      select: { id: true },
    });

    for (const org of organizations) {
      await this.computeOrganizationDailyRollups(org.id);
    }
  }

  private async computeOrganizationRollups(orgId: string) {
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Upsert hourly rollup
    await this.prisma.$executeRaw`
      INSERT INTO "AnalyticsRollup" (
        org_id, period_type, period_start, period_end, 
        total_visits, checked_in_visits, checked_out_visits, no_show_visits,
        average_wait_time, average_visit_duration, created_at, updated_at
      )
      SELECT 
        ${orgId},
        'HOURLY',
        DATE_TRUNC('hour', ${hourAgo}),
        DATE_TRUNC('hour', ${now}),
        COUNT(*),
        COUNT(CASE WHEN status = 'CHECKED_IN' THEN 1 END),
        COUNT(CASE WHEN status = 'CHECKED_OUT' THEN 1 END),
        COUNT(CASE WHEN status = 'NO_SHOW' THEN 1 END),
        COALESCE(AVG(EXTRACT(EPOCH FROM (check_in_time - scheduled_start))/60), 0),
        COALESCE(AVG(EXTRACT(EPOCH FROM (check_out_time - check_in_time))/60), 0),
        NOW(),
        NOW()
      FROM "Visit"
      WHERE org_id = ${orgId}
        AND scheduled_start >= DATE_TRUNC('hour', ${hourAgo})
        AND scheduled_start < DATE_TRUNC('hour', ${now})
      ON CONFLICT (org_id, period_type, period_start) 
      DO UPDATE SET
        total_visits = EXCLUDED.total_visits,
        checked_in_visits = EXCLUDED.checked_in_visits,
        checked_out_visits = EXCLUDED.checked_out_visits,
        no_show_visits = EXCLUDED.no_show_visits,
        average_wait_time = EXCLUDED.average_wait_time,
        average_visit_duration = EXCLUDED.average_visit_duration,
        updated_at = NOW()
    `;
  }

  private async computeOrganizationDailyRollups(orgId: string) {
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    // Upsert daily rollup
    await this.prisma.$executeRaw`
      INSERT INTO "AnalyticsRollup" (
        org_id, period_type, period_start, period_end,
        total_visits, checked_in_visits, checked_out_visits, no_show_visits,
        average_wait_time, average_visit_duration, created_at, updated_at
      )
      SELECT 
        ${orgId},
        'DAILY',
        DATE_TRUNC('day', ${yesterday}),
        DATE_TRUNC('day', ${today}),
        COUNT(*),
        COUNT(CASE WHEN status = 'CHECKED_IN' THEN 1 END),
        COUNT(CASE WHEN status = 'CHECKED_OUT' THEN 1 END),
        COUNT(CASE WHEN status = 'NO_SHOW' THEN 1 END),
        COALESCE(AVG(EXTRACT(EPOCH FROM (check_in_time - scheduled_start))/60), 0),
        COALESCE(AVG(EXTRACT(EPOCH FROM (check_out_time - check_in_time))/60), 0),
        NOW(),
        NOW()
      FROM "Visit"
      WHERE org_id = ${orgId}
        AND scheduled_start >= DATE_TRUNC('day', ${yesterday})
        AND scheduled_start < DATE_TRUNC('day', ${today})
      ON CONFLICT (org_id, period_type, period_start)
      DO UPDATE SET
        total_visits = EXCLUDED.total_visits,
        checked_in_visits = EXCLUDED.checked_in_visits,
        checked_out_visits = EXCLUDED.checked_out_visits,
        no_show_visits = EXCLUDED.no_show_visits,
        average_wait_time = EXCLUDED.average_wait_time,
        average_visit_duration = EXCLUDED.average_visit_duration,
        updated_at = NOW()
    `;
  }

  private buildWhereClause(filters: AnalyticsFilters) {
    const where: any = {
      org_id: filters.orgId,
    };

    if (filters.locationIds?.length) {
      where.location_id = { in: filters.locationIds };
    }

    if (filters.hostIds?.length) {
      where.host_id = { in: filters.hostIds };
    }

    if (filters.purposes?.length) {
      where.purpose = { in: filters.purposes };
    }

    if (filters.fromDate || filters.toDate) {
      where.scheduled_start = {};
      if (filters.fromDate) {
        where.scheduled_start.gte = filters.fromDate;
      }
      if (filters.toDate) {
        where.scheduled_start.lte = filters.toDate;
      }
    }

    return where;
  }

  private async getVisitStatusCounts(whereClause: any) {
    const statusCounts = await this.prisma.visit.groupBy({
      by: ['status'],
      where: whereClause,
      _count: { status: true },
    });

    return statusCounts.reduce((acc, item) => {
      acc[item.status] = item._count.status;
      return acc;
    }, {} as Record<string, number>);
  }

  private async getAverageWaitTime(whereClause: any): Promise<number> {
    const result = await this.prisma.$queryRaw`
      SELECT AVG(EXTRACT(EPOCH FROM (check_in_time - scheduled_start))/60)::float as avg_wait_time
      FROM "Visit"
      WHERE ${Object.entries(whereClause).map(([key, value]) => `${key} = ${value}`).join(' AND ')}
        AND check_in_time IS NOT NULL
        AND scheduled_start IS NOT NULL
    `;

    return result[0]?.avg_wait_time || 0;
  }

  private async getAverageVisitDuration(whereClause: any): Promise<number> {
    const result = await this.prisma.$queryRaw`
      SELECT AVG(EXTRACT(EPOCH FROM (check_out_time - check_in_time))/60)::float as avg_duration
      FROM "Visit"
      WHERE ${Object.entries(whereClause).map(([key, value]) => `${key} = ${value}`).join(' AND ')}
        AND check_in_time IS NOT NULL
        AND check_out_time IS NOT NULL
    `;

    return result[0]?.avg_duration || 0;
  }

  private async getPeakHour(whereClause: any): Promise<{ hour: number }> {
    const result = await this.prisma.$queryRaw`
      SELECT EXTRACT(HOUR FROM check_in_time)::int as hour, COUNT(*) as count
      FROM "Visit"
      WHERE ${Object.entries(whereClause).map(([key, value]) => `${key} = ${value}`).join(' AND ')}
        AND check_in_time IS NOT NULL
      GROUP BY EXTRACT(HOUR FROM check_in_time)
      ORDER BY count DESC
      LIMIT 1
    `;

    return result[0] || { hour: 9 };
  }

  private async getPeakDay(whereClause: any): Promise<{ day: string }> {
    const result = await this.prisma.$queryRaw`
      SELECT TO_CHAR(check_in_time, 'Day') as day, COUNT(*) as count
      FROM "Visit"
      WHERE ${Object.entries(whereClause).map(([key, value]) => `${key} = ${value}`).join(' AND ')}
        AND check_in_time IS NOT NULL
      GROUP BY TO_CHAR(check_in_time, 'Day')
      ORDER BY count DESC
      LIMIT 1
    `;

    return result[0] || { day: 'Monday' };
  }
}