import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

/** Mật khẩu yếu thường gặp + mật khẩu demo công khai trong README — không cho đặt lại. */
export const BANNED_PASSWORDS = ['coffee@123', '12345678', '123456789', 'password', 'password1', 'matkhau123', 'admin123', 'qwerty123'];

export class ChangePasswordDto {
  /** @example "Coffee@123" */
  @IsString({ message: 'Vui lòng nhập mật khẩu hiện tại' })
  @MinLength(1, { message: 'Vui lòng nhập mật khẩu hiện tại' })
  @MaxLength(72)
  currentPassword: string;

  /**
   * 8–72 ký tự, có cả chữ và số; không trùng mật khẩu cũ, không chứa tên đăng nhập, không phải mật khẩu phổ biến
   * @example "CaPhe2026!"
   */
  @IsString({ message: 'Vui lòng nhập mật khẩu mới' })
  @MinLength(8, { message: 'Mật khẩu mới tối thiểu 8 ký tự' })
  @MaxLength(72, { message: 'Mật khẩu mới tối đa 72 ký tự' })
  @Matches(/[A-Za-zÀ-ỹ]/, { message: 'Mật khẩu mới phải có chữ cái' })
  @Matches(/\d/, { message: 'Mật khẩu mới phải có chữ số' })
  newPassword: string;
}
