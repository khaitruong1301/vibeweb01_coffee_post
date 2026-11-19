import { expect, type Page } from '@playwright/test';

export const PASSWORD = 'Coffee@123';
export const API = process.env.E2E_API_URL ?? 'http://localhost:4200';

export async function login(page: Page, username: string, expectPath: RegExp) {
  await page.goto('/login');
  await page.getByLabel('Tên đăng nhập').fill(username);
  await page.getByLabel('Mật khẩu').fill(PASSWORD);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page).toHaveURL(expectPath);
}

export async function logout(page: Page) {
  await page.getByRole('button', { name: 'Đăng xuất' }).click();
  await expect(page).toHaveURL(/\/login/);
}

/** Thẻ món trên màn bán hàng. */
export const productCard = (page: Page, name: string) =>
  page.locator('article', { has: page.getByRole('heading', { name, exact: true }) });

export async function addToCart(page: Page, name: string, size?: 'S' | 'M' | 'L') {
  const card = productCard(page, name);
  if (size) await card.getByRole('button', { name: size === 'L' ? /^L/ : size, exact: size !== 'L' }).click();
  await card.getByRole('button', { name: '+ Thêm vào đơn' }).click();
}
