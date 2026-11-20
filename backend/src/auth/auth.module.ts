import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { config } from '../config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginLimiter } from './login-limiter';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: config.jwtSecret,
      signOptions: { expiresIn: config.jwtExpiresInSec },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, { provide: LoginLimiter, useFactory: () => new LoginLimiter() }],
  exports: [LoginLimiter],
})
export class AuthModule {}
