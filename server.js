import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import sqlite from 'better-sqlite3';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const db = new sqlite('restaurant.db');
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_change_me';

// --- Create tables ---
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT,
        role TEXT DEFAULT 'customer',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        table_id INTEGER,
        items TEXT,
        total REAL,
        status TEXT DEFAULT 'pending',
        payment_method TEXT DEFAULT 'table',
        customer_note TEXT,
        location_lat REAL,
        location_lng REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    );
    CREATE TABLE IF NOT EXISTS menu (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        category TEXT,
        price REAL,
        description TEXT,
        image TEXT,
        available INTEGER DEFAULT 1
    );
`);

// --- Seed menu if empty ---
const menuCount = db.prepare('SELECT COUNT(*) as count FROM menu').get();
if (menuCount.count === 0) {
    const insert = db.prepare('INSERT INTO menu (name, category, price, description, image) VALUES (?, ?, ?, ?, ?)');
    const items = [
        ['Classic Smash Burger', 'burgers', 14.99, 'Double patty, aged cheddar, special sauce', '/images/burger.jpg'],
        ['BBQ Bacon Stack', 'burgers', 17.99, 'Triple patty, BBQ sauce, bacon, jalapeños', '/images/burger.jpg'],
        ['Vegan Garden Burger', 'burgers', 13.99, 'Black bean patty, avocado, arugula', '/images/burger.jpg'],
        ['Margherita Classica', 'pizza', 16.99, 'San Marzano tomatoes, fresh mozzarella', '/images/pizza.jpg'],
        ['Truffle Mushroom', 'pizza', 19.99, 'Wild mushrooms, truffle cream, fontina', '/images/pizza.jpg'],
        ['Spicy Nduja', 'pizza', 18.99, 'Calabrian nduja, stracciatella, honey', '/images/pizza.jpg'],
        ['Fettuccine Alfredo', 'pasta', 15.99, 'Creamy parmesan sauce, grilled chicken', '/images/pasta.jpg'],
        ['Spaghetti Cacio e Pepe', 'pasta', 13.99, 'Pecorino Romano, black pepper', '/images/pasta.jpg'],
        ['Penne Arrabbiata', 'pasta', 12.99, 'Spicy tomato, garlic, chili', '/images/pasta.jpg'],
        ['Caesar Royale', 'salads', 11.99, 'Romaine, parmesan, croutons', '/images/salad.jpg'],
        ['Mediterranean Bowl', 'salads', 12.99, 'Quinoa, feta, olives, cucumber', '/images/salad.jpg'],
        ['Chocolate Lava Cake', 'desserts', 8.99, 'Warm molten cake, vanilla ice cream', '/images/dessert.jpg'],
        ['Tiramisu Classico', 'desserts', 7.99, 'Mascarpone, espresso, cocoa', '/images/dessert.jpg'],
        ['Craft Lemonade', 'drinks', 4.99, 'Fresh lemonade, lavender or strawberry', '/images/drinks.jpg'],
        ['Espresso Martini', 'drinks', 12.99, 'Vodka, espresso, Kahlúa', '/images/drinks.jpg']
    ];
    for (const item of items) insert.run(...item);
}

// --- Seed admin and staff users if no users exist ---
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
if (userCount.count === 0) {
    const adminHash = bcrypt.hashSync('admin123', 10);
    const staffHash = bcrypt.hashSync('staff123', 10);
    const insertUser = db.prepare('INSERT INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)');
    insertUser.run('admin-1', 'admin@tablebite.com', adminHash, 'Admin', 'admin');
    insertUser.run('staff-1', 'staff@tablebite.com', staffHash, 'Staff User', 'staff');
    console.log('Admin and staff users seeded.');
}

// --- Middleware ---
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api/', limiter);

function generateToken(userId, email) {
    return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '7d' });
}

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access token required' });
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid or expired token' });
        req.user = user;
        next();
    });
}

function requireStaff(req, res, next) {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.user.userId);
    if (!user || (user.role !== 'admin' && user.role !== 'staff')) return res.status(403).json({ error: 'Staff access required' });
    next();
}

function requireAdmin(req, res, next) {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.user.userId);
    if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    next();
}

// --- Public API ---
app.get('/api/menu', (req, res) => {
    const items = db.prepare('SELECT * FROM menu WHERE available = 1').all();
    res.json(items);
});

// --- Auth endpoints ---
app.post('/api/auth/register', async (req, res) => {
    const { email, password, name } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    try {
        const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (existing) return res.status(409).json({ error: 'Email already registered' });
        const hashed = await bcrypt.hash(password, 10);
        const userId = uuidv4();
        db.prepare('INSERT INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)').run(userId, email, hashed, name || '', 'customer');
        const token = generateToken(userId, email);
        res.json({ success: true, token, user: { id: userId, email, name, role: 'customer' } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Registration failed' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });
    const token = generateToken(user.id, user.email);
    res.json({ success: true, token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
    const user = db.prepare('SELECT id, email, name, role FROM users WHERE id = ?').get(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
});

// --- Order endpoints (fixed) ---
app.post('/api/orders', authenticateToken, (req, res) => {
    try {
        const { items, total, paymentMethod, customerNote, locationLat, locationLng, tableId } = req.body;
        const userId = req.user.userId;
        const orderId = uuidv4().substring(0, 8).toUpperCase();
        const stmt = db.prepare(`INSERT INTO orders (id, user_id, table_id, items, total, payment_method, customer_note, location_lat, location_lng)
                                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        stmt.run(orderId, userId, tableId || null, JSON.stringify(items), total, paymentMethod || 'table', customerNote || '', locationLat || null, locationLng || null);
        res.json({ success: true, orderId });
    } catch (err) {
        console.error('Order creation error:', err);
        res.status(500).json({ error: 'Failed to create order', details: err.message });
    }
});

app.get('/api/orders/my', authenticateToken, (req, res) => {
    const orders = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC').all(req.user.userId);
    res.json(orders);
});

app.get('/api/orders/:id', (req, res) => {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
});

// --- Staff endpoints ---
app.get('/api/staff/orders', authenticateToken, requireStaff, (req, res) => {
    const orders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
    res.json(orders);
});

app.put('/api/staff/orders/:id/status', authenticateToken, requireStaff, (req, res) => {
    const { status } = req.body;
    const allowed = ['pending', 'preparing', 'ready', 'completed'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const stmt = db.prepare('UPDATE orders SET status = ? WHERE id = ?');
    stmt.run(status, req.params.id);
    res.json({ success: true });
});

// --- Admin full CRUD for menu ---
app.get('/api/admin/menu', authenticateToken, requireAdmin, (req, res) => {
    const items = db.prepare('SELECT * FROM menu').all();
    res.json(items);
});

app.post('/api/admin/menu', authenticateToken, requireAdmin, (req, res) => {
    const { name, category, price, description, image, available } = req.body;
    if (!name || !category || !price) return res.status(400).json({ error: 'Missing required fields' });
    const stmt = db.prepare('INSERT INTO menu (name, category, price, description, image, available) VALUES (?, ?, ?, ?, ?, ?)');
    const info = stmt.run(name, category, price, description, image || '/images/default.jpg', available !== undefined ? (available ? 1 : 0) : 1);
    res.json({ success: true, id: info.lastInsertRowid });
});

app.put('/api/admin/menu/:id', authenticateToken, requireAdmin, (req, res) => {
    const { name, category, price, description, image, available } = req.body;
    const stmt = db.prepare('UPDATE menu SET name = ?, category = ?, price = ?, description = ?, image = ?, available = ? WHERE id = ?');
    stmt.run(name, category, price, description, image, available ? 1 : 0, req.params.id);
    res.json({ success: true });
});

app.delete('/api/admin/menu/:id', authenticateToken, requireAdmin, (req, res) => {
    const stmt = db.prepare('DELETE FROM menu WHERE id = ?');
    stmt.run(req.params.id);
    res.json({ success: true });
});

// --- Admin user management ---
app.get('/api/admin/users', authenticateToken, requireAdmin, (req, res) => {
    const users = db.prepare('SELECT id, email, name, role FROM users').all();
    res.json(users);
});

app.put('/api/admin/users/:id/role', authenticateToken, requireAdmin, (req, res) => {
    const { role } = req.body;
    if (!['customer', 'staff', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
    const stmt = db.prepare('UPDATE users SET role = ? WHERE id = ?');
    stmt.run(role, req.params.id);
    res.json({ success: true });
});

app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, (req, res) => {
    if (req.params.id === req.user.userId) return res.status(400).json({ error: 'Cannot delete your own account' });
    const stmt = db.prepare('DELETE FROM users WHERE id = ?');
    stmt.run(req.params.id);
    res.json({ success: true });
});

// --- Serve static frontend ---
app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));

// --- TEMPORARY DEBUG: list all orders (no auth) - REMOVE AFTER TESTING ---
app.get('/api/debug/orders', (req, res) => {
    const orders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
    res.json(orders);
});
