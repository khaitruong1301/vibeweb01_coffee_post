import { JwtService } from '@nestjs/jwt';
import { createTestContext, type TestContext } from './helpers';

type Role = 'cashier' | 'barista' | 'admin';
const USER_OF: Record<Role, string> = { cashier: 'thungan1', barista: 'phache1', admin: 'chuquan' };

/** Ma trận phân quyền — nguồn sự thật cho "ai được gọi API nào". */
const MATRIX: { method: 'get' | 'post' | 'patch'; path: string; body?: object; roles: Role[] }[] = [
  { method: 'get', path: '/api/auth/me', roles: ['cashier', 'barista', 'admin'] },
  { method: 'get', path: '/api/categories', roles: ['cashier', 'barista', 'admin'] },
  { method: 'get', path: '/api/products', roles: ['cashier', 'barista', 'admin'] },
  { method: 'get', path: '/api/products?all=true', roles: ['admin'] },
  { method: 'post', path: '/api/products', body: { name: 'Món thử quyền', categoryId: 1, price: 10000 }, roles: ['admin'] },
  { method: 'patch', path: '/api/products/1', body: { price: 25000 }, roles: ['admin'] },
  { method: 'post', path: '/api/orders', body: { items: [{ productId: 1, size: 'M', quantity: 1 }] }, roles: ['cashier', 'admin'] },
  { method: 'get', path: '/api/orders', roles: ['cashier', 'barista', 'admin'] },
  { method: 'get', path: '/api/orders/CP-000001', roles: ['cashier', 'barista', 'admin'] },
  { method: 'patch', path: '/api/orders/1/status', body: { status: 'preparing' }, roles: ['barista', 'admin'] },
  { method: 'get', path: '/api/quality/report', roles: ['admin'] },
  { method: 'patch', path: '/api/auth/password', body: {}, roles: ['cashier', 'barista', 'admin'] },
];

/** #7 Authentication & Authorization. */
describe('Xác thực & phân quyền', () => {
  let t: TestContext;
  let jwt: JwtService;

  beforeAll(async () => {
    t = await createTestContext(['chuquan', 'thungan1', 'phache1', 'thungan3', 'phache2']);
    jwt = t.app.get(JwtService);
    // Đơn #1 để các route theo :id / :code có dữ liệu
    await t.api().post('/api/orders').set(t.as('thungan1')).send({ items: [{ productId: 1, size: 'M', quantity: 1 }] }).expect(201);
  });
  afterAll(() => t.close());

  describe('ma trận vai trò × endpoint', () => {
    for (const route of MATRIX) {
      const call = (headers: Record<string, string> = {}) =>
        t.api()[route.method](route.path).set(headers).send(route.body);

      it(`${route.method.toUpperCase()} ${route.path} — chưa đăng nhập → 401`, async () => {
        await call().expect(401);
      });

      for (const role of ['cashier', 'barista', 'admin'] as Role[]) {
        const allowed = route.roles.includes(role);
        it(`${route.method.toUpperCase()} ${route.path} — ${role} → ${allowed ? 'được phép' : '403'}`, async () => {
          const res = await call(t.as(USER_OF[role]));
          if (allowed) expect([401, 403]).not.toContain(res.status);
          else expect(res.status).toBe(403);
        });
      }
    }
  });

  describe('token', () => {
    it('token hết hạn → 401', async () => {
      const expired = jwt.sign({ sub: 2, role: 'cashier' }, { expiresIn: -60 });
      const res = await t.api().get('/api/auth/me').set('Authorization', `Bearer ${expired}`).expect(401);
      expect(res.body.error).toContain('hết hạn');
    });

    it('token ký bằng khóa khác → 401', async () => {
      const forged = jwt.sign({ sub: 1, role: 'admin' }, { secret: 'khoa-gia-mao-khong-dung' });
      await t.api().get('/api/auth/me').set('Authorization', `Bearer ${forged}`).expect(401);
    });

    it('token alg "none" (bỏ chữ ký) → 401', async () => {
      const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
      const none = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: 1, role: 'admin' })}.`;
      await t.api().post('/api/products').set('Authorization', `Bearer ${none}`).send({}).expect(401);
    });

    it('sửa payload thành admin nhưng giữ chữ ký cũ → 401', async () => {
      const [h, , s] = t.token('thungan1').split('.');
      const payload = Buffer.from(JSON.stringify({ sub: 1, role: 'admin' })).toString('base64url');
      await t.api().get('/api/auth/me').set('Authorization', `Bearer ${h}.${payload}.${s}`).expect(401);
    });

    it('tài khoản bị khóa: token cũ và đăng nhập lại đều bị từ chối', async () => {
      await t.prisma.user.update({ where: { username: 'thungan3' }, data: { isActive: false } });
      await t.api().get('/api/auth/me').set(t.as('thungan3')).expect(401);
      await t.api().post('/api/auth/login').send({ username: 'thungan3', password: 'Coffee@123' }).expect(401);
      await t.prisma.user.update({ where: { username: 'thungan3' }, data: { isActive: true } });
    });

    it('vai trò lấy từ DB mỗi request — đổi vai có hiệu lực ngay, không tin claim trong token', async () => {
      const body = { items: [{ productId: 1, size: 'M', quantity: 1 }] };
      await t.api().post('/api/orders').set(t.as('phache2')).send(body).expect(403);
      await t.prisma.user.update({ where: { username: 'phache2' }, data: { role: 'cashier' } });
      await t.api().post('/api/orders').set(t.as('phache2')).send(body).expect(201);
      await t.prisma.user.update({ where: { username: 'phache2' }, data: { role: 'barista' } });
    });
  });

  describe('thu hồi phiên & đổi mật khẩu (V3)', () => {
    const freshLogin = async (username: string, password = 'Coffee@123') => {
      const res = await t.api().post('/api/auth/login').send({ username, password }).expect(200);
      return { token: res.body.token as string, cookie: res.headers['set-cookie'] as unknown as string[] };
    };

    it('token không có claim ver (cấp trước bản vá) → 401', async () => {
      const legacy = jwt.sign({ sub: 2, role: 'cashier' });
      await t.api().get('/api/auth/me').set('Authorization', `Bearer ${legacy}`).expect(401);
    });

    it('đăng xuất thu hồi token: dùng lại token cũ (Bearer hoặc cookie) → 401', async () => {
      const a = await freshLogin('thungan3');
      await t.api().get('/api/auth/me').set('Authorization', `Bearer ${a.token}`).expect(200);
      await t.api().post('/api/auth/logout').set('Authorization', `Bearer ${a.token}`).expect(204);
      const res = await t.api().get('/api/auth/me').set('Authorization', `Bearer ${a.token}`).expect(401);
      expect(res.body.error).toContain('Phiên đăng nhập đã kết thúc');
      await t.api().get('/api/auth/me').set('Cookie', a.cookie).expect(401);
      await freshLogin('thungan3'); // đăng nhập lại bình thường
    });

    it('đổi mật khẩu: sai mật khẩu hiện tại / mật khẩu yếu → 400 theo từng trường', async () => {
      const a = await freshLogin('thungan3');
      const auth = { Authorization: `Bearer ${a.token}` };
      const wrong = await t.api().patch('/api/auth/password').set(auth).send({ currentPassword: 'sai', newPassword: 'CaPhe2026x' }).expect(400);
      expect(wrong.body.details.currentPassword).toBe('Mật khẩu hiện tại không đúng');
      const weak = await t.api().patch('/api/auth/password').set(auth).send({ currentPassword: 'Coffee@123', newPassword: 'abcdefgh' }).expect(400);
      expect(weak.body.details.newPassword).toContain('chữ số');
      const same = await t.api().patch('/api/auth/password').set(auth).send({ currentPassword: 'Coffee@123', newPassword: 'Coffee@123' }).expect(400);
      expect(same.body.details.newPassword).toBeDefined();
    });

    it('đổi mật khẩu thành công: phiên khác bị thu hồi, phiên hiện tại nhận token mới, đăng nhập bằng mật khẩu mới', async () => {
      const other = await freshLogin('phache3');
      const me = await freshLogin('phache3');
      const res = await t
        .api()
        .patch('/api/auth/password')
        .set('Authorization', `Bearer ${me.token}`)
        .send({ currentPassword: 'Coffee@123', newPassword: 'PhaChe2026!' })
        .expect(200);
      expect(res.headers['set-cookie'][0]).toMatch(/coffeepos_token=.+HttpOnly/);
      await t.api().get('/api/auth/me').set('Authorization', `Bearer ${other.token}`).expect(401);
      await t.api().get('/api/auth/me').set('Authorization', `Bearer ${me.token}`).expect(401);
      await t.api().get('/api/auth/me').set('Authorization', `Bearer ${res.body.token}`).expect(200);
      await t.api().post('/api/auth/login').send({ username: 'phache3', password: 'Coffee@123' }).expect(401);
      await freshLogin('phache3', 'PhaChe2026!');
    });
  });

  describe('cookie phiên', () => {
    it('cookie httpOnly + SameSite=Lax + Path=/', async () => {
      const res = await t.api().post('/api/auth/login').send({ username: 'thungan1', password: 'Coffee@123' }).expect(200);
      const cookie = res.headers['set-cookie'][0];
      expect(cookie).toMatch(/HttpOnly/);
      expect(cookie).toMatch(/SameSite=Lax/);
      expect(cookie).toMatch(/Path=\//);
    });

    it('đăng xuất xóa cookie', async () => {
      const res = await t.api().post('/api/auth/logout').expect(204);
      expect(res.headers['set-cookie'][0]).toMatch(/coffeepos_token=;.*Expires=Thu, 01 Jan 1970/);
    });

    it('tên đăng nhập không phân biệt hoa thường', async () => {
      await t.api().post('/api/auth/login').send({ username: 'ThuNgan1', password: 'Coffee@123' }).expect(200);
    });
  });
});
