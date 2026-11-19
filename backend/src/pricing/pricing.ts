// Toàn bộ luật tính tiền nằm ở đây — hàm thuần, không đụng DB, để unit test bao phủ hết.
// Đổi luật giá (ví dụ phụ thu size) chỉ sửa file này; test trong pricing.spec.ts chỉ ra chỗ ảnh hưởng.
import type { Size } from '../generated/prisma/enums';

/** BR05: size L cộng 6.000đ vào giá món. S và M giữ giá gốc. */
export const SIZE_SURCHARGE: Record<Size, number> = { S: 0, M: 0, L: 6000 };

/** BR02: mỗi món 1–50 ly mỗi đơn. */
export const MIN_QTY = 1;
export const MAX_QTY = 50;

export interface PricedProduct {
  id: number;
  name: string;
  price: number;
  hasSize: boolean;
}

export interface LineInput {
  productId: number;
  size?: Size | null;
  quantity: number;
}

export interface PricedLine {
  productId: number;
  productName: string;
  size: Size | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export class PricingError extends Error {}

/** Đơn giá của một món theo size. Món không có size (bánh) luôn tính giá gốc. */
export function unitPrice(product: Pick<PricedProduct, 'price' | 'hasSize'>, size?: Size | null): number {
  if (!product.hasSize || !size) return product.price;
  return product.price + SIZE_SURCHARGE[size];
}

/**
 * Tính tiền cả đơn từ giá trong DB (BR01). Ném PricingError khi vi phạm luật.
 * `products` là danh sách món đang bán lấy từ DB; giá do client gửi không bao giờ được dùng.
 */
export function priceOrder(lines: LineInput[], products: PricedProduct[]): { lines: PricedLine[]; total: number } {
  if (lines.length === 0) throw new PricingError('Đơn phải có ít nhất một món'); // BR03

  const byId = new Map(products.map((p) => [p.id, p]));
  const qtyPerProduct = new Map<number, number>();
  const priced: PricedLine[] = [];

  for (const line of lines) {
    if (!Number.isInteger(line.quantity) || line.quantity < MIN_QTY || line.quantity > MAX_QTY) {
      throw new PricingError(`Số lượng mỗi món phải từ ${MIN_QTY} đến ${MAX_QTY}`);
    }
    const product = byId.get(line.productId);
    if (!product) throw new PricingError(`Món #${line.productId} không tồn tại hoặc đã ngừng bán`);
    if (product.hasSize && !line.size) throw new PricingError(`Vui lòng chọn size cho món "${product.name}"`);

    // BR02 tính theo món trong cả đơn: cùng một món tách nhiều dòng (khác size/ghi chú) vẫn tối đa 50 ly.
    const qty = (qtyPerProduct.get(product.id) ?? 0) + line.quantity;
    if (qty > MAX_QTY) throw new PricingError(`Món "${product.name}" tối đa ${MAX_QTY} ly mỗi đơn`);
    qtyPerProduct.set(product.id, qty);

    const size = product.hasSize ? (line.size ?? null) : null;
    const price = unitPrice(product, size);
    priced.push({
      productId: product.id,
      productName: product.name,
      size,
      unitPrice: price,
      quantity: line.quantity,
      lineTotal: price * line.quantity,
    });
  }

  return { lines: priced, total: priced.reduce((sum, l) => sum + l.lineTotal, 0) };
}
