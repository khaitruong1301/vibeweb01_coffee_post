import { AuthProvider } from '@/components/AuthProvider';
import { Navbar } from '@/components/Navbar';

/** Nhóm trang cần đăng nhập. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Navbar />
      <main className="mx-auto max-w-[1400px] px-4 py-4">{children}</main>
    </AuthProvider>
  );
}
