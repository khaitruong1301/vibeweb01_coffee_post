import type { OrderStatus } from '../generated/prisma/enums';
import { canTransition, NEXT_STATUS, STATUS_LABEL } from './order-status';

const ALL: OrderStatus[] = ['pending', 'preparing', 'ready', 'done'];

describe('luồng pha chế (UC05)', () => {
  it('chỉ cho đi đúng bước kế tiếp', () => {
    expect(canTransition('pending', 'preparing')).toBe(true);
    expect(canTransition('preparing', 'ready')).toBe(true);
    expect(canTransition('ready', 'done')).toBe(true);
  });

  it('cấm nhảy bước, đi lùi, đứng yên và đi tiếp từ "done"', () => {
    const allowed = new Set(['pending>preparing', 'preparing>ready', 'ready>done']);
    for (const from of ALL) {
      for (const to of ALL) {
        expect(canTransition(from, to)).toBe(allowed.has(`${from}>${to}`));
      }
    }
    expect(NEXT_STATUS.done).toBeNull();
  });

  it('mọi trạng thái đều có nhãn tiếng Việt', () => {
    for (const s of ALL) expect(STATUS_LABEL[s]).toMatch(/\S/);
  });
});
