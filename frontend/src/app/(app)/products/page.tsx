'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRequireRole } from '@/components/AuthProvider';
import { Alert, Button, Chip, Field, Input, Modal, Spinner } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { formatDateTime, formatVnd } from '@/lib/format';
import type { Category, Product, ProductList, Size } from '@/lib/types';

/** Khớp kiểm tra ở backend (CreateProductDto). Server vẫn kiểm tra lại. */
const MIN_PRICE = 1000;
const MAX_PRICE = 1_000_000;

interface FormState {
  name: string;
  categoryId: string;
  price: string;
  hasSize: boolean;
  isActive: boolean;
}

const EMPTY: FormState = { name: '', categoryId: '', price: '', hasSize: true, isActive: true };

function validate(f: FormState): Partial<Record<keyof FormState, string>> {
  const e: Partial<Record<keyof FormState, string>> = {};
  if (!f.name.trim()) e.name = 'Tên món không được trống';
  if (!f.categoryId) e.categoryId = 'Vui lòng chọn danh mục';
  const price = f.price.replace(/[.\s]/g, '');
  if (!/^\d+$/.test(price)) e.price = 'Giá phải là số nguyên lớn hơn 0 (đơn vị đồng)';
  else if (Number(price) < MIN_PRICE) e.price = `Giá tối thiểu ${formatVnd(MIN_PRICE)}`;
  else if (Number(price) > MAX_PRICE) e.price = `Giá tối đa ${formatVnd(MAX_PRICE)}`;
  return e;
}

/** UC06 — Chủ quán: danh sách món, thêm món, sửa giá, ẩn/hiện. */
export default function ProductsPage() {
  const allowed = useRequireRole(['admin']);
  const [data, setData] = useState<ProductList | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const [editing, setEditing] = useState<Product | 'new' | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [list, cats] = await Promise.all([api<ProductList>('/products?all=true'), api<Category[]>('/categories')]);
      setData(list);
      setCategories(cats);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được danh sách món');
    }
  }, []);

  useEffect(() => {
    if (!allowed) return;
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [allowed, load]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.items ?? []).filter(
      (p) =>
        (!q || p.name.toLowerCase().includes(q)) &&
        (filter === 'all' || (filter === 'active' ? p.isActive : !p.isActive)),
    );
  }, [data, search, filter]);

  function openForm(p: Product | 'new') {
    setEditing(p);
    setTouched(false);
    setSaveError(null);
    setForm(
      p === 'new'
        ? { ...EMPTY, categoryId: categories[0] ? String(categories[0].id) : '' }
        : { name: p.name, categoryId: String(p.category.id), price: String(p.price), hasSize: p.hasSize, isActive: p.isActive },
    );
  }

  const errors = validate(form);
  const priceNum = Number(form.price.replace(/[.\s]/g, ''));
  const priceValid = !errors.price;
  const surchargeL = data?.sizeSurcharge.L ?? 0;
  const oldPrice = editing && editing !== 'new' ? editing.price : null;

  async function save() {
    setTouched(true);
    if (Object.keys(errors).length || !editing) return;
    setSaving(true);
    setSaveError(null);
    const body = {
      name: form.name.trim(),
      categoryId: Number(form.categoryId),
      price: priceNum,
      hasSize: form.hasSize,
      isActive: form.isActive,
    };
    try {
      if (editing === 'new') await api('/products', { method: 'POST', body });
      else await api(`/products/${editing.id}`, { method: 'PATCH', body });
      setNotice(editing === 'new' ? `Đã thêm món "${body.name}"` : `Đã cập nhật "${body.name}"`);
      setEditing(null);
      await load();
    } catch (e) {
      setSaveError(e instanceof ApiError && e.status === 409 ? 'Tên món đã tồn tại' : e instanceof Error ? e.message : 'Không lưu được');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(p: Product) {
    try {
      await api(`/products/${p.id}`, { method: 'PATCH', body: { isActive: !p.isActive } });
      setNotice(`${p.isActive ? 'Đã ẩn' : 'Đã mở bán lại'} "${p.name}"`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không cập nhật được');
    }
  }

  if (!allowed) return null;

  const preview = (size: Size, qty: number) => (priceNum + (size === 'L' && form.hasSize ? surchargeL : 0)) * qty;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">
          Sản phẩm <span className="text-base font-normal text-muted">· {data?.items.length ?? 0} món</span>
        </h1>
        <Button onClick={() => openForm('new')} disabled={!categories.length}>
          + Thêm món
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 Tìm theo tên món…" aria-label="Tìm món" className="h-10 w-full sm:w-72" />
        {(['all', 'active', 'inactive'] as const).map((f) => (
          <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>
            {{ all: 'Tất cả', active: 'Đang bán', inactive: 'Ngừng bán' }[f]}
          </Chip>
        ))}
      </div>

      {notice && (
        <div onClick={() => setNotice(null)}>
          <Alert kind="success">✓ {notice}</Alert>
        </div>
      )}
      {error && <Alert>⚠ {error}</Alert>}

      {!data ? (
        !error && <Spinner label="Đang tải danh sách món…" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-secondary text-left">
              <tr>
                <th className="px-4 py-3">Tên món</th>
                <th className="px-4 py-3">Danh mục</th>
                <th className="px-4 py-3 text-right">Giá S / M</th>
                <th className="px-4 py-3 text-right">Giá size L</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Sửa lần cuối</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted">
                    Không có món phù hợp.
                  </td>
                </tr>
              )}
              {rows.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-4 py-3 font-semibold">{p.name}</td>
                  <td className="px-4 py-3">{p.category.name}</td>
                  <td className="tabular px-4 py-3 text-right">{formatVnd(p.price)}</td>
                  <td className="tabular px-4 py-3 text-right text-muted">{p.priceL !== null ? formatVnd(p.priceL) : '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        p.isActive ? 'bg-success text-white' : 'bg-secondary text-foreground'
                      }`}
                    >
                      {p.isActive ? 'Đang bán' : 'Ngừng bán'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {formatDateTime(p.updatedAt)}
                    {p.updatedBy && ` · ${p.updatedBy.fullName}`}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Button variant="secondary" size="sm" onClick={() => openForm(p)}>
                      ✎ Sửa
                    </Button>{' '}
                    <Button variant="ghost" size="sm" onClick={() => toggleActive(p)}>
                      {p.isActive ? 'Ẩn' : 'Mở bán'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={editing !== null}
        title={editing === 'new' ? 'Thêm món' : `Sửa món: ${editing?.name ?? ''}`}
        onClose={() => !saving && setEditing(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)} disabled={saving}>
              Hủy
            </Button>
            <Button onClick={save} loading={saving} disabled={touched && Object.keys(errors).length > 0}>
              Lưu
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Tên món *" error={touched ? errors.name : undefined}>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={100} invalid={touched && !!errors.name} />
          </Field>
          <Field label="Danh mục *" error={touched ? errors.categoryId : undefined}>
            <select
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              className="h-11 w-full rounded-lg border border-border bg-surface px-3"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Giá bán (size S / M) *"
              error={touched || form.price ? errors.price : undefined}
              hint={
                oldPrice !== null && priceValid && priceNum !== oldPrice
                  ? `Giá cũ: ${formatVnd(oldPrice)} · ${priceNum > oldPrice ? 'tăng' : 'giảm'} ${formatVnd(Math.abs(priceNum - oldPrice))}`
                  : undefined
              }
            >
              <Input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} inputMode="numeric" invalid={!!form.price && !!errors.price} />
            </Field>
            <Field label="Giá size L (tự tính)">
              <Input value={form.hasSize && priceValid ? formatVnd(priceNum + surchargeL) : '—'} disabled readOnly />
            </Field>
          </div>
          <div className="flex flex-wrap gap-6 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.hasSize} onChange={(e) => setForm({ ...form, hasSize: e.target.checked })} className="size-4" />
              Có chọn size (S / M / L)
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="size-4" />
              Đang bán
            </label>
          </div>
          {priceValid && (
            <div className="tabular rounded-lg bg-secondary p-3 text-sm">
              <p className="font-semibold">Xem thử tính tiền</p>
              <p>1 ly size M = {formatVnd(preview('M', 1))}</p>
              {form.hasSize && (
                <p>
                  2 ly size L = 2 × ({formatVnd(priceNum)} + {formatVnd(surchargeL)}) = <b>{formatVnd(preview('L', 2))}</b>
                </p>
              )}
              <p>
                50 ly size M = <b>{formatVnd(preview('M', 50))}</b>
              </p>
              <p className="mt-1 text-xs text-muted">Áp dụng cho đơn tạo sau khi lưu; đơn cũ giữ giá cũ.</p>
            </div>
          )}
          {saveError && <Alert>⚠ {saveError}</Alert>}
        </div>
      </Modal>
    </div>
  );
}
