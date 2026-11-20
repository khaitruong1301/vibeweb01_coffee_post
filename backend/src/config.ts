// Đọc & kiểm tra biến môi trường tại một chỗ — không dùng process.env rải rác.
import 'dotenv/config';
import { resolve } from 'node:path';

export const DEV_JWT_SECRET = 'coffeepos-dev-secret-doi-truoc-khi-deploy';

/**
 * Cấu hình bắt buộc khi APP_ENV=production (server thật). Trả danh sách lỗi; rỗng = hợp lệ.
 * Tách hàm thuần để unit test được mà không phải khởi động app.
 */
export function productionConfigErrors(env: NodeJS.ProcessEnv): string[] {
  if (env.APP_ENV !== 'production') return [];
  const errors: string[] = [];
  const secret = env.JWT_SECRET ?? '';
  if (!secret || secret === DEV_JWT_SECRET) errors.push('JWT_SECRET chưa đặt hoặc đang dùng giá trị mặc định cho dev');
  else if (secret.length < 32) errors.push('JWT_SECRET phải dài tối thiểu 32 ký tự');
  if (env.SEED === 'true' && !env.SEED_PASSWORD) errors.push('SEED=true trên production cần SEED_PASSWORD (không dùng mật khẩu demo)');
  return errors;
}

const prodErrors = productionConfigErrors(process.env);
if (prodErrors.length) {
  throw new Error(`Cấu hình production không an toàn:\n- ${prodErrors.join('\n- ')}`);
}

const appEnv = process.env.APP_ENV ?? 'development';
const isProduction = appEnv === 'production';
const num = (v: string | undefined, fallback: number) => (v && Number.isFinite(Number(v)) ? Number(v) : fallback);

export const config = {
  appEnv,
  isProduction,
  port: num(process.env.PORT, 4100),
  databaseUrl: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5435/coffeepos',
  jwtSecret: process.env.JWT_SECRET ?? DEV_JWT_SECRET,
  usingDevSecret: (process.env.JWT_SECRET ?? DEV_JWT_SECRET) === DEV_JWT_SECRET,
  /** Phiên đăng nhập 12 tiếng (một ca dài). */
  jwtExpiresInSec: 12 * 60 * 60,
  cookieName: 'coffeepos_token',
  /** Đặt COOKIE_SECURE=true khi web chạy HTTPS: cookie chỉ gửi qua HTTPS + bật HSTS. */
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3100',
  /** Swagger UI tại /api/docs — mặc định tắt trên production, bật lại bằng SWAGGER_ENABLED=true. */
  swaggerEnabled: process.env.SWAGGER_ENABLED ? process.env.SWAGGER_ENABLED === 'true' : !isProduction,
  /** File báo cáo kiểm thử do `npm run test:report` (thư mục gốc) sinh ra; Docker mount ./reports vào /app/reports. */
  testReportPath: process.env.TEST_REPORT_PATH ?? resolve(process.cwd(), '../reports/test-report.json'),
  /** Chống dò mật khẩu: số lần đăng nhập SAI tối đa trong cửa sổ thời gian. */
  login: {
    maxFailsPerUser: num(process.env.LOGIN_MAX_FAILS_PER_USER, 5),
    maxFailsPerIp: num(process.env.LOGIN_MAX_FAILS_PER_IP, 20),
    windowSec: num(process.env.LOGIN_WINDOW_SEC, 15 * 60),
  },
};
