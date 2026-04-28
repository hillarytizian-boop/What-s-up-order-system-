export type Category = 'burgers' | 'pizza' | 'pasta' | 'salads' | 'desserts' | 'drinks';

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: Category;
  image: string;
  available: boolean;
  popular?: boolean;
  spicy?: boolean;
  vegan?: boolean;
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  notes?: string;
}

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed';
export type PaymentMethod = 'table' | 'pickup';

export interface OrderItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

export interface Order {
  id: string;
  tableId: number;
  items: OrderItem[];
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  total: number;
  createdAt: string;
  updatedAt: string;
  customerNote?: string;
}

export interface Admin {
  id: string;
  username: string;
  passwordHash: string;
  twoFactorSecret: string;
  twoFactorEnabled: boolean;
  role: 'admin' | 'staff';
}

export interface Session {
  adminId: string;
  username: string;
  role: 'admin' | 'staff';
  createdAt: number;
  twoFactorVerified: boolean;
}

export interface RateLimitEntry {
  attempts: number;
  firstAttempt: number;
  lockedUntil?: number;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}
