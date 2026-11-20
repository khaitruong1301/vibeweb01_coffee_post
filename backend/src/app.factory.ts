import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { config } from './config';
import { AllExceptionsFilter } from './common/http-exception.filter';
import { setupSwagger } from './common/swagger';
import { createValidationPipe } from './common/validation';

/** Header bảo mật. API chỉ trả JSON → CSP chặn mọi thứ; Swagger UI cần script/style của chính nó. */
function securityHeaders() {
  const hsts = config.cookieSecure ? { maxAge: 180 * 24 * 3600, includeSubDomains: true } : false;
  const api = helmet({
    contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
    crossOriginResourcePolicy: { policy: 'same-site' },
    hsts,
  });
  const docs = helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: null,
      },
    },
    hsts,
  });
  return (req: Request, res: Response, next: NextFunction) => (req.path.startsWith('/api/docs') ? docs : api)(req, res, next);
}

/** Cấu hình dùng chung cho main.ts và e2e test — test chạy đúng như production. */
export function configureApp<T extends INestApplication>(app: T): T {
  const express = (app as unknown as NestExpressApplication).getHttpAdapter().getInstance();
  // Không để lộ framework (X-Powered-By: Express).
  express.disable('x-powered-by');
  // Backend nằm sau proxy Next.js trong mạng nội bộ Docker → tin X-Forwarded-For từ địa chỉ nội bộ để biết IP thật (giới hạn đăng nhập).
  express.set('trust proxy', 'loopback, linklocal, uniquelocal');
  app.use(securityHeaders());
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableCors({ origin: config.corsOrigin, credentials: true });
  app.enableShutdownHooks();
  if (config.swaggerEnabled) setupSwagger(app);
  return app;
}
