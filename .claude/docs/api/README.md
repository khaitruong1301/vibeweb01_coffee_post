# API

Base URL: `http://localhost:4100/api` (trực tiếp) · `http://localhost:3100/api` (qua frontend) · JSON camelCase · thời điểm ISO 8601 UTC · tiền VNĐ số nguyên.

**Swagger UI: http://localhost:4100/api/docs** · OpenAPI JSON: `/api/docs-json` — sinh tự động từ DTO (plugin `@nestjs/swagger`, đọc class-validator + JSDoc `@example`) và decorator trên controller; là nguồn chi tiết nhất cho request/response. File này là bản tóm tắt. Tắt bằng `SWAGGER_ENABLED=false`.

## 1. Quy ước chung

**Xác thực**: `POST /auth/login` đặt cookie httpOnly `coffeepos_token` (12 giờ) **và** trả `token`. Endpoint khác nhận `Authorization: Bearer <token>` (ưu tiên) hoặc cookie. Mọi endpoint cần đăng nhập trừ khi ghi "công khai" (guard toàn cục).

**Vai trò**: `cashier` (Thu ngân) · `barista` (Pha chế) · `admin` (Chủ quán).

**Lỗi**: `{ "error": "<tiếng Việt>" }`; lỗi validate thêm `details` theo đường dẫn trường.

```json
{ "error": "Dữ liệu không hợp lệ", "details": { "items.0.quantity": "Số lượng tối thiểu là 1" } }
```

| Status | Khi nào |
|---|---|
| 400 | dữ liệu sai (DTO), vi phạm luật bán hàng (món ngừng bán, thiếu size, > 50 ly/món), vi phạm CHECK |
| 401 | chưa đăng nhập, token sai / hết hạn, tài khoản bị khóa |
| 403 | sai vai trò |
| 404 | không tìm thấy |
| 409 | trùng dữ liệu (tên món), chuyển trạng thái sai thứ tự / bị người khác cập nhật trước |
| 429 | đăng nhập / nhập mật khẩu hiện tại sai quá 5 lần mỗi tài khoản hoặc 20 lần mỗi IP trong 15 phút — kèm header `Retry-After` (giây) |
| 500 | lỗi hệ thống (không lộ chi tiết) |

**Field lạ bị bỏ qua**: ValidationPipe `whitelist` loại mọi field không khai báo — gửi `price`, `total` lên cũng không có tác dụng.

## 2. Danh sách endpoint

| Method | Đường dẫn | Vai trò | Mô tả | UC |
|---|---|---|---|---|
| GET | `/docs` · `/docs-json` | công khai | Swagger UI · OpenAPI 3 JSON | — |
| GET | `/health` | công khai | API + kết nối DB | — |
| POST | `/auth/login` | công khai | đăng nhập | UC01 |
| POST | `/auth/logout` | công khai | xóa cookie + **thu hồi mọi token** của tài khoản (204) | UC01 |
| GET | `/auth/me` | đã đăng nhập | tài khoản hiện tại | UC01 |
| PATCH | `/auth/password` | đã đăng nhập | đổi mật khẩu; thu hồi phiên ở thiết bị khác, cấp token + cookie mới | UC01 |
| GET | `/categories` | đã đăng nhập | danh mục | UC06 |
| GET | `/products` | đã đăng nhập | menu đang bán; `?all=true` gồm món ngừng bán (chỉ admin, khác → 403) | UC02, UC06 |
| POST | `/products` | admin | thêm món | UC06 |
| PATCH | `/products/:id` | admin | sửa tên / danh mục / giá / size / ẩn-hiện | UC06 |
| POST | `/orders` | cashier, admin | tạo đơn = bấm Thanh toán | UC02, UC04 |
| GET | `/orders` | đã đăng nhập | danh sách đơn, `?status=pending,preparing,ready` (mặc định), `?limit=` ≤ 200, cũ nhất trước | UC05 |
| GET | `/orders/:code` | đã đăng nhập | chi tiết đơn theo mã `CP-000123` (sai định dạng / không có → 404) | UC03 |
| PATCH | `/orders/:id/status` | barista, admin | chuyển sang bước kế tiếp | UC05 |
| GET | `/quality/report` | admin | báo cáo kiểm thử tự động (đọc `reports/test-report.json`); chưa có → 404, file hỏng → 500 | — |

## 3. Chi tiết

### POST `/auth/login`

```json
{ "username": "thungan1", "password": "Coffee@123" }
```
**200** → `{ "user": { "id": 2, "username": "thungan1", "fullName": "Thu ngân Lan", "role": "cashier" }, "token": "eyJ..." }` + `Set-Cookie`. Sai → 401 `Sai tên đăng nhập hoặc mật khẩu` (cùng thông báo cho mọi trường hợp, kể cả tên không tồn tại). Sai quá nhiều → 429.

Token JWT gồm `sub`, `role`, `ver` (= `users.token_version`). Đăng xuất / đổi mật khẩu tăng `token_version` → token cũ trả 401 `Phiên đăng nhập đã kết thúc`.

### PATCH `/auth/password`

```json
{ "currentPassword": "Coffee@123", "newPassword": "CaPhe2026!" }
```
Mật khẩu mới: 8–72 ký tự (≤ 72 byte), có chữ và số, khác mật khẩu cũ, không chứa tên đăng nhập, không thuộc danh sách phổ biến (gồm `Coffee@123`). **200** → như đăng nhập (token + cookie mới). Lỗi: 400 `details.currentPassword` / `details.newPassword`; 429 khi nhập sai mật khẩu hiện tại quá nhiều.

### GET `/products`

```json
{
  "items": [{
    "id": 2, "name": "Cà phê sữa đá", "category": { "id": 1, "name": "Cà phê" },
    "price": 29000, "priceL": 35000, "hasSize": true, "isActive": true, "imageUrl": null,
    "updatedAt": "2026-11-19T13:02:59.000Z", "updatedBy": { "id": 1, "fullName": "Chủ quán" }
  }],
  "sizeSurcharge": { "S": 0, "M": 0, "L": 6000 }
}
```
`priceL` do server tính (`null` nếu món không có size).

### POST / PATCH `/products`

```json
{ "name": "Cà phê muối", "categoryId": 1, "price": 39000, "hasSize": true, "isActive": true }
```
`price`: số nguyên 1.000–1.000.000. PATCH nhận một phần các field. Lưu `updatedBy` = người sửa. Trùng tên → 409; danh mục không tồn tại → 400.

### POST `/orders` (UC02, UC04)

```json
{
  "source": "counter",
  "note": "Ít đá",
  "items": [
    { "productId": 2, "size": "L", "quantity": 2, "note": "Ít đường" },
    { "productId": 11, "quantity": 1 }
  ]
}
```
- `items`: 1–50 dòng; `quantity` số nguyên 1–50; `size` S/M/L, bắt buộc với món có size, bị bỏ qua với món không size.
- Cùng một món ở nhiều dòng: tổng số lượng tối đa 50 (BR02).
- `source`: `counter` (mặc định) / `grabfood` / `shopeefood`; khác `counter` thì bắt buộc `partnerCode`.
- Server lấy giá từ DB, tính `unitPrice`, `lineTotal`, `total` (BR01, BR05).

**201**:
```json
{
  "id": 1, "code": "CP-000001", "source": "counter", "partnerCode": null, "note": "Ít đá",
  "status": "pending", "statusLabel": "Chờ pha", "total": 98000,
  "createdAt": "...", "updatedAt": "...", "cashier": { "id": 2, "fullName": "Thu ngân Lan" },
  "items": [
    { "id": 1, "productId": 2, "productName": "Cà phê sữa đá", "size": "L", "unitPrice": 35000, "quantity": 2, "lineTotal": 70000, "note": "Ít đường" },
    { "id": 2, "productId": 11, "productName": "Bánh croissant", "size": null, "unitPrice": 28000, "quantity": 1, "lineTotal": 28000, "note": null }
  ]
}
```
Lỗi: 401 (chưa đăng nhập), 403 (pha chế), 400 (đơn rỗng, số lượng sai, món ngừng bán / không tồn tại, thiếu size, thiếu mã đơn đối tác).

### PATCH `/orders/:id/status` (UC05)

```json
{ "status": "preparing" }
```
Chỉ đi tới bước kế tiếp: `pending → preparing → ready → done`. Sai thứ tự hoặc đơn vừa được người khác cập nhật → 409. **200** → object đơn.
