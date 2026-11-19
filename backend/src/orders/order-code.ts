/** Mã đơn in trên hóa đơn: CP-000123 (suy ra từ id, không lưu riêng để không bao giờ lệch). */
export function orderCode(id: number): string {
  return `CP-${String(id).padStart(6, '0')}`;
}

export function parseOrderCode(code: string): number | null {
  const m = /^CP-(\d{1,10})$/i.exec(code.trim());
  if (!m) return null;
  const id = Number(m[1]);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
