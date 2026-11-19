import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser, JwtPayload } from './auth.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(username: string, password: string): Promise<{ user: AuthUser; token: string }> {
    const found = await this.prisma.user.findUnique({ where: { username: username.trim().toLowerCase() } });
    // Cùng một thông báo cho "sai tên" và "sai mật khẩu" để không lộ tài khoản tồn tại.
    const ok = found && found.isActive && (await bcrypt.compare(password, found.passwordHash));
    if (!ok) throw new UnauthorizedException({ error: 'Sai tên đăng nhập hoặc mật khẩu' });

    const user: AuthUser = { id: found.id, username: found.username, fullName: found.fullName, role: found.role };
    const payload: JwtPayload = { sub: user.id, role: user.role };
    return { user, token: await this.jwt.signAsync(payload) };
  }
}
