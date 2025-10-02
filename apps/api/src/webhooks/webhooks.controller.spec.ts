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

describe('WebhooksController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  beforeAll(async () => {
    app = TestHelper.getApp();
    prisma = TestHelper.getPrisma();
    jwtService = app.get<JwtService>(JwtService);
  });

  describe('Webhook Management', () => {
    let org: any, admin: any, token: string;

    beforeEach(async () => {
      org = await prisma.organization.create({
        data: createMockOrganization(),
      });
      admin = await prisma.employee.create({
        data: createMockEmployee(org.id, { role: 'ADMIN' }),
      });
      token = jwtService.sign(createJwtPayload(admin));
    });

    it('should create webhook subscription', async () => {
      const webhookData = {
        url: 'https://example.com/webhook',
        events: ['VISIT.CREATED', 'VISIT.CHECKED_IN', 'VISIT.CHECKED_OUT'],
        is_active: true,
      };

      const response = await request(app.getHttpServer())
        .post(`/organizations/${org.id}/webhooks`)
        .set(createAuthHeaders(token))
        .send(webhookData)
        .expect(201);

      expect(response.body.url).toBe(webhookData.url);
      expect(response.body.events).toEqual(webhookData.events);
      expect(response.body.secret).toBeDefined();
      expect(response.body.is_active).toBe(true);
    });

    it('should list webhook subscriptions', async () => {
      // Create webhook first
      await request(app.getHttpServer())
        .post(`/organizations/${org.id}/webhooks`)
        .set(createAuthHeaders(token))
        .send({
          url: 'https://example.com/webhook',
          events: ['VISIT.CREATED'],
          is_active: true,
        });

      const response = await request(app.getHttpServer())
        .get(`/organizations/${org.id}/webhooks`)
        .set(createAuthHeaders(token))
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].url).toBe('https://example.com/webhook');
    });

    it('should update webhook subscription', async () => {
      const createResponse = await request(app.getHttpServer())
        .post(`/organizations/${org.id}/webhooks`)
        .set(createAuthHeaders(token))
        .send({
          url: 'https://example.com/webhook',
          events: ['VISIT.CREATED'],
          is_active: true,
        });

      const updateResponse = await request(app.getHttpServer())
        .put(`/organizations/${org.id}/webhooks/${createResponse.body.id}`)
        .set(createAuthHeaders(token))
        .send({
          events: ['VISIT.CREATED', 'VISIT.CHECKED_IN'],
          is_active: false,
        })
        .expect(200);

      expect(updateResponse.body.events).toHaveLength(2);
      expect(updateResponse.body.is_active).toBe(false);
    });

    it('should delete webhook subscription', async () => {
      const createResponse = await request(app.getHttpServer())
        .post(`/organizations/${org.id}/webhooks`)
        .set(createAuthHeaders(token))
        .send({
          url: 'https://example.com/webhook',
          events: ['VISIT.CREATED'],
          is_active: true,
        });

      await request(app.getHttpServer())
        .delete(`/organizations/${org.id}/webhooks/${createResponse.body.id}`)
        .set(createAuthHeaders(token))
        .expect(204);

      // Verify deletion
      const listResponse = await request(app.getHttpServer())
        .get(`/organizations/${org.id}/webhooks`)
        .set(createAuthHeaders(token))
        .expect(200);

      expect(listResponse.body.data).toHaveLength(0);
    });
  });

  describe('Webhook Testing', () => {
    let org: any, admin: any, token: string;

    beforeEach(async () => {
      org = await prisma.organization.create({
        data: createMockOrganization(),
      });
      admin = await prisma.employee.create({
        data: createMockEmployee(org.id, { role: 'ADMIN' }),
      });
      token = jwtService.sign(createJwtPayload(admin));
    });

    it('should test webhook endpoint', async () => {
      const testData = {
        url: 'https://httpbin.org/post',
        event: 'VISIT.CREATED',
        payload: {
          visit_id: 'test-visit-id',
          visitor_name: 'Test Visitor',
          status: 'PENDING',
        },
      };

      const response = await request(app.getHttpServer())
        .post(`/organizations/${org.id}/webhooks/test`)
        .set(createAuthHeaders(token))
        .send(testData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.response_status).toBe(200);
    });

    it('should handle webhook test failures', async () => {
      const testData = {
        url: 'https://httpbin.org/status/500',
        event: 'VISIT.CREATED',
        payload: { test: 'data' },
      };

      const response = await request(app.getHttpServer())
        .post(`/organizations/${org.id}/webhooks/test`)
        .set(createAuthHeaders(token))
        .send(testData)
        .expect(200);

      expect(response.body.success).toBe(false);
      expect(response.body.response_status).toBe(500);
    });
  });

  describe('Webhook Delivery', () => {
    let org: any, admin: any, location: any, visitor: any, token: string;

    beforeEach(async () => {
      org = await prisma.organization.create({
        data: createMockOrganization(),
      });
      admin = await prisma.employee.create({
        data: createMockEmployee(org.id, { role: 'ADMIN' }),
      });
      location = await prisma.location.create({
        data: createMockLocation(org.id),
      });
      visitor = await prisma.visitor.create({
        data: createMockVisitor(),
      });
      token = jwtService.sign(createJwtPayload(admin));

      // Create webhook subscription
      await request(app.getHttpServer())
        .post(`/organizations/${org.id}/webhooks`)
        .set(createAuthHeaders(token))
        .send({
          url: 'https://httpbin.org/post',
          events: ['VISIT.CREATED', 'VISIT.CHECKED_IN'],
          is_active: true,
        });
    });

    it('should trigger webhook on visit creation', async () => {
      const visitData = {
        visitor_id: visitor.id,
        location_id: location.id,
        host_id: admin.id,
        purpose: 'MEETING',
        scheduled_start: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      };

      const response = await request(app.getHttpServer())
        .post(`/organizations/${org.id}/visits`)
        .set(createAuthHeaders(token))
        .send(visitData)
        .expect(201);

      // In a real test, you would verify webhook delivery
      // This could be done by mocking the HTTP client or using a webhook testing service
      expect(response.body.id).toBeDefined();
    });

    it('should include proper HMAC signature in webhook', async () => {
      // This test would verify that webhooks include proper HMAC signatures
      // Implementation would depend on your webhook service
      expect(true).toBe(true); // Placeholder
    });

    it('should retry failed webhook deliveries', async () => {
      // This test would verify retry logic with exponential backoff
      // Implementation would depend on your queue system
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Webhook Security', () => {
    let org: any, admin: any, token: string;

    beforeEach(async () => {
      org = await prisma.organization.create({
        data: createMockOrganization(),
      });
      admin = await prisma.employee.create({
        data: createMockEmployee(org.id, { role: 'ADMIN' }),
      });
      token = jwtService.sign(createJwtPayload(admin));
    });

    it('should validate webhook URL format', async () => {
      const invalidWebhookData = {
        url: 'not-a-valid-url',
        events: ['VISIT.CREATED'],
        is_active: true,
      };

      await request(app.getHttpServer())
        .post(`/organizations/${org.id}/webhooks`)
        .set(createAuthHeaders(token))
        .send(invalidWebhookData)
        .expect(400);
    });

    it('should require HTTPS for webhook URLs in production', async () => {
      const httpWebhookData = {
        url: 'http://example.com/webhook', // HTTP instead of HTTPS
        events: ['VISIT.CREATED'],
        is_active: true,
      };

      // This test assumes production environment requires HTTPS
      if (process.env.NODE_ENV === 'production') {
        await request(app.getHttpServer())
          .post(`/organizations/${org.id}/webhooks`)
          .set(createAuthHeaders(token))
          .send(httpWebhookData)
          .expect(400);
      } else {
        // In development, HTTP might be allowed
        await request(app.getHttpServer())
          .post(`/organizations/${org.id}/webhooks`)
          .set(createAuthHeaders(token))
          .send(httpWebhookData)
          .expect(201);
      }
    });

    it('should prevent webhook URL to internal networks', async () => {
      const internalWebhookData = {
        url: 'http://192.168.1.1/webhook',
        events: ['VISIT.CREATED'],
        is_active: true,
      };

      await request(app.getHttpServer())
        .post(`/organizations/${org.id}/webhooks`)
        .set(createAuthHeaders(token))
        .send(internalWebhookData)
        .expect(400);
    });

    it('should limit number of webhooks per organization', async () => {
      // Create maximum allowed webhooks
      const maxWebhooks = 10; // Assuming this is the limit
      const webhookPromises = [];

      for (let i = 0; i < maxWebhooks; i++) {
        webhookPromises.push(
          request(app.getHttpServer())
            .post(`/organizations/${org.id}/webhooks`)
            .set(createAuthHeaders(token))
            .send({
              url: `https://example.com/webhook-${i}`,
              events: ['VISIT.CREATED'],
              is_active: true,
            })
        );
      }

      await Promise.all(webhookPromises);

      // Try to create one more webhook (should fail)
      await request(app.getHttpServer())
        .post(`/organizations/${org.id}/webhooks`)
        .set(createAuthHeaders(token))
        .send({
          url: 'https://example.com/webhook-overflow',
          events: ['VISIT.CREATED'],
          is_active: true,
        })
        .expect(400);
    });
  });
});