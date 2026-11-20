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
- Tài khoản demo **chỉ ở máy dev** (mật khẩu `Coffee@123`): `thungan1` (bán hàng), `phache1` (quầy pha), `chuquan` (sản phẩm, kiểm thử). Đổi mật khẩu ở trang **Tài khoản** (bấm tên trên thanh menu).
- Production (`APP_ENV=production`) không dùng mật khẩu demo: bắt buộc secret `SEED_PASSWORD` và `JWT_SECRET` ≥ 32 ký tự — xem `.github/workflows/deploy.yml`.

## Dev local (Node 22)

```bash
docker compose up -d db
cd backend  && npm install && npm run db:deploy && npm run db:seed && npm run dev   # :4100
cd frontend && npm install && npm run dev                                         # :3100
```

## Deploy (CI/CD)

Push lên `main` → CI (`ci.yml`) tự chạy toàn bộ kiểm thử. Deploy **thủ công**: Actions → Deploy → Run workflow (chọn `ref`, mặc định `main`) — workflow kiểm tra commit đã có CI xanh rồi SSH vào server, chạy `docker compose up -d --build`.
Cấu hình secrets và cách vận hành: `.claude/docs/architecture/overview.md` mục 7.

## Kiểm thử

15 hạng mục kiểm thử tự động. Chi tiết, kết quả và coverage xem `TEST_CHECKLIST.md`.

```bash
npm run static && npm run test:unit && npm run test:api        # cần: docker compose up -d db
npm run stack:e2e:up && npm run test:smoke && PW_CHANNEL=chrome npm run test:e2e && npm run stack:e2e:down
```
