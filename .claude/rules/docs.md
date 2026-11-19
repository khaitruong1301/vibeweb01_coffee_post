# Luôn cập nhật tài liệu

Thêm hoặc sửa tính năng thì cập nhật tài liệu trong cùng lần thay đổi. Chưa cập nhật tài liệu thì chưa coi là xong.

| Thay đổi trong code | File cần cập nhật |
|---|---|
| Thêm / đổi / xoá endpoint, quyền, định dạng request/response | `.claude/docs/api/README.md` |
| Thêm / đổi model, cột, enum, index, quan hệ | `.claude/docs/architecture/database.md` |
| Thêm module, thư mục, biến môi trường, script, thư viện | `.claude/docs/architecture/overview.md` |
| Thêm / đổi use case, vai trò, luật nghiệp vụ | `.claude/docs/requirements/use-case.md` (giữ mã UC, BR) |
| Thêm trang, component dùng chung, đổi màu / font | `.claude/docs/ui-ux/design-system.md` |
| Đổi quy ước đặt tên, cấu trúc code, Git | `.claude/docs/conventions/` |

Quy tắc khi viết:
- Tiếng Việt có dấu, giữ văn phong và cách trình bày hiện có.
- Chỉ ghi điều đã có trong code; mục còn là thiết kế thì đánh dấu _(dự kiến)_ và bỏ dấu khi đã làm xong.
- Đọc lại code trước khi sửa tài liệu.
- Sửa lỗi nhỏ không ảnh hưởng các mục trên thì không cần sửa tài liệu.
- Khi báo cáo kết quả, nói rõ đã cập nhật file nào (hoặc vì sao không cần).
