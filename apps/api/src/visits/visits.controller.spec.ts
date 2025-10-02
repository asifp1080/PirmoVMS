import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { TestHelper } from '../../test/setup';
import { 
  createMockOrganization, 
  createMockEmployee, 
  createMockLocation,
  createMockVisitor,
  createMockVisit,
  createAuthHeaders,
  createJwtPayload 
} from '../../test/fixtures';

describe('VisitsController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  beforeAll(async () => {
    app = TestHelper.getApp();
    prisma = TestHelper.getPrisma();
    jwtService = app.get<JwtService>(JwtService);
  });

  describe('RBAC and Tenancy Tests', () => {
    let org1: any, org2: any;
    let admin1: any, receptionist1: any, admin2: any;
    let location1: any, location2: any;
    let visitor1: any, visitor2: any;
    let adminToken: string, receptionistToken: string, admin2Token: string;

    beforeEach(async () => {
      // Create two organizations
      org1 = await prisma.organization.create({
        data: createMockOrganization({ slug: 'org1' }),
      });
      org2 = await prisma.organization.create({
        data: createMockOrganization({ slug: 'org2', name: 'Org 2' }),
      });

      // Create employees
      admin1 = await prisma.employee.create({
        data: createMockEmployee(org1.id, { role: 'ADMIN', email: 'admin1@org1.com' }),
      });
      receptionist1 = await prisma.employee.create({
        data: createMockEmployee(org1.id, { role: 'RECEPTIONIST', email: 'receptionist1@org1.com' }),
      });
      admin2 = await prisma.employee.create({
        data: createMockEmployee(org2.id, { role: 'ADMIN', email: 'admin2@org2.com' }),
      });

      // Create locations
      location1 = await prisma.location.create({
        data: createMockLocation(org1.id),
      });
      location2 = await prisma.location.create({
        data: createMockLocation(org2.id),
      });

      // Create visitors
      visitor1 = await prisma.visitor.create({
        data: createMockVisitor({ email: 'visitor1@example.com' }),
      });
      visitor2 = await prisma.visitor.create({
        data: createMockVisitor({ email: 'visitor2@example.com' }),
      });

      // Generate tokens
      adminToken = jwtService.sign(createJwtPayload(admin1));
      receptionistToken = jwtService.sign(createJwtPayload(receptionist1));
      admin2Token = jwtService.sign(createJwtPayload(admin2));
    });

    it('should enforce organization scoping', async () => {
      // Create visit in org1
      const visit = await prisma.visit.create({
        data: createMockVisit(org1.id, location1.id, visitor1.id, admin1.id),
      });

      // Admin from org2 should not see org1's visits
      const response = await request(app.getHttpServer())
        .get(`/organizations/${org1.id}/visits`)
        .set(createAuthHeaders(admin2Token))
        .expect(403);
    });

    it('should allow admin to access all visits in their org', async () => {
      const visit = await prisma.visit.create({
        data: createMockVisit(org1.id, location1.id, visitor1.id, admin1.id),
      });

      const response = await request(app.getHttpServer())
        .get(`/organizations/${org1.id}/visits`)
        .set(createAuthHeaders(adminToken))
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe(visit.id);
    });

    it('should restrict receptionist access based on role', async () => {
      // Receptionist should be able to create visits
      const createResponse = await request(app.getHttpServer())
        .post(`/organizations/${org1.id}/visits`)
        .set(createAuthHeaders(receptionistToken))
        .send({
          visitor_id: visitor1.id,
          location_id: location1.id,
          host_id: admin1.id,
          purpose: 'MEETING',
          scheduled_start: new Date().toISOString(),
        })
        .expect(201);

      // But should not be able to delete visits (admin only)
      await request(app.getHttpServer())
        .delete(`/organizations/${org1.id}/visits/${createResponse.body.id}`)
        .set(createAuthHeaders(receptionistToken))
        .expect(403);
    });
  });

  describe('Visit Lifecycle Tests', () => {
    let org: any, employee: any, location: any, visitor: any, token: string;

    beforeEach(async () => {
      org = await prisma.organization.create({
        data: createMockOrganization(),
      });
      employee = await prisma.employee.create({
        data: createMockEmployee(org.id, { role: 'ADMIN' }),
      });
      location = await prisma.location.create({
        data: createMockLocation(org.id),
      });
      visitor = await prisma.visitor.create({
        data: createMockVisitor(),
      });
      token = jwtService.sign(createJwtPayload(employee));
    });

    it('should create visit with pre-registration', async () => {
      const visitData = {
        visitor_id: visitor.id,
        location_id: location.id,
        host_id: employee.id,
        purpose: 'MEETING',
        scheduled_start: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
        scheduled_end: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
      };

      const response = await request(app.getHttpServer())
        .post(`/organizations/${org.id}/visits`)
        .set(createAuthHeaders(token))
        .send(visitData)
        .expect(201);

      expect(response.body.status).toBe('PENDING');
      expect(response.body.qr_code).toBeDefined();
      expect(response.body.visitor_id).toBe(visitor.id);

      // Verify audit log was created
      const auditLogs = await prisma.auditLog.findMany({
        where: { resource_type: 'VISIT', action: 'CREATE' },
      });
      expect(auditLogs).toHaveLength(1);
    });

    it('should handle check-in process', async () => {
      const visit = await prisma.visit.create({
        data: createMockVisit(org.id, location.id, visitor.id, employee.id),
      });

      const checkInData = {
        photo_url: 'https://example.com/photo.jpg',
        signature_url: 'https://example.com/signature.jpg',
        agreements_signed: ['nda-v1', 'safety-v1'],
      };

      const response = await request(app.getHttpServer())
        .post(`/organizations/${org.id}/visits/${visit.id}/check-in`)
        .set(createAuthHeaders(token))
        .send(checkInData)
        .expect(200);

      expect(response.body.status).toBe('CHECKED_IN');
      expect(response.body.check_in_time).toBeDefined();
      expect(response.body.badge_number).toBeDefined();
      expect(response.body.photo_url).toBe(checkInData.photo_url);
    });

    it('should handle check-out process', async () => {
      const visit = await prisma.visit.create({
        data: createMockVisit(org.id, location.id, visitor.id, employee.id, {
          status: 'CHECKED_IN',
          check_in_time: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
          badge_number: 'BADGE-001',
        }),
      });

      const response = await request(app.getHttpServer())
        .post(`/organizations/${org.id}/visits/${visit.id}/check-out`)
        .set(createAuthHeaders(token))
        .expect(200);

      expect(response.body.status).toBe('CHECKED_OUT');
      expect(response.body.check_out_time).toBeDefined();

      // Verify duration calculation
      const checkInTime = new Date(response.body.check_in_time);
      const checkOutTime = new Date(response.body.check_out_time);
      const durationMinutes = Math.floor((checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60));
      expect(durationMinutes).toBeGreaterThan(50); // Should be around 60 minutes
    });
  });

  describe('Filtering and Pagination Tests', () => {
    let org: any, employee: any, location: any, visitors: any[], token: string;

    beforeEach(async () => {
      org = await prisma.organization.create({
        data: createMockOrganization(),
      });
      employee = await prisma.employee.create({
        data: createMockEmployee(org.id, { role: 'ADMIN' }),
      });
      location = await prisma.location.create({
        data: createMockLocation(org.id),
      });

      // Create multiple visitors
      visitors = await Promise.all([
        prisma.visitor.create({ data: createMockVisitor({ first_name: 'Alice', company: 'Alpha Corp' }) }),
        prisma.visitor.create({ data: createMockVisitor({ first_name: 'Bob', company: 'Beta Inc' }) }),
        prisma.visitor.create({ data: createMockVisitor({ first_name: 'Charlie', company: 'Gamma LLC' }) }),
      ]);

      token = jwtService.sign(createJwtPayload(employee));

      // Create visits with different statuses and dates
      const visitPromises = visitors.map((visitor, index) => {
        const hoursAgo = (index + 1) * 2;
        return prisma.visit.create({
          data: createMockVisit(org.id, location.id, visitor.id, employee.id, {
            purpose: index === 0 ? 'MEETING' : index === 1 ? 'INTERVIEW' : 'DELIVERY',
            status: index === 0 ? 'CHECKED_IN' : index === 1 ? 'CHECKED_OUT' : 'PENDING',
            scheduled_start: new Date(Date.now() - hoursAgo * 60 * 60 * 1000),
            check_in_time: index < 2 ? new Date(Date.now() - hoursAgo * 60 * 60 * 1000) : null,
            check_out_time: index === 1 ? new Date(Date.now() - (hoursAgo - 1) * 60 * 60 * 1000) : null,
          }),
        });
      });

      await Promise.all(visitPromises);
    });

    it('should filter visits by status', async () => {
      const response = await request(app.getHttpServer())
        .get(`/organizations/${org.id}/visits`)
        .query({ status: 'CHECKED_IN' })
        .set(createAuthHeaders(token))
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].status).toBe('CHECKED_IN');
    });

    it('should filter visits by purpose', async () => {
      const response = await request(app.getHttpServer())
        .get(`/organizations/${org.id}/visits`)
        .query({ purpose: 'MEETING' })
        .set(createAuthHeaders(token))
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].purpose).toBe('MEETING');
    });

    it('should filter visits by date range', async () => {
      const fromDate = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(); // 5 hours ago
      const toDate = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(); // 1 hour ago

      const response = await request(app.getHttpServer())
        .get(`/organizations/${org.id}/visits`)
        .query({ from_date: fromDate, to_date: toDate })
        .set(createAuthHeaders(token))
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      response.body.data.forEach((visit: any) => {
        const visitDate = new Date(visit.scheduled_start);
        expect(visitDate.getTime()).toBeGreaterThanOrEqual(new Date(fromDate).getTime());
        expect(visitDate.getTime()).toBeLessThanOrEqual(new Date(toDate).getTime());
      });
    });

    it('should paginate results correctly', async () => {
      const response = await request(app.getHttpServer())
        .get(`/organizations/${org.id}/visits`)
        .query({ limit: 2 })
        .set(createAuthHeaders(token))
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.meta.has_next).toBe(true);
      expect(response.body.meta.next_cursor).toBeDefined();

      // Test next page
      const nextResponse = await request(app.getHttpServer())
        .get(`/organizations/${org.id}/visits`)
        .query({ limit: 2, cursor: response.body.meta.next_cursor })
        .set(createAuthHeaders(token))
        .expect(200);

      expect(nextResponse.body.data).toHaveLength(1);
      expect(nextResponse.body.meta.has_next).toBe(false);
    });
  });

  describe('Validation Tests', () => {
    let org: any, employee: any, location: any, visitor: any, token: string;

    beforeEach(async () => {
      org = await prisma.organization.create({
        data: createMockOrganization(),
      });
      employee = await prisma.employee.create({
        data: createMockEmployee(org.id, { role: 'ADMIN' }),
      });
      location = await prisma.location.create({
        data: createMockLocation(org.id),
      });
      visitor = await prisma.visitor.create({
        data: createMockVisitor(),
      });
      token = jwtService.sign(createJwtPayload(employee));
    });

    it('should validate required fields', async () => {
      const response = await request(app.getHttpServer())
        .post(`/organizations/${org.id}/visits`)
        .set(createAuthHeaders(token))
        .send({
          // Missing required fields
        })
        .expect(400);

      expect(response.body.message).toContain('validation');
    });

    it('should validate visit scheduling conflicts', async () => {
      // Create first visit
      await prisma.visit.create({
        data: createMockVisit(org.id, location.id, visitor.id, employee.id, {
          scheduled_start: new Date(Date.now() + 60 * 60 * 1000),
          scheduled_end: new Date(Date.now() + 2 * 60 * 60 * 1000),
        }),
      });

      // Try to create overlapping visit
      const response = await request(app.getHttpServer())
        .post(`/organizations/${org.id}/visits`)
        .set(createAuthHeaders(token))
        .send({
          visitor_id: visitor.id,
          location_id: location.id,
          host_id: employee.id,
          purpose: 'MEETING',
          scheduled_start: new Date(Date.now() + 90 * 60 * 1000).toISOString(), // Overlaps with first visit
          scheduled_end: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
        })
        .expect(409); // Conflict

      expect(response.body.message).toContain('conflict');
    });

    it('should validate business hours', async () => {
      // Try to schedule visit outside business hours (e.g., 2 AM)
      const lateNight = new Date();
      lateNight.setHours(2, 0, 0, 0);

      const response = await request(app.getHttpServer())
        .post(`/organizations/${org.id}/visits`)
        .set(createAuthHeaders(token))
        .send({
          visitor_id: visitor.id,
          location_id: location.id,
          host_id: employee.id,
          purpose: 'MEETING',
          scheduled_start: lateNight.toISOString(),
          scheduled_end: new Date(lateNight.getTime() + 60 * 60 * 1000).toISOString(),
        })
        .expect(400);

      expect(response.body.message).toContain('business hours');
    });
  });
});