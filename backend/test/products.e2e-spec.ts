import { createTestContext, type TestContext } from './helpers';

/** #5 API — UC06 sản phẩm. (Quyền 403 và giá không hợp lệ đã có trong orders.e2e-spec.ts.) */
describe('API sản phẩm (UC06)', () => {
  let t: TestContext;
  beforeAll(async () => (t = await createTestContext()));
  afterAll(() => t.close());

  it('GET /categories — đủ 4 danh mục theo thứ tự', async () => {
    const res = await t.api().get('/api/categories').set(t.as('thungan1')).expect(200);
    expect(res.body.map((c: { name: string }) => c.name)).toEqual(['Cà phê', 'Trà', 'Đá xay', 'Bánh']);
  });

  it('GET /products — trả priceL do server tính và bảng phụ thu', async () => {
    const res = await t.api().get('/api/products').set(t.as('thungan1')).expect(200);
    const banh = res.body.items.find((p: { name: string }) => p.name === 'Bánh croissant');
    const caPhe = res.body.items.find((p: { name: string }) => p.name === 'Cà phê sữa đá');
    expect(caPhe).toMatchObject({ price: 29000, priceL: 35000, hasSize: true });
    expect(banh).toMatchObject({ priceL: null, hasSize: false });
    expect(res.body.sizeSurcharge).toEqual({ S: 0, M: 0, L: 6000 });
  });

  it('POST /products — 201, tên được trim, ghi người tạo', async () => {
    const res = await t
      .api()
      .post('/api/products')
      .set(t.as('chuquan'))
      .send({ name: '  Cà phê muối  ', categoryId: 1, price: 39000 })
      .expect(201);
    expect(res.body).toMatchObject({
      name: 'Cà phê muối', price: 39000, priceL: 45000, hasSize: true, isActive: true,
      category: { name: 'Cà phê' }, updatedBy: { fullName: 'Chủ quán' },
    });
  });

  it('POST /products — món không size có priceL = null', async () => {
    const res = await t
      .api()
      .post('/api/products')
      .set(t.as('chuquan'))
      .send({ name: 'Bánh flan', categoryId: 4, price: 20000, hasSize: false })
      .expect(201);
    expect(res.body.priceL).toBeNull();
  });

  it('POST /products — trùng tên → 409', async () => {
    const res = await t.api().post('/api/products').set(t.as('chuquan')).send({ name: 'Bạc xỉu', categoryId: 1, price: 30000 }).expect(409);
    expect(res.body).toEqual({ error: 'Dữ liệu đã tồn tại' });
  });

  it('POST /products — danh mục không tồn tại → 400', async () => {
    const res = await t.api().post('/api/products').set(t.as('chuquan')).send({ name: 'Món lạ', categoryId: 999, price: 30000 }).expect(400);
    expect(res.body.error).toBe('Danh mục không tồn tại');
  });

  it('POST /products — thiếu tên / giá → 400 kèm details từng trường', async () => {
    const res = await t.api().post('/api/products').set(t.as('chuquan')).send({ categoryId: 1 }).expect(400);
    expect(Object.keys(res.body.details)).toEqual(expect.arrayContaining(['name', 'price']));
  });

  it('PATCH /products/:id — id không tồn tại → 404, id không phải số → 400', async () => {
    await t.api().patch('/api/products/999999').set(t.as('chuquan')).send({ price: 30000 }).expect(404);
    const bad = await t.api().patch('/api/products/abc').set(t.as('chuquan')).send({ price: 30000 }).expect(400);
    expect(bad.body.error).toBe('Mã không hợp lệ');
  });

  it('PATCH isActive=false → món biến khỏi menu bán hàng, mở bán lại thì hiện (BR08)', async () => {
    const id = t.productId('Trà vải');
    const names = async () =>
      (await t.api().get('/api/products').set(t.as('thungan1'))).body.items.map((p: { name: string }) => p.name);
    await t.api().patch(`/api/products/${id}`).set(t.as('chuquan')).send({ isActive: false }).expect(200);
    expect(await names()).not.toContain('Trà vải');
    await t.api().patch(`/api/products/${id}`).set(t.as('chuquan')).send({ isActive: true }).expect(200);
    expect(await names()).toContain('Trà vải');
  });
});
