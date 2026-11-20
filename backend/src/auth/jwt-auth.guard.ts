import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { config } from '../config';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser, JwtPayload } from './auth.types';
import { IS_PUBLIC } from './decorators';

/** Nhận token từ header `Authorization: Bearer` (ưu tiên) hoặc cookie httpOnly. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const token = extractToken(req);
    if (!token) throw new UnauthorizedException({ error: 'Vui lòng đăng nhập' });

    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException({ error: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại' });
    }
    // Đọc lại DB: tài khoản bị khóa / đổi vai trò có hiệu lực ngay.
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, username: true, fullName: true, role: true, isActive: true, tokenVersion: true },
    });
    if (!user || !user.isActive) throw new UnauthorizedException({ error: 'Tài khoản không còn hoạt động' });
    // Token cấp trước lần đăng xuất / đổi mật khẩu gần nhất → đã bị thu hồi.
    if (payload.ver !== user.tokenVersion) {
      throw new UnauthorizedException({ error: 'Phiên đăng nhập đã kết thúc, vui lòng đăng nhập lại' });
    }
    req.user = { id: user.id, username: user.username, fullName: user.fullName, role: user.role };
    return true;
  }
}

export function extractToken(req: Request): string | undefined {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  const cookie = (req.cookies as Record<string, string> | undefined)?.[config.cookieName];
  return cookie || undefined;
}
