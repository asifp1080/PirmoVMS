import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Test, TestingModule } from '@nestjs/testing'
import { PrismaService } from '../prisma/prisma.service'
import { AnalyticsService } from './analytics.service'

describe('AnalyticsService', () => {
  let service: AnalyticsService
  let prismaService: PrismaService

  const mockPrismaService = {
    visit: {
      count: vi.fn(),
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
    location: {
      findUnique: vi.fn(),
    },
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile()

    service = module.get<AnalyticsService>(AnalyticsService)
    prismaService = module.get<PrismaService>(PrismaService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('getVisitAnalytics', () => {
    it('should return visit analytics', async () => {
      const orgId = 'org-1'
      const query = {
        period: 'month',
        from_date: '2024-01-01',
        to_date: '2024-01-31',
      }

      // Mock data
      mockPrismaService.visit.count.mockResolvedValue(100)
      mockPrismaService.visit.groupBy
        .mockResolvedValueOnce([
          { visitor_id: 'visitor-1', _count: 1 },
          { visitor_id: 'visitor-2', _count: 1 },
        ])
        .mockResolvedValueOnce([
          { purpose: 'MEETING', _count: 60 },
          { purpose: 'INTERVIEW', _count: 40 },
        ])
        .mockResolvedValueOnce([
          { location_id: 'loc-1', _count: 70 },
          { location_id: 'loc-2', _count: 30 },
        ])

      mockPrismaService.visit.findMany
        .mockResolvedValueOnce([
          {
            check_in_time: new Date('2024-01-01T10:00:00Z'),
            check_out_time: new Date('2024-01-01T11:00:00Z'),
          },
          {
            check_in_time: new Date('2024-01-01T14:00:00Z'),
            check_out_time: new Date('2024-01-01T15:30:00Z'),
          },
        ])
        .mockResolvedValueOnce([
          { check_in_time: new Date('2024-01-01T09:00:00Z') },
          { check_in_time: new Date('2024-01-01T10:00:00Z') },
          { check_in_time: new Date('2024-01-01T14:00:00Z') },
        ])
        .mockResolvedValueOnce([
          { created_at: new Date('2024-01-01T10:00:00Z') },
          { created_at: new Date('2024-01-02T11:00:00Z') },
        ])

      mockPrismaService.location.findUnique
        .mockResolvedValueOnce({ name: 'Main Office' })
        .mockResolvedValueOnce({ name: 'Branch Office' })

      const result = await service.getVisitAnalytics(orgId, query)

      expect(result).toEqual({
        total_visits: 100,
        unique_visitors: 2,
        average_duration: 75, // (60 + 90) / 2
        peak_hours: expect.arrayContaining([
          { hour: 9, count: 1 },
          { hour: 10, count: 1 },
          { hour: 14, count: 1 },
        ]),
        visits_by_purpose: [
          { purpose: 'MEETING', count: 60 },
          { purpose: 'INTERVIEW', count: 40 },
        ],
        visits_by_location: [
          { location_id: 'loc-1', location_name: 'Main Office', count: 70 },
          { location_id: 'loc-2', location_name: 'Branch Office', count: 30 },
        ],
        daily_counts: expect.arrayContaining([
          { date: '2024-01-01', count: 1 },
          { date: '2024-01-02', count: 1 },
        ]),
      })
    })

    it('should handle empty data gracefully', async () => {
      const orgId = 'org-1'
      const query = { period: 'month' }

      mockPrismaService.visit.count.mockResolvedValue(0)
      mockPrismaService.visit.groupBy.mockResolvedValue([])
      mockPrismaService.visit.findMany.mockResolvedValue([])

      const result = await service.getVisitAnalytics(orgId, query)

      expect(result.total_visits).toBe(0)
      expect(result.unique_visitors).toBe(0)
      expect(result.average_duration).toBe(0)
    })

    it('should filter by location when provided', async () => {
      const orgId = 'org-1'
      const query = {
        period: 'month',
        location_id: 'loc-1',
      }

      mockPrismaService.visit.count.mockResolvedValue(50)
      mockPrismaService.visit.groupBy.mockResolvedValue([])
      mockPrismaService.visit.findMany.mockResolvedValue([])

      await service.getVisitAnalytics(orgId, query)

      expect(mockPrismaService.visit.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          location_id: 'loc-1',
        }),
      })
    })
  })

  describe('exportAnalytics', () => {
    it('should export analytics data', async () => {
      const orgId = 'org-1'
      const exportParams = {
        format: 'csv',
        data_type: 'analytics',
        from_date: '2024-01-01',
        to_date: '2024-01-31',
      }

      // Mock the analytics data
      mockPrismaService.visit.count.mockResolvedValue(100)
      mockPrismaService.visit.groupBy.mockResolvedValue([])
      mockPrismaService.visit.findMany.mockResolvedValue([])

      const result = await service.exportAnalytics(orgId, exportParams)

      expect(result).toBeDefined()
      expect(result.total_visits).toBe(100)
    })
  })
})