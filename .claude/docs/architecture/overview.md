# Kiến trúc tổng quan

## 1. Công nghệ

| Lớp | Công nghệ |
|---|---|
| Frontend | Next.js 16.4 (App Router, `output: 'standalone'`), React 19, TypeScript strict, Tailwind CSS 4 |
| Backend | NestJS 11 (CommonJS), class-validator / class-transformer, `@nestjs/jwt`, `@nestjs/swagger` (plugin CLI), bcryptjs, cookie-parser |
| ORM / DB | Prisma 7.10 (`prisma-client` generator, `@prisma/adapter-pg`) → PostgreSQL 17 |
| Test | Jest + ts-jest (unit), Jest + supertest (e2e trên `coffeepos_test`) |
| Đóng gói | Docker (multi-stage, `node:22-alpine`), Docker Compose |

> Dùng NestJS 11 thay vì 12: bản 12 chuyển sang ESM thuần, chưa phù hợp với Prisma client CommonJS của dự án.

## 2. Luồng xử lý

```
Trình duyệt ──/api/*──► Next.js (rewrites) ──► NestJS /api ──► Prisma ──► PostgreSQL
   (cookie coffeepos_token httpOnly, cùng origin)   │
                                                    ├─ JwtAuthGuard + RolesGuard (toàn cục)
                                                    ├─ ValidationPipe (whitelist) → DTO
                                                    └─ AllExceptionsFilter → { error, details? }
```

- Next chuyển tiếp `/api/:path*` sang `BACKEND_URL` (chốt lúc build). Nhờ cùng origin, cookie httpOnly hoạt động mà không cần CORS.
- Backend vẫn bật CORS cho `CORS_ORIGIN` (gọi trực tiếp từ công cụ khác) và nhận cả `Authorization: Bearer` (Postman, test).

## 3. Cấu trúc thư mục

```
docker-compose.yml          db + backend + frontend (dev và production dùng chung, khác nhau ở .env)
.env.example                biến cho compose (JWT_SECRET, cổng, SEED, địa chỉ bind)
database/init/              SQL chạy khi volume DB trống (tạo coffeepos_test)
backend/
  prisma/schema.prisma      schema · migrations/ (kèm CHECK constraint)
  prisma.config.ts          cấu hình Prisma CLI (URL, seed)
  src/
    main.ts · app.module.ts · app.factory.ts (prefix /api, pipe, filter, cookie, CORS)
    config.ts               đọc biến môi trường
    common/                 AllExceptionsFilter, ValidationPipe, IdPipe, swagger.ts (setupSwagger, ApiErrors)
    prisma/                 PrismaService (global)
    auth/                   login/logout/me, JwtAuthGuard, RolesGuard, @Public @Roles @CurrentUser
    pricing/                luật tính tiền thuần + unit test
    products/               menu, danh mục, thêm/sửa món
    orders/                 tạo đơn, danh sách, hóa đơn theo mã, trạng thái pha chế
    health/                 GET /api/health
    seed/                   dữ liệu mẫu (chỉ nạp khi DB trống)
    generated/prisma/       Prisma Client sinh ra (không commit)
  test/                     e2e (orders.e2e-spec.ts), global-setup, setup-env
  Dockerfile · docker-entrypoint.sh (migrate deploy → seed → node dist/main.js)
frontend/
  next.config.ts            standalone + rewrites /api → backend
  src/app/
    login/                  đăng nhập (công khai)
    (app)/layout.tsx        AuthProvider + Navbar (cần đăng nhập)
    (app)/page.tsx          chuyển hướng theo vai trò
    (app)/checkout/         bán hàng (UC02, UC04)
    (app)/receipt/[code]/   hóa đơn (UC03)
    (app)/barista/          màn quầy pha (UC05)
    (app)/products/         sản phẩm (UC06)
    globals.css · icon.svg · layout.tsx
  src/components/           ui.tsx, AuthProvider.tsx, Navbar.tsx
  src/lib/                  api.ts, format.ts, roles.ts, types.ts
  Dockerfile
```

## 4. Module backend

| Module | Đường dẫn | Use case |
|---|---|---|
| auth | `/api/auth/*` | UC01 |
| products | `/api/products`, `/api/categories` | UC02, UC06 |
| orders | `/api/orders` | UC02–UC05 |
| health | `/api/health` | — |

## 5. Cổng & biến môi trường

| Dịch vụ | Cổng máy | Ghi chú |
|---|---|---|
| Web (Next) | 3100 | container 3000 |
| API (Nest) | 4100 | |
| PostgreSQL | 5435 | user/pass `postgres` (dev) |

| Biến | Nơi dùng | Ý nghĩa |
|---|---|---|
| `DATABASE_URL` | backend | chuỗi kết nối; mặc định `localhost:5435/coffeepos` |
| `DATABASE_URL_TEST` | backend e2e | phải có hậu tố `_test`; mặc định `coffeepos_test` |
| `JWT_SECRET` | backend | khóa ký phiên; có giá trị mặc định cho dev (in cảnh báo) — **đổi trước khi deploy** |
| `PORT` | backend | mặc định 4100 |
| `CORS_ORIGIN` | backend, compose | mặc định `http://localhost:3100` |
| `SEED` | backend (Docker) | `true` → nạp dữ liệu mẫu khi DB trống |
| `SWAGGER_ENABLED` | backend | mặc định bật; `false` → tắt `/api/docs` |
| `BACKEND_URL` | frontend (build) | mặc định `http://localhost:4100`; Docker: `http://backend:4100` |
| `DB_PASSWORD`, `DB_PORT`, `BACKEND_PORT`, `FRONTEND_PORT` | compose | xem `.env.example` |
| `DB_BIND`, `BACKEND_BIND` | compose | địa chỉ mở cổng DB / API; mặc định `0.0.0.0`, production `127.0.0.1` |

## 6. Script

| Thư mục | Lệnh | Việc |
|---|---|---|
| backend | `npm run dev` | Nest watch, cổng 4100 |
| backend | `npm run build` / `start` | biên dịch / chạy `dist/main.js` |
| backend | `npm run typecheck` | `tsc --noEmit` |
| backend | `npm test` | unit test (`src/**/*.spec.ts`) |
| backend | `npm run test:e2e` | migrate DB test rồi chạy e2e |
| backend | `npm run db:migrate` / `db:deploy` / `db:seed` | Prisma migrate dev / deploy / nạp dữ liệu mẫu |
| frontend | `npm run dev` / `build` / `start` | Next cổng 3100 |
| frontend | `npm run typecheck` / `lint` | tsc / ESLint (core-web-vitals) |
| gốc | `docker compose up -d --build` | build + chạy cả 3 dịch vụ |
