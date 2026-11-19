'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRequireRole } from '@/components/AuthProvider';
import { Alert, Button, Chip, Input, Modal, Spinner } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { MAX_QTY, priceOf, stepQty, summarize } from '@/lib/cart';
import { formatVnd, SOURCE_LABEL } from '@/lib/format';
import type { Order, OrderSource, Product, ProductList, Size } from '@/lib/types';

const SIZES: Size[] = ['S', 'M', 'L'];
const CART_KEY = 'coffeepos_cart';

interface CartLine {
  key: string;
  productId: number;
  size: Size | null;
  /** Chuỗi để thu ngân gõ tự do; chỉ hợp lệ khi là số nguyên 1–50. */
  qty: string;
}

interface SavedCart {
  lines: CartLine[];
  source: OrderSource;
  partnerCode: string;
  note: string;
}

function loadCart(): SavedCart | null {
  try {
    const raw = sessionStorage.getItem(CART_KEY);
    return raw ? (JSON.parse(raw) as SavedCart) : null;
  } catch {
    return null;
  }
}

function saveCart(c: SavedCart) {
  try {
    if (c.lines.length) sessionStorage.setItem(CART_KEY, JSON.stringify(c));
    else sessionStorage.removeItem(CART_KEY);
  } catch {
    /* trình duyệt chặn storage → bỏ qua, giỏ vẫn chạy trong bộ nhớ */
  }
}

export default function CheckoutPage() {
  const allowed = useRequireRole(['cashier', 'admin']);
  const router = useRouter();

  const [menu, setMenu] = useState<ProductList | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [category, setCategory] = useState<number | 'all'>('all');
  const [search, setSearch] = useState('');
  const [pickedSize, setPickedSize] = useState<Record<number, Size>>({});

  // Khôi phục giỏ đang làm dở (vd: hết phiên → đăng nhập lại). Trang chỉ render phía client
  // (AuthProvider hiện spinner khi render server) nên đọc sessionStorage ngay lúc khởi tạo được.
  const [saved] = useState(loadCart);
  const [lines, setLines] = useState<CartLine[]>(saved?.lines ?? []);
  const [source, setSource] = useState<OrderSource>(saved?.source ?? 'counter');
  const [partnerCode, setPartnerCode] = useState(saved?.partnerCode ?? '');
  const [note, setNote] = useState(saved?.note ?? '');

  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<{ message: string; details?: Record<string, string> } | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  const fetchMenu = useCallback(
    () =>
      api<ProductList>('/products')
        .then(setMenu)
        .catch((e: unknown) => setLoadError(e instanceof Error ? e.message : 'Không tải được menu')),
    [],
  );

  function retryMenu() {
    setLoadError(null);
    fetchMenu();
  }

  useEffect(() => {
    if (allowed) fetchMenu();
  }, [allowed, fetchMenu]);

  useEffect(() => {
    saveCart({ lines, source, partnerCode, note });
  }, [lines, source, partnerCode, note]);

  const productById = useMemo(() => new Map(menu?.items.map((p) => [p.id, p]) ?? []), [menu]);
  const categories = useMemo(() => {
    const seen = new Map<number, string>();
    menu?.items.forEach((p) => seen.set(p.category.id, p.category.name));
    return [...seen].map(([id, name]) => ({ id, name }));
  }, [menu]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (menu?.items ?? []).filter(
      (p) => (category === 'all' || p.category.id === category) && (!q || p.name.toLowerCase().includes(q)),
    );
  }, [menu, category, search]);

  // Giỏ bỏ qua món đã ngừng bán sau khi khôi phục
  const cart = lines
    .map((l) => ({ ...l, product: productById.get(l.productId) }))
    .filter((l): l is CartLine & { product: Product } => !!l.product);

  const { errors, hasErrors, subtotal, surcharge, total } = summarize(cart);
  const needPartnerCode = source !== 'counter' && !partnerCode.trim();
  const canPay = cart.length > 0 && !hasErrors && !needPartnerCode && !saving;

  function addToCart(p: Product) {
    const size: Size | null = p.hasSize ? (pickedSize[p.id] ?? 'M') : null;
    setSubmitError(null);
    setLines((prev) => {
      const found = prev.find((l) => l.productId === p.id && l.size === size);
      if (found) {
        return prev.map((l) => (l === found ? { ...l, qty: String(Math.min(MAX_QTY, (Number(l.qty) || 0) + 1)) } : l));
      }
      return [...prev, { key: `${p.id}-${size ?? '-'}-${Date.now()}`, productId: p.id, size, qty: '1' }];
    });
  }

  const setQty = (key: string, qty: string) => setLines((prev) => prev.map((l) => (l.key === key ? { ...l, qty } : l)));
  const removeLine = (key: string) => setLines((prev) => prev.filter((l) => l.key !== key));

  function step(key: string, current: string, delta: number) {
    const next = stepQty(current, delta);
    if (next === null) {
      if (window.confirm('Xóa món này khỏi đơn?')) removeLine(key);
      return;
    }
    setQty(key, next);
  }

  function resetCart() {
    setLines([]);
    setNote('');
    setPartnerCode('');
    setSource('counter');
    setSubmitError(null);
  }

  async function pay() {
    if (!canPay) return;
    setSaving(true);
    setSubmitError(null);
    try {
      // Chỉ gửi mã món, size, số lượng — KHÔNG gửi giá. Server tính tiền từ DB (BR01).
      const order = await api<Order>('/orders', {
        method: 'POST',
        body: {
          items: cart.map((l) => ({ productId: l.productId, size: l.size ?? undefined, quantity: Number(l.qty) })),
          source,
          partnerCode: source === 'counter' ? undefined : partnerCode.trim(),
          note: note.trim() || undefined,
        },
      });
      resetCart();
      saveCart({ lines: [], source: 'counter', partnerCode: '', note: '' });
      router.push(`/receipt/${order.code}`);
    } catch (e) {
      setSaving(false);
      if (e instanceof ApiError && e.status === 401) setSessionExpired(true);
      else if (e instanceof ApiError) setSubmitError({ message: e.message, details: e.details });
      else setSubmitError({ message: 'Không lưu được đơn, vui lòng thử lại' });
    }
  }

  if (!allowed) return null;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_400px]">
      {/* ---------- Menu ---------- */}
      <section className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">Nguồn đơn:</span>
          {(Object.keys(SOURCE_LABEL) as OrderSource[]).map((s) => (
            <Chip key={s} active={source === s} onClick={() => setSource(s)}>
              {SOURCE_LABEL[s]}
            </Chip>
          ))}
          {source !== 'counter' && (
            <Input
              value={partnerCode}
              onChange={(e) => setPartnerCode(e.target.value)}
              placeholder={`Mã đơn ${SOURCE_LABEL[source]} *`}
              aria-label={`Mã đơn ${SOURCE_LABEL[source]}`}
              invalid={needPartnerCode}
              maxLength={50}
              className="h-9 w-56"
            />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Tìm món…"
            aria-label="Tìm món"
            className="h-10 w-full sm:w-64"
          />
          <Chip active={category === 'all'} onClick={() => setCategory('all')}>
            Tất cả
          </Chip>
          {categories.map((c) => (
            <Chip key={c.id} active={category === c.id} onClick={() => setCategory(c.id)}>
              {c.name}
            </Chip>
          ))}
        </div>

        {loadError ? (
          <Alert>
            ⚠ {loadError}{' '}
            <button type="button" className="ml-2 underline" onClick={retryMenu}>
              Thử lại
            </button>
          </Alert>
        ) : !menu ? (
          <Spinner label="Đang tải menu…" />
        ) : visible.length === 0 ? (
          <p className="py-12 text-center text-muted">Không có món phù hợp.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {visible.map((p) => {
              const size = pickedSize[p.id] ?? 'M';
              return (
                <article key={p.id} className="flex flex-col rounded-xl border border-border bg-surface p-3">
                  <div className="mb-2 flex h-20 items-center justify-center rounded-lg bg-secondary text-3xl" aria-hidden>
                    {p.category.name === 'Bánh' ? '🥐' : p.category.name === 'Trà' ? '🍵' : p.category.name === 'Đá xay' ? '🥤' : '☕'}
                  </div>
                  <h3 className="font-semibold leading-tight">{p.name}</h3>
                  <p className="tabular text-sm text-muted">
                    {formatVnd(p.price)}
                    {p.hasSize && p.priceL !== null && <span> · L {formatVnd(p.priceL)}</span>}
                  </p>
                  {p.hasSize && (
                    <div className="mt-2 flex gap-1" role="group" aria-label={`Chọn size ${p.name}`}>
                      {SIZES.map((s) => (
                        <Chip
                          key={s}
                          active={size === s}
                          onClick={() => setPickedSize((prev) => ({ ...prev, [p.id]: s }))}
                          className="flex-1 whitespace-nowrap px-1 py-1 text-xs"
                        >
                          {s === 'L' && menu.sizeSurcharge.L ? `L+${menu.sizeSurcharge.L / 1000}k` : s}
                        </Chip>
                      ))}
                    </div>
                  )}
                  <div className="mt-auto pt-2">
                    <Button variant="secondary" size="sm" className="w-full" onClick={() => addToCart(p)}>
                      + Thêm vào đơn
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* ---------- Giỏ hàng ---------- */}
      <aside className="flex flex-col rounded-xl border border-border bg-surface p-4 lg:sticky lg:top-18 lg:max-h-[calc(100vh-88px)]">
        <h2 className="text-lg font-bold">
          Đơn hiện tại <span className="text-sm font-normal text-muted">· {cart.length} món · {SOURCE_LABEL[source]}</span>
        </h2>
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ghi chú đơn (không bắt buộc)"
          aria-label="Ghi chú đơn"
          maxLength={200}
          className="mt-2 h-10"
        />

        <div className="mt-3 min-h-24 flex-1 space-y-2 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-background p-6 text-center text-sm text-muted">
              🛒 Chưa có món nào
              <br />
              Chọn món bên trái để thêm vào đơn
            </div>
          ) : (
            cart.map((l) => {
              const err = errors[l.key];
              return (
                <div key={l.key} className={`rounded-lg border p-3 ${err ? 'border-danger' : 'border-border'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold leading-tight">{l.product.name}</p>
                      <p className="text-xs text-muted">Size: {l.size ?? '—'} · {formatVnd(priceOf(l.product, l.size))}</p>
                    </div>
                    <button type="button" onClick={() => removeLine(l.key)} aria-label={`Xóa ${l.product.name}`} className="text-muted hover:text-danger">
                      ✕
                    </button>
                  </div>
                  <div className="mt-2 flex items-center gap-1">
                    <Button variant="secondary" size="sm" className="w-9 px-0" onClick={() => step(l.key, l.qty, -1)} aria-label="Giảm">
                      −
                    </Button>
                    <Input
                      value={l.qty}
                      onChange={(e) => setQty(l.key, e.target.value)}
                      inputMode="numeric"
                      aria-label={`Số lượng ${l.product.name}`}
                      invalid={!!err}
                      className="h-9 w-14 text-center"
                    />
                    <Button variant="secondary" size="sm" className="w-9 px-0" onClick={() => step(l.key, l.qty, 1)} aria-label="Tăng">
                      +
                    </Button>
                    <span className="tabular ml-auto font-semibold">
                      {err ? '—' : formatVnd(priceOf(l.product, l.size) * Number(l.qty))}
                    </span>
                  </div>
                  {err && <p className="mt-1 text-xs text-danger">⚠ {err}</p>}
                </div>
              );
            })
          )}
        </div>

        <div className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
          <div className="flex justify-between text-muted">
            <span>Tạm tính</span>
            <span className="tabular">{formatVnd(subtotal)}</span>
          </div>
          <div className="flex justify-between text-muted">
            <span>Phụ thu size L</span>
            <span className="tabular">{formatVnd(surcharge)}</span>
          </div>
          <div className="flex items-baseline justify-between border-t border-border pt-2">
            <span className="text-base font-bold">Tổng cộng</span>
            <span className="tabular text-2xl font-bold">{formatVnd(total)}</span>
          </div>
          <p className="text-xs text-muted">Tổng tạm tính trên máy — server tính lại khi lưu.</p>
        </div>

        {submitError && (
          <div className="mt-3">
            <Alert>
              ⚠ <b>{submitError.message}</b>
              {submitError.details && (
                <ul className="mt-1 list-disc pl-5">
                  {Object.entries(submitError.details).map(([k, v]) => (
                    <li key={k}>{v}</li>
                  ))}
                </ul>
              )}
            </Alert>
          </div>
        )}

        <Button size="lg" className="mt-3 w-full" disabled={!canPay} loading={saving} onClick={pay}>
          {saving ? 'Đang lưu đơn…' : `Thanh toán · ${formatVnd(total)}`}
        </Button>
        {cart.length > 0 && (
          <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={() => window.confirm('Hủy đơn đang làm?') && resetCart()} disabled={saving}>
            Hủy đơn
          </Button>
        )}
      </aside>

      <Modal
        open={sessionExpired}
        title="Phiên đăng nhập đã hết hạn"
        onClose={() => setSessionExpired(false)}
        footer={
          <Button onClick={() => router.push('/login?next=/checkout')}>Đăng nhập lại</Button>
        }
      >
        Vui lòng đăng nhập lại. Đơn đang làm được giữ lại sau khi đăng nhập.
      </Modal>
    </div>
  );
}
