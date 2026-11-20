# CoffeePOS — phần mềm bán hàng quán cà phê

Monorepo 3 phần, chạy bằng Docker Compose:
- `frontend/` — Next.js 16 (App Router, client components) + Tailwind 4. Trình duyệt gọi `/api/*` cùng origin, Next rewrites sang backend.
- `backend/` — NestJS 11 (CommonJS) + Prisma 7 (`@prisma/adapter-pg`) + class-validator, JWT trong cookie httpOnly.
- `database/` + `docker-compose.yml` — PostgreSQL 17: DB `coffeepos` (chính) và `coffeepos_test` (e2e).

Đọc trước khi sửa code:
- Use case, luật BR01–BR05, lỗi L1–L3: `.claude/docs/requirements/use-case.md`
- Kiến trúc, thư mục, biến môi trường, cổng: `.claude/docs/architecture/overview.md`
- Database: `.claude/docs/architecture/database.md` (nguồn chính: `backend/prisma/schema.prisma`)
- API: `.claude/docs/api/README.md`
- Giao diện, màn hình: `.claude/docs/ui-ux/design-system.md` · wireframe: `.claude/docs/ui-ux/wireframe-man-hinh.drawio`
- Quy ước code, Git, kiểm thử: `.claude/docs/conventions/`

Quy tắc chính (chi tiết trong `.claude/rules/`):
- Mọi route backend mặc định cần đăng nhập (guard toàn cục); route công khai phải gắn `@Public()`, phân quyền + tài liệu Swagger bằng `@Auth(...)`.
- Giá và tổng tiền **chỉ** tính ở server bằng `backend/src/pricing/pricing.ts` từ giá trong DB; DTO không có field giá, ValidationPipe `whitelist` loại field lạ do client gửi.
- Luật số lượng / phụ thu size nằm trong `pricing.ts` (MIN_QTY, MAX_QTY, SIZE_SURCHARGE); đổi luật → sửa đó + `pricing.spec.ts` + e2e.
- Tiền là `Int` VNĐ; thời điểm lưu UTC, hiển thị giờ Việt Nam qua `frontend/src/lib/format.ts`.
- Lỗi API: `{ "error": "<tiếng Việt>", "details"?: {...} }` — ném `XxxException({ error: '...' })`.
- JSON camelCase; cột DB snake_case qua `@map`.
- Frontend gọi API chỉ qua `frontend/src/lib/api.ts`; component dùng chung ở `frontend/src/components/ui.tsx`; giao diện tiếng Việt có dấu.
- Không đọc/sửa `.env`; biến mới thêm vào `.env.example`.
- Thêm/sửa API, bảng, trang, use case → cập nhật tài liệu trong `.claude/docs/` cùng lần thay đổi.

Chạy (Node 22: `export PATH=$HOME/.nvm/versions/node/v22.17.0/bin:$PATH`):
- Toàn bộ bằng Docker: `docker compose up -d --build` → web http://localhost:3100 · API http://localhost:4100/api · Swagger http://localhost:4100/api/docs · DB localhost:5435.
- Dev local: `docker compose up -d db` · `cd backend && npm run dev` · `cd frontend && npm run dev`.
- Kiểm tra (chi tiết `TEST_CHECKLIST.md`, quy ước `.claude/docs/conventions/testing.md`): `npm run static` · `npm run test:unit` · `npm run test:api` · E2E: `npm run stack:e2e:up && npm run test:smoke && PW_CHANNEL=chrome npm run test:e2e` · tất cả: `npm run test:all`. CI: `.github/workflows/ci.yml` chạy khi tạo PR / push `main`; CD: `.github/workflows/deploy.yml` deploy **thủ công** (Actions → Deploy → Run workflow), chỉ cho commit đã có CI xanh (overview mục 7).
- Báo cáo kiểm thử trên web: trang `/quality` (chỉ admin) đọc `reports/test-report.json` — tạo bằng `npm run test:report` (đầy đủ) / `test:report:quick` / `test:report:build`.
- Đổi schema: `cd backend && npm run db:migrate -- --name <ten>`.
- Tài khoản demo (chỉ dev, mật khẩu `Coffee@123`): `chuquan` (admin), `thungan1..3`, `phache1..3`. Production: `APP_ENV=production` bắt buộc `JWT_SECRET` mạnh + `SEED_PASSWORD`.
- Bảo mật đã có (giữ khi sửa code): giới hạn đăng nhập sai (`auth/login-limiter.ts`), thu hồi token bằng `token_version`, helmet + header Next, Swagger tắt ở production.

Skill / lệnh: `/tao-api`, `/tao-trang`, `/tao-migration`, `/kiem-tra-giao-dien`, `/cap-nhat-docs`, `/kiem-tra`, `/review`, `/commit`, `/cap-nhat-doc`. Agent: `code-reviewer`, `ui-reviewer`.
