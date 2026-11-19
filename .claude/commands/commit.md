---
description: Kiểm tra checklist rồi tạo commit theo quy ước Git của dự án
argument-hint: "[gợi ý nội dung commit]"
allowed-tools: Bash(git status), Bash(git diff:*), Bash(git add:*), Bash(git commit:*), Bash(git log:*), Bash(npm run typecheck), Bash(npm run lint:*)
---

Gợi ý nội dung: $ARGUMENTS

1. Xem `git status` và `git diff` (cả phần đã stage). Không có thay đổi thì báo và dừng.
2. Đối chiếu checklist trong `.claude/docs/conventions/git.md`:
   - `npm run typecheck` (trong `backend/` và `frontend/`) và `npm run lint` (frontend) không lỗi; đổi luật / API thì `npm test` + `npm run test:e2e` trong `backend/` pass.
   - Không có `.env*` (trừ `.env.example`), `node_modules/`, `dist/`, `.next/`, `backend/src/generated/`, `.claude/settings.local.json`, file debug.
   - Đã cập nhật tài liệu theo `.claude/rules/docs.md` (nếu đổi API / schema / trang).
3. Thay đổi gồm nhiều việc không liên quan → đề xuất tách thành nhiều commit.
4. Viết message `<loại>(<phạm vi>): <nội dung tiếng Việt>` đúng quy ước, `git add` đúng file, `git commit`.
5. Không `git push` trừ khi người dùng yêu cầu.
