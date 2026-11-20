'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ROLE_LABEL } from '@/lib/format';
import { NAV } from '@/lib/roles';
import { useAuth } from './AuthProvider';

export function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const links = NAV.filter((n) => n.roles.includes(user.role));

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur print:hidden">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-2 px-4">
        <Link href="/" className="mr-2 shrink-0 text-lg font-bold text-primary">
          ☕ CoffeePOS
        </Link>
        <nav className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
          {links.map((l) => {
            const active = pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? 'page' : undefined}
                className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${
                  active ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <Link
          href="/account"
          title="Tài khoản · đổi mật khẩu"
          aria-current={pathname.startsWith('/account') ? 'page' : undefined}
          className="hidden rounded-lg px-2 py-1 text-sm text-muted hover:bg-secondary sm:inline"
        >
          {ROLE_LABEL[user.role]}: <b className="text-foreground">{user.fullName}</b>
        </Link>
        <button type="button" onClick={logout} className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-secondary">
          Đăng xuất
        </button>
      </div>
    </header>
  );
}
