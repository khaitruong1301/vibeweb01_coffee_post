---
paths:
  - "backend/src/**/*.ts"
  - "backend/test/**/*.ts"
---

# Quy tắc backend (NestJS 11 + Prisma 7)

## Cấu trúc
- Mỗi module một thư mục `backend/src/<module>/`: `<module>.module.ts`, `<module>.controller.ts` (chỉ nhận request, gọi service), `<module>.service.ts` (nghiệp vụ + Prisma), `dto/` (class-validator).
- Module mới phải import vào `backend/src/app.module.ts`.
- Cấu hình chỉ đọc qua `backend/src/config.ts`, không dùng `process.env` rải rác.
- Cấu hình app (prefix `/api`, pipe, filter, cookie, CORS) ở `backend/src/app.factory.ts` — dùng chung cho `main.ts` và e2e test.

## Xác thực & phân quyền
- `JwtAuthGuard` + `RolesGuard` là guard toàn cục: mọi route mặc định cần đăng nhập. Chỉ `login`, `logout`, `health` được `@Public()`.
- Phân quyền bằng `@Auth('cashier' | 'barista' | 'admin', …)` (bên trong là `@Roles`); người thao tác lấy bằng `@CurrentUser()`, không từ body.
- Kiểm tra quyền theo dữ liệu (ví dụ `?all=true` chỉ admin) làm trong controller/service, ném `ForbiddenException`.

## Swagger (`/api/docs`)
- Route cần đăng nhập gắn `@Auth()` / `@Auth('admin', …)` (= `@Roles` + ổ khóa + lỗi 401/403 trên Swagger) thay vì `@Roles` trần.
- Mỗi route: `@ApiTags` (ở controller), `@ApiOperation({ summary: '... (UCxx)' })`, `@ApiOkResponse/@ApiCreatedResponse({ type: XxxDto })`, `@ApiErrors(...)` cho mã lỗi riêng.
- DTO request và response đặt trong file `*.dto.ts` (plugin chỉ đọc đuôi này); mô tả + `@example` bằng JSDoc; field enum thêm `@ApiProperty({ enum })`.
- Hàm dựng phản hồi khai báo kiểu trả về là DTO response (vd. `toOrderDto(): OrderDto`) để tài liệu không lệch dữ liệu thật.
- `backend/test/swagger.e2e-spec.ts` kiểm tra tài liệu khớp quyền và luật — cập nhật khi thêm route.

## Validate
- Mọi body / query dùng DTO class-validator; thông báo lỗi tiếng Việt trong decorator.
- ValidationPipe `whitelist: true`: field không khai báo bị loại. **Không** thêm field giá/tổng vào DTO tạo đơn.
- Tham số `:id` dùng `IdPipe` (`backend/src/common/id.pipe.ts`).

## Nghiệp vụ bán hàng
- Tính tiền chỉ qua `priceOrder()` / `unitPrice()` trong `backend/src/pricing/pricing.ts` (hàm thuần, có unit test). Không tính tiền ở controller hay frontend.
- Lấy giá từ DB (`isActive: true`), chụp `productName`, `unitPrice` vào `order_items`.
- Ghi nhiều bảng: nested create của Prisma hoặc `prisma.$transaction`.
- Chuyển trạng thái đơn theo `NEXT_STATUS` (`order-status.ts`), cập nhật có điều kiện (`updateMany where status = cũ`) để chống race.
- Mã đơn `CP-000123` suy ra từ id (`order-code.ts`), không lưu cột riêng.

## Bảo mật (đã có — không làm yếu đi)
- Đăng nhập / kiểm tra mật khẩu đi qua `LoginLimiter` (`auth/login-limiter.ts`); thông báo sai luôn giống nhau, kể cả tên không tồn tại.
- JWT có claim `ver` = `users.token_version`; thao tác làm mất hiệu lực phiên (đăng xuất, đổi mật khẩu, khoá tài khoản) phải tăng `token_version`.
- Header bảo mật bằng helmet trong `app.factory.ts`; route mới trả HTML phải có CSP phù hợp.
- Cấu hình production kiểm tra trong `productionConfigErrors()` (`config.ts`) — thêm biến bí mật mới thì thêm kiểm tra.

## Lỗi & phản hồi
- Ném `BadRequestException({ error: '...' })`, `NotFoundException({ error })`, `ConflictException({ error })`… — `AllExceptionsFilter` trả `{ error, details? }`, đổi lỗi Prisma P2002 → 409, P2025 → 404, vi phạm CHECK → 400.
- Không trả `passwordHash`; luôn `select`/`include` có chủ đích.
- JSON camelCase. Status: 201 tạo, 200 sửa, 204 không nội dung, 409 xung đột trạng thái.

## Test
- Luật mới → unit test trong `*.spec.ts` cạnh file; API mới → e2e trong `backend/test/*.e2e-spec.ts` (đúng, 400, 401, 403, 404/409).
- e2e luôn chạy trên `coffeepos_test` (`test/setup-env.ts` ép `DATABASE_URL`), dữ liệu nạp lại bằng `resetDatabase()`.

## TypeScript
- `strict`, không `any`; import tương đối không đuôi (CommonJS).
- Không để `console.log` debug (dùng `Logger` của Nest khi cần log).
