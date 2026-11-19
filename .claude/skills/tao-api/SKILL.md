---
name: tao-api
description: Tạo endpoint REST mới cho backend NestJS theo khung dự án (module/controller/service + DTO class-validator + @Roles + Prisma + lỗi { error } + unit/e2e test + tài liệu API). Dùng khi người dùng muốn "thêm API", "tạo endpoint", "thêm module", "CRUD cho bảng ...".
argument-hint: "<mô tả endpoint / module>"
---

# Tạo API mới (NestJS)

Yêu cầu: $ARGUMENTS

1. **Đọc trước**: `.claude/docs/api/README.md` (endpoint đã có, quy ước lỗi), `.claude/docs/architecture/database.md`, `.claude/rules/backend.md`, mẫu trong `.claude/docs/conventions/coding.md`. Bảng chưa có → làm skill `tao-migration` trước.
2. **Xác định**: use case (UCxx), method + đường dẫn (danh từ số nhiều, kebab-case), vai trò được phép, dữ liệu vào/ra, luật BR liên quan. Thiếu thông tin nghiệp vụ quan trọng thì hỏi.
3. **DTO** `backend/src/<module>/dto/<ten>.dto.ts`: class-validator, thông báo tiếng Việt, `@Transform(trim)` cho chuỗi, `@Type(() => X)` + `@ValidateNested` cho mảng object. Không có field giá/tổng nếu là dữ liệu tiền.
4. **Service** `<module>.service.ts`: nghiệp vụ + Prisma với `select`/`include` rõ ràng; luật tính tiền gọi `backend/src/pricing/pricing.ts`; ghi nhiều bảng trong một transaction; ném `XxxException({ error: '...' })`.
5. **Controller** `<module>.controller.ts`: `@ApiTags` (tag mới → `addTag` trong `common/swagger.ts`), `@Auth(...)`, `@ApiOperation({ summary })`, `@ApiOkResponse({ type })`, `@ApiErrors(...)`, `@CurrentUser()`, `IdPipe` cho `:id`; chỉ gọi service. DTO phản hồi trong `dto/<ten>-response.dto.ts`. Module mới → import vào `app.module.ts`.
6. **Test**: luật thuần → `*.spec.ts`; API → thêm vào `backend/test/*.e2e-spec.ts` (đúng, 400, 401, 403, 404/409); kiểm tra route mới hiện đúng ở http://localhost:4100/api/docs. Chạy `npm run typecheck && npm test && npm run test:e2e` trong `backend/`.
7. **Frontend** (nếu dùng): thêm kiểu vào `frontend/src/lib/types.ts`, gọi bằng `api<T>()`.
8. **Tài liệu**: bảng endpoint + mục chi tiết trong `.claude/docs/api/README.md`; module mới → `overview.md`.
9. Báo cáo: endpoint đã tạo, kết quả test, tài liệu đã cập nhật.
