'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Alert, Button, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { formatDateTime, formatVnd, SOURCE_LABEL } from '@/lib/format';
import type { Order } from '@/lib/types';

/** UC03 — đọc lại đơn đã lưu từ server theo mã CP-…, không dùng dữ liệu giỏ hàng trên trình duyệt. */
export default function ReceiptPage() {
  const { code } = useParams<{ code: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Order>(`/orders/${encodeURIComponent(code)}`)
      .then(setOrder)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Không tải được hóa đơn'));
  }, [code]);

  if (error) {
    return (
      <div className="mx-auto max-w-md space-y-4 py-10">
        <Alert>⚠ {error}</Alert>
        <Link href="/checkout" className="underline">
          ← Về màn bán hàng
        </Link>
      </div>
    );
  }
  if (!order) return <Spinner label="Đang tải hóa đơn…" />;

  return (
    <div className="flex flex-col items-center gap-4 py-4 md:flex-row md:items-start md:justify-center">
      <article className="tabular w-full max-w-[380px] bg-surface p-6 text-sm shadow-md print:max-w-none print:shadow-none">
        <header className="text-center">
          <p className="text-lg font-bold">CoffeePOS</p>
          <p className="text-xs text-muted">Quán cà phê · Cảm ơn quý khách</p>
          <p className="mt-3 border-t border-dashed border-border pt-3 font-bold">HÓA ĐƠN BÁN HÀNG</p>
        </header>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          <dt className="text-muted">Mã đơn:</dt>
          <dd className="text-right font-bold">{order.code}</dd>
          <dt className="text-muted">Thời gian:</dt>
          <dd className="text-right">{formatDateTime(order.createdAt)}</dd>
          <dt className="text-muted">Thu ngân:</dt>
          <dd className="text-right">{order.cashier.fullName}</dd>
          <dt className="text-muted">Nguồn:</dt>
          <dd className="text-right">
            {SOURCE_LABEL[order.source]}
            {order.partnerCode && ` · ${order.partnerCode}`}
          </dd>
        </dl>
        <table className="mt-3 w-full border-t border-dashed border-border">
          <thead>
            <tr className="text-left">
              <th className="py-2 font-semibold">Món</th>
              <th className="py-2 text-right font-semibold">SL</th>
              <th className="py-2 text-right font-semibold">Đ.giá</th>
              <th className="py-2 text-right font-semibold">T.tiền</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((i) => (
              <tr key={i.id} className="align-top">
                <td className="py-1 pr-2">
                  {i.productName}
                  {i.size && ` (${i.size})`}
                  {i.note && <span className="block text-xs text-muted">{i.note}</span>}
                </td>
                <td className="py-1 text-right">{i.quantity}</td>
                <td className="py-1 text-right">{i.unitPrice.toLocaleString('vi-VN')}</td>
                <td className="py-1 text-right">{i.lineTotal.toLocaleString('vi-VN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {order.note && <p className="mt-2 text-xs text-muted">Ghi chú: {order.note}</p>}
        <div className="mt-3 flex items-baseline justify-between border-t border-dashed border-border pt-3">
          <span className="font-bold">TỔNG CỘNG</span>
          <span className="text-xl font-bold">{formatVnd(order.total)}</span>
        </div>
        <p className="mt-6 text-center text-xs text-muted">Hẹn gặp lại quý khách!</p>
      </article>

      <div className="flex w-full max-w-[380px] gap-2 md:w-48 md:flex-col print:hidden">
        <Button size="lg" className="flex-1 md:w-full md:flex-none" onClick={() => window.print()}>
          🖨 In hóa đơn
        </Button>
        <Link
          href="/checkout"
          className="inline-flex h-14 flex-1 md:flex-none items-center justify-center rounded-lg border border-border bg-surface font-semibold hover:bg-secondary md:w-full"
        >
          + Đơn mới
        </Link>
      </div>
    </div>
  );
}
