// Cấu hình Prisma CLI (Prisma 7): Prisma 7 không tự đọc .env nên nạp bằng dotenv.
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx src/seed/run.ts',
  },
  datasource: {
    // `prisma generate` không cần kết nối DB → cho phép thiếu biến khi build Docker.
    url: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5435/coffeepos',
  },
});
