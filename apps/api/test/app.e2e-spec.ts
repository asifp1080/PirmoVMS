import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import { PrismaService } from '../src/prisma/prisma.service'
import { AppModule } from '../src/app.module'

describe('API E2E Tests', () => {
  let app: INestApplication
  let prisma: PrismaService
  let authToken: string
  let testOrgId: string
  let testUserId: string

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
    
    prisma = app.get<PrismaService>(PrismaService)
    
    await app.init()

    // Setup test data
    await setupTestData()
  })

  afterAll(async () => {
    await cleanupTestData()
    await app.close()
  })

  beforeEach(async () => {
    // Login to get auth token
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123',
      })
      .expect(200)

    authToken = loginResponse.body.access_token
  })

  describe('Authentication', () => {
    it('should login successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(200)

      expect(response.body).toHaveProperty('access_token')
      expect(response.body).toHaveProperty('user')
      expect(response.body.user.email).toBe('test@example.com')
    })

    it('should reject invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
        .expect(401)
    })

    it('should refresh token successfully', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({
          refresh_token: loginResponse.body.refresh_token,
        })
        .expect(200)

      expect(response.body).toHaveProperty('access_token')
    })
  })

  describe('Visitors', () => {
    it('should create a visitor', async () => {
      const visitorData = {
        first_name: 'John',
        last_name: 'Test',
        email: 'john.test@example.com',
        phone: '+1-555-0123',
        company: 'Test Corp',
      }

      const response = await request(app.getHttpServer())
        .post(`/api/v1/organizations/${testOrgId}/visitors`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(visitorData)
        .expect(201)

      expect(response.body.first_name).toBe('John')
      expect(response.body.last_name).toBe('Test')
      expect(response.body.email).toBe('john.test@example.com')
    })

    it('should get visitors list', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/organizations/${testOrgId}/visitors`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('data')
      expect(response.body).toHaveProperty('meta')
      expect(Array.isArray(response.body.data)).toBe(true)
    })

    it('should search visitors', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/organizations/${testOrgId}/visitors?search=John`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.data.length).toBeGreaterThanOrEqual(0)
    })

    it('should update a visitor', async () => {
      // First create a visitor
      const createResponse = await request(app.getHttpServer())
        .post(`/api/v1/organizations/${testOrgId}/visitors`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          first_name: 'Jane',
          last_name: 'Update',
          email: 'jane.update@example.com',
        })

      const visitorId = createResponse.body.id

      // Then update it
      const response = await request(app.getHttpServer())
        .put(`/api/v1/organizations/${testOrgId}/visitors/${visitorId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          company: 'Updated Corp',
        })
        .expect(200)

      expect(response.body.company).toBe('Updated Corp')
    })

    it('should delete a visitor', async () => {
      // First create a visitor
      const createResponse = await request(app.getHttpServer())
        .post(`/api/v1/organizations/${testOrgId}/visitors`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          first_name: 'Delete',
          last_name: 'Me',
          email: 'delete.me@example.com',
        })

      const visitorId = createResponse.body.id

      // Then delete it
      await request(app.getHttpServer())
        .delete(`/api/v1/organizations/${testOrgId}/visitors/${visitorId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204)
    })
  })

  describe('Visits', () => {
    let testVisitorId: string

    beforeEach(async () => {
      // Create a test visitor
      const visitorResponse = await request(app.getHttpServer())
        .post(`/api/v1/organizations/${testOrgId}/visitors`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          first_name: 'Visit',
          last_name: 'Test',
          email: 'visit.test@example.com',
        })

      testVisitorId = visitorResponse.body.id
    })

    it('should create a visit', async () => {
      const visitData = {
        visitor_id: testVisitorId,
        location_id: 'test-location-id',
        purpose: 'MEETING',
        scheduled_start: new Date().toISOString(),
        scheduled_end: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      }

      const response = await request(app.getHttpServer())
        .post(`/api/v1/organizations/${testOrgId}/visits`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(visitData)
        .expect(201)

      expect(response.body.purpose).toBe('MEETING')
      expect(response.body.status).toBe('PENDING')
    })

    it('should check in a visit', async () => {
      // Create a visit first
      const visitResponse = await request(app.getHttpServer())
        .post(`/api/v1/organizations/${testOrgId}/visits`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          visitor_id: testVisitorId,
          location_id: 'test-location-id',
          purpose: 'MEETING',
          scheduled_start: new Date().toISOString(),
        })

      const visitId = visitResponse.body.id

      // Check in the visit
      const response = await request(app.getHttpServer())
        .post(`/api/v1/organizations/${testOrgId}/visits/${visitId}/check-in`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          photo_url: 'https://example.com/photo.jpg',
        })
        .expect(200)

      expect(response.body.status).toBe('CHECKED_IN')
      expect(response.body.check_in_time).toBeDefined()
    })

    it('should check out a visit', async () => {
      // Create and check in a visit
      const visitResponse = await request(app.getHttpServer())
        .post(`/api/v1/organizations/${testOrgId}/visits`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          visitor_id: testVisitorId,
          location_id: 'test-location-id',
          purpose: 'MEETING',
          scheduled_start: new Date().toISOString(),
        })

      const visitId = visitResponse.body.id

      await request(app.getHttpServer())
        .post(`/api/v1/organizations/${testOrgId}/visits/${visitId}/check-in`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})

      // Check out the visit
      const response = await request(app.getHttpServer())
        .post(`/api/v1/organizations/${testOrgId}/visits/${visitId}/check-out`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          notes: 'Visit completed successfully',
        })
        .expect(200)

      expect(response.body.status).toBe('CHECKED_OUT')
      expect(response.body.check_out_time).toBeDefined()
    })
  })

  describe('Analytics', () => {
    it('should get visit analytics', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/organizations/${testOrgId}/analytics/visits`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          period: 'month',
          from_date: '2024-01-01',
          to_date: '2024-01-31',
        })
        .expect(200)

      expect(response.body).toHaveProperty('total_visits')
      expect(response.body).toHaveProperty('unique_visitors')
      expect(response.body).toHaveProperty('average_duration')
      expect(response.body).toHaveProperty('peak_hours')
      expect(response.body).toHaveProperty('visits_by_purpose')
      expect(response.body).toHaveProperty('visits_by_location')
      expect(response.body).toHaveProperty('daily_counts')
    })

    it('should export analytics data', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/organizations/${testOrgId}/analytics/export`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          format: 'csv',
          data_type: 'analytics',
          from_date: '2024-01-01',
          to_date: '2024-01-31',
        })
        .expect(200)

      expect(response.headers['content-type']).toContain('application/octet-stream')
    })
  })

  describe('RBAC', () => {
    it('should deny access without authentication', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/organizations/${testOrgId}/visitors`)
        .expect(401)
    })

    it('should deny access to wrong organization', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/organizations/wrong-org-id/visitors')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403)
    })
  })

  async function setupTestData() {
    // Create test organization
    const org = await prisma.organization.create({
      data: {
        name: 'Test Organization',
        slug: 'test-org',
        time_zone: 'UTC',
      },
    })
    testOrgId = org.id

    // Create test location
    await prisma.location.create({
      data: {
        id: 'test-location-id',
        org_id: testOrgId,
        name: 'Test Location',
        address: '123 Test St',
        city: 'Test City',
        time_zone: 'UTC',
      },
    })

    // Create test user
    const user = await prisma.employee.create({
      data: {
        org_id: testOrgId,
        first_name: 'Test',
        last_name: 'User',
        email: 'test@example.com',
        role: 'ADMIN',
        is_host: true,
      },
    })
    testUserId = user.id
  }

  async function cleanupTestData() {
    await prisma.visit.deleteMany({ where: { org_id: testOrgId } })
    await prisma.visitor.deleteMany({})
    await prisma.employee.deleteMany({ where: { org_id: testOrgId } })
    await prisma.location.deleteMany({ where: { org_id: testOrgId } })
    await prisma.organization.delete({ where: { id: testOrgId } })
  }
})