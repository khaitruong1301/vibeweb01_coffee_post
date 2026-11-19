'use client';

import {
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary-hover disabled:bg-muted/40',
  secondary: 'bg-surface text-foreground border border-border hover:bg-secondary disabled:text-muted',
  ghost: 'text-foreground hover:bg-secondary disabled:text-muted',
  danger: 'bg-danger text-white hover:opacity-90 disabled:opacity-40',
};

const SIZES = { sm: 'h-9 px-3 text-sm', md: 'h-11 px-4', lg: 'h-14 px-6 text-lg' } as const;

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: keyof typeof SIZES; loading?: boolean }) {
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    >
      {loading && <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  );
}

/**
 * Nhãn + ô nhập + lỗi/gợi ý. Lỗi nằm NGOÀI <label> (để tên đọc của ô chỉ là nhãn) và được nối với ô
 * qua aria-describedby — trình đọc màn hình đọc "Giá bán, ô nhập, Giá tối thiểu 1.000đ".
 */
export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: ReactNode; children: ReactNode }) {
  const msgId = useId();
  const msg = error ?? hint;
  const control = isValidElement<{ 'aria-describedby'?: string }>(children) && msg
    ? cloneElement(children, { 'aria-describedby': msgId })
    : children;
  return (
    <div>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">{label}</span>
        {control}
      </label>
      {msg && (
        <span id={msgId} role={error ? 'alert' : undefined} className={`mt-1 block text-sm ${error ? 'text-danger' : 'text-muted'}`}>
          {msg}
        </span>
      )}
    </div>
  );
}

export function Input({ invalid, className = '', ...props }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      {...props}
      aria-invalid={invalid || undefined}
      className={`h-11 rounded-lg border bg-surface px-3 outline-none focus:ring-2 focus:ring-primary/40 disabled:bg-secondary ${
        /(^|\s)([a-z]+:)?w-/.test(className) ? '' : 'w-full'
      } ${
        invalid ? 'border-danger bg-danger/5' : 'border-border'
      } ${className}`}
    />
  );
}

export function Chip({ active, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      {...props}
      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-surface hover:bg-secondary'
      } ${className}`}
    />
  );
}

export function Alert({ kind = 'error', children }: { kind?: 'error' | 'success' | 'info'; children: ReactNode }) {
  const cls = {
    error: 'border-danger/40 bg-danger/5 text-danger',
    success: 'border-success/40 bg-success/5 text-success',
    info: 'border-border bg-secondary text-foreground',
  }[kind];
  return (
    <div role={kind === 'error' ? 'alert' : 'status'} className={`rounded-lg border px-4 py-3 text-sm ${cls}`}>
      {children}
    </div>
  );
}

export function Modal({ open, title, onClose, children, footer }: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl bg-surface shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Đóng" className="text-2xl leading-none text-muted hover:text-foreground">
            ×
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-border px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function Spinner({ label = 'Đang tải…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-muted">
      <span className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      {label}
    </div>
  );
}
