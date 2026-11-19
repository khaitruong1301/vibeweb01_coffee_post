'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { Spinner } from '@/components/ui';
import { homeOf } from '@/lib/roles';

/** Trang gốc: chuyển tới màn hình mặc định theo vai trò. */
export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();
  useEffect(() => router.replace(homeOf(user.role)), [router, user.role]);
  return <Spinner label="Đang chuyển trang…" />;
}
