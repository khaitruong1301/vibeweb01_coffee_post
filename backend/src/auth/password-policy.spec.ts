import { BadRequestException } from '@nestjs/common';
import { createValidationPipe } from '../common/validation';
import { passwordProblem } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';

const pipe = createValidationPipe();
const errorsOf = async (newPassword: string) => {
  try {
    await pipe.transform({ currentPassword: 'x', newPassword }, { type: 'body', metatype: ChangePasswordDto });
    return {};
  } catch (e) {
    return ((e as BadRequestException).getResponse() as { details: Record<string, string> }).details;
  }
};

describe('Luật mật khẩu mới', () => {
  it.each([
    ['Ab1', 'tối thiểu 8'],
    ['abcdefgh', 'chữ số'],
    ['12345678', 'chữ cái'],
    ['a1'.repeat(40), 'tối đa 72'],
  ])('%p bị DTO từ chối (%s)', async (pw, msg) => {
    expect((await errorsOf(pw)).newPassword).toContain(msg);
  });

  it('mật khẩu tốt qua DTO', async () => {
    expect(await errorsOf('CaPhe2026!')).toEqual({});
  });

  it.each([
    ['Coffee@123', 'Coffee@123', 'trùng mật khẩu cũ'],
    ['thungan1abc', 'Coffee@123', 'chứa tên đăng nhập'],
    ['Coffee@123', 'MatKhauCu1', 'mật khẩu demo công khai'],
    ['Password1', 'MatKhauCu1', 'mật khẩu phổ biến'],
  ])('%p (cũ %p) bị từ chối: %s', (pw, current) => {
    expect(passwordProblem(pw, current, 'thungan1')).not.toBeNull();
  });

  it('chuỗi có dấu dài > 72 byte bị từ chối (giới hạn của bcrypt)', () => {
    expect(passwordProblem('Mậtkhẩuđẹp1'.repeat(5), 'x', 'zz')).toContain('72 byte');
  });

  it('mật khẩu hợp lệ', () => {
    expect(passwordProblem('CaPhe2026!', 'Coffee@123', 'thungan1')).toBeNull();
  });
});
