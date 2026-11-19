import type { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { AllExceptionsFilter } from './common/http-exception.filter';
import { setupSwagger } from './common/swagger';
import { createValidationPipe } from './common/validation';

/** Cấu hình dùng chung cho main.ts và e2e test — test chạy đúng như production. */
export function configureApp(app: INestApplication) {
  // Không để lộ framework đang dùng (header X-Powered-By: Express).
  (app.getHttpAdapter().getInstance() as { disable(name: string): void }).disable('x-powered-by');
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableCors({ origin: config.corsOrigin, credentials: true });
  app.enableShutdownHooks();
  if (config.swaggerEnabled) setupSwagger(app);
  return app;
}
