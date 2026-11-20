import { createTestContext, type TestContext } from './helpers';

/** #9 Security — các lớp tấn công thường gặp với API bán hàng. (Lỗi L1–L3 nằm ở orders.e2e-spec.ts / auth.e2e-spec.ts.) */
describe('Bảo mật API', () => {
  let t: TestContext;
  beforeAll(async () => (t = await createTestContext()));
  afterAll(() => t.close());

  describe('SQL injection', () => {
    it.each(["' OR '1'='1", "thungan1'--", 'admin"; DROP TABLE users; --'])('login username %p → 401, DB nguyên vẹn', async (username) => {
      await t.api().post('/api/auth/login').send({ username, password: "' OR '1'='1" }).expect(401);
      expect(await t.prisma.user.count()).toBe(7);
    });

    it('mã đơn chứa SQL → 404, không lỗi 500', async () => {
      await t.api().get(`/api/orders/${encodeURIComponent("CP-1' OR '1'='1")}`).set(t.as('thungan1')).expect(404);
    });

    it('chuỗi SQL trong ghi chú được lưu nguyên văn (truy vấn có tham số)', async () => {
      const note = "'); DELETE FROM orders; --";
      const res = await t
        .api()
        .post('/api/orders')
        .set(t.as('thungan1'))
        .send({ note, items: [{ productId: t.productId('Bạc xỉu'), size: 'M', quantity: 1 }] })
        .expect(201);
      expect(res.body.note).toBe(note);
      expect(await t.prisma.order.count()).toBeGreaterThan(0);
    });
  });

  describe('XSS', () => {
    it('payload HTML lưu dạng chuỗi và trả về Content-Type JSON (React tự escape khi hiển thị)', async () => {
      const xss = '<img src=x onerror=alert(1)>';
      const res = await t
        .api()
        .post('/api/orders')
        .set(t.as('thungan1'))
        .send({ note: xss, items: [{ productId: t.productId('Bạc xỉu'), size: 'M', quantity: 1, note: '<script>alert(1)</script>' }] })
        .expect(201);
      expect(res.headers['content-type']).toMatch(/application\/json/);
      expect(res.body.note).toBe(xss);
    });
  });

  describe('Mass assignment — field không khai báo bị bỏ qua', () => {
    it('tạo đơn: không giả được thu ngân, trạng thái, tổng tiền', async () => {
      const chuquanId = (await t.prisma.user.findUniqueOrThrow({ where: { username: 'chuquan' } })).id;
      const res = await t
        .api()
        .post('/api/orders')
        .set(t.as('thungan1'))
        .send({
          cashierId: chuquanId, status: 'done', total: 1, id: 999999,
          items: [{ productId: t.productId('Bạc xỉu'), size: 'M', quantity: 1 }],
        })
        .expect(201);
      expect(res.body).toMatchObject({ status: 'pending', total: 32000, cashier: { fullName: 'Thu ngân Lan' } });
      expect(res.body.id).not.toBe(999999);
    });

    it('tạo món: không giả được id, người sửa', async () => {
      const res = await t
        .api()
        .post('/api/products')
        .set(t.as('chuquan'))
        .send({ id: 777777, updatedById: 2, name: 'Món kiểm thử mass', categoryId: 1, price: 20000 })
        .expect(201);
      expect(res.body.id).not.toBe(777777);
      expect(res.body.updatedBy.fullName).toBe('Chủ quán');
    });
  });

  describe('Rò rỉ thông tin', () => {
    it('không phản hồi nào chứa mật khẩu băm', async () => {
      const responses = await Promise.all([
        t.api().post('/api/auth/login').send({ username: 'thungan1', password: 'Coffee@123' }),
        t.api().get('/api/auth/me').set(t.as('thungan1')),
        t.api().get('/api/products?all=true').set(t.as('chuquan')),
        t.api().get('/api/orders?status=pending,preparing,ready,done').set(t.as('phache1')),
      ]);
      for (const r of responses) expect(JSON.stringify(r.body)).not.toMatch(/passwordHash|password_hash|\$2[aby]\$/);
    });

    it('JSON hỏng → 400 thông báo chung, không lộ chi tiết parser', async () => {
      const res = await t.api().post('/api/auth/login').set('Content-Type', 'application/json').send('{"username": ').expect(400);
      expect(res.body).toEqual({ error: 'Yêu cầu không hợp lệ' });
    });

    it('body quá lớn (> 100 KB) → 413', async () => {
      const res = await t.api().post('/api/orders').set(t.as('thungan1')).send({ note: 'x'.repeat(150_000), items: [] }).expect(413);
      expect(res.body).toEqual({ error: 'Dữ liệu gửi lên quá lớn' });
    });

    it('route không tồn tại → 404 tiếng Việt, không lộ "Cannot GET"', async () => {
      const res = await t.api().get('/api/khong-co').set(t.as('thungan1')).expect(404);
      expect(res.body).toEqual({ error: 'Không tìm thấy' });
    });

    it('không gửi header X-Powered-By', async () => {
      const res = await t.api().get('/api/health').expect(200);
      expect(res.headers['x-powered-by']).toBeUndefined();
    });

    it('CORS chỉ cho origin của frontend', async () => {
      const ok = await t.api().get('/api/health').set('Origin', 'http://localhost:3100');
      const evil = await t.api().get('/api/health').set('Origin', 'https://evil.example');
      expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:3100');
      expect(evil.headers['access-control-allow-origin']).not.toBe('https://evil.example');
    });
  });

  describe('Chống dò mật khẩu (V2)', () => {
    const login = (username: string, password: string) => t.api().post('/api/auth/login').send({ username, password });

    it('sai 5 lần → lần 6 bị 429 kèm Retry-After, kể cả khi nhập đúng mật khẩu', async () => {
      for (let i = 0; i < 5; i++) await login('thungan2', `sai-${i}`).expect(401);
      const blocked = await login('thungan2', 'Coffee@123').expect(429);
      expect(blocked.body.error).toMatch(/quá nhiều lần/);
      expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
    });

    it('khoá theo tài khoản không ảnh hưởng tài khoản khác', async () => {
      await login('thungan1', 'Coffee@123').expect(200);
    });

    it('tên đăng nhập không tồn tại cũng bị khoá như thường (không lộ tài khoản nào có thật)', async () => {
      for (let i = 0; i < 5; i++) await login('khong-ton-tai', 'x').expect(401);
      await login('khong-ton-tai', 'x').expect(429);
    });
  });

  describe('Header bảo mật (V4 — helmet)', () => {
    it('API: chặn nhúng iframe, chặn đoán MIME, CSP chặn mọi tài nguyên', async () => {
      const res = await t.api().get('/api/health').expect(200);
      expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['content-security-policy']).toContain("default-src 'none'");
      expect(res.headers['content-security-policy']).toContain("frame-ancestors 'none'");
      expect(res.headers['referrer-policy']).toBe('no-referrer');
    });

    it('chưa bật HTTPS (COOKIE_SECURE) thì không gửi HSTS', async () => {
      const res = await t.api().get('/api/health');
      expect(res.headers['strict-transport-security']).toBeUndefined();
    });

    it('Swagger UI có CSP riêng cho phép script / style của chính nó', async () => {
      const res = await t.api().get('/api/docs/').expect(200);
      expect(res.headers['content-security-policy']).toContain("script-src 'self' 'unsafe-inline'");
      expect(res.headers['content-security-policy']).toContain("frame-ancestors 'none'");
    });
  });
});
