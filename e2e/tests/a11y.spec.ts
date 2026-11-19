import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { addToCart, login } from './helpers';

/**
 * #11 Accessibility — axe-core (WCAG 2.1 A/AA). Chặn vi phạm mức serious/critical;
 * mức moderate/minor chỉ ghi chú vào báo cáo để không làm CI đỏ vì chi tiết nhỏ.
 */
async function audit(page: Page, name: string) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const blocking = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  for (const v of violations) {
    test.info().annotations.push({ type: `a11y-${v.impact}`, description: `${name}: ${v.id} — ${v.help} (${v.nodes.length} phần tử)` });
  }
  expect(
    blocking.map((v) => ({ id: v.id, impact: v.impact, help: v.help, targets: v.nodes.map((n) => n.target.join(' ')).slice(0, 5) })),
    `${name}: vi phạm a11y nghiêm trọng`,
  ).toEqual([]);
}

test.describe('Accessibility (WCAG 2.1 AA)', () => {
  test('đăng nhập', async ({ page }) => {
    await page.goto('/login');
    await audit(page, '/login');
  });

  test('bán hàng (có món trong giỏ và có lỗi số lượng)', async ({ page }) => {
    await login(page, 'thungan1', /\/checkout$/);
    await addToCart(page, 'Bạc xỉu', 'M');
    await page.getByLabel('Số lượng Bạc xỉu').fill('-1');
    await audit(page, '/checkout');
  });

  test('hóa đơn', async ({ page }) => {
    await login(page, 'thungan1', /\/checkout$/);
    await addToCart(page, 'Bánh tiramisu');
    await page.getByRole('button', { name: /Thanh toán/ }).click();
    await expect(page).toHaveURL(/\/receipt\//);
    await audit(page, '/receipt');
  });

  test('quầy pha', async ({ page }) => {
    await login(page, 'phache1', /\/barista$/);
    await audit(page, '/barista');
  });

  test('sản phẩm + hộp thoại sửa món', async ({ page }) => {
    await login(page, 'chuquan', /\/products$/);
    await audit(page, '/products');
    await page.getByRole('button', { name: '✎ Sửa' }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await audit(page, '/products (dialog)');
  });
});
