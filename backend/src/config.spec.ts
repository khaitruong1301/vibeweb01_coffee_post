import { DEV_JWT_SECRET, productionConfigErrors } from './config';

const STRONG = 'x'.repeat(40);

describe('Kiểm tra cấu hình production (từ chối khởi động nếu không an toàn)', () => {
  it('ngoài production không kiểm tra', () => {
    expect(productionConfigErrors({ JWT_SECRET: DEV_JWT_SECRET })).toEqual([]);
  });

  it('production + JWT_SECRET mặc định / thiếu / ngắn → lỗi', () => {
    expect(productionConfigErrors({ APP_ENV: 'production', JWT_SECRET: DEV_JWT_SECRET })).toHaveLength(1);
    expect(productionConfigErrors({ APP_ENV: 'production' })).toHaveLength(1);
    expect(productionConfigErrors({ APP_ENV: 'production', JWT_SECRET: 'ngan' })[0]).toContain('32 ký tự');
  });

  it('production + SEED=true mà thiếu SEED_PASSWORD → lỗi (không seed mật khẩu demo)', () => {
    expect(productionConfigErrors({ APP_ENV: 'production', JWT_SECRET: STRONG, SEED: 'true' })[0]).toContain('SEED_PASSWORD');
  });

  it('production cấu hình đầy đủ → hợp lệ', () => {
    expect(productionConfigErrors({ APP_ENV: 'production', JWT_SECRET: STRONG, SEED: 'true', SEED_PASSWORD: 'MatKhauRieng2026' })).toEqual([]);
    expect(productionConfigErrors({ APP_ENV: 'production', JWT_SECRET: STRONG, SEED: 'false' })).toEqual([]);
  });
});
