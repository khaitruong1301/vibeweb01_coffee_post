import { expect, test } from '@playwright/test';
import { login, logout, PASSWORD } from './helpers';

/** Bảo mật nhìn từ trình duyệt: header của trang web, khoá đăng nhập, đổi mật khẩu + thu hồi phiên. */
test.describe('Bảo mật (trình duyệt)', () => {
  test('trang web có header chống clickjacking, CSP, nosniff; không lộ X-Powered-By', async ({ page }) => {
    const res = await page.goto('/login');
    const h = res?.headers() ?? {};
    expect(h['x-frame-options']).toBe('DENY');
    expect(h['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(h['content-security-policy']).toContain("object-src 'none'");
    expect(h['x-content-type-options']).toBe('nosniff');
    expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(h['x-powered-by']).toBeUndefined();
  });

  test('trang vẫn chạy bình thường dưới CSP (không lỗi console do CSP)', async ({ page }) => {
    const cspErrors: string[] = [];
    page.on('console', (m) => m.type() === 'error' && /Content Security Policy/i.test(m.text()) && cspErrors.push(m.text()));
    await login(page, 'thungan1', /\/checkout$/);
    await expect(page.getByRole('heading', { name: 'Bạc xỉu' })).toBeVisible();
    expect(cspErrors).toEqual([]);
  });

  test('đăng nhập sai nhiều lần → báo khoá, không cho thử tiếp', async ({ page }) => {
    await page.goto('/login');
    const alert = page.getByRole('alert').filter({ hasText: /Sai tên|quá nhiều/ });
    for (let i = 0; i < 6; i++) {
      await page.getByLabel('Tên đăng nhập').fill('ke-do-mat-khau');
      await page.getByLabel('Mật khẩu').fill(`thu-${i}`);
      await page.getByRole('button', { name: 'Đăng nhập' }).click();
      await expect(alert).toBeVisible();
    }
    await expect(alert).toContainText('Đăng nhập sai quá nhiều lần');
  });

  test('đổi mật khẩu: phiên cũ ở "thiết bị khác" bị đăng xuất, mật khẩu mới dùng được', async ({ page, browser }) => {
    // "Thiết bị khác" đang đăng nhập cùng tài khoản
    const other = await browser.newContext();
    const otherPage = await other.newPage();
    await login(otherPage, 'thungan3', /\/checkout$/);

    await login(page, 'thungan3', /\/checkout$/);
    await page.getByRole('link', { name: /Thu ngân Mai/ }).click();
    await expect(page).toHaveURL(/\/account$/);
    await page.getByLabel('Mật khẩu hiện tại', { exact: true }).fill(PASSWORD);
    await page.getByLabel('Mật khẩu mới', { exact: true }).fill('ThuNgan2026!');
    await page.getByLabel('Nhập lại mật khẩu mới', { exact: true }).fill('ThuNgan2026!');
    await page.getByRole('button', { name: 'Đổi mật khẩu' }).click();
    await expect(page.getByText(/Đã đổi mật khẩu/)).toBeVisible();

    // Phiên hiện tại vẫn dùng được (đã nhận cookie mới)
    await page.goto('/checkout');
    await expect(page.getByRole('heading', { name: 'Bạc xỉu' })).toBeVisible();

    // Thiết bị khác: tải lại → bị đưa về trang đăng nhập
    await otherPage.reload();
    await expect(otherPage).toHaveURL(/\/login/);
    await other.close();

    // Mật khẩu cũ không còn dùng được, mật khẩu mới thì được
    await logout(page);
    await page.getByLabel('Tên đăng nhập').fill('thungan3');
    await page.getByLabel('Mật khẩu').fill(PASSWORD);
    await page.getByRole('button', { name: 'Đăng nhập' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Sai tên' })).toBeVisible();
    await page.getByLabel('Mật khẩu').fill('ThuNgan2026!');
    await page.getByRole('button', { name: 'Đăng nhập' }).click();
    await expect(page).toHaveURL(/\/checkout$/);
  });
});
