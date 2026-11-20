import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import QualityPage from '@/app/(app)/quality/page';
import type { QualityReport } from '@/lib/types';

vi.mock('@/components/AuthProvider', () => ({ useRequireRole: () => true }));

const counts = (total: number, passed: number, failed = 0, todo = 0) => ({ total, passed, failed, skipped: 0, todo });
const REPORT: QualityReport = {
  version: 1,
  generatedAt: '2026-11-19T13:00:00.000Z',
  fileUpdatedAt: '2026-11-19T13:00:00.000Z',
  environment: { node: 'v22.17.0', platform: 'darwin-arm64', ci: false },
  overall: 'fail',
  summary: { ...counts(3, 1, 1, 1), categoriesPassed: 1, categoriesFailed: 1, categoriesTotal: 3 },
  categories: [
    { id: 2, name: 'Unit Testing', tools: 'Jest', location: 'backend/src', command: 'npm run test:unit', status: 'pass', counts: counts(1, 1), checks: [], testIds: [0] },
    { id: 9, name: 'Security Testing', tools: 'supertest', location: 'backend/test', command: 'npm run test:api', status: 'fail', counts: counts(2, 0, 1, 1), checks: [], testIds: [1, 2] },
    { id: 4, name: 'Integration Testing', tools: '—', location: '—', command: '—', note: 'Gộp vào #5', status: 'merged', counts: counts(0, 0), checks: [], testIds: [] },
  ],
  suites: [],
  tests: [
    { suite: 'backend-unit', file: 'src/pricing/pricing.spec.ts', name: 'size L cộng 6.000đ', status: 'pass', durationMs: 2 },
    { suite: 'backend-e2e', file: 'test/security.e2e-spec.ts', name: 'body quá lớn → 413', status: 'fail', durationMs: 9, message: 'expected 413, got 500' },
    { suite: 'backend-e2e', file: 'test/security.e2e-spec.ts', name: 'rate limit đăng nhập', status: 'todo', durationMs: 0 },
  ],
  smoke: [{ name: 'API /api/health', status: 'pass' }],
  coverage: [
    {
      id: 'backend-e2e', label: 'Backend e2e', present: true,
      metrics: [
        { metric: 'lines', pct: 97.9, covered: 417, total: 426, threshold: 90, pass: true },
        { metric: 'statements', pct: 96.2, covered: 487, total: 506, threshold: 90, pass: true },
        { metric: 'branches', pct: 70, covered: 70, total: 100, threshold: 75, pass: false },
        { metric: 'functions', pct: 97.5, covered: 79, total: 81, threshold: 85, pass: true },
      ],
    },
  ],
  perf: null,
  ci: { workflow: '.github/workflows/ci.yml', jobs: [{ id: 'static', name: '#1 Static' }], ranOnGitHub: false },
  findings: [{ by: '#9 Security', issue: 'Body > 100 KB trả 500', fix: 'Filter nhận lỗi 4xx' }],
  recommendations: ['Rate limit đăng nhập'],
};

function mockReport(status: number, body: unknown) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(body), { status }));
}

beforeEach(() => vi.restoreAllMocks());

describe('Trang báo cáo kiểm thử (/quality)', () => {
  it('ô tổng quan và trạng thái tổng thể có chữ, không chỉ màu', async () => {
    mockReport(200, REPORT);
    render(<QualityPage />);
    expect(await screen.findByRole('heading', { name: /Kiểm thử tự động/ })).toHaveTextContent('Không đạt');
    expect(screen.getByRole('group', { name: 'Test đạt' })).toHaveTextContent('1/3');
    expect(screen.getByRole('group', { name: 'Test không đạt' })).toHaveTextContent('1');
    expect(screen.getByRole('group', { name: 'Chưa làm / bỏ qua' })).toHaveTextContent('1');
  });

  it('hàng hạng mục hiện trạng thái và số test; bấm để mở danh sách test', async () => {
    mockReport(200, REPORT);
    render(<QualityPage />);
    const security = await screen.findByRole('button', { name: /Security Testing/ });
    expect(security).toHaveAttribute('aria-expanded', 'false');
    const row = security.closest('tr') as HTMLElement;
    expect(within(row).getByText('Không đạt')).toBeInTheDocument();
    expect(within(row).getByText('1 chưa làm')).toBeInTheDocument();

    await userEvent.click(security);
    expect(security).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('body quá lớn → 413')).toBeInTheDocument();
    expect(screen.getByText('expected 413, got 500')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /^Không đạt \(1\)/ }));
    expect(screen.queryByText('rate limit đăng nhập')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^Chưa làm/ }));
    expect(screen.getByText('rate limit đăng nhập')).toBeInTheDocument();
  });

  it('hạng mục gộp hiện lý do', async () => {
    mockReport(200, REPORT);
    render(<QualityPage />);
    await userEvent.click(await screen.findByRole('button', { name: /Integration Testing/ }));
    expect(screen.getByText('Gộp vào #5')).toBeInTheDocument();
  });

  it('coverage: thanh có giá trị + ngưỡng cho trình đọc màn hình, dưới ngưỡng có dấu ✕', async () => {
    mockReport(200, REPORT);
    render(<QualityPage />);
    const branches = await screen.findByRole('meter', { name: 'Branches 70%, ngưỡng 75%' });
    expect(branches).toHaveAttribute('aria-valuenow', '70');
    expect(screen.getByText('✕ ngưỡng 75%')).toBeInTheDocument();
    expect(screen.getByText('Chưa chạy — `npm run test:report` (cần Docker).', { exact: false })).toBeInTheDocument();
  });

  it('#15 CI: hiện lần chạy trên GitHub kèm link và trạng thái từng job', async () => {
    mockReport(200, {
      ...REPORT,
      categories: [{ id: 15, name: 'CI/CD Automated Testing', tools: 'GitHub Actions', location: 'ci.yml', command: 'PR', status: 'pass', counts: counts(0, 0), checks: [], testIds: [] }],
      ci: {
        ...REPORT.ci,
        ranOnGitHub: true,
        lastJobs: [{ name: '#1 Static', conclusion: 'success', url: 'https://github.com/x/y/actions/runs/1/job/2' }],
        runs: [
          { id: 2, title: 'feat: thêm trang kiểm thử', branch: 'main', event: 'push', status: 'in_progress', conclusion: null, createdAt: '2026-11-19T14:00:00Z', url: 'https://github.com/x/y/actions/runs/2' },
          { id: 1, title: 'chore: khởi tạo', branch: 'main', event: 'push', status: 'completed', conclusion: 'success', createdAt: '2026-11-19T13:00:00Z', url: 'https://github.com/x/y/actions/runs/1' },
        ],
      },
    });
    render(<QualityPage />);
    await userEvent.click(await screen.findByRole('button', { name: /CI\/CD Automated Testing/ }));
    expect(screen.getByRole('link', { name: 'chore: khởi tạo' })).toHaveAttribute('href', 'https://github.com/x/y/actions/runs/1');
    expect(screen.getByText('(đang chạy)')).toBeInTheDocument();
    expect(screen.getByText('#1 Static', { exact: false }).closest('li')).toHaveTextContent('Đạt');
  });

  it('hạng mục chạy bằng lệnh: hiện số lệnh đạt, mở xem output; ô tìm lọc test theo tên', async () => {
    mockReport(200, {
      ...REPORT,
      categories: [
        {
          id: 1, name: 'Static Code Analysis', tools: 'ESLint', location: 'eslint.config.mjs', command: 'npm run static', status: 'pass',
          counts: counts(0, 0), testIds: [],
          checks: [{ id: 'static', label: 'ESLint + TypeScript', command: 'npm run static', status: 'pass', durationMs: 21000, ranAt: '2026-11-19T13:00:00Z', tail: ['> eslint .', '0 lỗi'] }],
        },
        { ...REPORT.categories[1], status: 'fail' },
        { id: 10, name: 'Performance & Load Testing', tools: 'autocannon', location: 'perf', command: 'npm run test:perf', status: 'pass', counts: counts(0, 0), checks: [], testIds: [] },
        { id: 14, name: 'Test Coverage Reporting', tools: 'Jest', location: 'coverage', command: 'npm run coverage:summary', status: 'pass', counts: counts(0, 0), checks: [], testIds: [] },
      ],
    });
    render(<QualityPage />);
    const staticBtn = await screen.findByRole('button', { name: /Static Code Analysis/ });
    expect(within(staticBtn.closest('tr') as HTMLElement).getByText('1/1 lệnh')).toBeInTheDocument();
    await userEvent.click(staticBtn);
    expect(screen.getByText(/ESLint \+ TypeScript · 21 s/)).toBeInTheDocument();
    expect(screen.getByLabelText('Output của lệnh')).toHaveTextContent('0 lỗi');

    await userEvent.click(screen.getByRole('button', { name: /Security Testing/ }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Tìm test' }), 'rate');
    expect(screen.getByText('rate limit đăng nhập')).toBeInTheDocument();
    expect(screen.queryByText('body quá lớn → 413')).not.toBeInTheDocument();
    await userEvent.type(screen.getByRole('textbox', { name: 'Tìm test' }), 'zzz');
    expect(screen.getByText('Không có test phù hợp.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Performance & Load/ }));
    expect(screen.getByText('Xem bảng Load test bên dưới.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Test Coverage Reporting/ }));
    expect(screen.getByText('Xem bảng Coverage bên dưới.')).toBeInTheDocument();
  });

  it('bảng load test: mỗi kịch bản có ngưỡng và kết quả bằng chữ', async () => {
    mockReport(200, {
      ...REPORT,
      perf: {
        api: 'http://localhost:4200', durationSec: 15, ranAt: '2026-11-19T13:00:00Z',
        results: [
          { scenario: 'POST /api/orders', connections: 10, rps: 260, p50: 34, p97_5: 79, p99: 107, non2xx: 0, errors: 0, threshold: 'p97.5 ≤ 500ms, 0 lỗi', result: 'PASS' },
          { scenario: 'GET /api/orders', connections: 10, rps: 20, p50: 400, p97_5: 900, p99: 1200, non2xx: 3, errors: 1, threshold: 'p97.5 ≤ 500ms, 0 lỗi', result: 'FAIL' },
        ],
      },
    });
    render(<QualityPage />);
    const table = await screen.findByRole('region', { name: 'Bảng load test' });
    const rows = within(table).getAllByRole('row');
    expect(rows[1]).toHaveTextContent('79 ms');
    expect(rows[1]).toHaveTextContent('Đạt');
    expect(rows[2]).toHaveTextContent('Không đạt');
    expect(rows[2]).toHaveTextContent('4');
    expect(screen.getByText(/Có kịch bản vượt ngưỡng/)).toBeInTheDocument();
  });

  it('chưa có báo cáo (404) → hướng dẫn lệnh tạo', async () => {
    mockReport(404, { error: 'Chưa có báo cáo kiểm thử' });
    render(<QualityPage />);
    expect(await screen.findByText('Chưa có báo cáo kiểm thử.')).toBeInTheDocument();
    expect(screen.getByText('npm run test:report')).toBeInTheDocument();
  });

  it('lỗi khác → hiện thông báo và nút tải lại', async () => {
    mockReport(500, { error: 'File báo cáo kiểm thử bị hỏng, hãy tạo lại' });
    render(<QualityPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('bị hỏng');
    expect(screen.getByRole('button', { name: 'Tải lại' })).toBeEnabled();
  });
});
