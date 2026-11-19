import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { configureApp } from '../src/app.factory';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { DEMO_PASSWORD } from '../src/seed/seed-data';
import { resetDatabase } from '../src/seed/seed';

export interface TestContext {
  app: INestApplication<App>;
  prisma: PrismaService;
  api: () => ReturnType<typeof request>;
  /** Header Authorization cho tài khoản demo đã đăng nhập. */
  as: (username: string) => { Authorization: string };
  token: (username: string) => string;
  productId: (name: string) => number;
  close: () => Promise<void>;
}

/** Dựng app giống production (configureApp), nạp lại DB test, đăng nhập sẵn các tài khoản. */
export async function createTestContext(users = ['chuquan', 'thungan1', 'phache1']): Promise<TestContext> {
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = configureApp(mod.createNestApplication<INestApplication<App>>());
  await app.init();
  const prisma = app.get(PrismaService);
  await resetDatabase(prisma);

  const api = () => request(app.getHttpServer());
  const tokens: Record<string, string> = {};
  for (const u of users) {
    const res = await api().post('/api/auth/login').send({ username: u, password: DEMO_PASSWORD }).expect(200);
    tokens[u] = (res.body as { token: string }).token;
  }
  const ids = new Map((await prisma.product.findMany()).map((p) => [p.name, p.id]));

  return {
    app,
    prisma,
    api,
    token: (u) => tokens[u],
    as: (u) => ({ Authorization: `Bearer ${tokens[u]}` }),
    productId: (name) => {
      const id = ids.get(name);
      if (!id) throw new Error(`Không có món "${name}" trong dữ liệu mẫu`);
      return id;
    },
    close: () => app.close(),
  };
}
