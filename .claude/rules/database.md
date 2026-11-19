---
paths:
  - "backend/prisma/**"
  - "database/**"
---

# Quy tắc database (Prisma 7 + PostgreSQL 17)

- Nguồn chính: `backend/prisma/schema.prisma`. Đổi schema: `cd backend && npm run db:migrate -- --name <ten_snake>` — không dùng `prisma db push`, không sửa migration đã áp dụng.
- Generator `prisma-client`, `moduleFormat = "cjs"`, `importFileExtension = ""` (bắt buộc để `nest build` chạy, cả trong Docker). Client sinh vào `backend/src/generated/prisma` (không commit).
- Prisma 7 không tự đọc `.env`: URL lấy trong `backend/prisma.config.ts`.
- Model `PascalCase` số ít, `@@map("snake_case_so_nhieu")`; field camelCase + `@map("snake_case")`.
- Mọi bảng có `id`; bảng nghiệp vụ có `createdAt`, `updatedAt` (timestamptz).
- Tiền `Int` (VNĐ), số lượng `Int`, trạng thái `enum`.
- Luật quan trọng thêm CHECK constraint thủ công trong migration (`--create-only` rồi sửa SQL) — lớp chặn cuối nếu code sót. Đặt tên `<bang>_<y_nghia>`.
- Món / nhân viên đã có đơn: không xóa, dùng `isActive = false`.
- Dữ liệu mẫu: `backend/src/seed/` (chỉ nạp khi DB trống). Seed chạy tự động trong Docker khi `SEED=true`.
- Áp migration cho cả DB test: e2e tự chạy `prisma migrate deploy` lên `coffeepos_test`.
- Đổi schema xong: `npm run typecheck`, `npm run test:e2e`, cập nhật `.claude/docs/architecture/database.md`.
