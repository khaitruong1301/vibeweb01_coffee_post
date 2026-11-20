import type { NextConfig } from 'next';

// Trình duyệt chỉ gọi /api/* cùng origin; Next chuyển tiếp sang backend NestJS → cookie đăng nhập
// httpOnly dùng được mà không cần CORS. Giá trị được chốt lúc build (Docker: build arg BACKEND_URL).
const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:4100';
const isDev = process.env.NODE_ENV !== 'production';

/**
 * Header bảo mật cho các trang web (V4). App Router chèn script inline nên cần 'unsafe-inline';
 * chế độ dev cần thêm 'unsafe-eval' + websocket cho hot reload. /api/* đã có header riêng từ backend (helmet).
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? ' ws: wss:' : ''}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  // Chỉ bật khi web chạy HTTPS (build với ENABLE_HSTS=true), nếu không trình duyệt sẽ ghi nhớ và chặn HTTP.
  ...(process.env.ENABLE_HSTS === 'true' ? [{ key: 'Strict-Transport-Security', value: 'max-age=15552000; includeSubDomains' }] : []),
];

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${backendUrl}/api/:path*` }];
  },
  async headers() {
    return [{ source: '/((?!api/).*)', headers: securityHeaders }];
  },
};

export default nextConfig;
