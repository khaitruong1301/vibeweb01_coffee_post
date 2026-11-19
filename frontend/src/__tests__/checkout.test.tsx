import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CheckoutPage from '@/app/(app)/checkout/page';
import type { ProductList } from '@/lib/types';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));
vi.mock('@/components/AuthProvider', () => ({ useRequireRole: () => true }));

const MENU: ProductList = {
  sizeSurcharge: { S: 0, M: 0, L: 6000 },
  items: [
    {
      id: 2, name: 'Cà phê sữa đá', category: { id: 1, name: 'Cà phê' }, price: 29000, priceL: 35000,
      hasSize: true, isActive: true, imageUrl: null, updatedAt: '2026-11-19T00:00:00Z', updatedBy: null,
    },
    {
      id: 11, name: 'Bánh croissant', category: { id: 4, name: 'Bánh' }, price: 28000, priceL: null,
      hasSize: false, isActive: true, imageUrl: null, updatedAt: '2026-11-19T00:00:00Z', updatedBy: null,
    },
  ],
};

type Handler = (body: unknown) => { status: number; body?: unknown };
let onCreateOrder: Handler;
let sentBodies: unknown[];

beforeEach(() => {
  push.mockReset();
  sentBodies = [];
  onCreateOrder = () => ({ status: 201, body: { code: 'CP-000009' } });
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input);
    const json = (status: number, body?: unknown) =>
      new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
    if (url === '/api/products') return json(200, MENU);
    if (url === '/api/orders' && init?.method === 'POST') {
      const body = JSON.parse(String(init.body));
      sentBodies.push(body);
      const r = onCreateOrder(body);
      return json(r.status, r.body);
    }
    return json(404, { error: 'Không tìm thấy' });
  });
});

const card = (name: string) => screen.getByRole('heading', { name }).closest('article') as HTMLElement;
const payButton = () => screen.getByRole('button', { name: /Thanh toán/ });

async function addCaPheL(times = 1) {
  await userEvent.click(within(card('Cà phê sữa đá')).getByRole('button', { name: 'L+6k' }));
  for (let i = 0; i < times; i++) {
    await userEvent.click(within(card('Cà phê sữa đá')).getByRole('button', { name: '+ Thêm vào đơn' }));
  }
}

describe('Màn bán hàng (UC02)', () => {
  it('giỏ trống → nút Thanh toán bị khóa (BR03)', async () => {
    render(<CheckoutPage />);
    await screen.findByRole('heading', { name: 'Cà phê sữa đá' });
    expect(screen.getByText(/Chưa có món nào/)).toBeInTheDocument();
    expect(payButton()).toBeDisabled();
  });

  it('size L hiển thị giá cộng 6.000đ, tổng tạm tính đúng (BR05)', async () => {
    render(<CheckoutPage />);
    await screen.findByRole('heading', { name: 'Cà phê sữa đá' });
    await addCaPheL(2);
    await userEvent.click(within(card('Bánh croissant')).getByRole('button', { name: '+ Thêm vào đơn' }));
    expect(screen.getByLabelText('Số lượng Cà phê sữa đá')).toHaveValue('2');
    expect(payButton()).toHaveTextContent('98.000đ');
  });

  it('số lượng âm → báo lỗi tại dòng và khóa Thanh toán (BR02, L2)', async () => {
    render(<CheckoutPage />);
    await screen.findByRole('heading', { name: 'Cà phê sữa đá' });
    await addCaPheL();
    const qty = screen.getByLabelText('Số lượng Cà phê sữa đá');
    await userEvent.clear(qty);
    await userEvent.type(qty, '-3');
    expect(screen.getByText(/Không nhận số âm/)).toBeInTheDocument();
    expect(payButton()).toBeDisabled();
    await userEvent.clear(qty);
    await userEvent.type(qty, '51');
    expect(screen.getByText(/Tối đa 50 ly mỗi món/)).toBeInTheDocument();
    expect(payButton()).toBeDisabled();
  });

  it('Thanh toán chỉ gửi mã món / size / số lượng — không gửi giá (L3) — rồi sang hóa đơn', async () => {
    render(<CheckoutPage />);
    await screen.findByRole('heading', { name: 'Cà phê sữa đá' });
    await addCaPheL(2);
    await userEvent.click(payButton());
    expect(sentBodies).toEqual([{ items: [{ productId: 2, size: 'L', quantity: 2 }], source: 'counter' }]);
    expect(JSON.stringify(sentBodies)).not.toMatch(/price|total/i);
    expect(push).toHaveBeenCalledWith('/receipt/CP-000009');
  });

  it('đơn GrabFood: bắt buộc mã đơn đối tác trước khi thanh toán (UC04)', async () => {
    render(<CheckoutPage />);
    await screen.findByRole('heading', { name: 'Cà phê sữa đá' });
    await addCaPheL();
    await userEvent.click(screen.getByRole('button', { name: 'GrabFood' }));
    expect(payButton()).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Mã đơn GrabFood'), 'GF-123');
    await userEvent.click(payButton());
    expect(sentBodies[0]).toMatchObject({ source: 'grabfood', partnerCode: 'GF-123' });
  });

  it('server từ chối (400) → hiện lỗi, giữ nguyên giỏ', async () => {
    onCreateOrder = () => ({ status: 400, body: { error: 'Món #2 không tồn tại hoặc đã ngừng bán' } });
    render(<CheckoutPage />);
    await screen.findByRole('heading', { name: 'Cà phê sữa đá' });
    await addCaPheL();
    await userEvent.click(payButton());
    expect(await screen.findByRole('alert')).toHaveTextContent('đã ngừng bán');
    expect(screen.getByLabelText('Số lượng Cà phê sữa đá')).toHaveValue('1');
    expect(push).not.toHaveBeenCalled();
  });

  it('hết phiên (401) → mời đăng nhập lại, giỏ được lưu để khôi phục', async () => {
    onCreateOrder = () => ({ status: 401, body: { error: 'Phiên đăng nhập đã hết hạn' } });
    render(<CheckoutPage />);
    await screen.findByRole('heading', { name: 'Cà phê sữa đá' });
    await addCaPheL();
    await userEvent.click(payButton());
    expect(await screen.findByRole('dialog', { name: 'Phiên đăng nhập đã hết hạn' })).toBeInTheDocument();
    expect(JSON.parse(sessionStorage.getItem('coffeepos_cart') ?? '{}').lines).toHaveLength(1);
  });
});
