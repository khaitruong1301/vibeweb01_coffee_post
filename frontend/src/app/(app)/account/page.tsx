'use client';

import { useState, type FormEvent } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { Alert, Button, Field, Input } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { ROLE_LABEL } from '@/lib/format';

type Fields = 'currentPassword' | 'newPassword' | 'confirm';

/** Khớp ChangePasswordDto ở backend; server kiểm tra lại (kể cả: khác mật khẩu cũ, không chứa tên đăng nhập, không phổ biến). */
function validate(v: Record<Fields, string>): Partial<Record<Fields, string>> {
  const e: Partial<Record<Fields, string>> = {};
  if (!v.currentPassword) e.currentPassword = 'Vui lòng nhập mật khẩu hiện tại';
  if (v.newPassword.length < 8) e.newPassword = 'Mật khẩu mới tối thiểu 8 ký tự';
  else if (!/[A-Za-zÀ-ỹ]/.test(v.newPassword) || !/\d/.test(v.newPassword)) e.newPassword = 'Mật khẩu mới phải có cả chữ và số';
  else if (v.newPassword === v.currentPassword) e.newPassword = 'Mật khẩu mới phải khác mật khẩu hiện tại';
  if (v.confirm !== v.newPassword) e.confirm = 'Nhập lại chưa khớp mật khẩu mới';
  return e;
}

/** UC01 — mọi nhân viên tự đổi mật khẩu. Thành công → server thu hồi phiên ở các thiết bị khác. */
export default function AccountPage() {
  const { user } = useAuth();
  const [values, setValues] = useState<Record<Fields, string>>({ currentPassword: '', newPassword: '', confirm: '' });
  const [touched, setTouched] = useState(false);
  const [serverErrors, setServerErrors] = useState<Partial<Record<Fields, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  // Chỉ lấy lỗi server còn hiệu lực — giá trị undefined không được đè mất lỗi kiểm tra phía client.
  const errors: Partial<Record<Fields, string>> = { ...(touched ? validate(values) : {}) };
  for (const [k, v] of Object.entries(serverErrors) as [Fields, string | undefined][]) if (v) errors[k] = v;
  const set = (k: Fields) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues({ ...values, [k]: e.target.value });
    setServerErrors((prev) => {
      const next = { ...prev };
      delete next[k];
      return next;
    });
    setDone(false);
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    setError(null);
    if (Object.keys(validate(values)).length) return;
    setSaving(true);
    try {
      await api('/auth/password', { method: 'PATCH', body: { currentPassword: values.currentPassword, newPassword: values.newPassword } });
      setDone(true);
      setTouched(false);
      setValues({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      if (err instanceof ApiError && err.details) setServerErrors(err.details as Partial<Record<Fields, string>>);
      else setError(err instanceof Error ? err.message : 'Không đổi được mật khẩu');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div>
        <h1 className="text-xl font-bold">Tài khoản</h1>
        <p className="text-sm text-muted">
          {user.fullName} · {user.username} · {ROLE_LABEL[user.role]}
        </p>
      </div>
      <form onSubmit={onSubmit} noValidate className="space-y-4 rounded-xl border border-border bg-surface p-5">
        <h2 className="font-bold">Đổi mật khẩu</h2>
        <Field label="Mật khẩu hiện tại" error={errors.currentPassword}>
          <Input type="password" autoComplete="current-password" value={values.currentPassword} onChange={set('currentPassword')} invalid={!!errors.currentPassword} />
        </Field>
        <Field label="Mật khẩu mới" error={errors.newPassword} hint="Tối thiểu 8 ký tự, có chữ và số; không chứa tên đăng nhập">
          <Input type="password" autoComplete="new-password" value={values.newPassword} onChange={set('newPassword')} invalid={!!errors.newPassword} />
        </Field>
        <Field label="Nhập lại mật khẩu mới" error={errors.confirm}>
          <Input type="password" autoComplete="new-password" value={values.confirm} onChange={set('confirm')} invalid={!!errors.confirm} />
        </Field>
        {error && <Alert>⚠ {error}</Alert>}
        {done && <Alert kind="success">✓ Đã đổi mật khẩu. Các thiết bị khác đang đăng nhập tài khoản này đã bị đăng xuất.</Alert>}
        <Button type="submit" loading={saving} className="w-full">
          Đổi mật khẩu
        </Button>
      </form>
    </div>
  );
}
