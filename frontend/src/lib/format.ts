// Hiển thị tiền / ngày giờ thống nhất. Server lưu UTC; giao diện luôn hiển thị giờ Việt Nam.
const TZ = 'Asia/Ho_Chi_Minh';

export function formatVnd(n: number): string {
  return `${n.toLocaleString('vi-VN')}đ`;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('vi-VN', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
}

export const SOURCE_LABEL = { counter: 'Tại quầy', grabfood: 'GrabFood', shopeefood: 'ShopeeFood' } as const;
export const ROLE_LABEL = { cashier: 'Thu ngân', barista: 'Pha chế', admin: 'Chủ quán' } as const;
