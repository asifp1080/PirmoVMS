import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as moment from 'moment-timezone';

@Injectable()
export class BadgeService {
  constructor(private prisma: PrismaService) {}

  async generateBadgeNumber(locationId: string): Promise<string> {
    const location = await this.prisma.location.findUnique({
      where: { id: locationId },
      select: { name: true, time_zone: true },
    });

    if (!location) {
      throw new Error('Location not found');
    }

    // Get location prefix (first 2 letters of location name)
    const prefix = location.name.substring(0, 2).toUpperCase();
    
    // Get current date in location timezone
    const today = moment().tz(location.time_zone).format('YYYYMMDD');
    
    // Get today's visit count for this location
    const startOfDay = moment().tz(location.time_zone).startOf('day').utc().toDate();
    const endOfDay = moment().tz(location.time_zone).endOf('day').utc().toDate();
    
    const todayVisitCount = await this.prisma.visit.count({
      where: {
        location_id: locationId,
        check_in_time: {
          gte: startOfDay,
          lte: endOfDay,
        },
        badge_number: {
          not: null,
        },
      },
    });

    // Generate badge number: PREFIX-YYYYMMDD-SEQUENCE
    const sequence = String(todayVisitCount + 1).padStart(3, '0');
    return `${prefix}-${today}-${sequence}`;
  }
}