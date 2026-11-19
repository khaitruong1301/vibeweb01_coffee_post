// Kiểu dữ liệu khớp phản hồi của backend NestJS (.claude/docs/api/README.md).
export type Role = 'cashier' | 'barista' | 'admin';
export type Size = 'S' | 'M' | 'L';
export type OrderSource = 'counter' | 'grabfood' | 'shopeefood';
export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'done';

export interface User {
  id: number;
  username: string;
  fullName: string;
  role: Role;
}

export interface Category {
  id: number;
  name: string;
}

export interface Product {
  id: number;
  name: string;
  category: Category;
  price: number;
  priceL: number | null;
  hasSize: boolean;
  isActive: boolean;
  imageUrl: string | null;
  updatedAt: string;
  updatedBy: { id: number; fullName: string } | null;
}

export interface ProductList {
  items: Product[];
  sizeSurcharge: Record<Size, number>;
}

export interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  size: Size | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  note: string | null;
}

export interface Order {
  id: number;
  code: string;
  source: OrderSource;
  partnerCode: string | null;
  note: string | null;
  status: OrderStatus;
  statusLabel: string;
  total: number;
  createdAt: string;
  cashier: { id: number; fullName: string };
  items: OrderItem[];
}
