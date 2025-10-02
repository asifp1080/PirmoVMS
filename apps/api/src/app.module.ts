import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';

// Core modules
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { TenancyModule } from './tenancy/tenancy.module';
import { AuditModule } from './audit/audit.module';

// Business modules
import { OrganizationsModule } from './organizations/organizations.module';
import { LocationsModule } from './locations/locations.module';
import { EmployeesModule } from './employees/employees.module';
import { VisitorsModule } from './visitors/visitors.module';
import { VisitsModule } from './visits/visits.module';
import { AgreementsModule } from './agreements/agreements.module';
import { KiosksModule } from './kiosks/kiosks.module';
import { NotificationsModule } from './notifications/notifications.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { ExportsModule } from './exports/exports.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),

    // Bull queues
    BullModule.forRootAsync({
      useFactory: () => ({
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT) || 6379,
          password: process.env.REDIS_PASSWORD,
        },
      }),
    }),

    // Scheduling
    ScheduleModule.forRoot(),

    // Core modules
    PrismaModule,
    AuthModule,
    TenancyModule,
    AuditModule,

    // Business modules
    OrganizationsModule,
    LocationsModule,
    EmployeesModule,
    VisitorsModule,
    VisitsModule,
    AgreementsModule,
    KiosksModule,
    NotificationsModule,
    WebhooksModule,
    ExportsModule,
    HealthModule,
  ],
})
export class AppModule {}