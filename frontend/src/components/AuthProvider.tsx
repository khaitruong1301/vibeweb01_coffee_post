'use client';

import { usePathname, useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, ApiError } from '@/lib/api';
import { homeOf } from '@/lib/roles';
import type { Role, User } from '@/lib/types';
import { Spinner } from './ui';

interface AuthState {
  user: User;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải dùng bên trong <AuthProvider>');
  return ctx;
}

/** Đọc phiên từ /api/auth/me; chưa đăng nhập → về /login?next=…; sai vai trò → về trang của vai đó. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<{ user: User }>('/auth/me')
      .then((r) => !cancelled && setUser(r.user))
      .catch((e: unknown) => {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 401) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        else setError(e instanceof Error ? e.message : 'Lỗi không xác định');
      });
    return () => {
      cancelled = true;
    };
  }, [router, pathname]);

  const logout = useCallback(async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
    router.replace('/login');
  }, [router]);

  if (error) return <p className="p-8 text-center text-danger">{error}</p>;
  if (!user) return <Spinner label="Đang kiểm tra đăng nhập…" />;
  return <AuthContext.Provider value={{ user, logout }}>{children}</AuthContext.Provider>;
}

/** Gọi đầu mỗi trang: vai trò không được phép thì chuyển về trang mặc định của vai đó. */
export function useRequireRole(roles: Role[]): boolean {
  const { user } = useAuth();
  const router = useRouter();
  const allowed = roles.includes(user.role);
  useEffect(() => {
    if (!allowed) router.replace(homeOf(user.role));
  }, [allowed, router, user.role]);
  return allowed;
}
