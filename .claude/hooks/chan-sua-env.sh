#!/usr/bin/env bash
# PreToolUse (Edit|Write): chặn Claude sửa file bí mật .env, .env.local, .env.production...
# Cho phép .env.example vì đó là file mẫu được commit.
file=$(jq -r '.tool_input.file_path // empty')
name=$(basename "$file")

case "$name" in
  .env.example) exit 0 ;;
  .env|.env.*)
    echo "Không được sửa $name (chứa bí mật). Hãy sửa .env.example và nhờ người dùng tự cập nhật $name." >&2
    exit 2
    ;;
esac
exit 0
