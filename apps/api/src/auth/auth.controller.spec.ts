import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AuthService } from '../auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TestHelper } from '../../test/setup';
import { createMockOrganization, createMockEmployee, createAuthHeaders } from '../../test/fixtures';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authService: AuthService;

  beforeAll(async () => {
    app = TestHelper.getApp();
    prisma = TestHelper.getPrisma();
    authService = app.get<AuthService>(AuthService);
  });

  describe('/auth/login (POST)', () => {
    it('should login with valid credentials', async () => {
      // Setup
      const org = await prisma.organization.create({
        data: createMockOrganization(),
      });

      const employee = await prisma.employee.create({
        data: createMockEmployee(org.id, {
          email: 'test@acme.com',
          role: 'ADMIN',
        }),
      });

      // Test
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@acme.com',
          password: 'password123',
          org_slug: 'acme-corp',
        })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('refresh_token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('test@acme.com');
      expect(response.body.user.role).toBe('ADMIN');
    });

    it('should fail with invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'invalid@example.com',
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('should fail with missing organization', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@nonexistent.com',
          password: 'password123',
          org_slug: 'nonexistent-org',
        })
        .expect(400);
    });

    it('should enforce rate limiting', async () => {
      const requests = Array(6).fill(null).map(() =>
        request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: 'test@example.com',
            password: 'wrongpassword',
          })
      );

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('/auth/register (POST)', () => {
    it('should register new user successfully', async () => {
      const org = await prisma.organization.create({
        data: createMockOrganization(),
      });

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          first_name: 'New',
          last_name: 'User',
          email: 'newuser@acme.com',
          password: 'password123',
          org_slug: 'acme-corp',
        })
        .expect(201);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body.user.email).toBe('newuser@acme.com');
      expect(response.body.user.role).toBe('RECEPTIONIST');
    });

    it('should fail with duplicate email', async () => {
      const org = await prisma.organization.create({
        data: createMockOrganization(),
      });

      await prisma.employee.create({
        data: createMockEmployee(org.id, {
          email: 'existing@acme.com',
        }),
      });

      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          first_name: 'Duplicate',
          last_name: 'User',
          email: 'existing@acme.com',
          password: 'password123',
          org_slug: 'acme-corp',
        })
        .expect(400);
    });
  });

  describe('/auth/refresh (POST)', () => {
    it('should refresh token successfully', async () => {
      const org = await prisma.organization.create({
        data: createMockOrganization(),
      });

      const employee = await prisma.employee.create({
        data: createMockEmployee(org.id),
      });

      // Get initial tokens
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: employee.email,
          password: 'password123',
          org_slug: 'acme-corp',
        });

      // Refresh token
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refresh_token: loginResponse.body.refresh_token,
        })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('refresh_token');
      expect(response.body.access_token).not.toBe(loginResponse.body.access_token);
    });

    it('should fail with invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refresh_token: 'invalid-token',
        })
        .expect(401);
    });
  });

  describe('/auth/logout (POST)', () => {
    it('should logout successfully', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .expect(200);

      // In a real implementation, you might check token blacklisting
    });
  });
});