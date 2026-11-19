// Đọc & kiểm tra biến môi trường tại một chỗ — không dùng process.env rải rác.
import 'dotenv/config';
import { resolve } from 'node:path';

const DEV_SECRET = 'coffeepos-dev-secret-doi-truoc-khi-deploy';

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`Thiếu biến môi trường ${name}`);
  return v;
}

export const config = {
  port: Number(process.env.PORT ?? 4100),
  databaseUrl: required('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5435/coffeepos'),
  jwtSecret: required('JWT_SECRET', DEV_SECRET),
  usingDevSecret: (process.env.JWT_SECRET ?? DEV_SECRET) === DEV_SECRET,
  /** Phiên đăng nhập 12 tiếng (một ca dài). */
  jwtExpiresInSec: 12 * 60 * 60,
  cookieName: 'coffeepos_token',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3100',
  isProduction: process.env.NODE_ENV === 'production',
  /** Swagger UI tại /api/docs — tắt bằng SWAGGER_ENABLED=false (vd. khi deploy thật). */
  swaggerEnabled: process.env.SWAGGER_ENABLED !== 'false',
  /** File báo cáo kiểm thử do `npm run test:report` (thư mục gốc) sinh ra; Docker mount ./reports vào /app/reports. */
  testReportPath: process.env.TEST_REPORT_PATH ?? resolve(process.cwd(), '../reports/test-report.json'),
};
