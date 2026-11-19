import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../generated/prisma/enums';

export class AuthUserDto {
  /** @example 2 */
  id: number;
  /** @example "thungan1" */
  username: string;
  /** @example "Thu ngân Lan" */
  fullName: string;
  /** cashier = Thu ngân · barista = Pha chế · admin = Chủ quán */
  @ApiProperty({ enum: Role, example: 'cashier' })
  role: Role;
}

export class LoginResponseDto {
  user: AuthUserDto;
  /**
   * JWT (12 giờ) — dùng cho header `Authorization: Bearer`. Cookie httpOnly `coffeepos_token` cũng được đặt.
   * @example "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   */
  token: string;
}

export class MeResponseDto {
  user: AuthUserDto;
}
