import { MAX_QTY, priceOrder, PricingError, SIZE_SURCHARGE, unitPrice, type PricedProduct } from './pricing';

const caPheSua: PricedProduct = { id: 1, name: 'Cà phê sữa đá', price: 29000, hasSize: true };
const traDao: PricedProduct = { id: 2, name: 'Trà đào cam sả', price: 39000, hasSize: true };
const banh: PricedProduct = { id: 3, name: 'Bánh croissant', price: 28000, hasSize: false };
const menu = [caPheSua, traDao, banh];

describe('unitPrice — BR05 phụ thu size', () => {
  it('size S và M giữ giá gốc', () => {
    expect(unitPrice(caPheSua, 'S')).toBe(29000);
    expect(unitPrice(caPheSua, 'M')).toBe(29000);
  });

  it('size L cộng 6.000đ', () => {
    expect(SIZE_SURCHARGE.L).toBe(6000);
    expect(unitPrice(caPheSua, 'L')).toBe(35000);
  });

  it('món không có size luôn tính giá gốc, kể cả khi gửi size L', () => {
    expect(unitPrice(banh, 'L')).toBe(28000);
  });
});

describe('priceOrder — tổng tiền theo giá DB (BR01)', () => {
  it('tính đúng đơn nhiều món, nhiều size', () => {
    const r = priceOrder(
      [
        { productId: 1, size: 'L', quantity: 2 }, // 2 × 35.000
        { productId: 2, size: 'M', quantity: 1 }, // 39.000
        { productId: 3, quantity: 1 }, // 28.000
      ],
      menu,
    );
    expect(r.lines.map((l) => l.lineTotal)).toEqual([70000, 39000, 28000]);
    expect(r.total).toBe(137000);
  });

  it('chụp tên món và đơn giá vào từng dòng', () => {
    const r = priceOrder([{ productId: 1, size: 'L', quantity: 1 }], menu);
    expect(r.lines[0]).toEqual({
      productId: 1, productName: 'Cà phê sữa đá', size: 'L', unitPrice: 35000, quantity: 1, lineTotal: 35000,
    });
  });

  it('đổi giá trong DB thì tổng đổi theo — không phụ thuộc giá cũ', () => {
    const raised = [{ ...caPheSua, price: 32000 }];
    expect(priceOrder([{ productId: 1, size: 'M', quantity: 3 }], raised).total).toBe(96000);
  });

  it('món không có size lưu size = null', () => {
    expect(priceOrder([{ productId: 3, size: 'L', quantity: 1 }], menu).lines[0].size).toBeNull();
  });
});

describe('priceOrder — luật đơn hàng', () => {
  it('BR03: đơn rỗng bị từ chối', () => {
    expect(() => priceOrder([], menu)).toThrow('Đơn phải có ít nhất một món');
  });

  it.each([0, -1, -3, 51, 1.5, Number.NaN])('BR02: số lượng %p bị từ chối', (q) => {
    expect(() => priceOrder([{ productId: 1, size: 'M', quantity: q }], menu)).toThrow(PricingError);
  });

  it.each([1, MAX_QTY])('BR02: số lượng biên %p hợp lệ', (q) => {
    expect(priceOrder([{ productId: 1, size: 'M', quantity: q }], menu).total).toBe(29000 * q);
  });

  it('BR02: cùng một món tách nhiều dòng vẫn tối đa 50 ly', () => {
    expect(() =>
      priceOrder(
        [
          { productId: 1, size: 'M', quantity: 30 },
          { productId: 1, size: 'L', quantity: 21 },
        ],
        menu,
      ),
    ).toThrow('tối đa 50 ly');
  });

  it('món không có trong danh sách đang bán bị từ chối', () => {
    expect(() => priceOrder([{ productId: 99, size: 'M', quantity: 1 }], menu)).toThrow('không tồn tại');
  });

  it('món có size mà không chọn size bị từ chối', () => {
    expect(() => priceOrder([{ productId: 1, quantity: 1 }], menu)).toThrow('chọn size');
  });
});
