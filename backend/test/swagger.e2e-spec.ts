import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { configureApp } from '../src/app.factory';
import { AppModule } from '../src/app.module';

interface Operation {
  security?: Record<string, string[]>[];
  responses: Record<string, unknown>;
}
interface Schema {
  properties?: Record<string, Schema & { minimum?: number; maximum?: number }>;
  required?: string[];
}
interface OpenApi {
  paths: Record<string, Record<string, Operation>>;
  components: { schemas: Record<string, Schema>; securitySchemes: Record<string, unknown> };
}

/** Tài liệu Swagger phải khớp quyền và luật thật — đổi code mà quên tài liệu thì test này đỏ. */
describe('Swagger (e2e)', () => {
  let app: INestApplication<App>;
  let doc: OpenApi;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(mod.createNestApplication());
    await app.init();
    doc = (await request(app.getHttpServer()).get('/api/docs-json').expect(200)).body;
  });

  afterAll(async () => {
    await app.close();
  });

  it('Swagger UI mở được tại /api/docs, không cần đăng nhập', async () => {
    const res = await request(app.getHttpServer()).get('/api/docs').redirects(1).expect(200);
    expect(res.text).toContain('swagger-ui');
  });

  it('khai báo đăng nhập bằng Bearer và cookie', () => {
    expect(Object.keys(doc.components.securitySchemes).sort()).toEqual(['bearer', 'cookie']);
  });

  it('route công khai không có ổ khóa, route cần đăng nhập có ổ khóa + lỗi 401', () => {
    for (const [path, method] of [['/api/auth/login', 'post'], ['/api/health', 'get']]) {
      expect(doc.paths[path][method].security).toBeUndefined();
    }
    const create = doc.paths['/api/orders'].post;
    expect(create.security).toEqual(expect.arrayContaining([{ bearer: [] }, { cookie: [] }]));
    expect(Object.keys(create.responses)).toEqual(expect.arrayContaining(['201', '400', '401', '403']));
  });

  it('route theo vai trò có lỗi 403, route chỉ cần đăng nhập thì không', () => {
    expect(doc.paths['/api/products/{id}'].patch.responses).toHaveProperty('403');
    expect(doc.paths['/api/orders/{id}/status'].patch.responses).toHaveProperty('403');
    expect(doc.paths['/api/quality/report'].get.responses).toHaveProperty('403');
    expect(doc.paths['/api/orders/{code}'].get.responses).not.toHaveProperty('403');
  });

  it('request tạo đơn không có field giá (L3), số lượng 1–50 (BR02)', () => {
    const order = doc.components.schemas.CreateOrderDto;
    const item = doc.components.schemas.OrderItemDto;
    expect(order.required).toContain('items');
    expect(Object.keys(item.properties ?? {}).sort()).toEqual(['note', 'productId', 'quantity', 'size']);
    expect(item.properties?.quantity).toMatchObject({ minimum: 1, maximum: 50 });
    expect(JSON.stringify(order)).not.toMatch(/price|total/i);
  });

  it('phản hồi có schema đầy đủ', () => {
    expect(Object.keys(doc.components.schemas.OrderDto.properties ?? {})).toEqual(
      expect.arrayContaining(['code', 'status', 'total', 'items']),
    );
    expect(doc.components.schemas.ProductDto.properties).toHaveProperty('priceL');
    expect(doc.components.schemas.ErrorResponseDto.properties).toHaveProperty('error');
  });
});
