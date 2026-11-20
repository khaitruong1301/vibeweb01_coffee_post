import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './app.factory';
import { config } from './config';

async function bootstrap() {
  const app = configureApp(await NestFactory.create(AppModule));
  await app.listen(config.port, '0.0.0.0');
  const log = new Logger('CoffeePOS');
  log.log(`API chạy tại http://localhost:${config.port}/api`);
  if (config.usingDevSecret) log.warn('Đang dùng JWT_SECRET mặc định cho dev — đặt JWT_SECRET riêng trước khi deploy!');
  log.log(`Môi trường: ${config.appEnv} · Swagger: ${config.swaggerEnabled ? 'bật' : 'tắt'} · cookie Secure: ${config.cookieSecure}`);
}
bootstrap().catch((err: unknown) => {
  console.error('Không khởi động được API:', err);
  process.exit(1);
});
