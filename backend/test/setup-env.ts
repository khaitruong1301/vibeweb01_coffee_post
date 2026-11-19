// Chạy trong mỗi worker trước khi import app: e2e LUÔN dùng DB test, không bao giờ đụng DB chính.
import 'dotenv/config';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

process.env.DATABASE_URL =
  process.env.DATABASE_URL_TEST ?? 'postgresql://postgres:postgres@localhost:5435/coffeepos_test';
process.env.NODE_ENV = 'test';
// Báo cáo kiểm thử giả cho quality.e2e-spec.ts — không đọc reports/ thật của repo.
process.env.TEST_REPORT_PATH = join(tmpdir(), `coffeepos-test-report-${process.pid}.json`);
