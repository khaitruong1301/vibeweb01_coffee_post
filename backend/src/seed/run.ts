// Chạy: npm run db:seed (dev, tsx) · node dist/seed/run.js (Docker). Chỉ nạp khi DB trống.
import { PrismaPg } from '@prisma/adapter-pg';
import { config } from '../config';
import { PrismaClient } from '../generated/prisma/client';
import { DEMO_PASSWORD, USERS } from './seed-data';
import { seedDatabase } from './seed';

async function main() {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: config.databaseUrl }) });
  try {
    const { skipped } = await seedDatabase(prisma, { onlyIfEmpty: true });
    if (skipped) {
      console.log('Seed: DB đã có dữ liệu — bỏ qua.');
    } else {
      console.log(`Seed: đã nạp dữ liệu mẫu. Tài khoản: ${USERS.map((u) => u.username).join(', ')} · mật khẩu: ${DEMO_PASSWORD}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
