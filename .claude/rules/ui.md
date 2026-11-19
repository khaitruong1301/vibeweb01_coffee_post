---
paths:
  - "frontend/src/app/**/*.tsx"
  - "frontend/src/components/**/*.tsx"
  - "frontend/src/app/globals.css"
---

# Quy tắc giao diện

- Toàn bộ chữ hiển thị bằng **tiếng Việt có dấu đầy đủ**; thuật ngữ thống nhất theo bảng trong `design-system.md` (Đơn hàng, Món, Bàn, Ca làm việc, Thanh toán...).
- Màu, bo góc, font lấy từ biến theme trong `frontend/src/app/globals.css` (`@theme`), dùng qua class Tailwind (`bg-primary`, `text-muted`...). Không viết mã màu hex trực tiếp trong component.
- Ưu tiên component có sẵn trong `frontend/src/components/ui.tsx`; cần component mới dùng nhiều nơi thì thêm vào đó và ghi vào `design-system.md`.
- Nút bấm trên màn hình POS cao tối thiểu 44px (bấm bằng tay trên tablet).
- Trạng thái pha chế (Chờ pha / Đang pha / Xong — chờ giao / Đã giao) và trạng thái món (Đang bán / Ngừng bán) dùng đúng nhãn trong `design-system.md`.
- Đủ tương phản (WCAG AA); input có `label`; điều hướng được bằng bàn phím.
- Kiểm tra bằng skill `kiem-tra-giao-dien` ở 1280px và 390px trước khi báo xong.
