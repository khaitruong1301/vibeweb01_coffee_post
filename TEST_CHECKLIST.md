# TEST CHECKLIST — CoffeePOS

Theo dõi 15 hạng mục kiểm thử tự động. Cập nhật cột **Kết quả** mỗi khi thêm/sửa test.
Lần chạy gần nhất: **19/11/2026** (máy local, Node 22.17, Docker Desktop, Chrome) — **tất cả ĐẠT**.

> **Nguyên tắc an toàn:** không test nào chạm DB production; workflow kiểm thử (`ci.yml`) không deploy — deploy nằm ở `deploy.yml`, chỉ chạy thủ công và chỉ cho commit đã có CI xanh.
> - e2e backend ép `DATABASE_URL = DATABASE_URL_TEST` (bắt buộc hậu tố `_test`, mặc định `coffeepos_test`).
> - E2E trình duyệt, smoke, load chạy trên `docker-compose.e2e.yml`: DB trên RAM, cổng 3200/4200/5436, tắt là mất.
> - Load test từ chối chạy nếu không phải cổng 4200 (trừ khi đặt `PERF_TARGET_CONFIRMED=yes`).

## 1. Công nghệ & lựa chọn công cụ

| Lớp | Công nghệ thực tế | Công cụ kiểm thử |
|---|---|---|
| Frontend | Next.js 16 (App Router), React 19, Tailwind 4 | ESLint (core-web-vitals), Vitest 5 + React Testing Library + jsdom, Playwright + axe-core |
| Backend | NestJS 11, class-validator, JWT cookie, Swagger | ESLint (typescript-eslint type-checked), Jest + ts-jest, supertest |
| Database | PostgreSQL 17, Prisma 7, CHECK constraint | Jest + Prisma trên `coffeepos_test`, `prisma migrate diff` |
| Hạ tầng | Docker Compose | stack E2E riêng, smoke script, autocannon, GitHub Actions |

## 2. Tổng hợp 15 hạng mục

| # | Hạng mục | Triển khai? | Nơi đặt | Lệnh | Kết quả |
|---|---|---|---|---|---|
| 1 | Static Code Analysis | ✅ | `backend/eslint.config.mjs`, `frontend/eslint.config.mjs`, `tsc` | `npm run static` | ✅ 0 lỗi (đã sửa 4 lỗi ESLint) |
| 2 | Unit Testing | ✅ | `backend/src/**/*.spec.ts`, `frontend/src/lib/*.test.ts` | `npm run test:unit` | ✅ BE 47 · FE 28 |
| 3 | Component Testing | ✅ | `frontend/src/__tests__/*.test.tsx` | `npm run test:unit` | ✅ 21 |
| 4 | Integration Testing | ⚪ gộp | — (xem ghi chú) | — | Gộp vào #5 và #8 |
| 5 | API Testing | ✅ | `backend/test/orders.e2e-spec.ts`, `products.e2e-spec.ts`, `swagger.e2e-spec.ts` | `npm run test:api` | ✅ |
| 6 | End-to-End | ✅ | `e2e/tests/sales.spec.ts` | `npm run test:e2e` | ✅ 9 kịch bản |
| 7 | Auth & Authorization | ✅ | `backend/test/auth.e2e-spec.ts` + `frontend/src/__tests__/auth.test.tsx` | `npm run test:api` | ✅ ma trận 10 route × 4 trạng thái |
| 8 | Database Testing | ✅ | `backend/test/database.e2e-spec.ts` | `npm run test:api` | ✅ |
| 9 | Security Testing | ✅ | `backend/test/security.e2e-spec.ts`, `npm audit` | `npm run test:api`, `npm run audit` | ✅ (2 mục `todo` là khuyến nghị) |
| 10 | Performance & Load | ✅ | `e2e/perf/load-test.mjs` | `npm run test:perf` | ✅ 3/3 kịch bản |
| 11 | Accessibility | ✅ | `e2e/tests/a11y.spec.ts` | `npm run test:a11y` | ✅ 5 màn hình, 0 vi phạm serious/critical |
| 12 | Regression | ✅ (không viết lại) | các test gắn mã `BR0x` / `L1–L3` | `npm run test:regression` | ✅ 39 test |
| 13 | Smoke Testing | ✅ | `scripts/smoke.sh`, `e2e/tests/smoke.spec.ts` (`@smoke`) | `npm run test:smoke` | ✅ 11/11 + 6 |
| 14 | Coverage Reporting | ✅ | Jest (lcov/html/json-summary), Vitest v8, JUnit XML | `npm run coverage:summary` | ✅ vượt ngưỡng |
| 15 | CI/CD Automated Testing | ✅ | `.github/workflows/ci.yml` | tự chạy khi tạo PR | ⏳ chưa chạy trên GitHub (repo chưa có git) |

**Vì sao #4 không có bộ riêng:** API test (#5) dựng ứng dụng Nest thật, gồm guard, pipe, filter, Prisma và PostgreSQL thật, nên đó đã là integration test giữa các tầng. Test database (#8) kiểm phần tích hợp với DB. Thêm một bộ "service + DB" riêng sẽ trùng lặp. Tích hợp frontend ↔ backend qua proxy Next được E2E (#6) và smoke (#13) bao phủ.

## 3. Kết quả chi tiết lần chạy gần nhất

| Bộ test | Số test | Đạt | Không đạt | Bỏ qua / todo | Thời gian |
|---|---|---|---|---|---|
| Static (ESLint + tsc, 2 phía) | — | ✅ | 0 | — | ~20 s |
| npm audit (production deps) | — | 0 lỗ hổng | — | — | — |
| Backend unit (Jest) | 47 | 47 | 0 | 0 | ~6 s |
| Backend API/Auth/DB/Security (Jest + supertest) | 124 | 122 | 0 | 2 todo | ~8 s |
| Frontend unit + component (Vitest) | 49 | 49 | 0 | 0 | ~4 s |
| Smoke script (curl) | 11 | 11 | 0 | 0 | ~2 s |
| Playwright E2E + a11y + smoke | 20 | 20 | 0 | 0 | ~33 s |
| Load test (autocannon) | 3 kịch bản | 3 | 0 | 0 | 45 s |
| **Tổng** | **254** | **252** | **0** | **2 todo** | |

### Coverage

| Bộ | Lines | Statements | Branches | Functions | Ngưỡng (L/B/F/S) |
|---|---|---|---|---|---|
| Backend unit (luật tính tiền, mã đơn, trạng thái, filter, validation) | 100% | 98.88% | 88.13% | 100% | 95 / 85 / 95 / 95 |
| Backend e2e (toàn bộ `src/`) | 97.88% | 96.24% | 81.02% | 97.53% | 90 / 75 / 85 / 90 |
| Frontend (lib, components, checkout) | 90.14% | 87.85% | 84.21% | 79.77% | 85 / 80 / 75 / 85 |

Báo cáo: `backend/coverage/{unit,e2e}/lcov-report/index.html`, `frontend/coverage/index.html`, `e2e/reports/html/index.html`, JUnit: `backend/reports/*.xml`, `frontend/reports/junit.xml`, `e2e/reports/junit-e2e.xml`, load: `e2e/reports/perf.md`.

### Load test (stack Docker local, 15 giây/kịch bản)

| Kịch bản | Kết nối | Req/s | p50 | p97.5 | p99 | Lỗi | Ngưỡng | KQ |
|---|---|---|---|---|---|---|---|---|
| Thu ngân mở menu — `GET /api/products` | 20 | 365 | 45 ms | 151 ms | 222 ms | 0 | p97.5 ≤ 300 ms | ✅ |
| Bấm Thanh toán — `POST /api/orders` | 10 | 260 | 34 ms | 79 ms | 107 ms | 0 | p97.5 ≤ 500 ms | ✅ |
| Quầy pha làm mới — `GET /api/orders?status=…` | 10 | 151 | 59 ms | 141 ms | 197 ms | 0 | p97.5 ≤ 500 ms | ✅ |

Quy mô thật khoảng 150 đơn/ngày, cao điểm 7h–9h. Mức chịu tải đo được (khoảng 260 đơn/giây) gấp hàng chục nghìn lần nhu cầu cao điểm.

## 4. Lỗi thật phát hiện nhờ test (đã sửa)

| Phát hiện bởi | Lỗi | Sửa |
|---|---|---|
| #9 Security (`security.e2e-spec.ts`) | Body > 100 KB trả **500** và ghi log lỗi hệ thống, thay vì **413** | `AllExceptionsFilter` nhận lỗi 4xx của body-parser |
| #9 Security | Header `X-Powered-By: Express` để lộ framework | Tắt trong `app.factory.ts` |
| #3 Component (`ui.test.tsx`) | `Field` đặt câu lỗi **trong** `<label>` nên tên đọc của ô bị dính câu lỗi | Đưa lỗi ra ngoài label, nối với ô qua `aria-describedby` |
| #11 Accessibility (axe) | Nhãn "Đang bán" và "Ngừng bán" không đủ tương phản WCAG AA | Đổi màu (chữ trắng trên `success`, chữ `foreground` trên `secondary`) |
| #1 Static (ESLint) | `bootstrap()` không bắt lỗi khởi động; 3 chỗ dùng `any` không an toàn | `.catch()` + thoát mã 1; khai báo kiểu |
| #9 `npm audit` | vitest 3 kéo theo tinypool có 2 lỗ hổng **critical** (dev dependency) | Nâng vitest 5 → 0 lỗ hổng |

Ba lỗi trong đề (L1 thiếu `authorize()`, L2 số lượng âm vẫn 201, L3 dùng giá trình duyệt gửi lên) có test tái hiện ở cả 3 tầng: unit (`pricing.spec.ts`, `validation.spec.ts`), API (`orders.e2e-spec.ts`, `auth.e2e-spec.ts`), component và E2E (`checkout.test.tsx`, `sales.spec.ts`).

## 5. Danh sách test case chính

**Unit — backend**
- [x] Tính tiền: S/M giá gốc, L +6.000đ, món không size bỏ qua size; tổng nhiều món; đổi giá DB thì tổng đổi theo (`pricing.spec.ts`)
- [x] BR02 số lượng 0, −1, −3, 51, 1.5, NaN bị từ chối; biên 1 và 50 hợp lệ; cùng món tách dòng tổng > 50 bị từ chối
- [x] BR03 đơn rỗng; món không tồn tại; thiếu size
- [x] Mã đơn `CP-000123` khứ hồi; mã sai / chứa SQL trả null (`order-code.spec.ts`)
- [x] Luồng pha chế chỉ đi tới bước kế, cấm nhảy bước / đi lùi (`order-status.spec.ts`)
- [x] Filter lỗi: giữ `{error}`, dịch lỗi Nest sang tiếng Việt, Prisma P2002/P2025/P2003, CHECK → 400, 413, lỗi lạ → 500 không lộ SQL
- [x] ValidationPipe loại field giá (L3), lỗi lồng nhau theo đường dẫn, UC04 bắt buộc mã đối tác

**Unit + Component — frontend**
- [x] `qtyError`, `priceOf`, `summarize`, `stepQty` (giỏ hàng); `formatVnd`, giờ Việt Nam; `homeOf`, menu theo vai
- [x] `api()`: URL cùng origin, cookie, ApiError + details, 204, mất mạng, lỗi không phải JSON
- [x] Button `loading` khóa nút; Field tên đọc + mô tả lỗi; Chip `aria-pressed`; Modal là dialog, đóng bằng Esc và ×
- [x] Checkout: giỏ trống khóa nút; size L ra 98.000đ; số lượng −3 / 51 báo lỗi và khóa nút; **body gửi lên không có giá**; GrabFood bắt buộc mã; 400 giữ giỏ; 401 mở hộp thoại và lưu giỏ
- [x] AuthProvider: 401 về `/login?next=`; spinner khi chờ; lỗi mạng; sai vai trò bị chuyển trang; Navbar theo vai, đánh dấu trang hiện tại, đăng xuất

**API / Auth / DB / Security — backend**
- [x] Tạo đơn: 201 + mã CP; L1 401 không lưu; token giả 401; pha chế 403; L3 bỏ giá client; BR05; BR03; L2 (âm, 0, 51, thập phân, chuỗi); biên 50; món ngừng bán; size sai; UC04
- [x] Sửa giá: thu ngân 403; đơn mới giá mới, đơn cũ giữ giá cũ; giá không hợp lệ 400; `?all=true` chỉ admin
- [x] Sản phẩm: danh mục; `priceL`; tạo 201, trim; trùng 409; danh mục sai 400; thiếu trường 400; 404; id sai 400; ẩn / mở bán
- [x] Quầy pha: 404 mã sai; chuyển trạng thái đúng thứ tự, 409 khi nhảy bước, 403 thu ngân
- [x] Ma trận 10 route × {ẩn danh, thu ngân, pha chế, chủ quán}; token hết hạn / khóa khác / `alg:none` / sửa payload; tài khoản bị khóa; đổi vai có hiệu lực ngay; cookie HttpOnly, SameSite=Lax; đăng xuất
- [x] DB: đúng DB test; **migration khớp schema (không drift)**; 5 CHECK constraint; RESTRICT / CASCADE / SET NULL; unique; timestamptz; seed không ghi đè giá
- [x] Bảo mật: SQL injection (login, mã đơn, ghi chú); XSS lưu dạng chuỗi JSON; gán thừa field (cashierId, status, total, id, updatedById); không lộ mật khẩu băm; JSON hỏng; 413; 404 tiếng Việt; không có X-Powered-By; CORS chỉ cho frontend
- [x] Swagger khớp code: ổ khóa, 401/403, schema tạo đơn không có giá, số lượng 1–50

**E2E / a11y / smoke — trình duyệt**
- [x] Sai mật khẩu; bán size L + bánh ra hóa đơn đúng tiền; giỏ trống / số lượng sai không thanh toán được; đơn GrabFood; pha chế chuyển 4 bước, màn pha chế không hiện giá; chủ quán sửa giá thì thu ngân bán giá mới; pha chế bị chặn khỏi `/products`; màn mobile không tràn ngang
- [x] axe WCAG 2.1 AA: đăng nhập, bán hàng (có lỗi), hóa đơn, quầy pha, sản phẩm + hộp thoại
- [x] Smoke: health, đăng nhập 3 vai, chuyển hướng khi chưa đăng nhập; script curl 11 mục

## 6. Khuyến nghị / việc còn mở

- [ ] **Rate limit đăng nhập** chống dò mật khẩu (`it.todo` trong `security.e2e-spec.ts`), ví dụ `@nestjs/throttler`.
- [ ] **Header bảo mật** (helmet: CSP, X-Frame-Options; HSTS khi chạy HTTPS). Cần cấu hình riêng cho Swagger UI.
- [ ] Backend còn 3 lỗ hổng mức **moderate** trong dev dependency (`glob` / `minimatch` qua `@nestjs/cli`), không có trong bản production; chờ bản vá upstream.
- [ ] Chạy CI thật: `git init`, đẩy lên GitHub, tạo PR đầu tiên. Nên bật branch protection bắt buộc 4 job CI xanh mới được merge.
- [ ] Quay video Playwright khi lỗi chỉ bật trên CI (máy local thiếu ffmpeg; chạy `npx playwright install ffmpeg` nếu muốn).

## 7. Cách chạy

```bash
export PATH=$HOME/.nvm/versions/node/v22.17.0/bin:$PATH   # Node 22
docker compose up -d db                                    # DB có coffeepos_test

npm run static          # 1  ESLint + TypeScript
npm run audit           # 9  npm audit (production)
npm run test:unit       # 2,3,14  Jest + Vitest/RTL + coverage
npm run test:api        # 5,7,8,9,14  supertest trên coffeepos_test + coverage
npm run test:regression # 12  chỉ các test gắn BR0x / L1–L3

npm run stack:e2e:up    # dựng stack tạm 3200/4200/5436
npm run test:smoke      # 13
PW_CHANNEL=chrome npm run test:e2e   # 6, 11, 13 (Playwright dùng Chrome có sẵn)
npm run test:perf       # 10  (tạo dữ liệu → chỉ trên stack E2E)
npm run stack:e2e:down

npm run coverage:summary
npm run test:all        # chạy tất cả theo thứ tự trên
```

**CI** (`.github/workflows/ci.yml`) chạy khi có Pull Request hoặc push lên `main`:

| Job | Hạng mục |
|---|---|
| `static` | #1, #9 |
| `backend` (service Postgres `coffeepos_test`) | #2, #5, #7, #8, #9, #14 |
| `frontend` | #2, #3, #14 + build |
| `e2e` (stack Docker) | #13, #6, #11; #10 chỉ khi bấm chạy tay |

Mỗi job tải lên artifact coverage / JUnit / báo cáo HTML và ghi bảng coverage vào Summary của run. `ci.yml` không có bước deploy. **CD** (`.github/workflows/deploy.yml`) chạy thủ công, chặn commit chưa có CI xanh — xem `.claude/docs/architecture/overview.md` mục 7.
