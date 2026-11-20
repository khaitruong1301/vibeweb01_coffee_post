// Kiểu dữ liệu khớp phản hồi của backend NestJS (.claude/docs/api/README.md).
export type Role = 'cashier' | 'barista' | 'admin';
export type Size = 'S' | 'M' | 'L';
export type OrderSource = 'counter' | 'grabfood' | 'shopeefood';
export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'done';

export interface User {
  id: number;
  username: string;
  fullName: string;
  role: Role;
}

export interface Category {
  id: number;
  name: string;
}

export interface Product {
  id: number;
  name: string;
  category: Category;
  price: number;
  priceL: number | null;
  hasSize: boolean;
  isActive: boolean;
  imageUrl: string | null;
  updatedAt: string;
  updatedBy: { id: number; fullName: string } | null;
}

export interface ProductList {
  items: Product[];
  sizeSurcharge: Record<Size, number>;
}

export interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  size: Size | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  note: string | null;
}

export interface Order {
  id: number;
  code: string;
  source: OrderSource;
  partnerCode: string | null;
  note: string | null;
  status: OrderStatus;
  statusLabel: string;
  total: number;
  createdAt: string;
  cashier: { id: number; fullName: string };
  items: OrderItem[];
}

// ---- Báo cáo kiểm thử (GET /api/quality/report — chỉ Chủ quán), sinh bởi scripts/test-report.mjs
export type TestStatus = 'pass' | 'fail' | 'skip' | 'todo';
export type CategoryStatus = 'pass' | 'fail' | 'not_run' | 'merged' | 'configured';

export interface TestCounts {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  todo: number;
}

export interface TestCase {
  suite: string;
  file: string;
  name: string;
  status: TestStatus;
  durationMs: number;
  message?: string;
}

export interface RunCheck {
  id: string;
  label: string;
  command: string;
  status: 'pass' | 'fail';
  durationMs: number;
  ranAt: string;
  tail: string[];
}

export interface TestCategory {
  id: number;
  name: string;
  tools: string;
  location: string;
  command: string;
  note?: string;
  status: CategoryStatus;
  counts: TestCounts;
  checks: RunCheck[];
  testIds: number[];
}

export interface CoverageMetric {
  metric: 'lines' | 'statements' | 'branches' | 'functions';
  pct: number;
  covered: number;
  total: number;
  threshold: number | null;
  pass: boolean;
}

export interface CiRun {
  id: number;
  title: string;
  branch: string;
  event: string;
  status: string;
  conclusion: string | null;
  createdAt: string;
  url: string;
}

export interface QualityReport {
  version: number;
  generatedAt: string;
  fileUpdatedAt: string;
  environment: { node: string; platform: string; ci: boolean };
  overall: 'pass' | 'fail' | 'partial';
  summary: TestCounts & { categoriesPassed: number; categoriesFailed: number; categoriesTotal: number };
  categories: TestCategory[];
  suites: (TestCounts & { id: string; label: string; present: boolean; ranAt: string | null })[];
  tests: TestCase[];
  smoke: { name: string; status: 'pass' | 'fail' }[];
  coverage: { id: string; label: string; present: boolean; ranAt?: string; metrics: CoverageMetric[] }[];
  perf: {
    api: string;
    durationSec: number;
    ranAt: string;
    results: { scenario: string; connections: number; rps: number; p50: number; p97_5: number; p99: number; non2xx: number; errors: number; threshold: string; result: 'PASS' | 'FAIL' }[];
  } | null;
  ci: {
    workflow: string;
    jobs: { id: string; name: string }[];
    ranOnGitHub: boolean;
    runs?: CiRun[];
    lastCompleted?: CiRun | null;
    lastJobs?: { name: string; conclusion: string; url: string }[];
  };
  findings: { by: string; issue: string; fix: string }[];
  recommendations: string[];
}
