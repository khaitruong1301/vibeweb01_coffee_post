import { expect, test } from '@playwright/test';
import { addToCart, login, logout, productCard } from './helpers';

/** #6 E2E — các luồng nghiệp vụ chính qua trình duyệt thật: Next.js → NestJS → PostgreSQL. */
test.describe.configure({ mode: 'serial' });

test.describe('Luồng bán hàng', () => {
  test('UC01: sai mật khẩu → báo lỗi chung, ở lại trang đăng nhập', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Tên đăng nhập').fill('thungan1');
    await page.getByLabel('Mật khẩu').fill('sai-mat-khau');
    await page.getByRole('button', { name: 'Đăng nhập' }).click();
    // Next.js có sẵn vùng role=alert thông báo chuyển trang → lọc theo nội dung
    await expect(page.getByRole('alert').filter({ hasText: 'Sai tên đăng nhập' })).toContainText('Sai tên đăng nhập hoặc mật khẩu');
    await expect(page).toHaveURL(/\/login/);
  });

  test('UC02 → UC03: bán 2 ly size L + 1 bánh, hóa đơn đúng tiền (BR05)', async ({ page }) => {
    await login(page, 'thungan1', /\/checkout$/);
    await addToCart(page, 'Cà phê sữa đá', 'L');
    await addToCart(page, 'Cà phê sữa đá', 'L');
    await addToCart(page, 'Bánh croissant');
    await expect(page.getByRole('button', { name: /Thanh toán/ })).toContainText('98.000đ');

    await page.getByRole('button', { name: /Thanh toán/ }).click();
    await expect(page).toHaveURL(/\/receipt\/CP-\d{6}$/);
    const receipt = page.locator('article');
    await expect(receipt).toContainText('HÓA ĐƠN BÁN HÀNG');
    await expect(receipt).toContainText('Cà phê sữa đá (L)');
    await expect(receipt).toContainText('35.000');
    await expect(receipt).toContainText('98.000đ');
    await expect(receipt).toContainText('Thu ngân Lan');
  });

  test('BR02 / BR03: giỏ trống hoặc số lượng sai → không thanh toán được', async ({ page }) => {
    await login(page, 'thungan1', /\/checkout$/);
    const pay = page.getByRole('button', { name: /Thanh toán/ });
    await expect(pay).toBeDisabled();
    await addToCart(page, 'Bạc xỉu', 'M');
    const qty = page.getByLabel('Số lượng Bạc xỉu');
    for (const [value, msg] of [['-1', 'Không nhận số âm'], ['0', 'Tối thiểu 1'], ['51', 'Tối đa 50 ly mỗi món']]) {
      await qty.fill(value);
      await expect(page.getByText(msg)).toBeVisible();
      await expect(pay).toBeDisabled();
    }
    await qty.fill('50');
    await expect(pay).toBeEnabled();
    await expect(pay).toContainText('1.600.000đ');
  });

  test('UC04: đơn GrabFood cần mã đơn đối tác, hiện trên hóa đơn', async ({ page }) => {
    await login(page, 'thungan1', /\/checkout$/);
    await page.getByRole('button', { name: 'GrabFood' }).click();
    await addToCart(page, 'Trà đào cam sả', 'M');
    await expect(page.getByRole('button', { name: /Thanh toán/ })).toBeDisabled();
    await page.getByLabel('Mã đơn GrabFood').fill('GF-E2E-001');
    await page.getByRole('button', { name: /Thanh toán/ }).click();
    await expect(page).toHaveURL(/\/receipt\/CP-\d{6}$/);
    await expect(page.locator('article')).toContainText('GrabFood · GF-E2E-001');
  });

  test('UC05: pha chế thấy đơn mới, chuyển Chờ pha → Đang pha → Xong → Đã giao', async ({ page }) => {
    await login(page, 'thungan1', /\/checkout$/);
    await addToCart(page, 'Americano', 'S');
    await page.getByRole('button', { name: /Thanh toán/ }).click();
    await expect(page).toHaveURL(/\/receipt\//);
    const code = page.url().split('/').pop() as string;
    await logout(page);

    await login(page, 'phache1', /\/barista$/);
    const card = page.locator('article', { hasText: code });
    await expect(card).toContainText('1 × Americano (S)');
    await expect(card).not.toContainText(/\d{1,3}(\.\d{3})+đ/); // màn quầy pha không hiện giá tiền
    await card.getByRole('button', { name: 'Bắt đầu pha' }).click();
    await card.getByRole('button', { name: 'Xong', exact: true }).click();
    await card.getByRole('button', { name: 'Đã giao' }).click();
    await expect(page.locator('article', { hasText: code })).toHaveCount(0);
  });

  test('UC06: chủ quán sửa giá → thu ngân bán theo giá mới (câu hỏi của chủ quán)', async ({ page }) => {
    await login(page, 'chuquan', /\/products$/);
    const row = page.locator('tr', { has: page.getByRole('cell', { name: 'Matcha đá xay', exact: true }) });
    await row.getByRole('button', { name: '✎ Sửa' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Giá bán (size S / M) *').fill('52000');
    await expect(dialog).toContainText('Giá cũ: 49.000đ · tăng 3.000đ');
    await expect(dialog).toContainText('2 × (52.000đ + 6.000đ) = 116.000đ');
    await dialog.getByRole('button', { name: 'Lưu' }).click();
    await expect(page.getByText('Đã cập nhật "Matcha đá xay"')).toBeVisible();
    await expect(row).toContainText('58.000đ');
    await logout(page);

    await login(page, 'thungan1', /\/checkout$/);
    await expect(productCard(page, 'Matcha đá xay')).toContainText('52.000đ · L 58.000đ');
    await addToCart(page, 'Matcha đá xay', 'L');
    await page.getByRole('button', { name: /Thanh toán/ }).click();
    await expect(page).toHaveURL(/\/receipt\/CP-\d{6}$/);
    await expect(page.locator('article')).toContainText('58.000đ');
  });

  test('phân quyền giao diện: pha chế gõ thẳng /products bị đưa về /barista', async ({ page }) => {
    await login(page, 'phache1', /\/barista$/);
    await page.goto('/products');
    await expect(page).toHaveURL(/\/barista$/);
    await expect(page.getByRole('link', { name: 'Sản phẩm' })).toHaveCount(0);
  });

  test('@mobile màn bán hàng dùng được ở màn hình điện thoại, không tràn ngang', async ({ page }) => {
    await login(page, 'thungan1', /\/checkout$/);
    await addToCart(page, 'Bạc xỉu', 'M');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await expect(page.getByRole('button', { name: /Thanh toán/ })).toBeEnabled();
  });
});
