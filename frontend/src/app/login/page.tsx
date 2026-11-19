'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, type FormEvent } from 'react';
import { Alert, Button, Field, Input } from '@/components/ui';
import { api } from '@/lib/api';
import { homeOf } from '@/lib/roles';
import type { User } from '@/lib/types';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { user } = await api<{ user: User }>('/auth/login', { method: 'POST', body: { username, password } });
      const next = params.get('next');
      // Chỉ nhận đường dẫn nội bộ để tránh open redirect.
      router.replace(next && next.startsWith('/') && !next.startsWith('//') ? next : homeOf(user.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng nhập thất bại');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-surface p-8 shadow-sm">
      <div className="text-center">
        <p className="text-3xl font-bold text-primary">☕ CoffeePOS</p>
        <p className="mt-1 text-sm text-muted">Đăng nhập để bắt đầu ca làm việc</p>
      </div>
      <Field label="Tên đăng nhập">
        <Input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus required placeholder="vd: thungan1" />
      </Field>
      <Field label="Mật khẩu">
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
      </Field>
      {error && <Alert>⚠ {error}</Alert>}
      <Button type="submit" size="lg" loading={loading} className="w-full">
        Đăng nhập
      </Button>
      <p className="text-center text-xs text-muted">Quên mật khẩu? Liên hệ chủ quán</p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
