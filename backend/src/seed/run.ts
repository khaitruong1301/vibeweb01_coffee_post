// Chạy: npm run db:seed (dev, tsx) · node dist/seed/run.js (Docker). Chỉ nạp khi DB trống.
import { PrismaPg } from '@prisma/adapter-pg';
import { config } from '../config';
import { PrismaClient } from '../generated/prisma/client';
import { DEMO_PASSWORD, USERS } from './seed-data';
import { seedDatabase } from './seed';

async function main() {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: config.databaseUrl }) });
  try {
    // Production bắt buộc SEED_PASSWORD (config.ts đã kiểm tra) — không bao giờ dùng mật khẩu demo công khai.
    const password = process.env.SEED_PASSWORD || DEMO_PASSWORD;
    const { skipped } = await seedDatabase(prisma, { onlyIfEmpty: true, password });
    if (skipped) {
      console.log('Seed: DB đã có dữ liệu — bỏ qua.');
    } else {
      const shown = process.env.SEED_PASSWORD ? '(SEED_PASSWORD — hãy đổi mật khẩu từng tài khoản sau lần đăng nhập đầu)' : DEMO_PASSWORD;
      console.log(`Seed: đã nạp dữ liệu mẫu. Tài khoản: ${USERS.map((u) => u.username).join(', ')} · mật khẩu: ${shown}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
