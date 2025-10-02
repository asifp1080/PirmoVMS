import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AppModule } from '../app.module';

export class TestHelper {
  private static app: INestApplication;
  private static prisma: PrismaService;

  static async setupTestApp(): Promise<INestApplication> {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        AppModule,
      ],
    }).compile();

    this.app = moduleFixture.createNestApplication();
    this.prisma = this.app.get<PrismaService>(PrismaService);

    await this.app.init();
    return this.app;
  }

  static async cleanDatabase(): Promise<void> {
    if (!this.prisma) return;

    // Clean in reverse dependency order
    await this.prisma.auditLog.deleteMany();
    await this.prisma.visit.deleteMany();
    await this.prisma.visitor.deleteMany();
    await this.prisma.employee.deleteMany();
    await this.prisma.location.deleteMany();
    await this.prisma.organization.deleteMany();
  }

  static async closeApp(): Promise<void> {
    if (this.app) {
      await this.app.close();
    }
  }

  static getApp(): INestApplication {
    return this.app;
  }

  static getPrisma(): PrismaService {
    return this.prisma;
  }
}

// Global test setup
beforeAll(async () => {
  await TestHelper.setupTestApp();
});

beforeEach(async () => {
  await TestHelper.cleanDatabase();
});

afterAll(async () => {
  await TestHelper.closeApp();
});