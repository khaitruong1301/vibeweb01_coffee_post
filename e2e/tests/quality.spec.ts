import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { login } from './helpers';

/** Trang báo cáo kiểm thử — chỉ Chủ quán. Chạy được cả khi chưa có báo cáo (CI) lẫn khi đã có (local). */
test.describe('Báo cáo kiểm thử (/quality)', () => {
  test('thu ngân và pha chế không thấy menu, gõ thẳng URL bị đưa về trang của mình', async ({ page }) => {
    await login(page, 'thungan1', /\/checkout$/);
    await expect(page.getByRole('link', { name: 'Kiểm thử' })).toHaveCount(0);
    await page.goto('/quality');
    await expect(page).toHaveURL(/\/checkout$/);
  });

  test('API báo cáo chặn ở server: thu ngân gọi trực tiếp → 403', async ({ page }) => {
    await login(page, 'thungan1', /\/checkout$/);
    const status = await page.evaluate(async () => (await fetch('/api/quality/report')).status);
    expect(status).toBe(403);
  });

  test('chủ quán mở được trang, hiện báo cáo hoặc hướng dẫn tạo; không vi phạm a11y nghiêm trọng', async ({ page }) => {
    await login(page, 'chuquan', /\/products$/);
    await page.getByRole('link', { name: 'Kiểm thử' }).click();
    await expect(page).toHaveURL(/\/quality$/);
    await expect(page.getByRole('heading', { name: /Kiểm thử tự động/ })).toBeVisible();

    const hasReport = await page.getByRole('table').first().isVisible().catch(() => false);
    if (hasReport) {
      await expect(page.getByRole('button', { name: /Static Code Analysis/ })).toBeVisible();
      await page.getByRole('button', { name: /Security Testing/ }).click();
      await expect(page.getByRole('textbox', { name: 'Tìm test' })).toBeVisible();
    } else {
      await expect(page.getByText('npm run test:report').first()).toBeVisible();
    }

    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});
