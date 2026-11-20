import bcrypt from 'bcryptjs';
import type { PrismaClient } from '../generated/prisma/client';
import { CATEGORIES, DEMO_PASSWORD, PRODUCTS, USERS } from './seed-data';

/**
 * Nạp dữ liệu mẫu. Mặc định chỉ chạy khi DB chưa có tài khoản nào — container khởi động lại
 * không ghi đè giá chủ quán đã sửa.
 */
export async function seedDatabase(prisma: PrismaClient, opts: { onlyIfEmpty?: boolean; password?: string } = {}) {
  if (opts.onlyIfEmpty && (await prisma.user.count()) > 0) return { skipped: true };

  const passwordHash = await bcrypt.hash(opts.password ?? DEMO_PASSWORD, 10);
  for (const u of USERS) {
    await prisma.user.upsert({ where: { username: u.username }, update: {}, create: { ...u, passwordHash } });
  }
  const categoryIds = new Map<string, number>();
  for (const [i, name] of CATEGORIES.entries()) {
    const c = await prisma.category.upsert({ where: { name }, update: {}, create: { name, sortOrder: i + 1 } });
    categoryIds.set(name, c.id);
  }
  for (const p of PRODUCTS) {
    await prisma.product.upsert({
      where: { name: p.name },
      update: {},
      create: {
        name: p.name,
        categoryId: categoryIds.get(p.category)!,
        price: p.price,
        hasSize: p.hasSize ?? true,
        isActive: p.isActive ?? true,
      },
    });
  }
  return { skipped: false };
}

/** Chỉ dùng cho e2e test trên DB test: xóa sạch rồi nạp lại. */
export async function resetDatabase(prisma: PrismaClient) {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE order_items, orders, products, categories, users RESTART IDENTITY CASCADE',
  );
  await seedDatabase(prisma);
}
