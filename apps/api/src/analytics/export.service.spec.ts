import { Test, TestingModule } from '@nestjs/testing';
import { ExportService } from './export.service';
import { AnalyticsService } from './analytics.service';

describe('ExportService', () => {
  let service: ExportService;
  let analyticsService: AnalyticsService;

  const mockAnalyticsService = {
    getVisitMetrics: jest.fn(),
    getLocationMetrics: jest.fn(),
    getHostMetrics: jest.fn(),
    getPurposeMetrics: jest.fn(),
    getVisitorRetentionData: jest.fn(),
    getDailyVisitCounts: jest.fn(),
    getWeeklyVisitCounts: jest.fn(),
    getMonthlyVisitCounts: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExportService,
        {
          provide: AnalyticsService,
          useValue: mockAnalyticsService,
        },
      ],
    }).compile();

    service = module.get<ExportService>(ExportService);
    analyticsService = module.get<AnalyticsService>(AnalyticsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('exportToCSV', () => {
    it('should export overview data to CSV format', async () => {
      const filters = { orgId: 'org-1' };
      
      const mockData = {
        visitMetrics: {
          totalVisits: 100,
          checkedInVisits: 25,
          checkedOutVisits: 60,
          noShowVisits: 15,
          averageWaitTime: 5.5,
          averageVisitDuration: 45.2,
          peakHour: 14,
          peakDay: 'Tuesday',
        },
        locationMetrics: [
          {
            locationId: 'loc-1',
            locationName: 'Main Office',
            totalVisits: 75,
            averageDuration: 45.5,
            peakHour: 14,
          },
        ],
        hostMetrics: [
          {
            hostId: 'host-1',
            hostName: 'John Doe',
            totalVisits: 50,
            averageWaitTime: 3.5,
            averageDuration: 60.2,
          },
        ],
        purposeMetrics: [
          {
            purpose: 'MEETING',
            totalVisits: 60,
            percentage: 60.0,
            averageDuration: 45.0,
          },
        ],
      };

      mockAnalyticsService.getVisitMetrics.mockResolvedValue(mockData.visitMetrics);
      mockAnalyticsService.getLocationMetrics.mockResolvedValue(mockData.locationMetrics);
      mockAnalyticsService.getHostMetrics.mockResolvedValue(mockData.hostMetrics);
      mockAnalyticsService.getPurposeMetrics.mockResolvedValue(mockData.purposeMetrics);

      const result = await service.exportToCSV('overview', filters);

      expect(result).toContain('Analytics Overview Report');
      expect(result).toContain('Total Visits,100');
      expect(result).toContain('Average Wait Time (minutes),5.50');
      expect(result).toContain('"Main Office",75,45.50,14:00');
      expect(result).toContain('"John Doe",50,3.50,60.20');
      expect(result).toContain('MEETING,60,60%,45.00');
    });

    it('should export daily data to CSV format', async () => {
      const filters = { orgId: 'org-1' };
      
      const mockDailyData = [
        { date: '2024-01-15', visits: 25 },
        { date: '2024-01-16', visits: 30 },
        { date: '2024-01-17', visits: 22 },
      ];

      mockAnalyticsService.getDailyVisitCounts.mockResolvedValue(mockDailyData);

      const result = await service.exportToCSV('daily', filters);

      expect(result).toContain('Daily Visit Counts');
      expect(result).toContain('Date,Visits');
      expect(result).toContain('2024-01-15,25');
      expect(result).toContain('2024-01-16,30');
      expect(result).toContain('2024-01-17,22');
    });

    it('should export weekly data to CSV format', async () => {
      const filters = { orgId: 'org-1' };
      
      const mockWeeklyData = [
        { week: '2024-01-08', visits: 150 },
        { week: '2024-01-15', visits: 175 },
      ];

      mockAnalyticsService.getWeeklyVisitCounts.mockResolvedValue(mockWeeklyData);

      const result = await service.exportToCSV('weekly', filters);

      expect(result).toContain('Weekly Visit Counts');
      expect(result).toContain('Week Starting,Visits');
      expect(result).toContain('2024-01-08,150');
      expect(result).toContain('2024-01-15,175');
    });

    it('should export monthly data to CSV format', async () => {
      const filters = { orgId: 'org-1' };
      
      const mockMonthlyData = [
        { month: '2024-01', visits: 650 },
        { month: '2024-02', visits: 720 },
      ];

      mockAnalyticsService.getMonthlyVisitCounts.mockResolvedValue(mockMonthlyData);

      const result = await service.exportToCSV('monthly', filters);

      expect(result).toContain('Monthly Visit Counts');
      expect(result).toContain('Month,Visits');
      expect(result).toContain('2024-01,650');
      expect(result).toContain('2024-02,720');
    });

    it('should export location metrics to CSV format', async () => {
      const filters = { orgId: 'org-1' };
      
      const mockLocationData = [
        {
          locationId: 'loc-1',
          locationName: 'Main Office',
          totalVisits: 150,
          averageDuration: 45.5,
          peakHour: 14,
        },
        {
          locationId: 'loc-2',
          locationName: 'Branch Office',
          totalVisits: 75,
          averageDuration: 30.2,
          peakHour: 10,
        },
      ];

      mockAnalyticsService.getLocationMetrics.mockResolvedValue(mockLocationData);

      const result = await service.exportToCSV('locations', filters);

      expect(result).toContain('Location Analytics');
      expect(result).toContain('Location,Total Visits,Average Duration (min),Peak Hour');
      expect(result).toContain('"Main Office",150,45.50,14:00');
      expect(result).toContain('"Branch Office",75,30.20,10:00');
    });

    it('should export host metrics to CSV format', async () => {
      const filters = { orgId: 'org-1' };
      
      const mockHostData = [
        {
          hostId: 'host-1',
          hostName: 'John Doe',
          totalVisits: 50,
          averageWaitTime: 3.5,
          averageDuration: 60.2,
        },
      ];

      mockAnalyticsService.getHostMetrics.mockResolvedValue(mockHostData);

      const result = await service.exportToCSV('hosts', filters);

      expect(result).toContain('Host Analytics');
      expect(result).toContain('"John Doe",50,3.50,60.20');
    });

    it('should export purpose metrics to CSV format', async () => {
      const filters = { orgId: 'org-1' };
      
      const mockPurposeData = [
        {
          purpose: 'MEETING',
          totalVisits: 60,
          percentage: 60.0,
          averageDuration: 45.0,
        },
      ];

      mockAnalyticsService.getPurposeMetrics.mockResolvedValue(mockPurposeData);

      const result = await service.exportToCSV('purposes', filters);

      expect(result).toContain('Purpose Analytics');
      expect(result).toContain('MEETING,60,60%,45.00');
    });

    it('should export retention data to CSV format', async () => {
      const filters = { orgId: 'org-1' };
      
      const mockRetentionData = [
        {
          period: '2024-01-01',
          newVisitors: 20,
          returningVisitors: 5,
          totalVisitors: 25,
          retentionRate: 20.0,
        },
      ];

      mockAnalyticsService.getVisitorRetentionData.mockResolvedValue(mockRetentionData);

      const result = await service.exportToCSV('retention', filters);

      expect(result).toContain('Visitor Retention Analytics');
      expect(result).toContain('2024-01-01,20,5,25,20%');
    });

    it('should throw error for unsupported export type', async () => {
      const filters = { orgId: 'org-1' };

      await expect(service.exportToCSV('unsupported', filters)).rejects.toThrow(
        'Unsupported export type: unsupported'
      );
    });
  });

  describe('exportToPDF', () => {
    it('should generate PDF buffer', async () => {
      const filters = { orgId: 'org-1' };
      
      mockAnalyticsService.getVisitMetrics.mockResolvedValue({
        totalVisits: 100,
        checkedInVisits: 25,
        checkedOutVisits: 60,
        noShowVisits: 15,
        averageWaitTime: 5.5,
        averageVisitDuration: 45.2,
        peakHour: 14,
        peakDay: 'Tuesday',
      });

      mockAnalyticsService.getLocationMetrics.mockResolvedValue([]);
      mockAnalyticsService.getHostMetrics.mockResolvedValue([]);
      mockAnalyticsService.getPurposeMetrics.mockResolvedValue([]);

      const result = await service.exportToPDF('overview', filters);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle PDF generation errors', async () => {
      const filters = { orgId: 'org-1' };
      
      mockAnalyticsService.getVisitMetrics.mockRejectedValue(new Error('Data error'));

      await expect(service.exportToPDF('overview', filters)).rejects.toThrow();
    });
  });

  describe('CSV format validation', () => {
    it('should properly escape CSV values with commas', async () => {
      const filters = { orgId: 'org-1' };
      
      const mockLocationData = [
        {
          locationId: 'loc-1',
          locationName: 'Main Office, Building A',
          totalVisits: 150,
          averageDuration: 45.5,
          peakHour: 14,
        },
      ];

      mockAnalyticsService.getLocationMetrics.mockResolvedValue(mockLocationData);

      const result = await service.exportToCSV('locations', filters);

      expect(result).toContain('"Main Office, Building A"');
    });

    it('should handle special characters in data', async () => {
      const filters = { orgId: 'org-1' };
      
      const mockHostData = [
        {
          hostId: 'host-1',
          hostName: 'José María',
          totalVisits: 50,
          averageWaitTime: 3.5,
          averageDuration: 60.2,
        },
      ];

      mockAnalyticsService.getHostMetrics.mockResolvedValue(mockHostData);

      const result = await service.exportToCSV('hosts', filters);

      expect(result).toContain('"José María"');
    });
  });
});