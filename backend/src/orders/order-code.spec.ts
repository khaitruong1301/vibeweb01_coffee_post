import { orderCode, parseOrderCode } from './order-code';

describe('mã đơn CP-…', () => {
  it.each([
    [1, 'CP-000001'],
    [123, 'CP-000123'],
    [1234567, 'CP-1234567'],
  ])('id %p → %p', (id, code) => {
    expect(orderCode(id)).toBe(code);
  });

  it('đọc lại được mã vừa sinh (khứ hồi)', () => {
    for (const id of [1, 42, 999999]) expect(parseOrderCode(orderCode(id))).toBe(id);
  });

  it('không phân biệt hoa thường, bỏ khoảng trắng', () => {
    expect(parseOrderCode(' cp-000042 ')).toBe(42);
  });

  it.each(['', 'abc', 'CP-', 'CP-abc', 'CP-000000', 'XX-000001', 'CP-1; DROP TABLE orders', 'CP-99999999999'])(
    'mã không hợp lệ %p → null',
    (code) => {
      expect(parseOrderCode(code)).toBeNull();
    },
  );
});
