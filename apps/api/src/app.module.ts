import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ThrottlerModule } from '@nestjs/throttler'
import { ScheduleModule } from '@nestjs/schedule'
import { BullModule } from '@nestjs/bull'

import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './auth/auth.module'
import { OrganizationsModule } from './organizations/organizations.module'
import { LocationsModule } from './locations/locations.module'
import { EmployeesModule } from './employees/employees.module'
import { VisitorsModule } from './visitors/visitors.module'
import { VisitsModule } from './visits/visits.module'
import { AgreementsModule } from './agreements/agreements.module'
import { KiosksModule } from './kiosks/kiosks.module'
import { WebhooksModule } from './webhooks/webhooks.module'
import { NotificationsModule } from './notifications/notifications.module'
import { AnalyticsModule } from './analytics/analytics.module'
import { ExportsModule } from './exports/exports.module'
import { PrivacyModule } from './privacy/privacy.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),
    ScheduleModule.forRoot(),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      },
    }),
    PrismaModule,
    AuthModule,
    OrganizationsModule,
    LocationsModule,
    EmployeesModule,
    VisitorsModule,
    VisitsModule,
    AgreementsModule,
    KiosksModule,
    WebhooksModule,
    NotificationsModule,
    AnalyticsModule,
    ExportsModule,
    PrivacyModule,
  ],
})
export class AppModule {}