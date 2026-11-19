---
description: Đồng bộ tài liệu .claude/docs với code hiện tại (gọi skill cap-nhat-docs)
argument-hint: "[api | database | kien-truc | use-case | giao-dien] (bỏ trống = toàn bộ)"
---

Dùng skill `cap-nhat-docs` để đối chiếu code với tài liệu và sửa chỗ lệch.

Phạm vi: $ARGUMENTS

- Bỏ trống → kiểm tra toàn bộ.
- `api` → `backend/src/**/*.controller.ts`, `dto/` ↔ `.claude/docs/api/README.md`
- `database` → `backend/prisma/schema.prisma`, `backend/prisma/migrations/` ↔ `.claude/docs/architecture/database.md`
- `kien-truc` → cây thư mục, biến môi trường, script, `docker-compose.yml` ↔ `.claude/docs/architecture/overview.md`
- `use-case` → `pricing.ts`, `order-status.ts`, `@Roles` ↔ `.claude/docs/requirements/use-case.md`
- `giao-dien` → `frontend/src/app/**/page.tsx`, `components/ui.tsx` ↔ `.claude/docs/ui-ux/design-system.md`
- Có thể truyền đường dẫn cụ thể (ví dụ `backend/src/orders`) để chỉ đồng bộ phần liên quan.

Tuân theo `.claude/rules/docs.md`. Kết thúc bằng báo cáo: file đã sửa, mục nào, lệch gì, điểm cần người dùng xác nhận.
