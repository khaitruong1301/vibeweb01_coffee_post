---
name: tao-migration
description: Thay đổi schema database bằng Prisma migrate (thêm/sửa model, cột, enum, index, quan hệ, CHECK constraint) an toàn, kèm seed, test và tài liệu. Dùng khi người dùng muốn "thêm bảng", "thêm cột", "đổi schema", "tạo migration", "sửa database".
argument-hint: "<mô tả thay đổi schema>"
---

# Đổi schema database

Yêu cầu: $ARGUMENTS

1. **Đọc trước**: `.claude/docs/architecture/database.md`, `backend/prisma/schema.prisma`, `.claude/rules/database.md`. Đảm bảo DB chạy: `docker compose up -d db`.
2. **Thiết kế**: liệt kê thay đổi và ảnh hưởng dữ liệu cũ (cột bắt buộc mới cần `@default` hoặc migration 2 bước). Thay đổi có thể mất dữ liệu (xóa cột/bảng, đổi kiểu) → **hỏi người dùng trước**.
3. **Sửa** `schema.prisma` theo quy ước (`@@map`, `@map`, tiền `Int`, `@@index`, `onDelete` rõ ràng). `npx prisma format && npx prisma validate` trong `backend/`.
4. **Tạo migration**: `npm run db:migrate -- --name <mo_ta_snake> --create-only`; đọc SQL sinh ra (đặc biệt `DROP`); thêm CHECK constraint nếu cần; rồi `npm run db:migrate` để áp dụng.
5. **Seed**: cập nhật `backend/src/seed/seed-data.ts` / `seed.ts` nếu cần dữ liệu mẫu.
6. **Kiểm tra**: `npm run typecheck && npm test && npm run test:e2e` (e2e tự áp migration lên `coffeepos_test`). Docker: `docker compose up -d --build backend` (entrypoint chạy `migrate deploy`).
7. **Tài liệu**: cập nhật `.claude/docs/architecture/database.md`.
8. Báo cáo: tên migration, thay đổi, rủi ro dữ liệu, tài liệu đã cập nhật.
