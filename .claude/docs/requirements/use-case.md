# Use case — CoffeePOS (phạm vi: Bán hàng)

Nguồn: Bài tập 1 buổi 7-8 "Kiểm thử và CI/CD trên CoffeePOS". Mã UC / BR / L dùng chung trong code, test và tài liệu; không đổi mã đã dùng, chỉ thêm mã mới.

Sơ đồ (PlantUML): `diagrams/01-tong-quan.puml` · `diagrams/02-ban-hang.puml`
Wireframe màn hình (draw.io, 9 trang): `../ui-ux/wireframe-man-hinh.drawio`

## 1. Bối cảnh

- Khoảng 150 đơn/ngày, cao điểm 7h–9h sáng; 2 quầy thu ngân; có đơn từ GrabFood, ShopeeFood.
- Nhân sự: 1 chủ quán, 1 quản lý, 3 thu ngân, 3 pha chế.
- Hệ thống hiện tại: Node.js 22 + `node:sqlite`, giao diện HTML + Bootstrap, deploy Vercel qua `api/index.js`, có `/api/health`.

## 2. Tác nhân

| Tác nhân | Loại | Việc làm |
|---|---|---|
| Nhân viên | trừu tượng | Đăng nhập; là cha của 3 vai bên dưới |
| Thu ngân | chính | Chọn món, size, thanh toán, in hóa đơn |
| Pha chế | chính | Nhận đơn ở màn quầy pha |
| Chủ quán (admin) | chính | Sửa giá, thêm món |
| GrabFood / ShopeeFood | hệ thống ngoài | Nguồn đơn giao đồ ăn |

> Chưa rõ: đề có nhắc **quản lý** trong phần quy mô nhưng không mô tả quyền — hệ thống chưa có vai trò này.

## 3. Danh sách use case

| Mã | Tên | Tác nhân | Màn hình / API |
|---|---|---|---|
| UC01 | Đăng nhập, đăng xuất, đổi mật khẩu | Nhân viên | `/login`, `/account` → `/api/auth/*` (sai quá 5 lần / 15 phút bị khoá tạm) |
| UC02 | Bán hàng tại quầy (tạo đơn & thanh toán) | Thu ngân | `/checkout` → `POST /api/orders` |
| UC03 | In hóa đơn | Thu ngân | `/receipt/CP-000123` → `GET /api/orders/:code` |
| UC04 | Nhận đơn giao đồ ăn | Thu ngân, GrabFood/ShopeeFood | `/checkout` chọn nguồn + nhập mã đơn đối tác (nhập tay) |
| UC05 | Nhận đơn ở màn quầy pha | Pha chế | `/barista` → `GET /api/orders`, `PATCH /api/orders/:id/status` |
| UC06 | Quản lý sản phẩm (thêm món, sửa giá) | Chủ quán | `/products` → `GET/POST/PATCH /api/products` |

Quan hệ: UC02, UC04, UC05, UC06 `<<include>>` UC01 · UC03 `<<extend>>` UC02 · "Chọn size" `<<extend>>` "Chọn món".

## 4. Đặc tả UC02 — Bán hàng tại quầy

| Mục | Nội dung |
|---|---|
| Tác nhân | Thu ngân |
| Tiền điều kiện | Thu ngân đã đăng nhập (BR04) |
| Hậu điều kiện | Có 1 bản ghi `orders` + các bản ghi `order_items`; đơn hiện ở màn quầy pha; in được hóa đơn `CP-…` |

**Luồng chính**
1. Thu ngân mở `checkout.html`, chọn món, size, số lượng.
2. Bấm **Thanh toán** → trình duyệt gửi `POST /api/orders`.
3. Server kiểm tra đăng nhập (BR04) và kiểm tra đơn hợp lệ (BR02, BR03).
4. Server tính tổng tiền theo giá trong DB (BR01, BR05).
5. Server lưu `orders` + `order_items`, trả 201 kèm mã đơn.
6. Chuyển sang `receipt.html` để in hóa đơn (UC03).

**Luồng thay thế / ngoại lệ**
- 3a. Chưa đăng nhập → 401, không lưu đơn.
- 3b. Đơn không có món → 400.
- 3c. Có món với số lượng < 1 hoặc > 50 (gồm số âm, 0, số thập phân) → 400.
- 4a. Món không tồn tại → 400.

## 5. Luật bán hàng

| Mã | Luật |
|---|---|
| BR01 | Giá bán lấy từ màn Sản phẩm; chỉ admin được sửa. Server không dùng giá do trình duyệt gửi. |
| BR02 | Mỗi món 1–50 ly mỗi đơn — tính theo món trong cả đơn (cùng món tách nhiều dòng khác size vẫn tối đa 50). |
| BR03 | Đơn phải có ít nhất một món. |
| BR04 | Chỉ nhân viên đã đăng nhập mới tạo được đơn — cụ thể: Thu ngân và Chủ quán; Pha chế không tạo đơn (403). |
| BR05 | Size L cộng 6.000đ vào giá món; S, M giữ giá gốc; món không size (bánh) luôn giá gốc _(thay đổi giữa chừng — test cũ phải chỉ ra chỗ cần sửa)_. |

## 6. Lỗi thật đã tìm thấy trong `server.js`

Bản NestJS trong repo đã chặn cả 3 lỗi; test tương ứng nằm trong `backend/test/orders.e2e-spec.ts` (tên test bắt đầu bằng mã L1/L2/L3).

| Mã | Lỗi | Vi phạm | Kết quả mong đợi khi sửa |
|---|---|---|---|
| L1 | `POST /api/orders` không gọi `authorize()` | BR04 | Không có phiên đăng nhập → 401 |
| L2 | `qty` âm vẫn trả 201 (integration test buổi 6 đã bắt được) | BR02 | → 400, không lưu đơn |
| L3 | Tổng tiền lấy `price` do trình duyệt gửi lên | BR01 | Tổng tính lại từ giá trong DB, bỏ qua `price` client gửi |

## 7. Cách hiện thực các luật

| Luật | Chỗ trong code |
|---|---|
| BR01, BR02, BR03, BR05 | `backend/src/pricing/pricing.ts` (hàm thuần) + DTO `backend/src/orders/dto/order.dto.ts` + CHECK constraint trong DB |
| BR04 | Guard toàn cục `JwtAuthGuard` (mọi route cần đăng nhập) + `@Roles('cashier', 'admin')` trên `POST /orders` |
| L3 | DTO không có field giá; ValidationPipe `whitelist` loại field lạ |
| Luồng pha chế | `backend/src/orders/order-status.ts`: Chờ pha → Đang pha → Xong — chờ giao → Đã giao, không nhảy bước |

## 8. Câu hỏi của chủ quán

| Câu hỏi | Hướng trả lời |
|---|---|
| "Sửa giá xong làm sao biết không tính sai?" | Unit test `pricing.spec.ts` + e2e "chủ quán sửa giá → đơn mới tính giá mới, đơn cũ giữ giá cũ"; trên màn Sản phẩm có ô "Xem thử tính tiền" và ghi người sửa giá cuối |
| "Có cách nào chặn code lỗi trước khi lên máy bán hàng không?" | CI chạy test trên mỗi lần push/PR; test fail thì chặn deploy lên Vercel |
