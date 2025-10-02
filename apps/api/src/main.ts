import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SecurityMiddleware } from '@vms/security';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Security configuration
  const securityConfig = {
    enableCSRF: configService.get('NODE_ENV') === 'production',
    enableRateLimit: true,
    rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
    rateLimitMax: 100, // 100 requests per window
    enableHSTS: configService.get('NODE_ENV') === 'production',
    hstsMaxAge: 31536000, // 1 year
    trustedProxies: configService.get('TRUSTED_PROXIES')?.split(',') || [],
  };

  const securityMiddleware = new SecurityMiddleware(securityConfig);

  // Apply security middleware
  app.use(securityMiddleware.getHelmetConfig());
  app.use(securityMiddleware.getCSRFProtection());
  app.use(securityMiddleware.getRateLimiter());
  app.use(securityMiddleware.securityLogger());
  app.use(securityMiddleware.sanitizeInput());
  app.use(securityMiddleware.preventParameterPollution());

  // Content type validation
  app.use(securityMiddleware.validateContentType([
    'application/json',
    'application/x-www-form-urlencoded',
    'multipart/form-data',
  ]));

  // Origin validation for production
  if (configService.get('NODE_ENV') === 'production') {
    const allowedOrigins = configService.get('CORS_ORIGINS')?.split(',') || [];
    app.use(securityMiddleware.validateOrigin(allowedOrigins));
  }

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CORS configuration
  app.enableCors({
    origin: configService.get('CORS_ORIGINS')?.split(',') || ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  const port = configService.get('PORT') || 3001;
  await app.listen(port);

  console.log(`🚀 VMS API is running on: http://localhost:${port}/api/v1`);
  console.log(`🔒 Security features enabled: ${Object.keys(securityConfig).filter(key => securityConfig[key]).join(', ')}`);
}

bootstrap();