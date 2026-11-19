import { execSync } from 'node:child_process';
import 'dotenv/config';

/** Áp migration lên DB test trước khi chạy e2e. */
export default function globalSetup() {
  const url = process.env.DATABASE_URL_TEST ?? 'postgresql://postgres:postgres@localhost:5435/coffeepos_test';
  if (!/_test\b/.test(url)) throw new Error(`DATABASE_URL_TEST phải trỏ tới DB có hậu tố _test (đang là ${url})`);
  execSync('npx prisma migrate deploy', { stdio: 'inherit', env: { ...process.env, DATABASE_URL: url } });
}
