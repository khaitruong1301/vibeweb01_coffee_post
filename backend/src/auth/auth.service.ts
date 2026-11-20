import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser, JwtPayload } from './auth.types';
import { BANNED_PASSWORDS } from './dto/change-password.dto';
import { LoginLimiter } from './login-limiter';

const BCRYPT_ROUNDS = 10;
/** Hash giả (sinh một lần lúc khởi động) để so khi tên đăng nhập không tồn tại — thời gian phản hồi như nhau. */
const DUMMY_HASH = bcrypt.hashSync('khong-phai-mat-khau-that', BCRYPT_ROUNDS);

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly limiter: LoginLimiter,
  ) {}

  private sign(user: { id: number; role: AuthUser['role']; tokenVersion: number }) {
    const payload: JwtPayload = { sub: user.id, role: user.role, ver: user.tokenVersion };
    return this.jwt.signAsync(payload);
  }

  async login(username: string, password: string, ip: string): Promise<{ user: AuthUser; token: string }> {
    this.limiter.assertAllowed(username, ip);
    const found = await this.prisma.user.findUnique({ where: { username: username.trim().toLowerCase() } });
    // Luôn chạy bcrypt (kể cả tên không tồn tại) để thời gian phản hồi không lộ tài khoản có thật.
    const hash = found?.passwordHash ?? DUMMY_HASH;
    const ok = (await bcrypt.compare(password, hash)) && !!found && found.isActive;
    if (!ok || !found) {
      this.limiter.recordFailure(username, ip);
      // Cùng một thông báo cho "sai tên" và "sai mật khẩu".
      throw new UnauthorizedException({ error: 'Sai tên đăng nhập hoặc mật khẩu' });
    }
    this.limiter.recordSuccess(username);
    const user: AuthUser = { id: found.id, username: found.username, fullName: found.fullName, role: found.role };
    return { user, token: await this.sign(found) };
  }

  /** Đổi mật khẩu → tăng token_version (đăng xuất mọi phiên khác) và cấp token mới cho phiên hiện tại. */
  async changePassword(userId: number, currentPassword: string, newPassword: string, ip: string) {
    const found = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    this.limiter.assertAllowed(found.username, ip);
    if (!(await bcrypt.compare(currentPassword, found.passwordHash))) {
      this.limiter.recordFailure(found.username, ip);
      throw new BadRequestException({ error: 'Dữ liệu không hợp lệ', details: { currentPassword: 'Mật khẩu hiện tại không đúng' } });
    }
    const problem = passwordProblem(newPassword, currentPassword, found.username);
    if (problem) throw new BadRequestException({ error: 'Dữ liệu không hợp lệ', details: { newPassword: problem } });

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await bcrypt.hash(newPassword, BCRYPT_ROUNDS), tokenVersion: { increment: 1 } },
    });
    this.limiter.recordSuccess(found.username);
    const user: AuthUser = { id: updated.id, username: updated.username, fullName: updated.fullName, role: updated.role };
    return { user, token: await this.sign(updated) };
  }

  /** Thu hồi mọi token đang có của tài khoản (gọi khi đăng xuất). Token sai / hết hạn thì bỏ qua. */
  async revoke(token: string | undefined): Promise<void> {
    if (!token) return;
    try {
      const { sub, ver } = await this.jwt.verifyAsync<JwtPayload>(token);
      await this.prisma.user.updateMany({ where: { id: sub, tokenVersion: ver }, data: { tokenVersion: { increment: 1 } } });
    } catch {
      /* token không hợp lệ — chỉ cần xoá cookie */
    }
  }
}

/** Luật mật khẩu ngoài phần DTO kiểm được (cần biết mật khẩu cũ / tên đăng nhập). */
export function passwordProblem(newPassword: string, currentPassword: string, username: string): string | null {
  if (newPassword === currentPassword) return 'Mật khẩu mới phải khác mật khẩu hiện tại';
  if (newPassword.toLowerCase().includes(username.toLowerCase())) return 'Mật khẩu không được chứa tên đăng nhập';
  if (BANNED_PASSWORDS.includes(newPassword.toLowerCase())) return 'Mật khẩu quá phổ biến, hãy chọn mật khẩu khác';
  if (Buffer.byteLength(newPassword, 'utf8') > 72) return 'Mật khẩu mới quá dài (tối đa 72 byte)';
  return null;
}
