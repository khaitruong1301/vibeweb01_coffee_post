---
name: cap-nhat-docs
description: Đối chiếu code với tài liệu trong .claude/docs (API, database, kiến trúc, use case, giao diện) và sửa chỗ lệch. Dùng khi người dùng muốn "cập nhật tài liệu", "đồng bộ docs", "docs có khớp code không", hoặc trước khi commit/bàn giao.
argument-hint: "[api | database | kien-truc | use-case | giao-dien | <đường dẫn>]"
---

# Đồng bộ tài liệu với code

Phạm vi: $ARGUMENTS (bỏ trống = toàn bộ)

1. **API** — liệt kê `@Get/@Post/@Patch/@Put/@Delete` + `@Controller(...)` + `@Roles/@Public` trong `backend/src/**/*.controller.ts`; so với bảng endpoint trong `.claude/docs/api/README.md` (method, đường dẫn, vai trò, UC). DTO trong `dto/` ↔ mục chi tiết.
2. **Database** — `backend/prisma/schema.prisma` + `backend/prisma/migrations/` (cả CHECK constraint) ↔ `.claude/docs/architecture/database.md`.
3. **Kiến trúc** — cây thư mục, module trong `app.module.ts`, biến môi trường (`backend/src/config.ts`, các `.env.example`, `docker-compose.yml`), script `package.json` ↔ `overview.md`.
4. **Use case / luật** — `backend/src/pricing/pricing.ts`, `order-status.ts`, `@Roles` ↔ `use-case.md` (BR, vai trò, trạng thái).
5. **Giao diện** — `frontend/src/app/**/page.tsx`, `lib/roles.ts` (NAV), `components/ui.tsx` ↔ `design-system.md`.
6. Viết theo `.claude/rules/docs.md`: tiếng Việt có dấu, chỉ ghi điều có trong code.
7. Báo cáo: file nào đã sửa, mục nào, lệch gì; điểm cần người dùng xác nhận.
