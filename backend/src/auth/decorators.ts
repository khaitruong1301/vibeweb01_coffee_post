import { applyDecorators, createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth } from '@nestjs/swagger';
import { ApiErrors, BEARER, COOKIE } from '../common/swagger';
import type { Role } from '../generated/prisma/enums';
import type { AuthUser } from './auth.types';

export const IS_PUBLIC = 'isPublic';
export const ROLES = 'roles';

/** Bỏ qua kiểm tra đăng nhập (chỉ dùng cho login, logout, health). */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** Chỉ các vai trò này được gọi. Không gắn = mọi nhân viên đã đăng nhập. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES, roles);

/**
 * Gắn cho route cần đăng nhập: phân quyền (`@Roles`) + tài liệu Swagger (ổ khóa, lỗi 401/403) trong một chỗ,
 * để tài liệu luôn khớp quyền thật. Guard toàn cục vẫn chặn kể cả khi quên gắn decorator này.
 */
export function Auth(...roles: Role[]) {
  return applyDecorators(
    ...(roles.length ? [Roles(...roles)] : []),
    ApiBearerAuth(BEARER),
    ApiCookieAuth(COOKIE),
    roles.length ? ApiErrors(401, 403) : ApiErrors(401),
  );
}

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthUser => ctx.switchToHttp().getRequest<{ user: AuthUser }>().user,
);
