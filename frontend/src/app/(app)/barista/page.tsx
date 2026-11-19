'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRequireRole } from '@/components/AuthProvider';
import { Alert, Button, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { formatTime, SOURCE_LABEL } from '@/lib/format';
import type { Order, OrderStatus } from '@/lib/types';

const REFRESH_MS = 5000;

const COLUMNS: { status: OrderStatus; title: string; next: OrderStatus; action: string }[] = [
  { status: 'pending', title: 'Chờ pha', next: 'preparing', action: 'Bắt đầu pha' },
  { status: 'preparing', title: 'Đang pha', next: 'ready', action: 'Xong' },
  { status: 'ready', title: 'Xong — chờ giao', next: 'done', action: 'Đã giao' },
];

/** UC05 — màn quầy pha: tự làm mới, không hiển thị giá tiền. */
export default function BaristaPage() {
  const allowed = useRequireRole(['barista', 'admin']);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      const r = await api<{ items: Order[] }>('/orders?status=pending,preparing,ready');
      setOrders(r.items);
      setUpdatedAt(new Date());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được danh sách đơn');
    }
  }, []);

  useEffect(() => {
    if (!allowed) return;
    // Lần tải đầu chạy ngay; sau đó làm mới định kỳ (setState chỉ xảy ra khi request trả về).
    const first = setTimeout(refresh, 0);
    const timer = setInterval(refresh, REFRESH_MS);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [allowed, refresh]);

  async function advance(order: Order, next: OrderStatus) {
    setBusy(order.id);
    try {
      await api(`/orders/${order.id}/status`, { method: 'PATCH', body: { status: next } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không cập nhật được đơn');
    } finally {
      setBusy(null);
      refresh();
    }
  }

  if (!allowed) return null;
  if (!orders && !error) return <Spinner label="Đang tải đơn…" />;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-bold">Đơn cần pha</h1>
        <p className="text-sm text-muted">
          Tự làm mới mỗi {REFRESH_MS / 1000} giây
          {updatedAt && ` · cập nhật lúc ${updatedAt.toLocaleTimeString('vi-VN')}`}
        </p>
      </div>
      {error && <Alert>⚠ {error}</Alert>}

      <div className="grid gap-3 md:grid-cols-3">
        {COLUMNS.map((col) => {
          const list = (orders ?? []).filter((o) => o.status === col.status);
          return (
            <section key={col.status} className="rounded-xl bg-secondary/60 p-3">
              <h2 className="mb-2 font-bold">
                {col.title} <span className="font-normal text-muted">({list.length})</span>
              </h2>
              <div className="space-y-2">
                {list.length === 0 && <p className="py-6 text-center text-sm text-muted">Không có đơn</p>}
                {list.map((o) => (
                  <article key={o.id} className="rounded-lg border border-border bg-surface p-3">
                    <div className="flex items-baseline justify-between">
                      <span className="font-bold">{o.code}</span>
                      <span className="tabular text-sm text-muted">⏱ {formatTime(o.createdAt)}</span>
                    </div>
                    <p className="text-xs text-muted">
                      {SOURCE_LABEL[o.source]}
                      {o.partnerCode && ` · ${o.partnerCode}`}
                    </p>
                    <ul className="mt-2 space-y-0.5">
                      {o.items.map((i) => (
                        <li key={i.id} className="font-semibold">
                          {i.quantity} × {i.productName}
                          {i.size && ` (${i.size})`}
                          {i.note && <span className="block text-sm font-normal text-warning">📝 {i.note}</span>}
                        </li>
                      ))}
                    </ul>
                    {o.note && <p className="mt-1 text-sm text-warning">📝 {o.note}</p>}
                    <Button
                      variant={col.status === 'ready' ? 'secondary' : 'primary'}
                      className="mt-3 w-full"
                      loading={busy === o.id}
                      onClick={() => advance(o, col.next)}
                    >
                      {col.action}
                    </Button>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
