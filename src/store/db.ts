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

export const adminDB = {
  getAll(): Admin[] {
    try { return JSON.parse(localStorage.getItem(KEYS.ADMINS) || '[]'); }
    catch { return []; }
  },
  save(admins: Admin[]) {
    localStorage.setItem(KEYS.ADMINS, JSON.stringify(admins));
  },
  getByUsername(username: string): Admin | undefined {
    return this.getAll().find(a => a.username.toLowerCase() === username.toLowerCase());
  },
  upsert(admin: Admin): void {
    const all = this.getAll();
    const idx = all.findIndex(a => a.id === admin.id);
    if (idx >= 0) all[idx] = admin; else all.push(admin);
    this.save(all);
  },
};

export const sessionDB = {
  get(): Session | null {
    try {
      const raw = sessionStorage.getItem(KEYS.SESSION);
      if (!raw) return null;
      const s: Session = JSON.parse(raw);
      if (Date.now() - s.createdAt > 8 * 60 * 60 * 1000) {
        this.clear();
        return null;
      }
      return s;
    } catch { return null; }
  },
  set(session: Session) {
    sessionStorage.setItem(KEYS.SESSION, JSON.stringify(session));
  },
  clear() {
    sessionStorage.removeItem(KEYS.SESSION);
  },
};

export async function seedDatabase() {
  if (menuDB.getAll().length === 0) {
    const menu: MenuItem[] = [
      { id: generateId(), name: 'Classic Smash Burger', description: 'Double smashed patty, aged cheddar, special sauce, pickles & crispy onions on a toasted brioche bun.', price: 14.99, category: 'burgers', image: '/images/burger.jpg', available: true, popular: true },
      { id: generateId(), name: 'BBQ Bacon Stack', description: 'Triple patty, smoky BBQ sauce, crispy bacon, caramelized onions, jalapeños & pepper jack cheese.', price: 17.99, category: 'burgers', image: '/images/burger.jpg', available: true, spicy: true },
      { id: generateId(), name: 'Vegan Garden Burger', description: 'House-made black bean patty, avocado, roasted peppers, arugula & chipotle aioli on a whole grain bun.', price: 13.99, category: 'burgers', image: '/images/burger.jpg', available: true, vegan: true },
      { id: generateId(), name: 'Margherita Classica', description: 'San Marzano tomatoes, fresh mozzarella di bufala, basil oil & sea salt on a slow-fermented Neapolitan crust.', price: 16.99, category: 'pizza', image: '/images/pizza.jpg', available: true, popular: true },
      { id: generateId(), name: 'Truffle Mushroom', description: 'Wild mushroom blend, truffle cream, fontina, thyme & aged parmesan on a golden crust.', price: 19.99, category: 'pizza', image: '/images/pizza.jpg', available: true },
      { id: generateId(), name: 'Spicy Nduja', description: 'Spicy Calabrian nduja, stracciatella, fresh basil & honey drizzle — fiery and rich.', price: 18.99, category: 'pizza', image: '/images/pizza.jpg', available: true, spicy: true },
      { id: generateId(), name: 'Fettuccine Alfredo', description: 'House-made fettuccine, 24-hour parmesan cream sauce, grilled chicken & fresh cracked pepper.', price: 15.99, category: 'pasta', image: '/images/pasta.jpg', available: true, popular: true },
      { id: generateId(), name: 'Spaghetti Cacio e Pepe', description: 'Authentic Roman-style spaghetti with Pecorino Romano, Parmigiano-Reggiano & Tellicherry pepper.', price: 13.99, category: 'pasta', image: '/images/pasta.jpg', available: true, vegan: false },
      { id: generateId(), name: 'Penne Arrabbiata', description: 'Spicy San Marzano tomato, garlic, chili flakes & fresh basil — a fiery Italian classic.', price: 12.99, category: 'pasta', image: '/images/pasta.jpg', available: true, spicy: true, vegan: true },
      { id: generateId(), name: 'Caesar Royale', description: 'Crisp romaine, house-made Caesar dressing, sourdough croutons, anchovies & aged parmesan.', price: 11.99, category: 'salads', image: '/images/salad.jpg', available: true },
      { id: generateId(), name: 'Mediterranean Bowl', description: 'Quinoa, roasted chickpeas, cucumber, cherry tomatoes, kalamata olives, feta & lemon-herb vinaigrette.', price: 12.99, category: 'salads', image: '/images/salad.jpg', available: true, vegan: true, popular: true },
      { id: generateId(), name: 'Chocolate Lava Cake', description: 'Warm dark chocolate molten cake, vanilla bean ice cream & fresh berry coulis.', price: 8.99, category: 'desserts', image: '/images/dessert.jpg', available: true, popular: true },
      { id: generateId(), name: 'Tiramisu Classico', description: 'Authentic Italian tiramisu with mascarpone cream, espresso-soaked ladyfingers & cocoa.', price: 7.99, category: 'desserts', image: '/images/dessert.jpg', available: true },
      { id: generateId(), name: 'Craft Lemonade', description: 'Fresh-squeezed lemonade with house-made lavender or strawberry syrup, served over crushed ice.', price: 4.99, category: 'drinks', image: '/images/drinks.jpg', available: true },
      { id: generateId(), name: 'Espresso Martini', description: 'Vodka, fresh espresso, Kahlúa & a touch of vanilla — shaken to silky perfection.', price: 12.99, category: 'drinks', image: '/images/drinks.jpg', available: true, popular: true },
      { id: generateId(), name: 'Sparkling Water', description: 'Chilled San Pellegrino sparkling mineral water, 750ml.', price: 3.99, category: 'drinks', image: '/images/drinks.jpg', available: true },
    ];
    menuDB.save(menu);
  }

  if (adminDB.getAll().length === 0) {
    const secret = generateTOTPSecret();
    const admin: Admin = {
      id: generateId(),
      username: 'admin',
      passwordHash: hashPassword('Admin@TableBite2024!'),
      twoFactorSecret: secret,
      twoFactorEnabled: true,
      role: 'admin',
    };
    const staff: Admin = {
      id: generateId(),
      username: 'staff',
      passwordHash: hashPassword('Staff@TableBite2024!'),
      twoFactorSecret: generateTOTPSecret(),
      twoFactorEnabled: true,
      role: 'staff',
    };
    adminDB.save([admin, staff]);
    console.log('%c[TableBite] Admin 2FA Secret (scan in Google Authenticator):', 'color: #f59e0b; font-weight: bold;');
    console.log('%c' + secret, 'color: #10b981; font-size: 1.2em;');
    console.log('%c[TableBite] TOTP Auth URL:', 'color: #f59e0b; font-weight: bold;');
    const url = `otpauth://totp/TableBite:admin?secret=${secret}&issuer=TableBite&algorithm=SHA1&digits=6&period=30`;
    console.log('%c' + url, 'color: #6366f1;');
    console.log('%c[TableBite] Admin credentials: admin / Admin@TableBite2024!', 'color: #3b82f6;');
  }
}
