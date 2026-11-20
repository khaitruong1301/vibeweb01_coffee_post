import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useRequireRole } from '@/components/AuthProvider';
import { Navbar } from '@/components/Navbar';
import type { Role, User } from '@/lib/types';

const replace = vi.fn();
let pathname = '/checkout';
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, push: vi.fn() }), usePathname: () => pathname }));

function mockMe(status: number, user?: User) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input);
    if (url === '/api/auth/me') {
      return new Response(JSON.stringify(user ? { user } : { error: 'Vui lòng đăng nhập' }), { status });
    }
    return new Response(null, { status: 204 }); // logout
  });
}

const user = (role: Role): User => ({ id: 1, username: role, fullName: `Người ${role}`, role });

function Page({ roles }: { roles: Role[] }) {
  const allowed = useRequireRole(roles);
  return allowed ? <p>Nội dung được phép</p> : null;
}

beforeEach(() => {
  replace.mockReset();
  pathname = '/checkout';
});

describe('AuthProvider (bảo vệ trang phía frontend)', () => {
  it('chưa đăng nhập (401) → chuyển về /login kèm next', async () => {
    mockMe(401);
    render(<AuthProvider><p>Bí mật</p></AuthProvider>);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login?next=%2Fcheckout'));
    expect(screen.queryByText('Bí mật')).not.toBeInTheDocument();
  });

  it('đang kiểm tra phiên → hiện spinner, chưa render nội dung', () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise(() => undefined));
    render(<AuthProvider><p>Bí mật</p></AuthProvider>);
    expect(screen.getByText('Đang kiểm tra đăng nhập…')).toBeInTheDocument();
    expect(screen.queryByText('Bí mật')).not.toBeInTheDocument();
  });

  it('lỗi mạng → hiện thông báo, không chuyển trang', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    render(<AuthProvider><p>Bí mật</p></AuthProvider>);
    expect(await screen.findByText(/Không kết nối được máy chủ/)).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('đúng vai trò → hiện nội dung', async () => {
    mockMe(200, user('cashier'));
    render(<AuthProvider><Page roles={['cashier', 'admin']} /></AuthProvider>);
    expect(await screen.findByText('Nội dung được phép')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('sai vai trò (pha chế vào trang sản phẩm) → không hiện, chuyển về trang của vai đó', async () => {
    mockMe(200, user('barista'));
    render(<AuthProvider><Page roles={['admin']} /></AuthProvider>);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/barista'));
    expect(screen.queryByText('Nội dung được phép')).not.toBeInTheDocument();
  });
});

describe('Navbar', () => {
  it.each([
    ['cashier', ['Bán hàng']],
    ['barista', ['Quầy pha']],
    ['admin', ['Bán hàng', 'Quầy pha', 'Sản phẩm', 'Kiểm thử']],
  ] as [Role, string[]][])('vai %s chỉ thấy menu %j', async (role, links) => {
    mockMe(200, user(role));
    render(<AuthProvider><Navbar /></AuthProvider>);
    await screen.findByRole('navigation');
    const shown = screen
      .getAllByRole('link')
      .filter((a) => !['/', '/account'].includes(a.getAttribute('href') ?? ''))
      .map((a) => a.textContent);
    expect(shown).toEqual(links);
  });

  it('đánh dấu trang hiện tại và đăng xuất về /login', async () => {
    mockMe(200, user('admin'));
    pathname = '/products';
    render(<AuthProvider><Navbar /></AuthProvider>);
    expect(await screen.findByRole('link', { name: 'Sản phẩm' })).toHaveAttribute('aria-current', 'page');
    await userEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
  });
});
