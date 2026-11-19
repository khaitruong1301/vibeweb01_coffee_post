# Quy ước Git

## Commit
- Định dạng: `<loại>(<phạm vi>): <nội dung tiếng Việt>`
- Loại: `feat`, `fix`, `refactor`, `style` (giao diện), `test`, `docs`, `chore`, `db`
- Phạm vi: `backend`, `frontend`, `orders`, `products`, `auth`, `pricing`, `docker`, `docs`…
- Ví dụ: `fix(orders): chặn số lượng âm khi tạo đơn`, `db(products): thêm cột image_url`, `style(checkout): tăng cỡ nút chọn size`

## Nhánh
- `main` — bản ổn định
- `feat/<ten>`, `fix/<ten>` — tính năng, sửa lỗi

## Trước khi commit
- [ ] `backend`: `npm run typecheck`, `npm test`, `npm run test:e2e` pass
- [ ] `frontend`: `npm run typecheck`, `npm run lint`, `npm run build` pass
- [ ] Trang đã sửa được kiểm tra bằng skill `kiem-tra-giao-dien`
- [ ] Không commit `.env*` (trừ `.env.example`), `node_modules/`, `dist/`, `.next/`, `backend/src/generated/`, `.claude/settings.local.json`
- [ ] Đã cập nhật tài liệu theo `.claude/rules/docs.md`
