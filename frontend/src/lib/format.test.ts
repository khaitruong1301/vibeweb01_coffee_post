import { describe, expect, it } from 'vitest';
import { formatDateTime, formatTime, formatVnd } from './format';
import { homeOf, NAV } from './roles';

describe('format', () => {
  it('formatVnd dùng dấu chấm ngăn nghìn + đ', () => {
    expect(formatVnd(0)).toBe('0đ');
    expect(formatVnd(35000)).toBe('35.000đ');
    expect(formatVnd(1600000)).toBe('1.600.000đ');
  });

  it('giờ hiển thị theo Asia/Ho_Chi_Minh (UTC+7), không theo múi giờ máy', () => {
    expect(formatTime('2026-11-19T00:42:00.000Z')).toBe('07:42');
    expect(formatDateTime('2026-11-19T17:30:00.000Z')).toContain('20/11/2026'); // qua ngày theo giờ VN
  });
});

describe('roles', () => {
  it('trang mặc định theo vai trò', () => {
    expect(homeOf('cashier')).toBe('/checkout');
    expect(homeOf('barista')).toBe('/barista');
    expect(homeOf('admin')).toBe('/products');
  });

  it('menu "Sản phẩm" và "Kiểm thử" chỉ dành cho Chủ quán', () => {
    expect(NAV.find((n) => n.href === '/products')?.roles).toEqual(['admin']);
    expect(NAV.find((n) => n.href === '/quality')?.roles).toEqual(['admin']);
  });
});
