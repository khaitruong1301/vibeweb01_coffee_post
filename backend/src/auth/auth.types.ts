import type { Role } from '../generated/prisma/enums';

/** Người dùng hiện tại, lấy từ token đã xác minh — không bao giờ lấy từ body. */
export interface AuthUser {
  id: number;
  username: string;
  fullName: string;
  role: Role;
}

export interface JwtPayload {
  sub: number;
  role: Role;
}
