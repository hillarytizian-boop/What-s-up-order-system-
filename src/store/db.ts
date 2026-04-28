import { MenuItem, Order, Admin, Session } from '../types';
import { hashPassword, generateId, generateTOTPSecret } from '../utils/security';

const KEYS = {
  MENU: 'tb_menu',
  ORDERS: 'tb_orders',
  ADMINS: 'tb_admins',
  SESSION: 'tb_session',
};

export const menuDB = {
  getAll(): MenuItem[] {
    try { return JSON.parse(localStorage.getItem(KEYS.MENU) || '[]'); }
    catch { return []; }
  },
  save(items: MenuItem[]) {
    localStorage.setItem(KEYS.MENU, JSON.stringify(items));
  },
  getById(id: string): MenuItem | undefined {
    return this.getAll().find(m => m.id === id);
  },
  upsert(item: MenuItem): void {
    const all = this.getAll();
    const idx = all.findIndex(m => m.id === item.id);
    if (idx >= 0) all[idx] = item; else all.push(item);
    this.save(all);
  },
  delete(id: string): void {
    this.save(this.getAll().filter(m => m.id !== id));
  },
};

export const orderDB = {
  getAll(): Order[] {
    try { return JSON.parse(localStorage.getItem(KEYS.ORDERS) || '[]'); }
    catch { return []; }
  },
  save(orders: Order[]) {
    localStorage.setItem(KEYS.ORDERS, JSON.stringify(orders));
  },
  getById(id: string): Order | undefined {
    return this.getAll().find(o => o.id === id);
  },
  create(order: Order): void {
    const all = this.getAll();
    all.unshift(order);
    this.save(all);
  },
  updateStatus(id: string, status: Order['status']): Order | null {
    const all = this.getAll();
    const idx = all.findIndex(o => o.id === id);
    if (idx < 0) return null;
    all[idx] = { ...all[idx], status, updatedAt: new Date().toISOString() };
    this.save(all);
    return all[idx];
  },
};
