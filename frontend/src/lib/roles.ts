import type { Role } from './types';

/** Trang mặc định sau khi đăng nhập, theo vai trò. */
export function homeOf(role: Role): string {
  if (role === 'barista') return '/barista';
  if (role === 'admin') return '/products';
  return '/checkout';
}

export const NAV: { href: string; label: string; roles: Role[] }[] = [
  { href: '/checkout', label: 'Bán hàng', roles: ['cashier', 'admin'] },
  { href: '/barista', label: 'Quầy pha', roles: ['barista', 'admin'] },
  { href: '/products', label: 'Sản phẩm', roles: ['admin'] },
  { href: '/quality', label: 'Kiểm thử', roles: ['admin'] },
];
