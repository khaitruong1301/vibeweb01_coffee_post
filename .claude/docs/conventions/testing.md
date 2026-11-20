# Quy ước kiểm thử

Theo dõi tổng thể: `TEST_CHECKLIST.md` (gốc repo). CI: `.github/workflows/ci.yml`.

## Đặt test ở đâu

| Loại | Công cụ | Vị trí | Lệnh |
|---|---|---|---|
| Unit backend (hàm thuần, filter, pipe) | Jest | `backend/src/**/*.spec.ts` cạnh file | `npm run test:cov` (backend) |
| API / Auth / DB / Security backend | Jest + supertest, PostgreSQL `coffeepos_test` | `backend/test/*.e2e-spec.ts` (dùng `test/helpers.ts`) | `npm run test:e2e:cov` |
| Unit frontend (`lib/`) | Vitest | `frontend/src/lib/*.test.ts` | `npm test` (frontend) |
| Component frontend | Vitest + React Testing Library (jsdom) | `frontend/src/__tests__/*.test.tsx` | `npm run test:ci` |
| E2E / a11y / smoke trình duyệt | Playwright + axe-core | `e2e/tests/*.spec.ts` | `npm run test:e2e` (gốc) |
| Smoke nhanh không cần trình duyệt | bash + curl | `scripts/smoke.sh` | `npm run test:smoke` |
| Load | autocannon | `e2e/perf/load-test.mjs` | `npm run test:perf` |

## Quy tắc
- Không bao giờ dùng DB production. e2e backend ép `DATABASE_URL` = `DATABASE_URL_TEST` (bắt buộc hậu tố `_test`); E2E trình duyệt và load test chạy trên `docker-compose.e2e.yml` (DB trên RAM, cổng 3200/4200/5436).
- Tên test gắn mã nghiệp vụ (`BR02`, `L1`, `UC05`…) — `npm run test:regression` lọc theo các mã này.
- Luật mới → unit test; API mới → thêm dòng vào ma trận `backend/test/auth.e2e-spec.ts` + test API; trang mới → Playwright + `a11y.spec.ts`.
- Lỗi phát hiện được thì viết test tái hiện trước rồi mới sửa; tính năng chưa có thì dùng `it.todo`, không viết test "pass giả".
- Frontend: tìm phần tử theo vai trò / nhãn (`getByRole`, `getByLabelText`), không theo class CSS.
- Ngưỡng coverage (CI đỏ nếu tụt): backend unit 95/85/95/95, backend e2e 90/75/85/90, frontend 85/80/75/85 (lines/branches/functions/statements).
- Coverage e2e bỏ `src/config.ts`: các nhánh `process.env.X ?? mặc định` phụ thuộc biến môi trường của máy chạy (CI có `JWT_SECRET`, máy dev thì không) nên số liệu lệch giữa local và CI. Logic kiểm tra cấu hình production đã có unit test `config.spec.ts`.
