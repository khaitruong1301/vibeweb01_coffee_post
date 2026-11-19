import type { NextConfig } from 'next';

// Trình duyệt chỉ gọi /api/* cùng origin; Next chuyển tiếp sang backend NestJS → cookie đăng nhập
// httpOnly dùng được mà không cần CORS. Giá trị được chốt lúc build (Docker: build arg BACKEND_URL).
const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:4100';

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${backendUrl}/api/:path*` }];
  },
};

export default nextConfig;
