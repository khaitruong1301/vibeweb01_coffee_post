#!/bin/sh
# Áp migration → (tuỳ chọn) nạp dữ liệu mẫu khi DB trống → chạy API.
set -e
./node_modules/.bin/prisma migrate deploy
if [ "$SEED" = "true" ]; then
  node dist/seed/run.js
fi
exec node dist/main.js
