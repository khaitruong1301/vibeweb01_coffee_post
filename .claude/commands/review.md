---
description: Rà soát thay đổi hiện tại bằng agent code-reviewer (và ui-reviewer nếu có sửa giao diện)
argument-hint: "[file hoặc thư mục] (bỏ trống = thay đổi chưa commit)"
---

Phạm vi: $ARGUMENTS (bỏ trống = `git diff` + file chưa theo dõi)

1. Gọi agent `code-reviewer` cho phạm vi trên.
2. Nếu có file trong `frontend/src/app/**/page.tsx`, `frontend/src/components/` hoặc `globals.css` thay đổi → gọi thêm agent `ui-reviewer` (chạy song song).
3. Gộp kết quả, bỏ trùng, xếp `[CHẶN]` → `[CẢNH BÁO]` → `[GỢI Ý]`.
4. Không tự sửa; hỏi người dùng muốn sửa mục nào.
