import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { configureApp } from '../src/app.factory';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { DEMO_PASSWORD } from '../src/seed/seed-data';
import { resetDatabase } from '../src/seed/seed';

/**
 * Kiểm thử API bán hàng trên DB test (coffeepos_test), dữ liệu nạp lại trước mỗi nhóm.
 * Mã BR / L khớp .claude/docs/requirements/use-case.md.
 */
describe('CoffeePOS API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const tokens: Record<string, string> = {};
  const productId: Record<string, number> = {};

  const api = () => request(app.getHttpServer());
  const as = (user: string) => ({ Authorization: `Bearer ${tokens[user]}` });
  const order = (items: unknown[], extra: Record<string, unknown> = {}) => ({ items, ...extra });

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(mod.createNestApplication());
    await app.init();
    prisma = app.get(PrismaService);
    await resetDatabase(prisma);

    for (const u of ['chuquan', 'thungan1', 'phache1']) {
      const res = await api().post('/api/auth/login').send({ username: u, password: DEMO_PASSWORD }).expect(200);
      tokens[u] = res.body.token;
    }
    for (const p of await prisma.product.findMany()) productId[p.name] = p.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Đăng nhập (UC01)', () => {
    it('sai mật khẩu → 401, thông báo chung', async () => {
      const res = await api().post('/api/auth/login').send({ username: 'thungan1', password: 'sai' }).expect(401);
      expect(res.body).toEqual({ error: 'Sai tên đăng nhập hoặc mật khẩu' });
    });

    it('đăng nhập đặt cookie httpOnly và trả user, không trả password', async () => {
      const res = await api().post('/api/auth/login').send({ username: 'thungan1', password: DEMO_PASSWORD }).expect(200);
      expect(res.headers['set-cookie'][0]).toMatch(/coffeepos_token=.*HttpOnly/);
      expect(res.body.user).toMatchObject({ username: 'thungan1', role: 'cashier' });
      expect(JSON.stringify(res.body)).not.toContain('password');
    });

    it('cookie dùng được thay cho Bearer', async () => {
      const login = await api().post('/api/auth/login').send({ username: 'thungan1', password: DEMO_PASSWORD });
      const res = await api().get('/api/auth/me').set('Cookie', login.headers['set-cookie']).expect(200);
      expect(res.body.user.username).toBe('thungan1');
    });
  });

  describe('Tạo đơn — POST /api/orders (UC02)', () => {
    it('L1 / BR04: chưa đăng nhập → 401 và không lưu đơn', async () => {
      const before = await prisma.order.count();
      await api().post('/api/orders').send(order([{ productId: productId['Bạc xỉu'], size: 'M', quantity: 1 }])).expect(401);
      expect(await prisma.order.count()).toBe(before);
    });

    it('BR04: token giả → 401', async () => {
      await api()
        .post('/api/orders')
        .set('Authorization', 'Bearer abc.def.ghi')
        .send(order([{ productId: productId['Bạc xỉu'], size: 'M', quantity: 1 }]))
        .expect(401);
    });

    it('pha chế không được tạo đơn → 403', async () => {
      await api()
        .post('/api/orders')
        .set(as('phache1'))
        .send(order([{ productId: productId['Bạc xỉu'], size: 'M', quantity: 1 }]))
        .expect(403);
    });

    it('đơn hợp lệ → 201, tổng tính từ giá DB, mã CP-…', async () => {
      const res = await api()
        .post('/api/orders')
        .set(as('thungan1'))
        .send(
          order([
            { productId: productId['Cà phê sữa đá'], size: 'L', quantity: 2 }, // 2 × 35.000
            { productId: productId['Trà đào cam sả'], size: 'M', quantity: 1 }, // 39.000
            { productId: productId['Bánh croissant'], quantity: 1 }, // 28.000
          ]),
        )
        .expect(201);
      expect(res.body.code).toMatch(/^CP-\d{6}$/);
      expect(res.body.total).toBe(137000);
      expect(res.body.status).toBe('pending');
      expect(res.body.items).toHaveLength(3);

      const saved = await prisma.order.findUnique({ where: { id: res.body.id }, include: { items: true } });
      expect(saved?.total).toBe(137000);
      expect(saved?.items.map((i) => i.lineTotal)).toEqual([70000, 39000, 28000]);
    });

    it('L3 / BR01: giá, tổng do trình duyệt gửi bị bỏ qua', async () => {
      const res = await api()
        .post('/api/orders')
        .set(as('thungan1'))
        .send({
          total: 1000,
          items: [{ productId: productId['Cà phê sữa đá'], size: 'M', quantity: 2, price: 1, unitPrice: 1, lineTotal: 2 }],
        })
        .expect(201);
      expect(res.body.items[0].unitPrice).toBe(29000);
      expect(res.body.total).toBe(58000);
    });

    it('BR05: size L cộng 6.000đ, món không size bỏ qua size', async () => {
      const res = await api()
        .post('/api/orders')
        .set(as('thungan1'))
        .send(
          order([
            { productId: productId['Americano'], size: 'S', quantity: 1 },
            { productId: productId['Americano'], size: 'L', quantity: 1 },
            { productId: productId['Bánh tiramisu'], size: 'L', quantity: 1 },
          ]),
        )
        .expect(201);
      expect(res.body.items.map((i: { unitPrice: number }) => i.unitPrice)).toEqual([35000, 41000, 35000]);
      expect(res.body.items[2].size).toBeNull();
    });

    it('BR03: đơn không có món → 400', async () => {
      const res = await api().post('/api/orders').set(as('thungan1')).send(order([])).expect(400);
      expect(res.body.error).toBe('Dữ liệu không hợp lệ');
      expect(res.body.details.items).toBe('Đơn phải có ít nhất một món');
    });

    it('BR03: thiếu items → 400', async () => {
      await api().post('/api/orders').set(as('thungan1')).send({}).expect(400);
    });

    it.each([
      ['âm (L2)', -1],
      ['bằng 0', 0],
      ['51', 51],
      ['thập phân', 1.5],
      ['chuỗi', '2'],
    ])('L2 / BR02: số lượng %s → 400 và không lưu đơn', async (_label, quantity) => {
      const before = await prisma.order.count();
      const res = await api()
        .post('/api/orders')
        .set(as('thungan1'))
        .send(order([{ productId: productId['Bạc xỉu'], size: 'M', quantity }]))
        .expect(400);
      expect(res.body.details['items.0.quantity']).toBeDefined();
      expect(await prisma.order.count()).toBe(before);
    });

    it('BR02: biên 50 ly hợp lệ', async () => {
      const res = await api()
        .post('/api/orders')
        .set(as('thungan1'))
        .send(order([{ productId: productId['Cà phê đen đá'], size: 'M', quantity: 50 }]))
        .expect(201);
      expect(res.body.total).toBe(50 * 25000);
    });

    it('BR02: cùng món tách 2 dòng tổng 51 ly → 400', async () => {
      const res = await api()
        .post('/api/orders')
        .set(as('thungan1'))
        .send(
          order([
            { productId: productId['Bạc xỉu'], size: 'M', quantity: 30 },
            { productId: productId['Bạc xỉu'], size: 'L', quantity: 21 },
          ]),
        )
        .expect(400);
      expect(res.body.error).toContain('tối đa 50 ly');
    });

    it('món ngừng bán / không tồn tại → 400', async () => {
      await api()
        .post('/api/orders')
        .set(as('thungan1'))
        .send(order([{ productId: productId['Sinh tố bơ'], size: 'M', quantity: 1 }]))
        .expect(400);
      await api()
        .post('/api/orders')
        .set(as('thungan1'))
        .send(order([{ productId: 999999, size: 'M', quantity: 1 }]))
        .expect(400);
    });

    it('size không hợp lệ hoặc thiếu size cho món có size → 400', async () => {
      await api()
        .post('/api/orders')
        .set(as('thungan1'))
        .send(order([{ productId: productId['Bạc xỉu'], size: 'XL', quantity: 1 }]))
        .expect(400);
      await api()
        .post('/api/orders')
        .set(as('thungan1'))
        .send(order([{ productId: productId['Bạc xỉu'], quantity: 1 }]))
        .expect(400);
    });

    it('UC04: đơn GrabFood bắt buộc mã đơn đối tác', async () => {
      const items = [{ productId: productId['Trà vải'], size: 'M', quantity: 1 }];
      const bad = await api().post('/api/orders').set(as('thungan1')).send(order(items, { source: 'grabfood' })).expect(400);
      expect(bad.body.details.partnerCode).toBeDefined();
      const ok = await api()
        .post('/api/orders')
        .set(as('thungan1'))
        .send(order(items, { source: 'grabfood', partnerCode: 'GF-123' }))
        .expect(201);
      expect(ok.body).toMatchObject({ source: 'grabfood', partnerCode: 'GF-123' });
    });
  });

  describe('Sửa giá rồi bán (UC06 + UC02) — "sửa giá xong làm sao biết không tính sai?"', () => {
    it('thu ngân không sửa được giá → 403 (BR01)', async () => {
      await api().patch(`/api/products/${productId['Bạc xỉu']}`).set(as('thungan1')).send({ price: 1000 }).expect(403);
    });

    it('chủ quán sửa giá → đơn mới tính giá mới, đơn cũ giữ giá cũ', async () => {
      const id = productId['Cappuccino'];
      const oldOrder = await api()
        .post('/api/orders')
        .set(as('thungan1'))
        .send(order([{ productId: id, size: 'L', quantity: 1 }]))
        .expect(201);
      expect(oldOrder.body.total).toBe(45000 + 6000);

      const upd = await api().patch(`/api/products/${id}`).set(as('chuquan')).send({ price: 50000 }).expect(200);
      expect(upd.body).toMatchObject({ price: 50000, priceL: 56000, updatedBy: { fullName: 'Chủ quán' } });

      const newOrder = await api()
        .post('/api/orders')
        .set(as('thungan1'))
        .send(order([{ productId: id, size: 'L', quantity: 2 }]))
        .expect(201);
      expect(newOrder.body.total).toBe(2 * 56000);

      const receipt = await api().get(`/api/orders/${oldOrder.body.code}`).set(as('thungan1')).expect(200);
      expect(receipt.body.total).toBe(51000);
    });

    it('giá không hợp lệ → 400', async () => {
      for (const price of [0, -5000, 1500.5, 2_000_000]) {
        await api().patch(`/api/products/${productId['Bạc xỉu']}`).set(as('chuquan')).send({ price }).expect(400);
      }
    });

    it('món ngừng bán không hiện ở menu bán hàng, chủ quán xem được với all=true', async () => {
      const menu = await api().get('/api/products').set(as('thungan1')).expect(200);
      expect(menu.body.items.map((p: { name: string }) => p.name)).not.toContain('Sinh tố bơ');
      await api().get('/api/products?all=true').set(as('thungan1')).expect(403);
      const all = await api().get('/api/products?all=true').set(as('chuquan')).expect(200);
      expect(all.body.items.map((p: { name: string }) => p.name)).toContain('Sinh tố bơ');
    });
  });

  describe('Hóa đơn & quầy pha (UC03, UC05)', () => {
    it('mã đơn không tồn tại → 404', async () => {
      await api().get('/api/orders/CP-999999').set(as('thungan1')).expect(404);
      await api().get('/api/orders/abc').set(as('thungan1')).expect(404);
    });

    it('pha chế chuyển trạng thái đúng thứ tự, không nhảy bước', async () => {
      const created = await api()
        .post('/api/orders')
        .set(as('thungan1'))
        .send(order([{ productId: productId['Trà sữa trân châu'], size: 'M', quantity: 1 }]))
        .expect(201);
      const id = created.body.id;

      const board = await api().get('/api/orders').set(as('phache1')).expect(200);
      expect(board.body.items.map((o: { id: number }) => o.id)).toContain(id);

      await api().patch(`/api/orders/${id}/status`).set(as('phache1')).send({ status: 'ready' }).expect(409);
      await api().patch(`/api/orders/${id}/status`).set(as('thungan1')).send({ status: 'preparing' }).expect(403);
      await api().patch(`/api/orders/${id}/status`).set(as('phache1')).send({ status: 'preparing' }).expect(200);
      await api().patch(`/api/orders/${id}/status`).set(as('phache1')).send({ status: 'ready' }).expect(200);
      const done = await api().patch(`/api/orders/${id}/status`).set(as('phache1')).send({ status: 'done' }).expect(200);
      expect(done.body.status).toBe('done');

      const after = await api().get('/api/orders').set(as('phache1')).expect(200);
      expect(after.body.items.map((o: { id: number }) => o.id)).not.toContain(id);
    });
  });

  it('GET /api/health công khai', async () => {
    const res = await api().get('/api/health').expect(200);
    expect(res.body).toMatchObject({ status: 'ok', db: 'ok' });
  });
});
