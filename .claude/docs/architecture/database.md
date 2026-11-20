# Database

Nguồn chính: `backend/prisma/schema.prisma` · migration: `backend/prisma/migrations/` · PostgreSQL 17, DB `coffeepos` (chính), `coffeepos_test` (e2e).
Tiền: `Int` (VNĐ). Thời điểm: `timestamptz(6)`, phiên DB luôn UTC. Field Prisma camelCase ↔ cột snake_case.

## 1. Quan hệ

```
users 1─n orders 1─n order_items n─1 products n─1 categories
users 1─n products (updated_by_id — người sửa giá lần cuối)
```

## 2. Bảng

| Bảng (model) | Cột chính | Ghi chú |
|---|---|---|
| `users` (User) | `username` unique, `password_hash`, `full_name`, `role` (Role), `is_active`, `token_version` | bcrypt; tài khoản khóa không đăng nhập / dùng token được; `token_version` tăng khi đăng xuất / đổi mật khẩu → token cũ bị từ chối (migration `user_token_version`) |
| `categories` (Category) | `name` unique, `sort_order` | |
| `products` (Product) | `category_id`, `name` unique, `price`, `has_size`, `is_active`, `image_url?`, `updated_by_id?` | `price` là giá size S/M; giá L do code tính (BR05) |
| `orders` (Order) | `cashier_id`, `source` (OrderSource), `partner_code?`, `note?`, `status` (OrderStatus), `total` | mã `CP-000123` suy ra từ `id`, không lưu |
| `order_items` (OrderItem) | `order_id`, `product_id`, `product_name`, `size?`, `unit_price`, `quantity`, `line_total`, `note?` | chụp tên + đơn giá lúc bán; `size` null với món không size |

`users`, `products`, `orders` có `created_at`, `updated_at`.

## 3. Enum

| Enum | Giá trị |
|---|---|
| `Role` | `cashier`, `barista`, `admin` (Chủ quán) |
| `OrderStatus` | `pending` (Chờ pha) → `preparing` (Đang pha) → `ready` (Xong — chờ giao) → `done` (Đã giao) |
| `OrderSource` | `counter`, `grabfood`, `shopeefood` |
| `Size` | `S`, `M`, `L` |

## 4. Ràng buộc & index

| Ràng buộc | Nội dung | Luật |
|---|---|---|
| `products_price_positive` | `price > 0` | BR01 |
| `order_items_quantity_range` | `quantity BETWEEN 1 AND 50` | BR02 |
| `order_items_amount_positive` | `unit_price > 0 AND line_total = unit_price * quantity` | BR01 |
| `orders_total_positive` | `total > 0` | BR03 |
| `orders_partner_code_required` | `source = 'counter'` hoặc có `partner_code` khác rỗng | UC04 |

CHECK constraint được thêm thủ công trong migration `init` — lớp chặn cuối nếu code bỏ sót; vi phạm trả 400.

- Khóa ngoại: `products → categories` RESTRICT · `products.updated_by_id → users` SET NULL · `orders → users` RESTRICT · `order_items → orders` CASCADE · `order_items → products` RESTRICT.
- Index: `orders(status, created_at)`, `order_items(order_id)`, `products(category_id)`.

## 5. Dữ liệu mẫu (`backend/src/seed/`)

- 7 tài khoản (mật khẩu `Coffee@123` ở dev; production dùng `SEED_PASSWORD` — bắt buộc): `chuquan` (admin), `thungan1..3` (cashier), `phache1..3` (barista).
- 4 danh mục, 13 món (2 món bánh không size, 1 món ngừng bán "Sinh tố bơ").
- Chỉ nạp khi bảng `users` trống — khởi động lại container không ghi đè giá đã sửa. e2e dùng `resetDatabase()` (TRUNCATE + nạp lại) trên DB test.
