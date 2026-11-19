import { expect, test } from '@playwright/test';
import { API, login } from './helpers';

/** #13 Smoke — vài kiểm tra nhanh nhất để biết bản build "sống" (chạy riêng: npm run test:smoke). */
test.describe('@smoke', () => {
  test('API health ok, DB ok', async ({ request }) => {
    const res = await request.get(`${API}/api/health`);
    expect(res.ok()).toBeTruthy();
    expect(await res.json()).toMatchObject({ status: 'ok', db: 'ok' });
  });

  test('trang đăng nhập hiển thị', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: 'Đăng nhập' })).toBeVisible();
    await expect(page).toHaveTitle(/CoffeePOS/);
  });

  for (const [user, path] of [['thungan1', /\/checkout$/], ['phache1', /\/barista$/], ['chuquan', /\/products$/]] as const) {
    test(`${user} đăng nhập → vào đúng trang mặc định`, async ({ page }) => {
      await login(page, user, path);
    });
  }

  test('chưa đăng nhập mở /checkout → về /login', async ({ page }) => {
    await page.goto('/checkout');
    await expect(page).toHaveURL(/\/login\?next=%2Fcheckout/);
  });
});
