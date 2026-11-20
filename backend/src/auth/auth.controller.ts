import { Body, Controller, Get, HttpCode, Patch, Post, Req, Res } from '@nestjs/common';
import { ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags, ApiTooManyRequestsResponse } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { ApiErrors } from '../common/swagger';
import { config } from '../config';
import { AuthService } from './auth.service';
import type { AuthUser } from './auth.types';
import { Auth, CurrentUser, Public } from './decorators';
import { LoginResponseDto, MeResponseDto } from './dto/auth-response.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { extractToken } from './jwt-auth.guard';

function setSessionCookie(res: Response, token: string) {
  res.cookie(config.cookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.cookieSecure,
    maxAge: config.jwtExpiresInSec * 1000,
    path: '/',
  });
}

const clientIp = (req: Request) => req.ip ?? req.socket.remoteAddress ?? 'unknown';

@ApiTags('Xác thực')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Đăng nhập (UC01)',
    description:
      'Đặt cookie httpOnly `coffeepos_token` (12 giờ) và trả `token` cho header Bearer. Sai tên hoặc mật khẩu đều trả cùng một thông báo. ' +
      'Sai quá 5 lần / tài khoản hoặc 20 lần / IP trong 15 phút → 429 kèm header Retry-After.',
  })
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiErrors(400, 401)
  @ApiTooManyRequestsResponse({ description: 'Đăng nhập sai quá nhiều lần', type: ErrorResponseDto })
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<LoginResponseDto> {
    const { user, token } = await this.auth.login(dto.username, dto.password, clientIp(req));
    setSessionCookie(res, token);
    return { user, token };
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  @ApiOperation({ summary: 'Đăng xuất', description: 'Xoá cookie và thu hồi mọi token đang có của tài khoản (mọi thiết bị).' })
  @ApiNoContentResponse({ description: 'Đã đăng xuất' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.revoke(extractToken(req));
    res.clearCookie(config.cookieName, { path: '/', httpOnly: true, sameSite: 'lax', secure: config.cookieSecure });
  }

  @Auth()
  @Get('me')
  @ApiOperation({ summary: 'Tài khoản hiện tại' })
  @ApiOkResponse({ type: MeResponseDto })
  me(@CurrentUser() user: AuthUser): MeResponseDto {
    return { user };
  }

  @Auth()
  @Patch('password')
  @ApiOperation({
    summary: 'Đổi mật khẩu (UC01)',
    description: 'Mật khẩu mới 8–72 ký tự, có chữ và số, khác mật khẩu cũ, không chứa tên đăng nhập, không phải mật khẩu phổ biến. Thành công → token cũ ở mọi thiết bị bị thu hồi; phiên hiện tại nhận token + cookie mới.',
  })
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiErrors(400)
  @ApiTooManyRequestsResponse({ description: 'Nhập sai mật khẩu hiện tại quá nhiều lần', type: ErrorResponseDto })
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser() current: AuthUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDto> {
    const { user, token } = await this.auth.changePassword(current.id, dto.currentPassword, dto.newPassword, clientIp(req));
    setSessionCookie(res, token);
    return { user, token };
  }
}
