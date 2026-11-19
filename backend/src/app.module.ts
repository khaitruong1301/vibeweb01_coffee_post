import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { HealthController } from './health/health.controller';
import { OrdersModule } from './orders/orders.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { QualityModule } from './quality/quality.module';

@Module({
  imports: [PrismaModule, AuthModule, ProductsModule, OrdersModule, QualityModule],
  controllers: [HealthController],
  providers: [
    // Guard toàn cục: MỌI route mặc định cần đăng nhập (chặn lỗi L1); route công khai phải gắn @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
