import { IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  /** @example "thungan1" */
  @IsString({ message: 'Vui lòng nhập tên đăng nhập' })
  @MinLength(1, { message: 'Vui lòng nhập tên đăng nhập' })
  @MaxLength(50)
  username: string;

  /** @example "Coffee@123" */
  @IsString({ message: 'Vui lòng nhập mật khẩu' })
  @MinLength(1, { message: 'Vui lòng nhập mật khẩu' })
  @MaxLength(72)
  password: string;
}
