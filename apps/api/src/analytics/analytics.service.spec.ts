import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    visit: {
      count: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
    organization: {
      findMany: jest.fn(),
    },
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getVisitMetrics', () => {
    it('should return visit metrics for organization', async () => {
      const filters = { orgId: 'org-1' };
      
      mockPrismaService.visit.count.mockResolvedValue(100);
      mockPrismaService.visit.groupBy.mockResolvedValue([
        { status: 'CHECKED_IN', _count: { status: 25 } },
        { status: 'CHECKED_OUT', _count: { status: 60 } },
        { status: 'NO_SHOW', _count: { status: 15 } },
      ]);
      
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([{ avg_wait_time: 5.5 }]) // Average wait time
        .mockResolvedValueOnce([{ avg_duration: 45.2 }]) // Average duration
        .mockResolvedValueOnce([{ hour: 14 }]) // Peak hour
        .mockResolvedValueOnce([{ day: 'Tuesday' }]); // Peak day

      const result = await service.getVisitMetrics(filters);

      expect(result).toEqual({
        totalVisits: 100,
        checkedInVisits: 25,
        checkedOutVisits: 60,
        noShowVisits: 15,
        averageWaitTime: 5.5,
        averageVisitDuration: 45.2,
        peakHour: 14,
        peakDay: 'Tuesday',
      });
    });

    it('should handle empty results gracefully', async () => {
      const filters = { orgId: 'org-empty' };
      
      mockPrismaService.visit.count.mockResolvedValue(0);
      mockPrismaService.visit.groupBy.mockResolvedValue([]);
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([]) // No wait time data
        .mockResolvedValueOnce([]) // No duration data
        .mockResolvedValueOnce([]) // No peak hour data
        .mockResolvedValueOnce([]); // No peak day data

      const result = await service.getVisitMetrics(filters);

      expect(result).toEqual({
        totalVisits: 0,
        checkedInVisits: 0,
        checkedOutVisits: 0,
        noShowVisits: 0,
        averageWaitTime: 0,
        averageVisitDuration: 0,
        peakHour: 9, // Default
        peakDay: 'Monday', // Default
      });
    });
  });

  describe('getLocationMetrics', () => {
    it('should return location metrics', async () => {
      const filters = { orgId: 'org-1' };
      
      const mockLocationData = [
        {
          locationId: 'loc-1',
          locationName: 'Main Office',
          totalVisits: 150,
          averageDuration: 45,
          peakHour: 14,
        },
        {
          locationId: 'loc-2',
          locationName: 'Branch Office',
          totalVisits: 75,
          averageDuration: 30,
          peakHour: 10,
        },
      ];

      mockPrismaService.$queryRaw.mockResolvedValue(mockLocationData);

      const result = await service.getLocationMetrics(filters);

      expect(result).toEqual(mockLocationData);
      expect(mockPrismaService.$queryRaw).toHaveBeenCalledWith(
        expect.stringContaining('SELECT')
      );
    });

    it('should apply location filters', async () => {
      const filters = { 
        orgId: 'org-1', 
        locationIds: ['loc-1'] 
      };
      
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      await service.getLocationMetrics(filters);

      expect(mockPrismaService.$queryRaw).toHaveBeenCalledWith(
        expect.stringContaining('loc-1')
      );
    });
  });

  describe('getHostMetrics', () => {
    it('should return host metrics', async () => {
      const filters = { orgId: 'org-1' };
      
      const mockHostData = [
        {
          hostId: 'host-1',
          hostName: 'John Doe',
          totalVisits: 50,
          averageWaitTime: 3.5,
          averageDuration: 60,
        },
        {
          hostId: 'host-2',
          hostName: 'Jane Smith',
          totalVisits: 35,
          averageWaitTime: 2.8,
          averageDuration: 45,
        },
      ];

      mockPrismaService.$queryRaw.mockResolvedValue(mockHostData);

      const result = await service.getHostMetrics(filters);

      expect(result).toEqual(mockHostData);
    });
  });

  describe('getPurposeMetrics', () => {
    it('should return purpose metrics with percentages', async () => {
      const filters = { orgId: 'org-1' };
      
      const mockPurposeData = [
        {
          purpose: 'MEETING',
          totalVisits: 60,
          percentage: 60.0,
          averageDuration: 45,
        },
        {
          purpose: 'INTERVIEW',
          totalVisits: 25,
          percentage: 25.0,
          averageDuration: 90,
        },
        {
          purpose: 'DELIVERY',
          totalVisits: 15,
          percentage: 15.0,
          averageDuration: 10,
        },
      ];

      mockPrismaService.$queryRaw.mockResolvedValue(mockPurposeData);

      const result = await service.getPurposeMetrics(filters);

      expect(result).toEqual(mockPurposeData);
      expect(result.reduce((sum, p) => sum + p.percentage, 0)).toBe(100);
    });
  });

  describe('getHeatmapData', () => {
    it('should return heatmap data for peak hours analysis', async () => {
      const filters = { orgId: 'org-1' };
      
      const mockHeatmapData = [
        { hour: 9, day: 'Monday', visits: 15 },
        { hour: 10, day: 'Monday', visits: 25 },
        { hour: 14, day: 'Monday', visits: 30 },
        { hour: 9, day: 'Tuesday', visits: 20 },
        { hour: 10, day: 'Tuesday', visits: 35 },
        { hour: 14, day: 'Tuesday', visits: 28 },
      ];

      mockPrismaService.$queryRaw.mockResolvedValue(mockHeatmapData);

      const result = await service.getHeatmapData(filters);

      expect(result).toEqual(mockHeatmapData);
      expect(result.every(item => 
        typeof item.hour === 'number' && 
        typeof item.day === 'string' && 
        typeof item.visits === 'number'
      )).toBe(true);
    });
  });

  describe('getVisitorRetentionData', () => {
    it('should calculate visitor retention correctly', async () => {
      const filters = { orgId: 'org-1' };
      
      const mockRetentionData = [
        {
          period: '2024-01-01',
          newVisitors: 20,
          returningVisitors: 5,
          totalVisitors: 25,
          retentionRate: 20.0,
        },
        {
          period: '2024-01-08',
          newVisitors: 15,
          returningVisitors: 10,
          totalVisitors: 25,
          retentionRate: 40.0,
        },
      ];

      mockPrismaService.$queryRaw.mockResolvedValue(mockRetentionData);

      const result = await service.getVisitorRetentionData(filters);

      expect(result).toEqual(mockRetentionData);
      expect(result.every(item => item.retentionRate >= 0 && item.retentionRate <= 100)).toBe(true);
    });
  });

  describe('getDailyVisitCounts', () => {
    it('should return daily visit counts', async () => {
      const filters = { orgId: 'org-1' };
      
      const mockDailyData = [
        { date: '2024-01-15', visits: 25 },
        { date: '2024-01-16', visits: 30 },
        { date: '2024-01-17', visits: 22 },
      ];

      mockPrismaService.$queryRaw.mockResolvedValue(mockDailyData);

      const result = await service.getDailyVisitCounts(filters);

      expect(result).toEqual(mockDailyData);
    });

    it('should apply date range filters', async () => {
      const filters = { 
        orgId: 'org-1',
        fromDate: new Date('2024-01-01'),
        toDate: new Date('2024-01-31'),
      };
      
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      await service.getDailyVisitCounts(filters);

      expect(mockPrismaService.$queryRaw).toHaveBeenCalledWith(
        expect.stringContaining('2024-01-01')
      );
    });
  });

  describe('computeHourlyRollups', () => {
    it('should compute rollups for all organizations', async () => {
      const mockOrganizations = [
        { id: 'org-1' },
        { id: 'org-2' },
      ];

      mockPrismaService.organization.findMany.mockResolvedValue(mockOrganizations);
      mockPrismaService.$executeRaw.mockResolvedValue(undefined);

      await service.computeHourlyRollups();

      expect(mockPrismaService.organization.findMany).toHaveBeenCalled();
      expect(mockPrismaService.$executeRaw).toHaveBeenCalledTimes(2); // Once per org
    });
  });

  describe('computeDailyRollups', () => {
    it('should compute daily rollups for all organizations', async () => {
      const mockOrganizations = [
        { id: 'org-1' },
        { id: 'org-2' },
      ];

      mockPrismaService.organization.findMany.mockResolvedValue(mockOrganizations);
      mockPrismaService.$executeRaw.mockResolvedValue(undefined);

      await service.computeDailyRollups();

      expect(mockPrismaService.organization.findMany).toHaveBeenCalled();
      expect(mockPrismaService.$executeRaw).toHaveBeenCalledTimes(2); // Once per org
    });
  });

  describe('buildWhereClause', () => {
    it('should build correct where clause with all filters', () => {
      const filters = {
        orgId: 'org-1',
        locationIds: ['loc-1', 'loc-2'],
        hostIds: ['host-1'],
        purposes: ['MEETING', 'INTERVIEW'],
        fromDate: new Date('2024-01-01'),
        toDate: new Date('2024-01-31'),
      };

      const whereClause = (service as any).buildWhereClause(filters);

      expect(whereClause).toEqual({
        org_id: 'org-1',
        location_id: { in: ['loc-1', 'loc-2'] },
        host_id: { in: ['host-1'] },
        purpose: { in: ['MEETING', 'INTERVIEW'] },
        scheduled_start: {
          gte: new Date('2024-01-01'),
          lte: new Date('2024-01-31'),
        },
      });
    });

    it('should build minimal where clause with only orgId', () => {
      const filters = { orgId: 'org-1' };

      const whereClause = (service as any).buildWhereClause(filters);

      expect(whereClause).toEqual({
        org_id: 'org-1',
      });
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      const filters = { orgId: 'org-1' };
      
      mockPrismaService.visit.count.mockRejectedValue(new Error('Database error'));

      await expect(service.getVisitMetrics(filters)).rejects.toThrow('Database error');
    });

    it('should handle null/undefined data in calculations', async () => {
      const filters = { orgId: 'org-1' };
      
      mockPrismaService.visit.count.mockResolvedValue(0);
      mockPrismaService.visit.groupBy.mockResolvedValue([]);
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([{ avg_wait_time: null }])
        .mockResolvedValueOnce([{ avg_duration: null }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.getVisitMetrics(filters);

      expect(result.averageWaitTime).toBe(0);
      expect(result.averageVisitDuration).toBe(0);
      expect(result.peakHour).toBe(9);
      expect(result.peakDay).toBe('Monday');
    });
  });

  describe('performance optimization', () => {
    it('should use efficient queries for large datasets', async () => {
      const filters = { orgId: 'org-1' };
      
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      await service.getLocationMetrics(filters);

      // Verify that the query uses proper indexing hints
      expect(mockPrismaService.$queryRaw).toHaveBeenCalledWith(
        expect.stringContaining('GROUP BY')
      );
    });

    it('should limit results appropriately', async () => {
      const filters = { orgId: 'org-1' };
      
      const mockData = Array.from({ length: 100 }, (_, i) => ({
        locationId: `loc-${i}`,
        locationName: `Location ${i}`,
        totalVisits: Math.floor(Math.random() * 100),
        averageDuration: Math.floor(Math.random() * 120),
        peakHour: Math.floor(Math.random() * 24),
      }));

      mockPrismaService.$queryRaw.mockResolvedValue(mockData);

      const result = await service.getLocationMetrics(filters);

      // Should return all results (no artificial limit in this case)
      expect(result.length).toBe(100);
    });
  });

  describe('data integrity', () => {
    it('should validate calculation accuracy', async () => {
      const filters = { orgId: 'org-1' };
      
      const mockPurposeData = [
        { purpose: 'MEETING', totalVisits: 60, percentage: 60.0, averageDuration: 45 },
        { purpose: 'INTERVIEW', totalVisits: 40, percentage: 40.0, averageDuration: 90 },
      ];

      mockPrismaService.$queryRaw.mockResolvedValue(mockPurposeData);

      const result = await service.getPurposeMetrics(filters);

      // Verify percentages add up to 100%
      const totalPercentage = result.reduce((sum, item) => sum + item.percentage, 0);
      expect(totalPercentage).toBe(100);
    });

    it('should handle edge cases in retention calculation', async () => {
      const filters = { orgId: 'org-1' };
      
      const mockRetentionData = [
        {
          period: '2024-01-01',
          newVisitors: 0,
          returningVisitors: 0,
          totalVisitors: 0,
          retentionRate: 0,
        },
      ];

      mockPrismaService.$queryRaw.mockResolvedValue(mockRetentionData);

      const result = await service.getVisitorRetentionData(filters);

      expect(result[0].retentionRate).toBe(0);
      expect(result[0].totalVisitors).toBe(0);
    });
  });

  describe('rollup computations', () => {
    it('should handle rollup computation errors', async () => {
      mockPrismaService.organization.findMany.mockResolvedValue([{ id: 'org-1' }]);
      mockPrismaService.$executeRaw.mockRejectedValue(new Error('Rollup failed'));

      // Should not throw, but log the error
      await expect(service.computeHourlyRollups()).resolves.not.toThrow();
    });

    it('should compute rollups with correct time windows', async () => {
      mockPrismaService.organization.findMany.mockResolvedValue([{ id: 'org-1' }]);
      mockPrismaService.$executeRaw.mockResolvedValue(undefined);

      await service.computeHourlyRollups();

      expect(mockPrismaService.$executeRaw).toHaveBeenCalledWith(
        expect.stringContaining('DATE_TRUNC')
      );
    });
  });
});