import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AccountPage from '@/app/(app)/account/page';

vi.mock('@/components/AuthProvider', () => ({
  useAuth: () => ({ user: { id: 2, username: 'thungan1', fullName: 'Thu ngân Lan', role: 'cashier' }, logout: vi.fn() }),
}));

let sent: unknown[] = [];
function mockApi(status: number, body: unknown) {
  sent = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
    sent.push(JSON.parse(String(init?.body)));
    return new Response(JSON.stringify(body), { status });
  });
}

async function fill(current: string, next: string, confirm = next) {
  await userEvent.type(screen.getByLabelText('Mật khẩu hiện tại'), current);
  await userEvent.type(screen.getByLabelText('Mật khẩu mới'), next);
  await userEvent.type(screen.getByLabelText('Nhập lại mật khẩu mới'), confirm);
  await userEvent.click(screen.getByRole('button', { name: 'Đổi mật khẩu' }));
}

beforeEach(() => vi.restoreAllMocks());

describe('Trang tài khoản — đổi mật khẩu (V3)', () => {
  it('hiện thông tin tài khoản', () => {
    mockApi(200, {});
    render(<AccountPage />);
    expect(screen.getByText(/Thu ngân Lan · thungan1 · Thu ngân/)).toBeInTheDocument();
  });

  it('kiểm tra phía client: ngắn / thiếu số / nhập lại sai → không gọi API', async () => {
    mockApi(200, {});
    render(<AccountPage />);
    await fill('Coffee@123', 'abcdefgh', 'khac');
    expect(screen.getByLabelText('Mật khẩu mới')).toHaveAccessibleDescription('Mật khẩu mới phải có cả chữ và số');
    expect(screen.getByLabelText('Nhập lại mật khẩu mới')).toHaveAccessibleDescription('Nhập lại chưa khớp mật khẩu mới');
    expect(sent).toHaveLength(0);
  });

  it('thành công → chỉ gửi mật khẩu cũ + mới, báo đã đăng xuất thiết bị khác, xoá form', async () => {
    mockApi(200, { user: {}, token: 't' });
    render(<AccountPage />);
    await fill('Coffee@123', 'CaPhe2026!');
    expect(sent).toEqual([{ currentPassword: 'Coffee@123', newPassword: 'CaPhe2026!' }]);
    expect(await screen.findByText(/Đã đổi mật khẩu/)).toBeInTheDocument();
    expect(screen.getByLabelText('Mật khẩu mới')).toHaveValue('');
  });

  it('server báo sai mật khẩu hiện tại → lỗi hiện ngay dưới ô đó', async () => {
    mockApi(400, { error: 'Dữ liệu không hợp lệ', details: { currentPassword: 'Mật khẩu hiện tại không đúng' } });
    render(<AccountPage />);
    await fill('sai-roi', 'CaPhe2026!');
    expect(await screen.findByText('Mật khẩu hiện tại không đúng')).toBeInTheDocument();
    expect(screen.getByLabelText('Mật khẩu hiện tại')).toHaveAttribute('aria-invalid', 'true');
  });

  it('bị khoá do sai nhiều lần (429) → thông báo chung', async () => {
    mockApi(429, { error: 'Đăng nhập sai quá nhiều lần, vui lòng thử lại sau 15 phút' });
    render(<AccountPage />);
    await fill('sai-roi', 'CaPhe2026!');
    expect(await screen.findByRole('alert')).toHaveTextContent('quá nhiều lần');
  });
});
