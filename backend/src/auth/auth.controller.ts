import { Body, Controller, Get, HttpCode, Post, Res } from '@nestjs/common';
import { ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ApiErrors } from '../common/swagger';
import { config } from '../config';
import { AuthService } from './auth.service';
import type { AuthUser } from './auth.types';
import { Auth, CurrentUser, Public } from './decorators';
import { LoginResponseDto, MeResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';

@ApiTags('Xác thực')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Đăng nhập (UC01)',
    description: 'Đặt cookie httpOnly `coffeepos_token` (12 giờ) và trả `token` cho header Bearer. Sai tên hoặc mật khẩu đều trả cùng một thông báo.',
  })
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiErrors(400, 401)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response): Promise<LoginResponseDto> {
    const { user, token } = await this.auth.login(dto.username, dto.password);
    res.cookie(config.cookieName, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.isProduction && process.env.COOKIE_SECURE === 'true',
      maxAge: config.jwtExpiresInSec * 1000,
      path: '/',
    });
    return { user, token };
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  @ApiOperation({ summary: 'Đăng xuất', description: 'Xóa cookie phiên.' })
  @ApiNoContentResponse({ description: 'Đã đăng xuất' })
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(config.cookieName, { path: '/' });
  }

  @Auth()
  @Get('me')
  @ApiOperation({ summary: 'Tài khoản hiện tại' })
  @ApiOkResponse({ type: MeResponseDto })
  me(@CurrentUser() user: AuthUser): MeResponseDto {
    return { user };
  }
}
