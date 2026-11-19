import { describe, expect, it } from 'vitest';
import { MAX_QTY, priceOf, qtyError, stepQty, summarize } from './cart';

const caPhe = { price: 29000, priceL: 35000 };
const banh = { price: 28000, priceL: null };

describe('qtyError — BR02 trên giao diện', () => {
  it.each(['1', '2', '50', ' 7 '])('%p hợp lệ', (q) => expect(qtyError(q)).toBeNull());
  it.each([
    ['0', 'Tối thiểu 1'],
    ['-3', 'Không nhận số âm'],
    ['51', 'Tối đa 50 ly mỗi món'],
    ['1.5', 'Nhập số nguyên'],
    ['', 'Nhập số nguyên'],
    ['abc', 'Nhập số nguyên'],
  ])('%p → %p', (q, msg) => expect(qtyError(q)).toBe(msg));
});

describe('priceOf — BR05 hiển thị', () => {
  it('size L dùng priceL do server trả', () => expect(priceOf(caPhe, 'L')).toBe(35000));
  it('S / M / không size dùng giá gốc', () => {
    expect(priceOf(caPhe, 'S')).toBe(29000);
    expect(priceOf(caPhe, 'M')).toBe(29000);
    expect(priceOf(banh, null)).toBe(28000);
  });
});

describe('summarize', () => {
  it('tách tạm tính và phụ thu size L', () => {
    const r = summarize([
      { key: 'a', product: caPhe, size: 'L', qty: '2' },
      { key: 'b', product: banh, size: null, qty: '1' },
    ]);
    expect(r).toMatchObject({ subtotal: 86000, surcharge: 12000, total: 98000, hasErrors: false });
  });

  it('dòng sai số lượng không cộng tiền và bật cờ lỗi', () => {
    const r = summarize([
      { key: 'a', product: caPhe, size: 'M', qty: '-1' },
      { key: 'b', product: banh, size: null, qty: '1' },
    ]);
    expect(r.hasErrors).toBe(true);
    expect(r.errors.a).toBe('Không nhận số âm');
    expect(r.total).toBe(28000);
  });

  it('giỏ trống → 0đ', () => expect(summarize([]).total).toBe(0));
});

describe('stepQty', () => {
  it('tăng / giảm 1', () => {
    expect(stepQty('2', 1)).toBe('3');
    expect(stepQty('2', -1)).toBe('1');
  });
  it('không vượt 50', () => expect(stepQty(String(MAX_QTY), 1)).toBe('50'));
  it('giảm dưới 1 → null (hỏi xóa món)', () => expect(stepQty('1', -1)).toBeNull());
  it('ô đang lỗi coi như 0', () => expect(stepQty('abc', 1)).toBe('1'));
});
