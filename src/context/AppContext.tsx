import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { MenuItem, CartItem, Order, Session, ToastMessage } from '../types';
import { menuDB, orderDB, sessionDB } from '../store/db';
import { generateId } from '../utils/security';

interface AppContextType {
  menuItems: MenuItem[];
  refreshMenu: () => void;
  cart: CartItem[];
  addToCart: (item: MenuItem, quantity?: number) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, qty: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
  orders: Order[];
  refreshOrders: () => void;
  getOrder: (id: string) => Order | undefined;
  session: Session | null;
  setSession: (s: Session | null) => void;
  logout: () => void;
  toasts: ToastMessage[];
  showToast: (type: ToastMessage['type'], message: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [session, setSessionState] = useState<Session | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const refreshMenu = useCallback(() => setMenuItems(menuDB.getAll()), []);
  const refreshOrders = useCallback(() => setOrders(orderDB.getAll()), []);
  const getOrder = useCallback((id: string) => orderDB.getById(id), []);

  useEffect(() => {
    refreshMenu();
    refreshOrders();
    const s = sessionDB.get();
    if (s) setSessionState(s);
  }, [refreshMenu, refreshOrders]);

  const showToast = useCallback((type: ToastMessage['type'], message: string) => {
    const id = generateId();
    setToasts(prev => [...prev, { id, type, message }]);
    const timer = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
      toastRef.current.delete(id);
    }, 4000);
    toastRef.current.set(id, timer);
  }, []);

  const addToCart = useCallback((item: MenuItem, quantity = 1) => {
    setCart(prev => {
      const existing = prev.find(c => c.menuItem.id === item.id);
      if (existing) {
        return prev.map(c => c.menuItem.id === item.id ? { ...c, quantity: c.quantity + quantity } : c);
      }
      return [...prev, { menuItem: item, quantity }];
    });
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    setCart(prev => prev.filter(c => c.menuItem.id !== itemId));
  }, []);

  const updateQuantity = useCallback((itemId: string, qty: number) => {
    if (qty <= 0) { removeFromCart(itemId); return; }
    setCart(prev => prev.map(c => c.menuItem.id === itemId ? { ...c, quantity: qty } : c));
  }, [removeFromCart]);

  const clearCart = useCallback(() => setCart([]), []);

  const cartTotal = cart.reduce((sum, c) => sum + c.menuItem.price * c.quantity, 0);
  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  const setSession = useCallback((s: Session | null) => {
    setSessionState(s);
    if (s) sessionDB.set(s); else sessionDB.clear();
  }, []);

  const logout = useCallback(() => {
    setSession(null);
    showToast('info', 'Logged out successfully');
  }, [setSession, showToast]);

  return (
    <AppContext.Provider value={{
      menuItems, refreshMenu,
      cart, addToCart, removeFromCart, updateQuantity, clearCart, cartTotal, cartCount,
      orders, refreshOrders, getOrder,
      session, setSession, logout,
      toasts, showToast,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
