import { RateLimiter } from '../src/services/rate-limiter';
import { NotificationEventType } from '../src/types';

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;
  
  const mockConfig = {
    perVisitor: {
      maxPerHour: 5,
      maxPerDay: 20,
    },
    perVisit: {
      maxPerVisit: 3,
    },
  };

  beforeEach(() => {
    rateLimiter = new RateLimiter(mockConfig);
  });

  afterEach(() => {
    rateLimiter.reset();
  });

  describe('checkLimit', () => {
    it('should allow requests within limits', async () => {
      const key = 'test_visitor_1';
      const type = NotificationEventType.HOST_ALERT;

      for (let i = 0; i < mockConfig.perVisitor.maxPerHour; i++) {
        const allowed = await rateLimiter.checkLimit(key, type);
        expect(allowed).toBe(true);
      }
    });

    it('should reject requests exceeding hourly limit', async () => {
      const key = 'test_visitor_2';
      const type = NotificationEventType.HOST_ALERT;

      // Exhaust hourly limit
      for (let i = 0; i < mockConfig.perVisitor.maxPerHour; i++) {
        await rateLimiter.checkLimit(key, type);
      }

      // Next request should be rejected
      const allowed = await rateLimiter.checkLimit(key, type);
      expect(allowed).toBe(false);
    });

    it('should enforce per-visit limits', async () => {
      const key = 'test_visitor_3';
      const visitId = 'visit_123';
      const type = NotificationEventType.HOST_ALERT;

      // Exhaust per-visit limit
      for (let i = 0; i < mockConfig.perVisit.maxPerVisit; i++) {
        const allowed = await rateLimiter.checkLimit(key, type, visitId);
        expect(allowed).toBe(true);
      }

      // Next request for same visit should be rejected
      const allowed = await rateLimiter.checkLimit(key, type, visitId);
      expect(allowed).toBe(false);
    });

    it('should allow requests for different visits', async () => {
      const key = 'test_visitor_4';
      const visitId1 = 'visit_456';
      const visitId2 = 'visit_789';
      const type = NotificationEventType.HOST_ALERT;

      // Exhaust limit for first visit
      for (let i = 0; i < mockConfig.perVisit.maxPerVisit; i++) {
        await rateLimiter.checkLimit(key, type, visitId1);
      }

      // Should still allow requests for different visit
      const allowed = await rateLimiter.checkLimit(key, type, visitId2);
      expect(allowed).toBe(true);
    });

    it('should handle different visitor keys independently', async () => {
      const key1 = 'visitor_1';
      const key2 = 'visitor_2';
      const type = NotificationEventType.HOST_ALERT;

      // Exhaust limit for first visitor
      for (let i = 0; i < mockConfig.perVisitor.maxPerHour; i++) {
        await rateLimiter.checkLimit(key1, type);
      }

      // Second visitor should still be allowed
      const allowed = await rateLimiter.checkLimit(key2, type);
      expect(allowed).toBe(true);
    });
  });

  describe('getCurrentLimits', () => {
    it('should track current limits', async () => {
      const key = 'test_visitor_5';
      const type = NotificationEventType.HOST_ALERT;

      await rateLimiter.checkLimit(key, type);
      await rateLimiter.checkLimit(key, type);

      const limits = rateLimiter.getCurrentLimits();
      expect(limits.size).toBeGreaterThan(0);
    });
  });
});