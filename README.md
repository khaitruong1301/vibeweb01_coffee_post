# CoffeePOS

Phần mềm bán hàng quán cà phê — bài tập buổi 7-8 "Kiểm thử và CI/CD trên CoffeePOS".

- `frontend/` Next.js 16 · `backend/` NestJS 11 + Prisma 7 · PostgreSQL 17 · Docker Compose
- Tài liệu: `CLAUDE.md` và `.claude/docs/`

## Chạy bằng Docker

```bash
cp .env.example .env        # đặt JWT_SECRET riêng
docker compose up -d --build
```

- Web: http://localhost:3100 · API: http://localhost:4100/api (`/api/health`) · DB: localhost:5435
- Tài khoản demo (mật khẩu `Coffee@123`): `thungan1` (bán hàng), `phache1` (quầy pha), `chuquan` (sản phẩm)

## Dev local (Node 22)

```bash
docker compose up -d db
cd backend  && npm install && npm run db:deploy && npm run db:seed && npm run dev   # :4100
cd frontend && npm install && npm run dev                                         # :3100
```

## Deploy (CI/CD)

Push lên `main` → CI (`ci.yml`) chạy toàn bộ kiểm thử → nếu xanh, `deploy.yml` SSH vào server, lấy đúng commit đó và chạy `docker compose up -d --build`.
Cấu hình secrets và cách vận hành: `.claude/docs/architecture/overview.md` mục 7.

## Kiểm thử

15 hạng mục kiểm thử tự động. Chi tiết, kết quả và coverage xem `TEST_CHECKLIST.md`; CI chạy khi tạo PR (`.github/workflows/ci.yml`).

```bash
npm run static && npm run test:unit && npm run test:api        # cần: docker compose up -d db
npm run stack:e2e:up && npm run test:smoke && PW_CHANNEL=chrome npm run test:e2e && npm run stack:e2e:down
```
