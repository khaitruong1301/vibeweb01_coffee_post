---
paths:
  - "frontend/src/**/*.ts"
  - "frontend/src/**/*.tsx"
---

# Quy tắc frontend (Next.js 16 App Router)

## Cấu trúc
- Trang cần đăng nhập nằm trong nhóm `frontend/src/app/(app)/` — layout bọc `AuthProvider` + `Navbar`. Trang công khai: `app/login`.
- Đầu mỗi trang gọi `useRequireRole([...])` (sai vai trò → về trang mặc định của vai đó, `lib/roles.ts`). Trang mới có menu → thêm vào `NAV` trong `lib/roles.ts`.
- Component dùng chung: `frontend/src/components/ui.tsx` (Button, Input, Field, Chip, Alert, Modal, Spinner). Không tự viết lại.
- Next 16 có thay đổi so với bản cũ: đọc `frontend/node_modules/next/dist/docs/` khi dùng API chưa chắc chắn.

## Gọi API
- Chỉ qua `api<T>()` trong `frontend/src/lib/api.ts` (gọi `/api/...` cùng origin, cookie httpOnly tự gửi, ném `ApiError` có `status`, `details`).
- 401 khi đang thao tác → hiện hộp thoại "Phiên đăng nhập đã hết hạn", giữ dữ liệu đang nhập.
- **Không gửi giá/tổng tiền lên server**; tổng trên giao diện chỉ để hiển thị, ghi rõ "server tính lại".
- Kiểu dữ liệu phản hồi khai báo ở `frontend/src/lib/types.ts`, khớp backend.

## React
- Tuân thủ lint `react-hooks`: không gọi setState đồng bộ trong effect; dữ liệu khởi tạo từ storage dùng lazy `useState(fn)` (trang trong `(app)` chỉ render phía client).
- `sessionStorage`/`localStorage` luôn bọc try/catch.
- Nút submit khóa khi đang gửi (`loading`); hiển thị lỗi theo trường từ `details`.

## Hiển thị
- Tiền `formatVnd()`, ngày giờ `formatDateTime()` / `formatTime()` (giờ Việt Nam) trong `lib/format.ts`.
- Không tràn ngang ở 390px; màn POS tối ưu ≥ 1024px.

## TypeScript
- `strict`, không `any`; import tuyệt đối qua `@/`.
