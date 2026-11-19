import { rm, writeFile } from 'node:fs/promises';
import { createTestContext, type TestContext } from './helpers';

/** Báo cáo kiểm thử trên web — chỉ Chủ quán (quyền 401/403 nằm trong ma trận auth.e2e-spec.ts). */
describe('API báo cáo kiểm thử', () => {
  let t: TestContext;
  const file = process.env.TEST_REPORT_PATH as string;

  beforeAll(async () => (t = await createTestContext()));
  afterAll(async () => {
    await rm(file, { force: true });
    await t.close();
  });

  it('chưa sinh báo cáo → 404 kèm hướng dẫn', async () => {
    await rm(file, { force: true });
    const res = await t.api().get('/api/quality/report').set(t.as('chuquan')).expect(404);
    expect(res.body.error).toContain('npm run test:report');
  });

  it('có báo cáo → admin đọc được, kèm thời điểm cập nhật file', async () => {
    await writeFile(file, JSON.stringify({ version: 1, summary: { total: 3, passed: 3 } }));
    const res = await t.api().get('/api/quality/report').set(t.as('chuquan')).expect(200);
    expect(res.body).toMatchObject({ version: 1, summary: { total: 3, passed: 3 } });
    expect(new Date(res.body.fileUpdatedAt).getTime()).not.toBeNaN();
  });

  it('file hỏng → 500 thông báo rõ ràng, không lộ nội dung', async () => {
    await writeFile(file, '{ hỏng');
    const res = await t.api().get('/api/quality/report').set(t.as('chuquan')).expect(500);
    expect(res.body).toEqual({ error: 'File báo cáo kiểm thử bị hỏng, hãy tạo lại' });
  });

  it('thu ngân / pha chế không xem được → 403', async () => {
    await t.api().get('/api/quality/report').set(t.as('thungan1')).expect(403);
    await t.api().get('/api/quality/report').set(t.as('phache1')).expect(403);
  });
});
