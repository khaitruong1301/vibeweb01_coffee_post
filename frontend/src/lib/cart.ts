// Logic giỏ hàng thuần (không React) — tách khỏi trang Checkout để unit test được.
// Tổng tiền ở đây CHỈ để hiển thị; server tính lại từ giá trong DB (BR01).
import type { Product, Size } from './types';

/** BR02 — khớp MIN_QTY / MAX_QTY ở backend (src/pricing/pricing.ts). Server vẫn kiểm tra lại. */
export const MIN_QTY = 1;
export const MAX_QTY = 50;

/** Kiểm tra ô số lượng thu ngân gõ tự do; trả thông báo lỗi hoặc null nếu hợp lệ. */
export function qtyError(qty: string): string | null {
  if (!/^-?\d+$/.test(qty.trim())) return 'Nhập số nguyên';
  const n = Number(qty);
  if (n < MIN_QTY) return n < 0 ? 'Không nhận số âm' : `Tối thiểu ${MIN_QTY}`;
  if (n > MAX_QTY) return `Tối đa ${MAX_QTY} ly mỗi món`;
  return null;
}

/** Đơn giá hiển thị: size L dùng `priceL` do server trả về, còn lại giá gốc. */
export function priceOf(p: Pick<Product, 'price' | 'priceL'>, size: Size | null): number {
  return size === 'L' && p.priceL !== null ? p.priceL : p.price;
}

export interface CartLineView {
  key: string;
  product: Pick<Product, 'price' | 'priceL'>;
  size: Size | null;
  qty: string;
}

/** Tạm tính / phụ thu / tổng; dòng có số lượng sai không được cộng vào. */
export function summarize(lines: CartLineView[]) {
  const errors: Record<string, string | null> = Object.fromEntries(lines.map((l) => [l.key, qtyError(l.qty)]));
  let subtotal = 0;
  let surcharge = 0;
  for (const l of lines) {
    if (errors[l.key]) continue;
    const q = Number(l.qty);
    subtotal += l.product.price * q;
    surcharge += (priceOf(l.product, l.size) - l.product.price) * q;
  }
  return { errors, hasErrors: Object.values(errors).some(Boolean), subtotal, surcharge, total: subtotal + surcharge };
}

/** Bấm +/−: không vượt MAX_QTY; trả null khi giảm dưới MIN_QTY (hỏi xóa món). */
export function stepQty(current: string, delta: number): string | null {
  const n = (Number(current) || 0) + delta;
  if (n < MIN_QTY) return null;
  return String(Math.min(MAX_QTY, n));
}
