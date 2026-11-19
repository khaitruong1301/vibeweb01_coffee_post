#!/usr/bin/env bash
# #13 Smoke test — kiểm tra nhanh một stack vừa dựng/triển khai còn "sống": health, đăng nhập, menu, đơn, các trang.
# Dùng: scripts/smoke.sh [WEB_URL] [API_URL]   (mặc định stack E2E: http://localhost:3200 http://localhost:4200)
# Chỉ đọc + 1 lần đăng nhập; KHÔNG tạo dữ liệu → an toàn khi chạy với bất kỳ môi trường nào.
set -u
WEB=${1:-http://localhost:3200}
API=${2:-http://localhost:4200}
USER_NAME=${SMOKE_USER:-thungan1}
PASS=${SMOKE_PASSWORD:-Coffee@123}
fail=0

check() { # tên, lệnh trả mã 0 khi đạt
  local name=$1; shift
  if "$@" >/dev/null 2>&1; then printf '  PASS  %s\n' "$name"; else printf '  FAIL  %s\n' "$name"; fail=$((fail + 1)); fi
}
status_is() { [ "$(curl -s -o /dev/null -w '%{http_code}' "$2")" = "$1" ]; }

echo "Smoke test: web=$WEB api=$API"
check "API /api/health trả status ok + db ok" sh -c "curl -sf '$API/api/health' | grep -q '\"db\":\"ok\"'"
TOKEN=$(curl -sf -X POST "$API/api/auth/login" -H 'Content-Type: application/json' \
  -d "{\"username\":\"$USER_NAME\",\"password\":\"$PASS\"}" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
check "Đăng nhập $USER_NAME lấy được token" test -n "$TOKEN"
check "GET /api/products có món đang bán" sh -c "curl -sf -H 'Authorization: Bearer $TOKEN' '$API/api/products' | grep -q '\"isActive\":true'"
check "GET /api/orders trả danh sách" sh -c "curl -sf -H 'Authorization: Bearer $TOKEN' '$API/api/orders' | grep -q '\"items\"'"
check "Chưa đăng nhập tạo đơn → 401" sh -c "[ \$(curl -s -o /dev/null -w '%{http_code}' -X POST '$API/api/orders' -H 'Content-Type: application/json' -d '{}') = 401 ]"
check "Swagger /api/docs" status_is 200 "$API/api/docs"
for p in /login /checkout /barista /products; do check "Trang $p (200)" status_is 200 "$WEB$p"; done
check "Proxy web → API (/api/health qua $WEB)" status_is 200 "$WEB/api/health"

if [ "$fail" -eq 0 ]; then echo "Smoke: TẤT CẢ ĐẠT"; else echo "Smoke: $fail mục KHÔNG ĐẠT"; fi
exit "$fail"
