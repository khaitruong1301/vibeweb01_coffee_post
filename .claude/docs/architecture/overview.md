# Kiến trúc tổng quan

## 1. Công nghệ

| Lớp | Công nghệ |
|---|---|
| Frontend | Next.js 16.4 (App Router, `output: 'standalone'`), React 19, TypeScript strict, Tailwind CSS 4 |
| Backend | NestJS 11 (CommonJS), class-validator / class-transformer, `@nestjs/jwt`, `@nestjs/swagger` (plugin CLI), bcryptjs, cookie-parser |
| ORM / DB | Prisma 7.10 (`prisma-client` generator, `@prisma/adapter-pg`) → PostgreSQL 17 |
| Test | Jest + ts-jest (unit), Jest + supertest (e2e trên `coffeepos_test`) |
| Đóng gói | Docker (multi-stage, `node:22-alpine`), Docker Compose |
| CI/CD | GitHub Actions: `ci.yml` (kiểm thử, tự chạy), `deploy.yml` (deploy thủ công: SSH lên server, build bằng Docker Compose) |

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
.github/workflows/          ci.yml (kiểm thử) · deploy.yml (deploy thủ công lên server)
scripts/deploy.sh           chạy trên server: cài Docker, lấy code theo commit, compose up --build, health check
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
    quality/                GET /api/quality/report — đọc reports/test-report.json
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
    (app)/quality/          báo cáo kiểm thử (chỉ admin)
    (app)/account/          tài khoản — đổi mật khẩu (mọi vai trò)
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
| quality | `/api/quality/report` (chỉ admin) | báo cáo kiểm thử |

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
| `CORS_ORIGIN` | backend, compose | mặc định `http://localhost:3100`; production = `DEPLOY_URL` |
| `SEED` | backend (Docker) | `true` → nạp dữ liệu mẫu khi DB trống |
| `APP_ENV` | backend | `production` → từ chối khởi động nếu `JWT_SECRET` mặc định / < 32 ký tự hoặc `SEED=true` mà thiếu `SEED_PASSWORD` |
| `SEED_PASSWORD` | backend | mật khẩu tài khoản seed; dev bỏ trống = `Coffee@123`; production bắt buộc khi `SEED=true` |
| `COOKIE_SECURE` | backend, frontend (build `ENABLE_HSTS`) | `true` khi chạy HTTPS: cookie Secure + header HSTS |
| `LOGIN_MAX_FAILS_PER_USER` / `_PER_IP` / `LOGIN_WINDOW_SEC` | backend | giới hạn đăng nhập sai (mặc định 5 / 20 / 900 giây) |
| `SWAGGER_ENABLED` | backend | mặc định bật ở dev, **tắt khi `APP_ENV=production`**; đặt `true` / `false` để ép |
| `TEST_REPORT_PATH` | backend | file báo cáo kiểm thử cho `/api/quality/report`; mặc định `../reports/test-report.json`, Docker: `/app/reports/test-report.json` (mount `./reports` chỉ đọc) |
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

## 7. Triển khai (CD)

`.github/workflows/deploy.yml` **chỉ chạy thủ công**: push lên `main` chỉ chạy CI, không tự deploy. Khi muốn đưa bản mới lên server: GitHub → **Actions → Deploy → Run workflow**, hoặc `gh workflow run deploy.yml -f ref=main`.

| Input | Mặc định | Ý nghĩa |
|---|---|---|
| `ref` | `main` | branch, tag hoặc commit SHA cần deploy — rollback = nhập commit cũ |
| `skip_ci_check` | `false` | mặc định workflow dừng nếu commit chưa có lần chạy CI thành công; chỉ bật khi khẩn cấp |

Các bước:

1. Checkout `ref`, kiểm tra commit đã có CI xanh.
2. SSH vào server bằng deploy key (kiểm tra host key qua `SSH_KNOWN_HOSTS`).
3. Kiểm tra secret (`JWT_SECRET` ≥ 32 ký tự, có `SEED_PASSWORD` khi `SEED=true`), ghi `/opt/coffeepos/.env` từ GitHub Secrets/Variables (quyền 600, kèm `APP_ENV=production`, DB/API bind `127.0.0.1`).
4. Gửi `scripts/deploy.sh` chạy trên server: lần đầu cài git + Docker, tạo swap 2GB nếu RAM < 2GB; lấy đúng commit đã qua CI (`git fetch --depth 1` + checkout); `docker compose up -d --build --wait`; gọi `/api/health` qua cổng web; dọn image cũ.

| Server | Giá trị |
|---|---|
| Thư mục | `/opt/coffeepos` (code + `.env`), dữ liệu DB ở volume `coffeepos_db-data` |
| Cổng mở ra Internet | chỉ web `FRONTEND_PORT` (mặc định 3100); DB và API nghe trên `127.0.0.1` |
| Swagger | tắt trên production; bật bằng variable `SWAGGER_ENABLED=true` → `<DEPLOY_URL>/api/docs` (đi qua Next rewrites) |

| GitHub Secrets | Ý nghĩa |
|---|---|
| `SSH_HOST`, `SSH_USER` | địa chỉ server, user SSH |
| `SSH_PRIVATE_KEY` | private key của deploy key (public key nằm trong `~/.ssh/authorized_keys` trên server) |
| `SSH_KNOWN_HOSTS` | kết quả `ssh-keyscan <host>` |
| `JWT_SECRET`, `DB_PASSWORD` | ghi vào `.env` server; `JWT_SECRET` ≥ 32 ký tự; `DB_PASSWORD` chỉ áp dụng khi volume DB tạo lần đầu |
| `SEED_PASSWORD` | mật khẩu tài khoản seed — **bắt buộc khi `SEED=true`** (workflow dừng nếu thiếu); chỉ dùng khi DB trống |

| GitHub Variables (tuỳ chọn) | Mặc định |
|---|---|
| `FRONTEND_PORT` | `3100` |
| `SEED` | `true` (nạp dữ liệu mẫu khi DB trống) |
| `DEPLOY_URL` | link hiển thị trên run + `CORS_ORIGIN` |
| `COOKIE_SECURE` | `false` — đặt `true` khi web chạy HTTPS (cookie Secure + HSTS) |
| `SWAGGER_ENABLED` | `false` (production tắt `/api/docs`) |

Kiểm tra trên server: `cd /opt/coffeepos && docker compose ps` · `docker compose logs -f backend`. Rollback: chạy workflow Deploy với `ref` = commit cũ, hoặc trên server `git fetch --depth 1 origin <sha> && git checkout -f FETCH_HEAD && docker compose up -d --build`.
