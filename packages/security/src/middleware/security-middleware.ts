import helmet from 'helmet';
import * as csurf from 'csurf';
import * as rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';

export interface SecurityConfig {
  enableCSRF: boolean;
  enableRateLimit: boolean;
  rateLimitWindowMs: number;
  rateLimitMax: number;
  enableHSTS: boolean;
  hstsMaxAge: number;
  trustedProxies: string[];
}

export class SecurityMiddleware {
  private config: SecurityConfig;

  constructor(config: SecurityConfig) {
    this.config = config;
  }

  /**
   * Configure Helmet for security headers
   */
  getHelmetConfig() {
    return helmet({
      // Content Security Policy
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:", "blob:"],
          scriptSrc: ["'self'"],
          connectSrc: ["'self'", "wss:", "https:"],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
        },
      },

      // HTTP Strict Transport Security
      hsts: this.config.enableHSTS ? {
        maxAge: this.config.hstsMaxAge,
        includeSubDomains: true,
        preload: true,
      } : false,

      // X-Frame-Options
      frameguard: { action: 'deny' },

      // X-Content-Type-Options
      noSniff: true,

      // X-XSS-Protection
      xssFilter: true,

      // Referrer Policy
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },

      // Remove X-Powered-By header
      hidePoweredBy: true,

      // DNS Prefetch Control
      dnsPrefetchControl: { allow: false },

      // IE No Open
      ieNoOpen: true,

      // Don't infer MIME type
      noSniff: true,
    });
  }

  /**
   * Configure CSRF protection
   */
  getCSRFProtection() {
    if (!this.config.enableCSRF) {
      return (req: Request, res: Response, next: NextFunction) => next();
    }

    return csurf({
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 3600000, // 1 hour
      },
      ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
    });
  }

  /**
   * Configure rate limiting
   */
  getRateLimiter() {
    if (!this.config.enableRateLimit) {
      return (req: Request, res: Response, next: NextFunction) => next();
    }

    return rateLimit({
      windowMs: this.config.rateLimitWindowMs,
      max: this.config.rateLimitMax,
      message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: Math.ceil(this.config.rateLimitWindowMs / 1000),
      },
      standardHeaders: true,
      legacyHeaders: false,
      trustProxy: this.config.trustedProxies.length > 0,
    });
  }

  /**
   * Strict rate limiter for sensitive endpoints
   */
  getStrictRateLimiter() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 attempts per window
      message: {
        error: 'Too many attempts, please try again later.',
        retryAfter: 900, // 15 minutes
      },
      standardHeaders: true,
      legacyHeaders: false,
      trustProxy: this.config.trustedProxies.length > 0,
    });
  }

  /**
   * Configure secure cookies
   */
  getSecureCookieConfig() {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    };
  }

  /**
   * Middleware to validate request origin
   */
  validateOrigin(allowedOrigins: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
      const origin = req.get('Origin') || req.get('Referer');
      
      if (!origin) {
        return res.status(403).json({ error: 'Origin header required' });
      }

      const isAllowed = allowedOrigins.some(allowed => {
        if (allowed === '*') return true;
        return origin.startsWith(allowed);
      });

      if (!isAllowed) {
        return res.status(403).json({ error: 'Origin not allowed' });
      }

      next();
    };
  }

  /**
   * Middleware to log security events
   */
  securityLogger() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Log suspicious activity
      const suspiciousPatterns = [
        /\.\./,  // Path traversal
        /<script/i,  // XSS attempts
        /union.*select/i,  // SQL injection
        /javascript:/i,  // JavaScript protocol
      ];

      const url = req.url;
      const userAgent = req.get('User-Agent') || '';
      const isSuspicious = suspiciousPatterns.some(pattern => 
        pattern.test(url) || pattern.test(userAgent)
      );

      if (isSuspicious) {
        console.warn('Suspicious request detected:', {
          ip: req.ip,
          url: req.url,
          userAgent,
          timestamp: new Date().toISOString(),
        });
      }

      next();
    };
  }

  /**
   * Middleware to sanitize request data
   */
  sanitizeInput() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Recursively sanitize object
      const sanitize = (obj: any): any => {
        if (typeof obj === 'string') {
          return obj
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
            .replace(/javascript:/gi, '') // Remove javascript: protocol
            .replace(/on\w+\s*=/gi, ''); // Remove event handlers
        }
        
        if (Array.isArray(obj)) {
          return obj.map(sanitize);
        }
        
        if (obj && typeof obj === 'object') {
          const sanitized: any = {};
          for (const [key, value] of Object.entries(obj)) {
            sanitized[key] = sanitize(value);
          }
          return sanitized;
        }
        
        return obj;
      };

      if (req.body) {
        req.body = sanitize(req.body);
      }
      
      if (req.query) {
        req.query = sanitize(req.query);
      }

      next();
    };
  }

  /**
   * Middleware to validate content type
   */
  validateContentType(allowedTypes: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
      if (req.method === 'GET' || req.method === 'HEAD') {
        return next();
      }

      const contentType = req.get('Content-Type');
      if (!contentType) {
        return res.status(400).json({ error: 'Content-Type header required' });
      }

      const isAllowed = allowedTypes.some(type => contentType.includes(type));
      if (!isAllowed) {
        return res.status(415).json({ error: 'Unsupported Media Type' });
      }

      next();
    };
  }

  /**
   * Middleware to prevent parameter pollution
   */
  preventParameterPollution() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Convert array parameters to single values (keep last)
      for (const [key, value] of Object.entries(req.query)) {
        if (Array.isArray(value)) {
          req.query[key] = value[value.length - 1];
        }
      }

      next();
    };
  }
}

// Security utility functions
export class SecurityUtils {
  /**
   * Generate secure random token
   */
  static generateSecureToken(length: number = 32): string {
    return require('crypto').randomBytes(length).toString('hex');
  }

  /**
   * Hash password with bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    const bcrypt = require('bcrypt');
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify password with bcrypt
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    const bcrypt = require('bcrypt');
    return bcrypt.compare(password, hash);
  }

  /**
   * Validate password strength
   */
  static validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Check for common patterns
    const commonPatterns = [
      /(.)\1{2,}/, // Repeated characters
      /123456|654321|abcdef|qwerty/i, // Common sequences
    ];

    if (commonPatterns.some(pattern => pattern.test(password))) {
      errors.push('Password contains common patterns');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Sanitize filename for safe storage
   */
  static sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace unsafe characters
      .replace(/_{2,}/g, '_') // Replace multiple underscores
      .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
      .toLowerCase();
  }

  /**
   * Validate file upload
   */
  static validateFileUpload(file: any, options: {
    maxSize: number;
    allowedTypes: string[];
    allowedExtensions: string[];
  }): { isValid: boolean; error?: string } {
    if (file.size > options.maxSize) {
      return { isValid: false, error: 'File size exceeds limit' };
    }

    if (!options.allowedTypes.includes(file.mimetype)) {
      return { isValid: false, error: 'File type not allowed' };
    }

    const extension = file.originalname.split('.').pop()?.toLowerCase();
    if (!extension || !options.allowedExtensions.includes(extension)) {
      return { isValid: false, error: 'File extension not allowed' };
    }

    return { isValid: true };
  }

  /**
   * Generate CSRF token
   */
  static generateCSRFToken(): string {
    return this.generateSecureToken(32);
  }

  /**
   * Validate CSRF token
   */
  static validateCSRFToken(token: string, sessionToken: string): boolean {
    return token === sessionToken;
  }
}