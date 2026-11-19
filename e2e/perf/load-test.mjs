// #10 Performance & Load — mô phỏng giờ cao điểm 7h–9h (2 quầy thu ngân + màn quầy pha + đơn app giao đồ ăn).
// Quy mô thật ~150 đơn/ngày → tải ở đây gấp hàng trăm lần cao điểm để có biên an toàn.
// Chạy: node perf/load-test.mjs   (mặc định vào stack E2E http://localhost:4200 — DB tạm trên RAM)
// TẠO DỮ LIỆU THẬT → không trỏ vào production. Muốn chạy nơi khác phải đặt PERF_TARGET_CONFIRMED=yes.
import autocannon from 'autocannon';
import { mkdirSync, writeFileSync } from 'node:fs';

const API = process.env.PERF_API_URL ?? 'http://localhost:4200';
const DURATION = Number(process.env.PERF_DURATION ?? 15);

if (!API.includes(':4200') && process.env.PERF_TARGET_CONFIRMED !== 'yes') {
  console.error(`Từ chối chạy load test vào ${API}: chỉ dùng stack E2E (cổng 4200). Đặt PERF_TARGET_CONFIRMED=yes nếu chắc chắn không phải production.`);
  process.exit(2);
}

async function login(username) {
  const res = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: 'Coffee@123' }),
  });
  if (!res.ok) throw new Error(`Không đăng nhập được ${username}: ${res.status}`);
  return (await res.json()).token;
}

const cashier = await login('thungan1');
const barista = await login('phache1');
const menu = await (await fetch(`${API}/api/products`, { headers: { Authorization: `Bearer ${cashier}` } })).json();
const coffee = menu.items.find((p) => p.hasSize);
const cake = menu.items.find((p) => !p.hasSize);

/** Ngưỡng: p97.5 (≈ p95) dưới mức cho phép, không lỗi, không phản hồi khác 2xx. */
const SCENARIOS = [
  {
    name: 'Thu ngân mở menu — GET /api/products',
    opts: { url: `${API}/api/products`, connections: 20, headers: { Authorization: `Bearer ${cashier}` } },
    maxP97_5: 300,
  },
  {
    name: 'Bấm Thanh toán — POST /api/orders',
    opts: {
      url: `${API}/api/orders`,
      method: 'POST',
      connections: 10,
      headers: { Authorization: `Bearer ${cashier}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [{ productId: coffee.id, size: 'L', quantity: 2 }, { productId: cake.id, quantity: 1 }] }),
    },
    maxP97_5: 500,
  },
  {
    name: 'Quầy pha làm mới — GET /api/orders?status=…',
    opts: { url: `${API}/api/orders?status=pending,preparing,ready&limit=100`, connections: 10, headers: { Authorization: `Bearer ${barista}` } },
    maxP97_5: 500,
  },
];

const results = [];
for (const s of SCENARIOS) {
  const r = await autocannon({ ...s.opts, duration: DURATION });
  const pass = r.errors === 0 && r.non2xx === 0 && r.timeouts === 0 && r.latency.p97_5 <= s.maxP97_5;
  results.push({
    scenario: s.name,
    connections: s.opts.connections,
    requests: r.requests.total,
    rps: Math.round(r.requests.average),
    p50: r.latency.p50,
    p97_5: r.latency.p97_5,
    p99: r.latency.p99,
    max: r.latency.max,
    non2xx: r.non2xx,
    errors: r.errors + r.timeouts,
    threshold: `p97.5 ≤ ${s.maxP97_5}ms, 0 lỗi`,
    result: pass ? 'PASS' : 'FAIL',
  });
}

console.table(results.map(({ scenario, rps, p50, p97_5, p99, non2xx, errors, result }) => ({ scenario, rps, p50, p97_5, p99, non2xx, errors, result })));
mkdirSync('reports', { recursive: true });
writeFileSync('reports/perf.json', JSON.stringify({ api: API, durationSec: DURATION, at: new Date().toISOString(), results }, null, 2));
const md = [
  `| Kịch bản | Kết nối | Req/s | p50 (ms) | p97.5 (ms) | p99 (ms) | Lỗi | Ngưỡng | KQ |`,
  `|---|---|---|---|---|---|---|---|---|`,
  ...results.map((r) => `| ${r.scenario} | ${r.connections} | ${r.rps} | ${r.p50} | ${r.p97_5} | ${r.p99} | ${r.non2xx + r.errors} | ${r.threshold} | ${r.result} |`),
].join('\n');
writeFileSync('reports/perf.md', md + '\n');
console.log(`\nĐã ghi reports/perf.json, reports/perf.md`);
process.exit(results.every((r) => r.result === 'PASS') ? 0 : 1);
