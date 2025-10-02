import { Injectable, Logger } from '@nestjs/common';
import { NotificationEventType } from '../types';

interface RateLimitConfig {
  perVisitor: {
    maxPerHour: number;
    maxPerDay: number;
  };
  perVisit: {
    maxPerVisit: number;
  };
}

interface RateLimitEntry {
  count: number;
  windowStart: number;
  visitCounts: Map<string, number>;
}

@Injectable()
export class RateLimiter {
  private readonly logger = new Logger(RateLimiter.name);
  private limits: Map<string, RateLimitEntry> = new Map();
  private readonly cleanupInterval = 60 * 60 * 1000; // 1 hour

  constructor(private config: RateLimitConfig) {
    // Cleanup expired entries periodically
    setInterval(() => this.cleanup(), this.cleanupInterval);
  }

  async checkLimit(key: string, type: NotificationEventType, visitId?: string): Promise<boolean> {
    const now = Date.now();
    const hourWindow = 60 * 60 * 1000; // 1 hour
    const dayWindow = 24 * 60 * 60 * 1000; // 24 hours

    // Check per-visitor limits
    const hourlyKey = `${key}_hourly`;
    const dailyKey = `${key}_daily`;

    // Check hourly limit
    if (!this.checkWindowLimit(hourlyKey, now, hourWindow, this.config.perVisitor.maxPerHour)) {
      this.logger.warn(`Hourly rate limit exceeded for ${key}`);
      return false;
    }

    // Check daily limit
    if (!this.checkWindowLimit(dailyKey, now, dayWindow, this.config.perVisitor.maxPerDay)) {
      this.logger.warn(`Daily rate limit exceeded for ${key}`);
      return false;
    }

    // Check per-visit limit if visitId provided
    if (visitId) {
      const visitKey = `${key}_visit_${visitId}`;
      const entry = this.limits.get(visitKey) || { count: 0, windowStart: now, visitCounts: new Map() };
      
      if (entry.count >= this.config.perVisit.maxPerVisit) {
        this.logger.warn(`Per-visit rate limit exceeded for ${visitId}`);
        return false;
      }
      
      entry.count++;
      this.limits.set(visitKey, entry);
    }

    // Increment counters
    this.incrementCounter(hourlyKey, now, hourWindow);
    this.incrementCounter(dailyKey, now, dayWindow);

    return true;
  }

  private checkWindowLimit(key: string, now: number, windowSize: number, maxCount: number): boolean {
    const entry = this.limits.get(key);
    
    if (!entry) {
      return true; // No previous entries, allow
    }

    // Check if window has expired
    if (now - entry.windowStart > windowSize) {
      return true; // Window expired, allow
    }

    return entry.count < maxCount;
  }

  private incrementCounter(key: string, now: number, windowSize: number): void {
    const entry = this.limits.get(key);
    
    if (!entry || now - entry.windowStart > windowSize) {
      // Create new window
      this.limits.set(key, {
        count: 1,
        windowStart: now,
        visitCounts: new Map(),
      });
    } else {
      // Increment existing window
      entry.count++;
      this.limits.set(key, entry);
    }
  }

  private cleanup(): void {
    const now = Date.now();
    const dayWindow = 24 * 60 * 60 * 1000;
    let cleanedCount = 0;

    for (const [key, entry] of this.limits.entries()) {
      if (now - entry.windowStart > dayWindow) {
        this.limits.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(`Cleaned up ${cleanedCount} expired rate limit entries`);
    }
  }

  // For testing purposes
  reset(): void {
    this.limits.clear();
  }

  getCurrentLimits(): Map<string, RateLimitEntry> {
    return new Map(this.limits);
  }
}