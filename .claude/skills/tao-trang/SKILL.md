---
name: tao-trang
description: Tạo trang (màn hình) mới cho frontend Next.js theo khung dự án — nhóm (app) có AuthProvider, useRequireRole, gọi API qua lib/api.ts, component ui.tsx, trạng thái tải/rỗng/lỗi, tiếng Việt có dấu. Dùng khi người dùng muốn "thêm trang", "tạo màn hình", "làm giao diện ...".
argument-hint: "<tên trang / mô tả màn hình>"
---

# Tạo trang mới

Yêu cầu: $ARGUMENTS

1. **Đọc trước**: `.claude/docs/ui-ux/design-system.md` (màu, component, bảng màn hình), wireframe `.claude/docs/ui-ux/wireframe-man-hinh.drawio`, use case liên quan, `.claude/rules/frontend.md`, `.claude/rules/ui.md`.
2. **Xác định**: route (kebab-case), vai trò được vào, API cần gọi (chưa có → skill `tao-api` trước), thao tác trên trang.
3. **Code** `frontend/src/app/(app)/<route>/page.tsx` (`'use client'`):
   - Dòng đầu: `const allowed = useRequireRole([...])`; `if (!allowed) return null`.
   - Gọi API bằng `api<T>()`; kiểu ở `lib/types.ts`.
   - Có trạng thái đang tải (`Spinner`), rỗng (lời nhắc), lỗi (`Alert` + thử lại); 401 giữa chừng → mời đăng nhập lại.
   - Dùng `components/ui.tsx`, màu theo theme, tiền/ngày qua `lib/format.ts`.
   - Trang có menu → thêm vào `NAV` trong `lib/roles.ts`.
4. **Kiểm tra**: `npm run typecheck && npm run lint && npm run build` trong `frontend/`; chạy skill `kiem-tra-giao-dien` ở 1280px và 390px.
5. **Tài liệu**: thêm dòng vào bảng màn hình trong `design-system.md`.
6. Báo cáo: route đã tạo, kết quả kiểm tra (ảnh chụp), tài liệu đã cập nhật.
