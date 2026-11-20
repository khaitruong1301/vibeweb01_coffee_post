'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useRequireRole } from '@/components/AuthProvider';
import { Alert, Button, Chip, Input, Spinner } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import type { CategoryStatus, CoverageMetric, QualityReport, TestCase, TestStatus } from '@/lib/types';

/** Trạng thái luôn có biểu tượng + chữ — không dựa vào màu. Màu đã kiểm tương phản (axe). */
const STATUS: Record<CategoryStatus | TestStatus | 'partial', { icon: string; label: string; cls: string }> = {
  pass: { icon: '✓', label: 'Đạt', cls: 'bg-success text-white' },
  fail: { icon: '✕', label: 'Không đạt', cls: 'bg-danger text-white' },
  partial: { icon: '◐', label: 'Chưa đủ', cls: 'bg-secondary text-foreground' },
  not_run: { icon: '–', label: 'Chưa chạy', cls: 'bg-secondary text-foreground' },
  merged: { icon: '⊕', label: 'Gộp', cls: 'bg-secondary text-foreground' },
  configured: { icon: '⚙', label: 'Đã cấu hình', cls: 'bg-secondary text-foreground' },
  skip: { icon: '⏭', label: 'Bỏ qua', cls: 'bg-secondary text-foreground' },
  todo: { icon: '○', label: 'Chưa làm', cls: 'bg-secondary text-foreground' },
};

const METRIC_LABEL: Record<CoverageMetric['metric'], string> = {
  lines: 'Lines',
  statements: 'Statements',
  branches: 'Branches',
  functions: 'Functions',
};

function StatusBadge({ status }: { status: keyof typeof STATUS }) {
  const s = STATUS[status];
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.cls}`}>
      <span aria-hidden>{s.icon}</span>
      {s.label}
    </span>
  );
}

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div role="group" aria-label={label} className="rounded-xl border border-border bg-surface p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="tabular mt-1 text-2xl font-semibold">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </div>
  );
}

/** Thanh coverage: phần tô mang trạng thái (đạt/không đạt), nền là sắc nhạt cùng màu, vạch đứng = ngưỡng. */
function Meter({ m }: { m: CoverageMetric }) {
  const fill = m.pass ? 'bg-success' : 'bg-danger';
  const track = m.pass ? 'bg-success/20' : 'bg-danger/20';
  return (
    <div
      role="meter"
      aria-label={`${METRIC_LABEL[m.metric]} ${m.pct}%${m.threshold != null ? `, ngưỡng ${m.threshold}%` : ''}`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={m.pct}
      title={`${m.covered}/${m.total}`}
      className={`relative h-2 w-full min-w-24 rounded-full ${track}`}
    >
      <div className={`h-2 rounded-full ${fill}`} style={{ width: `${Math.min(100, m.pct)}%` }} />
      {m.threshold != null && (
        <div className="absolute -top-1 h-4 w-0.5 bg-foreground" style={{ left: `${m.threshold}%` }} aria-hidden />
      )}
    </div>
  );
}

/** Vùng cuộn truy cập được bằng bàn phím (axe: scrollable-region-focusable). */
function ScrollArea({ label, className = '', children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div role="region" aria-label={label} tabIndex={0} className={`focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${className}`}>
      {children}
    </div>
  );
}

function Section({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-xl border border-border bg-surface">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-4 py-3">
        <h2 className="text-lg font-bold">{title}</h2>
        {aside && <div className="text-xs text-muted">{aside}</div>}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function TestList({ tests }: { tests: TestCase[] }) {
  const [filter, setFilter] = useState<'all' | 'fail' | 'todo'>('all');
  const [q, setQ] = useState('');
  const shown = tests.filter(
    (t) =>
      (filter === 'all' || (filter === 'fail' ? t.status === 'fail' : t.status === 'todo' || t.status === 'skip')) &&
      (!q || t.name.toLowerCase().includes(q.toLowerCase())),
  );
  if (!tests.length) return null;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {(['all', 'fail', 'todo'] as const).map((f) => (
          <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>
            {{ all: `Tất cả (${tests.length})`, fail: `Không đạt (${tests.filter((t) => t.status === 'fail').length})`, todo: `Chưa làm / bỏ qua (${tests.filter((t) => t.status === 'todo' || t.status === 'skip').length})` }[f]}
          </Chip>
        ))}
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm test…" aria-label="Tìm test" className="h-9 w-full sm:w-64" />
      </div>
      <ScrollArea label="Danh sách test" className="max-h-96 overflow-y-auto rounded-lg border border-border">
      <ul className="divide-y divide-border">
        {shown.length === 0 && <li className="px-3 py-4 text-center text-sm text-muted">Không có test phù hợp.</li>}
        {shown.map((t, i) => (
          <li key={`${t.file}-${t.name}-${i}`} className="px-3 py-2 text-sm">
            <div className="flex items-start gap-2">
              <StatusBadge status={t.status} />
              <div className="min-w-0 flex-1">
                <p className="break-words">{t.name}</p>
                <p className="text-xs text-muted">
                  {t.file} · {t.durationMs} ms
                </p>
                {t.message && (
                  <pre tabIndex={0} aria-label="Lỗi của test" className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-danger/5 p-2 text-xs text-danger">{t.message}</pre>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
      </ScrollArea>
    </div>
  );
}

const CI_STATUS = (r: { status: string; conclusion: string | null }): keyof typeof STATUS =>
  r.status !== 'completed' ? 'configured' : r.conclusion === 'success' ? 'pass' : r.conclusion === 'cancelled' || r.conclusion === 'skipped' ? 'skip' : 'fail';

function CiDetails({ ci }: { ci: QualityReport['ci'] }) {
  return (
    <div className="space-y-3 text-sm">
      <div>
        <p className="font-semibold">Job trong {ci.workflow}</p>
        <ul className="mt-1 list-disc pl-5">
          {ci.jobs.map((j) => {
            const last = ci.lastJobs?.find((x) => x.name === j.name);
            return (
              <li key={j.id}>
                <code className="text-xs">{j.id}</code> — {j.name}
                {last && (
                  <span className="ml-2">
                    <StatusBadge status={last.conclusion === 'success' ? 'pass' : last.conclusion === 'skipped' ? 'skip' : 'fail'} />
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
      {ci.runs?.length ? (
        <div>
          <p className="font-semibold">Lần chạy gần nhất trên GitHub Actions</p>
          <ul className="mt-1 space-y-1">
            {ci.runs.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-2">
                <StatusBadge status={CI_STATUS(r)} />
                {r.status !== 'completed' && <span className="text-xs text-muted">(đang chạy)</span>}
                <a href={r.url} target="_blank" rel="noreferrer" className="underline">
                  {r.title}
                </a>
                <span className="text-xs text-muted">
                  {r.branch} · {r.event} · {formatDateTime(r.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-muted">Chưa thấy lần chạy nào trên GitHub (chưa đẩy repo hoặc máy chưa đăng nhập gh).</p>
      )}
    </div>
  );
}

/** Báo cáo 15 hạng mục kiểm thử — chỉ Chủ quán (API cũng chặn bằng @Auth('admin')). */
export default function QualityPage() {
  const allowed = useRequireRole(['admin']);
  const [report, setReport] = useState<QualityReport | null>(null);
  const [error, setError] = useState<{ status: number; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setReport(await api<QualityReport>('/quality/report'));
      setError(null);
    } catch (e) {
      setReport(null);
      setError({ status: e instanceof ApiError ? e.status : 0, message: e instanceof Error ? e.message : 'Không tải được báo cáo' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!allowed) return;
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [allowed, load]);

  const testsOf = useMemo(() => (ids: number[]) => ids.map((i) => report?.tests[i]).filter((t): t is TestCase => !!t), [report]);

  if (!allowed) return null;
  if (!report && !error) return <Spinner label="Đang tải báo cáo kiểm thử…" />;

  if (error) {
    return (
      <div className="mx-auto max-w-xl space-y-4 py-10 text-center">
        <h1 className="text-xl font-bold">Kiểm thử tự động</h1>
        {error.status === 404 ? (
          <div className="space-y-3 rounded-xl border border-dashed border-border bg-surface p-6">
            <p>Chưa có báo cáo kiểm thử.</p>
            <p className="text-sm text-muted">Chạy lệnh sau ở thư mục gốc dự án rồi bấm Tải lại:</p>
            <code className="block rounded-lg bg-secondary px-3 py-2 text-sm">npm run test:report</code>
          </div>
        ) : (
          <Alert>⚠ {error.message}</Alert>
        )}
        <Button variant="secondary" onClick={load} loading={loading}>
          Tải lại
        </Button>
      </div>
    );
  }
  if (!report) return null;

  const s = report.summary;
  const perfOk = report.perf?.results.every((r) => r.result === 'PASS');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex flex-wrap items-center gap-2 text-xl font-bold">
            Kiểm thử tự động <StatusBadge status={report.overall} />
          </h1>
          <p className="text-sm text-muted">
            Cập nhật {formatDateTime(report.generatedAt)} · Node {report.environment.node} · {report.environment.ci ? 'CI' : 'máy local'}
          </p>
        </div>
        <Button variant="secondary" onClick={load} loading={loading}>
          ↻ Tải lại
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Test đạt" value={`${s.passed}/${s.total}`} sub={s.total ? `${Math.round((s.passed / s.total) * 100)}%` : undefined} />
        <StatTile label="Test không đạt" value={String(s.failed)} />
        <StatTile label="Chưa làm / bỏ qua" value={String(s.todo + s.skipped)} sub="ghi nhận bằng it.todo" />
        <StatTile label="Hạng mục đạt" value={`${s.categoriesPassed}/${s.categoriesTotal}`} sub="còn lại: gộp / đã cấu hình" />
      </div>

      <Section title="15 hạng mục kiểm thử" aside="Bấm một hàng để xem chi tiết từng test">
        <ScrollArea label="Bảng 15 hạng mục" className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="text-left text-muted">
              <tr className="border-b border-border">
                <th className="py-2 pr-2 font-semibold">#</th>
                <th className="py-2 pr-2 font-semibold">Hạng mục</th>
                <th className="py-2 pr-2 font-semibold">Trạng thái</th>
                <th className="py-2 pr-2 text-right font-semibold">Test đạt</th>
                <th className="py-2 pr-2 font-semibold">Công cụ</th>
                <th className="py-2 font-semibold">Lệnh</th>
              </tr>
            </thead>
            <tbody>
              {report.categories.map((c) => {
                const expanded = open === c.id;
                const tests = testsOf(c.testIds);
                return (
                  <Fragment key={c.id}>
                    <tr className="border-b border-border align-top hover:bg-background">
                      <td className="py-2 pr-2 text-muted">{c.id}</td>
                      <td className="py-2 pr-2">
                        <button
                          type="button"
                          className="text-left font-semibold underline-offset-2 hover:underline"
                          aria-expanded={expanded}
                          aria-controls={`cat-${c.id}`}
                          onClick={() => setOpen(expanded ? null : c.id)}
                        >
                          <span aria-hidden>{expanded ? '▾' : '▸'}</span> {c.name}
                        </button>
                      </td>
                      <td className="py-2 pr-2">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="tabular py-2 pr-2 text-right">
                        {c.counts.total ? `${c.counts.passed}/${c.counts.total}` : c.checks.length ? `${c.checks.filter((x) => x.status === 'pass').length}/${c.checks.length} lệnh` : '—'}
                        {c.counts.todo > 0 && <span className="block text-xs text-muted">{c.counts.todo} chưa làm</span>}
                      </td>
                      <td className="py-2 pr-2 text-muted">{c.tools}</td>
                      <td className="py-2">
                        <code className="whitespace-nowrap rounded bg-secondary px-1.5 py-0.5 text-xs">{c.command}</code>
                      </td>
                    </tr>
                    {expanded && (
                      <tr id={`cat-${c.id}`} className="border-b border-border bg-background">
                        <td colSpan={6} className="space-y-3 px-2 py-3">
                          <p className="text-sm">
                            <b>Nơi đặt:</b> <span className="text-muted">{c.location}</span>
                          </p>
                          {c.note && <p className="text-sm text-muted">{c.note}</p>}
                          {c.checks.map((x) => (
                            <details key={x.id} className="rounded-lg border border-border bg-surface p-3 text-sm">
                              <summary className="flex cursor-pointer flex-wrap items-center gap-2">
                                <StatusBadge status={x.status} /> {x.label} · {Math.round(x.durationMs / 1000)} s · {formatDateTime(x.ranAt)}
                              </summary>
                              <pre tabIndex={0} aria-label="Output của lệnh" className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap text-xs text-muted">{x.tail.join('\n')}</pre>
                            </details>
                          ))}
                          {c.id === 14 && <p className="text-sm text-muted">Xem bảng Coverage bên dưới.</p>}
                          {c.id === 10 && <p className="text-sm text-muted">Xem bảng Load test bên dưới.</p>}
                          {c.id === 15 && <CiDetails ci={report.ci} />}
                          <TestList tests={tests} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </ScrollArea>
      </Section>

      <Section title="Coverage" aside="Vạch đứng = ngưỡng tối thiểu; dưới ngưỡng thì CI đỏ">
        <ScrollArea label="Bảng coverage" className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-muted">
              <tr className="border-b border-border">
                <th className="py-2 pr-2 font-semibold">Bộ</th>
                {(['lines', 'statements', 'branches', 'functions'] as const).map((k) => (
                  <th key={k} className="py-2 pr-2 font-semibold">
                    {METRIC_LABEL[k]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.coverage.map((c) => (
                <tr key={c.id} className="border-b border-border align-top">
                  <td className="py-2 pr-3">{c.label}</td>
                  {c.present ? (
                    c.metrics.map((m) => (
                      <td key={m.metric} className="py-2 pr-3">
                        <div className="tabular flex items-baseline justify-between gap-2">
                          <span className="font-semibold">{m.pct}%</span>
                          <span className="text-xs text-muted">
                            {m.pass ? '✓' : '✕'} ngưỡng {m.threshold ?? '—'}%
                          </span>
                        </div>
                        <div className="mt-1.5">
                          <Meter m={m} />
                        </div>
                      </td>
                    ))
                  ) : (
                    <td colSpan={4} className="py-2 text-muted">
                      Chưa có số liệu
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollArea>
      </Section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section
          title="Load test"
          aside={report.perf ? `${report.perf.durationSec} s/kịch bản · ${formatDateTime(report.perf.ranAt)}` : undefined}
        >
          {report.perf ? (
            <ScrollArea label="Bảng load test" className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead className="text-left text-muted">
                  <tr className="border-b border-border">
                    <th className="py-2 pr-2 font-semibold">Kịch bản</th>
                    <th className="py-2 pr-2 text-right font-semibold">Req/s</th>
                    <th className="py-2 pr-2 text-right font-semibold">p97.5</th>
                    <th className="py-2 pr-2 text-right font-semibold">Lỗi</th>
                    <th className="py-2 font-semibold">KQ</th>
                  </tr>
                </thead>
                <tbody className="tabular">
                  {report.perf.results.map((r) => (
                    <tr key={r.scenario} className="border-b border-border">
                      <td className="py-2 pr-2">
                        {r.scenario}
                        <span className="block text-xs text-muted">{r.threshold}</span>
                      </td>
                      <td className="py-2 pr-2 text-right">{r.rps}</td>
                      <td className="py-2 pr-2 text-right">{r.p97_5} ms</td>
                      <td className="py-2 pr-2 text-right">{r.non2xx + r.errors}</td>
                      <td className="py-2">
                        <StatusBadge status={r.result === 'PASS' ? 'pass' : 'fail'} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-xs text-muted">{perfOk ? 'Tất cả kịch bản đạt ngưỡng.' : 'Có kịch bản vượt ngưỡng.'} Chạy trên stack E2E tạm, không phải production.</p>
            </ScrollArea>
          ) : (
            <p className="text-sm text-muted">Chưa chạy — `npm run test:report` (cần Docker).</p>
          )}
        </Section>

        <Section title="Smoke test (curl)">
          {report.smoke.length ? (
            <ul className="space-y-1.5 text-sm">
              {report.smoke.map((c) => (
                <li key={c.name} className="flex items-center gap-2">
                  <StatusBadge status={c.status} /> {c.name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Chưa chạy — `npm run test:report` (cần Docker).</p>
          )}
        </Section>
      </div>

      <Section title="Lỗi thật phát hiện nhờ test (đã sửa)">
        <ScrollArea label="Bảng lỗi phát hiện" className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-muted">
              <tr className="border-b border-border">
                <th className="py-2 pr-2 font-semibold">Phát hiện bởi</th>
                <th className="py-2 pr-2 font-semibold">Lỗi</th>
                <th className="py-2 font-semibold">Cách sửa</th>
              </tr>
            </thead>
            <tbody>
              {report.findings.map((f) => (
                <tr key={f.issue} className="border-b border-border align-top">
                  <td className="whitespace-nowrap py-2 pr-2 font-semibold">{f.by}</td>
                  <td className="py-2 pr-2">{f.issue}</td>
                  <td className="py-2 text-muted">{f.fix}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollArea>
      </Section>

      <Section title="Khuyến nghị / việc còn mở">
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {report.recommendations.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </Section>

      <p className="text-xs text-muted">
        Cập nhật báo cáo: chạy <code className="rounded bg-secondary px-1">npm run test:report</code> (đầy đủ, cần Docker) hoặc{' '}
        <code className="rounded bg-secondary px-1">npm run test:report:quick</code> ở thư mục gốc, rồi bấm Tải lại.
      </p>
    </div>
  );
}
