import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { AnalyticsQuerySchema, VisitAnalyticsSchema } from '@vms/contracts'

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getVisitAnalytics(orgId: string, query: any) {
    const { period, from_date, to_date, location_id } = AnalyticsQuerySchema.parse(query)
    
    const fromDate = from_date ? new Date(from_date) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const toDate = to_date ? new Date(to_date) : new Date()

    // Base where clause
    const whereClause: any = {
      org_id: orgId,
      created_at: {
        gte: fromDate,
        lte: toDate,
      },
      deleted_at: null,
    }

    if (location_id) {
      whereClause.location_id = location_id
    }

    // Total visits
    const totalVisits = await this.prisma.visit.count({
      where: whereClause,
    })

    // Unique visitors
    const uniqueVisitors = await this.prisma.visit.groupBy({
      by: ['visitor_id'],
      where: whereClause,
      _count: true,
    })

    // Average duration (for checked out visits)
    const completedVisits = await this.prisma.visit.findMany({
      where: {
        ...whereClause,
        status: 'CHECKED_OUT',
        check_in_time: { not: null },
        check_out_time: { not: null },
      },
      select: {
        check_in_time: true,
        check_out_time: true,
      },
    })

    const averageDuration = completedVisits.length > 0 
      ? completedVisits.reduce((sum, visit) => {
          const duration = new Date(visit.check_out_time!).getTime() - new Date(visit.check_in_time!).getTime()
          return sum + (duration / (1000 * 60)) // Convert to minutes
        }, 0) / completedVisits.length
      : 0

    // Peak hours
    const peakHoursData = await this.prisma.visit.findMany({
      where: {
        ...whereClause,
        check_in_time: { not: null },
      },
      select: {
        check_in_time: true,
      },
    })

    const hourCounts = peakHoursData.reduce((acc, visit) => {
      const hour = new Date(visit.check_in_time!).getHours()
      acc[hour] = (acc[hour] || 0) + 1
      return acc
    }, {} as Record<number, number>)

    const peakHours = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: hourCounts[hour] || 0,
    }))

    // Visits by purpose
    const visitsByPurpose = await this.prisma.visit.groupBy({
      by: ['purpose'],
      where: whereClause,
      _count: true,
    })

    // Visits by location
    const visitsByLocation = await this.prisma.visit.groupBy({
      by: ['location_id'],
      where: whereClause,
      _count: true,
      _max: {
        location: {
          select: {
            name: true,
          },
        },
      },
    })

    // Daily counts
    const dailyCounts = await this.getDailyCounts(orgId, fromDate, toDate, location_id)

    const analytics = {
      total_visits: totalVisits,
      unique_visitors: uniqueVisitors.length,
      average_duration: Math.round(averageDuration),
      peak_hours: peakHours,
      visits_by_purpose: visitsByPurpose.map(item => ({
        purpose: item.purpose,
        count: item._count,
      })),
      visits_by_location: await Promise.all(
        visitsByLocation.map(async item => {
          const location = await this.prisma.location.findUnique({
            where: { id: item.location_id },
            select: { name: true },
          })
          return {
            location_id: item.location_id,
            location_name: location?.name || 'Unknown',
            count: item._count,
          }
        })
      ),
      daily_counts: dailyCounts,
    }

    return VisitAnalyticsSchema.parse(analytics)
  }

  private async getDailyCounts(orgId: string, fromDate: Date, toDate: Date, locationId?: string) {
    const visits = await this.prisma.visit.findMany({
      where: {
        org_id: orgId,
        created_at: {
          gte: fromDate,
          lte: toDate,
        },
        ...(locationId && { location_id: locationId }),
        deleted_at: null,
      },
      select: {
        created_at: true,
      },
    })

    // Group by date
    const dateCounts = visits.reduce((acc, visit) => {
      const date = visit.created_at.toISOString().split('T')[0]
      acc[date] = (acc[date] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Fill in missing dates with 0 counts
    const result = []
    const currentDate = new Date(fromDate)
    
    while (currentDate <= toDate) {
      const dateStr = currentDate.toISOString().split('T')[0]
      result.push({
        date: dateStr,
        count: dateCounts[dateStr] || 0,
      })
      currentDate.setDate(currentDate.getDate() + 1)
    }

    return result
  }

  async exportAnalytics(orgId: string, exportParams: any) {
    // Implementation for exporting analytics data
    // This would generate CSV, PDF, or JSON based on the format requested
    const analytics = await this.getVisitAnalytics(orgId, {
      from_date: exportParams.from_date,
      to_date: exportParams.to_date,
      location_id: exportParams.filters?.location_id,
    })

    return analytics
  }
}