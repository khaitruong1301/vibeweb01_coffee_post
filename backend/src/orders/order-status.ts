import type { OrderStatus } from '../generated/prisma/enums';

/** UC05 — luồng pha chế một chiều: Chờ pha → Đang pha → Xong (chờ giao) → Đã giao. */
export const NEXT_STATUS: Record<OrderStatus, OrderStatus | null> = {
  pending: 'preparing',
  preparing: 'ready',
  ready: 'done',
  done: null,
};

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Chờ pha',
  preparing: 'Đang pha',
  ready: 'Xong — chờ giao',
  done: 'Đã giao',
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return NEXT_STATUS[from] === to;
}
