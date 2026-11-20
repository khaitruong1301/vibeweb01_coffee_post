#!/usr/bin/env node
// Chạy các bộ kiểm thử và tổng hợp thành reports/test-report.json — dữ liệu cho trang /quality (chỉ Chủ quán).
//
//   node scripts/test-report.mjs              chạy tất cả (static → unit → API → stack E2E → smoke → Playwright → load)
//   node scripts/test-report.mjs --quick      bỏ phần cần Docker (smoke, Playwright, load) — giữ kết quả cũ của chúng
//   node scripts/test-report.mjs --no-perf    chạy tất cả trừ load test
//   node scripts/test-report.mjs --build-only chỉ gom kết quả đã có, không chạy test
//
// An toàn: không trỏ vào DB production — API test dùng coffeepos_test; E2E/load dùng docker-compose.e2e.yml (DB trên RAM).
// Danh mục 15 hạng mục bên dưới phải khớp TEST_CHECKLIST.md.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'reports');
const RUNS_FILE = join(OUT_DIR, 'runs.json');
const REPORT_FILE = join(OUT_DIR, 'test-report.json');
const args = new Set(process.argv.slice(2));
const quick = args.has('--quick');
const buildOnly = args.has('--build-only');
const noPerf = args.has('--no-perf');

// ---------------------------------------------------------------- chạy lệnh
const STEPS = [
  { id: 'static', label: 'ESLint + TypeScript (backend, frontend)', cmd: 'npm run static' },
  { id: 'audit', label: 'npm audit — dependency production', cmd: 'npm run audit' },
  { id: 'backend-unit', label: 'Backend unit + coverage', cmd: 'npm run test:cov --prefix backend' },
  { id: 'backend-e2e', label: 'Backend API/Auth/DB/Security + coverage', cmd: 'npm run test:e2e:cov --prefix backend' },
  { id: 'frontend', label: 'Frontend unit + component + coverage', cmd: 'npm run test:ci --prefix frontend' },
  { id: 'stack-up', label: 'Dựng stack E2E (Docker)', cmd: 'npm run stack:e2e:up', docker: true, internal: true },
  { id: 'smoke', label: 'Smoke script (curl)', cmd: 'bash scripts/smoke.sh http://localhost:3200 http://localhost:4200', docker: true },
  { id: 'playwright', label: 'Playwright E2E + a11y + smoke', cmd: 'npm test --prefix e2e', docker: true },
  { id: 'perf', label: 'Load test (autocannon)', cmd: 'npm run perf --prefix e2e', docker: true, perf: true },
  { id: 'stack-down', label: 'Dọn stack E2E', cmd: 'npm run stack:e2e:down', docker: true, internal: true, always: true },
];

const stripAnsi = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');

function run(step) {
  return new Promise((resolveRun) => {
    console.log(`\n▶ ${step.label}\n  $ ${step.cmd}`);
    const started = Date.now();
    const child = spawn(step.cmd, { cwd: ROOT, shell: true, env: process.env });
    const lines = [];
    const collect = (chunk, stream) => {
      stream.write(chunk);
      lines.push(...stripAnsi(chunk.toString()).split('\n'));
      if (lines.length > 400) lines.splice(0, lines.length - 400);
    };
    child.stdout.on('data', (c) => collect(c, process.stdout));
    child.stderr.on('data', (c) => collect(c, process.stderr));
    child.on('close', (code) => {
      resolveRun({
        id: step.id,
        label: step.label,
        command: step.cmd,
        status: code === 0 ? 'pass' : 'fail',
        exitCode: code,
        durationMs: Date.now() - started,
        ranAt: new Date(started).toISOString(),
        tail: lines.filter((l) => l.trim()).slice(-40),
      });
    });
  });
}

const readJson = (file, fallback) => {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
};

mkdirSync(OUT_DIR, { recursive: true });
const runs = readJson(RUNS_FILE, {});

if (!buildOnly) {
  let stackUp = false;
  for (const step of STEPS) {
    if (step.docker && quick) continue;
    if (step.perf && noPerf) continue;
    if (step.id === 'stack-down' && !stackUp) continue;
    if (['smoke', 'playwright', 'perf'].includes(step.id) && !stackUp) {
      console.log(`\n⏭  Bỏ qua ${step.label}: stack E2E chưa chạy`);
      continue;
    }
    const result = await run(step);
    if (step.id === 'stack-up') stackUp = result.status === 'pass';
    if (!step.internal) runs[step.id] = result;
    else if (result.status === 'fail') console.error(`✖ ${step.label} thất bại`);
  }
  writeFileSync(RUNS_FILE, JSON.stringify(runs, null, 2));
}

// ---------------------------------------------------------------- đọc JUnit
const decode = (s) =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&amp;/g, '&');
const attrs = (s) => Object.fromEntries([...s.matchAll(/([\w:-]+)="([^"]*)"/g)].map(([, k, v]) => [k, decode(v)]));

// Jest: đọc output --json (phân biệt được todo / pending) · Vitest, Playwright: JUnit XML.
const SUITES = [
  { id: 'backend-unit', label: 'Backend unit (Jest)', file: 'backend/reports/jest-unit.json', format: 'jest', root: 'backend' },
  { id: 'backend-e2e', label: 'Backend API · Auth · DB · Security (Jest + supertest)', file: 'backend/reports/jest-e2e.json', format: 'jest', root: 'backend' },
  { id: 'frontend', label: 'Frontend unit + component (Vitest + RTL)', file: 'frontend/reports/junit.xml' },
  { id: 'playwright', label: 'Trình duyệt: E2E · a11y · smoke (Playwright)', file: 'e2e/reports/junit-e2e.xml' },
];

function parseJest(suite, path) {
  const data = readJson(path, { testResults: [] });
  const STATUS = { passed: 'pass', failed: 'fail', pending: 'skip', skipped: 'skip', todo: 'todo', disabled: 'skip' };
  const tests = data.testResults.flatMap((file) =>
    file.assertionResults.map((a) => ({
      suite: suite.id,
      file: relative(join(ROOT, suite.root), file.name),
      name: [...a.ancestorTitles, a.title].join(' › '),
      status: STATUS[a.status] ?? 'skip',
      durationMs: a.duration ?? 0,
      ...(a.failureMessages?.length ? { message: stripAnsi(a.failureMessages.join('\n')).slice(0, 1500) } : {}),
    })),
  );
  return { ...suite, present: true, ranAt: statSync(path).mtime.toISOString(), tests };
}

function parseJUnit(suite) {
  const path = join(ROOT, suite.file);
  if (!existsSync(path)) return { ...suite, present: false, ranAt: null, tests: [] };
  if (suite.format === 'jest') return parseJest(suite, path);
  const xml = readFileSync(path, 'utf8');
  const tests = [];
  for (const [, sAttr, body] of xml.matchAll(/<testsuite\b([^>]*)>([\s\S]*?)<\/testsuite>/g)) {
    const sa = attrs(sAttr);
    for (const [, cAttr, , inner = ''] of body.matchAll(/<testcase\b([^>]*?)(\/>|>([\s\S]*?)<\/testcase>)/g)) {
      const ca = attrs(cAttr);
      const file = ca.file ?? sa.file ?? sa.name ?? '';
      const failed = /<(failure|error)\b/.test(inner);
      const skipped = /<skipped\b/.test(inner);
      const msgMatch = inner.match(/<(?:failure|error)\b([^>]*)>([\s\S]*?)<\/(?:failure|error)>|<(?:failure|error)\b([^>]*)\/>/);
      let message;
      if (failed && msgMatch) {
        const a = attrs(msgMatch[1] ?? msgMatch[3] ?? '');
        message = stripAnsi(decode((msgMatch[2] ?? '').replace(/<!\[CDATA\[|\]\]>/g, '')) || a.message || '').trim().slice(0, 1500);
      }
      const cls = ca.classname && ca.classname !== file && !/\.(ts|tsx)$/.test(ca.classname) ? ca.classname : '';
      tests.push({
        suite: suite.id,
        file: relative('.', file).replace(/^\.\//, ''),
        name: cls && !ca.name.startsWith(cls) ? `${cls} › ${ca.name}` : ca.name,
        status: failed ? 'fail' : skipped ? 'skip' : 'pass',
        durationMs: Math.round(Number(ca.time ?? 0) * 1000),
        ...(message ? { message } : {}),
      });
    }
  }
  return { ...suite, present: true, ranAt: statSync(path).mtime.toISOString(), tests };
}

const suites = SUITES.map(parseJUnit);
const allTests = suites.flatMap((s) => s.tests);

// ---------------------------------------------------------------- coverage, load, smoke, CI
function thresholdsFromVitest() {
  try {
    const src = readFileSync(join(ROOT, 'frontend/vitest.config.mts'), 'utf8');
    const m = src.match(/thresholds:\s*\{([^}]*)\}/);
    return Object.fromEntries([...m[1].matchAll(/(\w+):\s*(\d+)/g)].map(([, k, v]) => [k, Number(v)]));
  } catch {
    return {};
  }
}
const backendPkg = readJson(join(ROOT, 'backend/package.json'), {});
const jestE2e = readJson(join(ROOT, 'backend/test/jest-e2e.json'), {});
const COVERAGE = [
  { id: 'backend-unit', label: 'Backend unit — luật tính tiền, mã đơn, trạng thái, filter, validation', file: 'backend/coverage/unit/coverage-summary.json', thresholds: backendPkg.jest?.coverageThreshold?.global ?? {} },
  { id: 'backend-e2e', label: 'Backend e2e — toàn bộ src/', file: 'backend/coverage/e2e/coverage-summary.json', thresholds: jestE2e.coverageThreshold?.global ?? {} },
  { id: 'frontend', label: 'Frontend — lib, components, checkout', file: 'frontend/coverage/coverage-summary.json', thresholds: thresholdsFromVitest() },
];
const coverage = COVERAGE.map((c) => {
  const path = join(ROOT, c.file);
  const data = readJson(path, null);
  if (!data) return { ...c, present: false, metrics: [] };
  const metrics = ['lines', 'statements', 'branches', 'functions'].map((k) => ({
    metric: k,
    pct: data.total[k].pct,
    covered: data.total[k].covered,
    total: data.total[k].total,
    threshold: c.thresholds[k] ?? null,
    pass: c.thresholds[k] == null || data.total[k].pct >= c.thresholds[k],
  }));
  return { ...c, present: true, ranAt: statSync(path).mtime.toISOString(), metrics };
});

const perfPath = join(ROOT, 'e2e/reports/perf.json');
const perf = existsSync(perfPath) ? { ...readJson(perfPath, {}), ranAt: statSync(perfPath).mtime.toISOString() } : null;

const smokeChecks = (runs.smoke?.tail ?? [])
  .map((l) => l.match(/^\s*(PASS|FAIL)\s+(.+)$/))
  .filter(Boolean)
  .map(([, s, name]) => ({ name, status: s === 'PASS' ? 'pass' : 'fail' }));

let ciJobs = [];
try {
  const yml = readFileSync(join(ROOT, '.github/workflows/ci.yml'), 'utf8');
  ciJobs = [...yml.matchAll(/^ {2}([\w-]+):\n {4}name: "?([^"\n]+)"?/gm)].map(([, id, name]) => ({ id, name }));
} catch {
  /* chưa có workflow */
}

// Lần chạy CI thật trên GitHub (chỉ đọc qua gh CLI; bỏ qua nếu không có gh / chưa đăng nhập / chưa có remote).
function ghJson(args) {
  const r = spawnSync('gh', args, { cwd: ROOT, encoding: 'utf8', timeout: 20000 });
  if (r.status !== 0 || !r.stdout) return null;
  try {
    return JSON.parse(r.stdout);
  } catch {
    return null;
  }
}
const ciRuns = (ghJson(['run', 'list', '--workflow', 'ci.yml', '--limit', '5', '--json', 'databaseId,status,conclusion,headBranch,event,createdAt,url,displayTitle']) ?? []).map((r) => ({
  id: r.databaseId, title: r.displayTitle, branch: r.headBranch, event: r.event, status: r.status, conclusion: r.conclusion || null, createdAt: r.createdAt, url: r.url,
}));
const lastCompleted = ciRuns.find((r) => r.status === 'completed' && r.conclusion !== 'cancelled' && r.conclusion !== 'skipped');
const lastJobs = lastCompleted
  ? (ghJson(['run', 'view', String(lastCompleted.id), '--json', 'jobs'])?.jobs ?? []).map((j) => ({ name: j.name, conclusion: j.conclusion || j.status, url: j.url }))
  : [];

// ---------------------------------------------------------------- 15 hạng mục
const inSuite = (id, filePart) => (t) => t.suite === id && (!filePart || t.file.includes(filePart));
const any = (...preds) => (t) => preds.some((p) => p(t));

const CATALOG = [
  { id: 1, name: 'Static Code Analysis', tools: 'ESLint (typescript-eslint có kiểu, next core-web-vitals) + tsc', location: 'backend/eslint.config.mjs · frontend/eslint.config.mjs', command: 'npm run static', runs: ['static'] },
  { id: 2, name: 'Unit Testing', tools: 'Jest (backend) · Vitest (frontend)', location: 'backend/src/**/*.spec.ts · frontend/src/lib/*.test.ts', command: 'npm run test:unit', tests: any(inSuite('backend-unit'), inSuite('frontend', '/lib/')) },
  { id: 3, name: 'Component Testing', tools: 'Vitest + React Testing Library (jsdom)', location: 'frontend/src/__tests__/*.test.tsx', command: 'npm run test:unit', tests: inSuite('frontend', '__tests__') },
  { id: 4, name: 'Integration Testing', merged: true, tools: '— (gộp)', location: 'xem #5, #8', command: '—', note: 'API test dựng ứng dụng Nest thật (guard, pipe, filter, Prisma) trên PostgreSQL thật — đã là integration giữa các tầng; #8 kiểm tích hợp DB. Bộ riêng sẽ trùng lặp.' },
  { id: 5, name: 'API Testing', tools: 'Jest + supertest', location: 'backend/test/{orders,products,swagger,quality}.e2e-spec.ts', command: 'npm run test:api', tests: any(inSuite('backend-e2e', 'orders'), inSuite('backend-e2e', 'products'), inSuite('backend-e2e', 'swagger'), inSuite('backend-e2e', 'quality')) },
  { id: 6, name: 'End-to-End (E2E) Testing', tools: 'Playwright (Chrome)', location: 'e2e/tests/sales.spec.ts · quality.spec.ts', command: 'npm run test:e2e', tests: any(inSuite('playwright', 'sales'), inSuite('playwright', 'quality')) },
  { id: 7, name: 'Authentication & Authorization', tools: 'supertest (ma trận vai trò × endpoint, token) · RTL (AuthProvider)', location: 'backend/test/auth.e2e-spec.ts · src/auth/*.spec.ts · frontend/src/__tests__/{auth,account}.test.tsx', command: 'npm run test:api', tests: any(inSuite('backend-e2e', 'auth.e2e'), inSuite('backend-unit', 'auth/'), inSuite('frontend', 'auth.test'), inSuite('frontend', 'account.test')) },
  { id: 8, name: 'Database Testing', tools: 'Jest + Prisma trên coffeepos_test · prisma migrate diff', location: 'backend/test/database.e2e-spec.ts', command: 'npm run test:api', tests: inSuite('backend-e2e', 'database') },
  { id: 9, name: 'Security Testing', tools: 'supertest (SQLi, XSS, mass assignment, rò rỉ, brute force, helmet) · Playwright (header, khoá đăng nhập) · npm audit', location: 'backend/test/security.e2e-spec.ts · src/config.spec.ts · e2e/tests/security.spec.ts', command: 'npm run test:api · npm run audit', tests: any(inSuite('backend-e2e', 'security'), inSuite('backend-unit', 'config.spec'), inSuite('playwright', 'security')), runs: ['audit'] },
  { id: 10, name: 'Performance & Load Testing', tools: 'autocannon', location: 'e2e/perf/load-test.mjs', command: 'npm run test:perf', perf: true },
  { id: 11, name: 'Accessibility Testing', tools: 'Playwright + axe-core (WCAG 2.1 AA)', location: 'e2e/tests/a11y.spec.ts', command: 'npm run test:a11y', tests: inSuite('playwright', 'a11y') },
  { id: 12, name: 'Regression Testing', tools: 'Lọc test gắn mã BR0x / L1–L3', location: 'các bộ test hiện có', command: 'npm run test:regression', tests: (t) => /\b(BR0\d|L[123])\b/.test(t.name) },
  { id: 13, name: 'Smoke Testing', tools: 'bash + curl · Playwright @smoke', location: 'scripts/smoke.sh · e2e/tests/smoke.spec.ts', command: 'npm run test:smoke', tests: inSuite('playwright', 'smoke'), runs: ['smoke'] },
  { id: 14, name: 'Test Coverage Reporting', tools: 'Jest (lcov, json-summary) · Vitest v8 · JUnit XML', location: '*/coverage/ · */reports/', command: 'npm run coverage:summary', coverage: true },
  { id: 15, name: 'CI/CD Automated Testing', tools: 'GitHub Actions (4 job, không deploy)', location: '.github/workflows/ci.yml', command: 'tự chạy khi tạo Pull Request', ci: true },
];

const count = (tests) => ({
  total: tests.length,
  passed: tests.filter((t) => t.status === 'pass').length,
  failed: tests.filter((t) => t.status === 'fail').length,
  skipped: tests.filter((t) => t.status === 'skip').length,
  todo: tests.filter((t) => t.status === 'todo').length,
});

const categories = CATALOG.map((c) => {
  const tests = c.tests ? allTests.filter(c.tests) : [];
  const checks = (c.runs ?? []).map((id) => runs[id]).filter(Boolean).map(({ id, label, command, status, durationMs, ranAt, tail }) => ({ id, label, command, status, durationMs, ranAt, tail }));
  let status;
  if (c.merged) status = 'merged';
  else if (c.ci) status = lastCompleted ? (lastCompleted.conclusion === 'success' ? 'pass' : 'fail') : ciJobs.length ? 'configured' : 'not_run';
  else if (c.coverage) status = coverage.some((x) => x.present) ? (coverage.every((x) => !x.present || x.metrics.every((m) => m.pass)) ? 'pass' : 'fail') : 'not_run';
  else if (c.perf) status = perf?.results ? (perf.results.every((r) => r.result === 'PASS') ? 'pass' : 'fail') : 'not_run';
  else if (!tests.length && !checks.length) status = 'not_run';
  else status = tests.some((t) => t.status === 'fail') || checks.some((x) => x.status === 'fail') ? 'fail' : 'pass';
  const { tests: _pred, runs: _runs, ...meta } = c;
  return { ...meta, status, counts: count(tests), checks, testIds: tests.map((t) => allTests.indexOf(t)) };
});

const totals = count(allTests);
const report = {
  version: 1,
  generatedAt: new Date().toISOString(),
  environment: { node: process.version, platform: `${process.platform}-${process.arch}`, ci: !!process.env.CI },
  overall: categories.some((c) => c.status === 'fail') ? 'fail' : categories.some((c) => c.status === 'not_run') ? 'partial' : 'pass',
  summary: {
    ...totals,
    categoriesPassed: categories.filter((c) => c.status === 'pass').length,
    categoriesFailed: categories.filter((c) => c.status === 'fail').length,
    categoriesTotal: categories.length,
  },
  categories,
  suites: suites.map(({ tests, ...s }) => ({ ...s, ...count(tests) })),
  tests: allTests,
  runs: Object.values(runs),
  smoke: smokeChecks,
  coverage,
  perf,
  ci: { workflow: '.github/workflows/ci.yml', jobs: ciJobs, ranOnGitHub: ciRuns.length > 0, runs: ciRuns, lastCompleted: lastCompleted ?? null, lastJobs },
  findings: [
    { by: '#9 Security', issue: 'Body > 100 KB trả 500 (ghi log lỗi hệ thống) thay vì 413', fix: 'AllExceptionsFilter nhận lỗi 4xx của body-parser' },
    { by: '#9 Security', issue: 'Header X-Powered-By: Express lộ framework', fix: 'Tắt trong app.factory.ts' },
    { by: '#3 Component', issue: 'Field đặt câu lỗi trong <label> → tên đọc của ô bị dính câu lỗi', fix: 'Đưa lỗi ra ngoài label, nối bằng aria-describedby' },
    { by: '#11 Accessibility', issue: 'Nhãn "Đang bán" / "Ngừng bán" không đủ tương phản WCAG AA', fix: 'Đổi màu chữ / nền' },
    { by: '#1 Static', issue: 'bootstrap() không bắt lỗi khởi động; 3 chỗ dùng any không an toàn', fix: '.catch() + thoát mã 1; khai báo kiểu' },
    { by: '#9 npm audit', issue: 'vitest 3 kéo theo tinypool có 2 lỗ hổng critical (dev dependency)', fix: 'Nâng vitest 5' },
    { by: '#9 Security (V1)', issue: 'Deploy với SEED=true tạo tài khoản demo mật khẩu Coffee@123 công khai; API chạy được với JWT_SECRET mặc định', fix: 'APP_ENV=production: từ chối khởi động nếu JWT_SECRET yếu / thiếu SEED_PASSWORD; deploy.yml kiểm tra trước khi deploy' },
    { by: '#9 Security (V2)', issue: 'Đăng nhập không giới hạn số lần thử → dò mật khẩu', fix: 'Giới hạn sai 5 lần / tài khoản, 20 lần / IP trong 15 phút → 429 + Retry-After' },
    { by: '#9 Security (V3)', issue: 'Đăng xuất không thu hồi token (token lộ còn dùng 12 giờ); không đổi được mật khẩu', fix: 'token_version + PATCH /api/auth/password + trang Tài khoản' },
    { by: '#9 Security (V4)', issue: 'Thiếu header bảo mật (clickjacking, MIME sniffing, CSP)', fix: 'helmet (API) + headers() của Next (web); HSTS khi COOKIE_SECURE=true' },
    { by: '#9 Security (V5–V7)', issue: 'Swagger công khai trên production; cờ Secure của cookie khó hiểu; 3 lỗ hổng moderate (glob qua @nestjs/cli)', fix: 'Swagger mặc định tắt khi production; COOKIE_SECURE; npm overrides glob 14 → 0 lỗ hổng' },
    { by: '#3 Component', issue: 'Trang đổi mật khẩu: lỗi server (undefined) đè mất lỗi kiểm tra phía client → bấm Đổi mà không thấy báo gì', fix: 'Chỉ trộn lỗi server có giá trị' },
  ],
  recommendations: [
    'Bật branch protection trên GitHub: bắt buộc 4 job CI xanh mới được merge vào main (cần chuyển sang quy trình Pull Request)',
    'Chạy production sau reverse proxy HTTPS (nginx / Caddy): ghi đè X-Forwarded-For để giới hạn theo IP không giả được, rồi đặt COOKIE_SECURE=true',
    'Chạy nhiều instance backend thì chuyển bộ đếm đăng nhập sai sang Redis (hiện lưu trong bộ nhớ)',
  ],
};

writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
console.log(`\n📄 ${relative(ROOT, REPORT_FILE)} — ${totals.passed}/${totals.total} test đạt, ${totals.failed} không đạt · tổng thể: ${report.overall}`);
console.log('   Xem trên web: đăng nhập chuquan → menu "Kiểm thử" (/quality)');
process.exit(report.overall === 'fail' ? 1 : 0);
