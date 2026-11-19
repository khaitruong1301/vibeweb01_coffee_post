---
name: kiem-tra-giao-dien
description: Mở trang trên trình duyệt headless để kiểm tra giao diện thật — lỗi console, request lỗi, tràn ngang, chữ thiếu dấu, chụp ảnh màn hình ở desktop và mobile. Dùng sau khi tạo/sửa trang, khi người dùng hỏi "trang có hiển thị đúng không", "kiểm tra giao diện", "check responsive".
argument-hint: "<route, ví dụ /checkout hoặc /products>"
---

# Kiểm tra giao diện

Route: $ARGUMENTS (bỏ trống = các trang vừa sửa)

1. Đảm bảo web đang chạy ở http://localhost:3100 (`lsof -ti tcp:3100 -sTCP:LISTEN`) và API ở 4100: Docker `docker compose up -d --build` hoặc dev `npm run dev` trong `backend/` và `frontend/` (chạy nền). Không bật thêm server ở cổng khác.
2. Trang cần đăng nhập → đăng nhập bằng tài khoản demo (`backend/src/seed/seed-data.ts`, mật khẩu `Coffee@123`): `thungan1` → /checkout, `phache1` → /barista, `chuquan` → /products.
3. Dùng skill `browser-automation` mở trang ở **1280×800** và **390×844**:
   - Không có lỗi console, không có request 4xx/5xx ngoài dự kiến.
   - Không tràn ngang (`document.documentElement.scrollWidth <= innerWidth`).
   - Chữ tiếng Việt đủ dấu, không còn chữ mẫu / tiếng Anh sót.
   - Trạng thái loading / rỗng / lỗi hiển thị hợp lý; nút POS đủ lớn để bấm.
   - Màu đúng theme trong `design-system.md`.
4. Tự xem ảnh chụp; thấy lỗi thì sửa rồi kiểm tra lại.
5. Báo cáo: route đã kiểm tra, lỗi tìm thấy, đã sửa gì, đường dẫn ảnh chụp.
