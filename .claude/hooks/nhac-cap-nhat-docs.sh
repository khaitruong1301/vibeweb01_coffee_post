#!/usr/bin/env bash
# PostToolUse (Edit|Write): sửa API / schema / trang thì nhắc Claude cập nhật tài liệu tương ứng.
file=$(jq -r '.tool_input.file_path // empty')

case "$file" in
  */src/app/api/*)
    msg="Vừa sửa API: nhớ cập nhật .claude/docs/api/README.md (endpoint, quyền, request/response)." ;;
  */prisma/schema.prisma|*/prisma/migrations/*)
    msg="Vừa sửa database: nhớ cập nhật .claude/docs/architecture/database.md." ;;
  */src/app/*/page.tsx|*/src/app/page.tsx)
    msg="Vừa sửa trang: nếu là trang mới hoặc đổi luồng, cập nhật bảng màn hình trong .claude/docs/ui-ux/design-system.md và overview.md." ;;
  *) exit 0 ;;
esac

jq -n --arg m "$msg" '{hookSpecificOutput: {hookEventName: "PostToolUse", additionalContext: $m}}'
