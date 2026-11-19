import { execSync } from 'node:child_process';
import { Test } from '@nestjs/testing';
import { Prisma } from '../src/generated/prisma/client';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { resetDatabase } from '../src/seed/seed';

/** #8 Database — ràng buộc ở tầng DB là lớp chặn cuối khi code có lỗi. Chạy trên coffeepos_test. */
describe('Database (coffeepos_test)', () => {
  let prisma: PrismaService;
  let cashierId: number;
  let productId: number;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [PrismaModule] }).compile();
    prisma = mod.get(PrismaService);
    await resetDatabase(prisma);
    cashierId = (await prisma.user.findUniqueOrThrow({ where: { username: 'thungan1' } })).id;
    productId = (await prisma.product.findFirstOrThrow({ where: { name: 'Bạc xỉu' } })).id;
  });
  afterAll(() => prisma.$disconnect());

  const item = (over: Partial<Prisma.OrderItemCreateWithoutOrderInput> = {}) => ({
    product: { connect: { id: productId } }, productName: 'Bạc xỉu', unitPrice: 32000, quantity: 1, lineTotal: 32000, ...over,
  });
  const order = (over: Partial<Prisma.OrderCreateInput> = {}, items = [item()]) =>
    prisma.order.create({ data: { cashier: { connect: { id: cashierId } }, total: 32000, items: { create: items }, ...over } });

  it('đang chạy đúng DB test', async () => {
    const [{ db }] = await prisma.$queryRaw<{ db: string }[]>`SELECT current_database() AS db`;
    expect(db).toBe('coffeepos_test');
  });

  it('migration đã áp dụng khớp hoàn toàn schema.prisma (không drift)', () => {
    const out = execSync('npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code', {
      env: process.env,
      encoding: 'utf8',
    });
    expect(out).toMatch(/No difference detected|empty migration/i);
  });

  describe('CHECK constraint', () => {
    it.each([0, -1, 51])('BR02: quantity = %p bị DB từ chối', async (quantity) => {
      await expect(order({ total: 32000 * Math.max(quantity, 1) }, [item({ quantity, lineTotal: 32000 * quantity })])).rejects.toThrow(
        /order_items_quantity_range|check constraint/i,
      );
    });

    it('line_total phải = unit_price × quantity', async () => {
      await expect(order({}, [item({ quantity: 2, lineTotal: 1 })])).rejects.toThrow(/order_items_amount_positive|check constraint/i);
    });

    it('BR01: giá món phải > 0', async () => {
      await expect(prisma.product.update({ where: { id: productId }, data: { price: 0 } })).rejects.toThrow(/products_price_positive|check constraint/i);
    });

    it('BR03: tổng đơn phải > 0', async () => {
      await expect(order({ total: 0 })).rejects.toThrow(/orders_total_positive|check constraint/i);
    });

    it('UC04: đơn GrabFood thiếu mã đơn đối tác bị từ chối, có mã thì được', async () => {
      await expect(order({ source: 'grabfood' })).rejects.toThrow(/orders_partner_code_required|check constraint/i);
      await expect(order({ source: 'grabfood', partnerCode: '   ' })).rejects.toThrow(/check constraint/i);
      await expect(order({ source: 'grabfood', partnerCode: 'GF-1' })).resolves.toMatchObject({ partnerCode: 'GF-1' });
    });
  });

  describe('khóa ngoại & unique', () => {
    it('không xóa được món đã có trong đơn (RESTRICT) — dữ liệu bán hàng không mất', async () => {
      await order();
      await expect(prisma.product.delete({ where: { id: productId } })).rejects.toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
    });

    it('không xóa được nhân viên đã có đơn (RESTRICT)', async () => {
      await expect(prisma.user.delete({ where: { id: cashierId } })).rejects.toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
    });

    it('xóa đơn thì xóa luôn chi tiết đơn (CASCADE)', async () => {
      const o = await order();
      await prisma.order.delete({ where: { id: o.id } });
      expect(await prisma.orderItem.count({ where: { orderId: o.id } })).toBe(0);
    });

    it('xóa người sửa giá → products.updated_by_id thành NULL (SET NULL)', async () => {
      const u = await prisma.user.create({ data: { username: 'tam', passwordHash: 'x', fullName: 'Tạm', role: 'admin' } });
      const p = await prisma.product.update({ where: { id: productId }, data: { updatedById: u.id } });
      await prisma.user.delete({ where: { id: u.id } });
      expect((await prisma.product.findUniqueOrThrow({ where: { id: p.id } })).updatedById).toBeNull();
    });

    it('tên món và username là duy nhất (P2002)', async () => {
      await expect(
        prisma.product.create({ data: { name: 'Bạc xỉu', price: 1000, category: { connect: { name: 'Cà phê' } } } }),
      ).rejects.toMatchObject({ code: 'P2002' });
      await expect(
        prisma.user.create({ data: { username: 'thungan1', passwordHash: 'x', fullName: 'Trùng', role: 'cashier' } }),
      ).rejects.toMatchObject({ code: 'P2002' });
    });
  });

  it('thời điểm lưu UTC (timestamptz) — không lệch múi giờ', async () => {
    const before = Date.now();
    const o = await order();
    expect(Math.abs(o.createdAt.getTime() - before)).toBeLessThan(5000);
  });

  it('seed chỉ chạy khi DB trống (không ghi đè giá đã sửa)', async () => {
    const { seedDatabase } = await import('../src/seed/seed');
    await prisma.product.update({ where: { id: productId }, data: { price: 33000 } });
    expect(await seedDatabase(prisma, { onlyIfEmpty: true })).toEqual({ skipped: true });
    expect((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).price).toBe(33000);
  });
});
