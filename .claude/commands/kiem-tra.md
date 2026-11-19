---
description: Chạy toàn bộ kiểm thử trước khi bàn giao (theo TEST_CHECKLIST.md) — static, unit, API, E2E, a11y, smoke
argument-hint: "[nhanh] (chỉ static + unit + API, bỏ E2E Docker)"
---

Tham số: $ARGUMENTS. Node 22 (`export PATH=$HOME/.nvm/versions/node/v22.17.0/bin:$PATH`). Cần DB test: `docker compose up -d db`.

Chạy ở thư mục gốc, bước nào lỗi thì sửa rồi chạy lại từ bước đó:

1. `npm run static` — ESLint + TypeScript cả backend và frontend
2. `npm run audit` — lỗ hổng dependency production
3. `npm run test:unit` — Jest (backend) + Vitest/RTL (frontend) kèm coverage
4. `npm run test:api` — API, phân quyền, DB, bảo mật trên `coffeepos_test`
5. Bỏ qua nếu `nhanh`: `npm run stack:e2e:up` → `npm run test:smoke` → `PW_CHANNEL=chrome npm run test:e2e` → `npm run stack:e2e:down`
6. `npm run coverage:summary`

Lỗi do code vừa sửa thì sửa luôn; lỗi có sẵn hoặc cần quyết định nghiệp vụ thì báo lại. Không chạy load test và không trỏ test vào DB production.

Kết thúc bằng bảng: bước · kết quả (✅/❌) · số test · coverage · file đã sửa. Cập nhật cột kết quả trong `TEST_CHECKLIST.md` nếu có thay đổi.
