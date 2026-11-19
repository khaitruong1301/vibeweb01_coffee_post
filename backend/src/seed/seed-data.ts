import type { Role } from '../generated/prisma/enums';

/** Mật khẩu chung của mọi tài khoản demo. */
export const DEMO_PASSWORD = 'Coffee@123';

export const USERS: { username: string; fullName: string; role: Role }[] = [
  { username: 'chuquan', fullName: 'Chủ quán', role: 'admin' },
  { username: 'thungan1', fullName: 'Thu ngân Lan', role: 'cashier' },
  { username: 'thungan2', fullName: 'Thu ngân Hùng', role: 'cashier' },
  { username: 'thungan3', fullName: 'Thu ngân Mai', role: 'cashier' },
  { username: 'phache1', fullName: 'Pha chế Minh', role: 'barista' },
  { username: 'phache2', fullName: 'Pha chế Tú', role: 'barista' },
  { username: 'phache3', fullName: 'Pha chế Vy', role: 'barista' },
];

export const CATEGORIES = ['Cà phê', 'Trà', 'Đá xay', 'Bánh'];

export const PRODUCTS: { name: string; category: string; price: number; hasSize?: boolean; isActive?: boolean }[] = [
  { name: 'Cà phê đen đá', category: 'Cà phê', price: 25000 },
  { name: 'Cà phê sữa đá', category: 'Cà phê', price: 29000 },
  { name: 'Bạc xỉu', category: 'Cà phê', price: 32000 },
  { name: 'Americano', category: 'Cà phê', price: 35000 },
  { name: 'Cappuccino', category: 'Cà phê', price: 45000 },
  { name: 'Trà đào cam sả', category: 'Trà', price: 39000 },
  { name: 'Trà sữa trân châu', category: 'Trà', price: 35000 },
  { name: 'Trà vải', category: 'Trà', price: 39000 },
  { name: 'Cookie đá xay', category: 'Đá xay', price: 45000 },
  { name: 'Matcha đá xay', category: 'Đá xay', price: 49000 },
  { name: 'Bánh croissant', category: 'Bánh', price: 28000, hasSize: false },
  { name: 'Bánh tiramisu', category: 'Bánh', price: 35000, hasSize: false },
  { name: 'Sinh tố bơ', category: 'Đá xay', price: 45000, isActive: false },
];
