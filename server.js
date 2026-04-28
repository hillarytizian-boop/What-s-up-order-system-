import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import sqlite from 'better-sqlite3';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const db = new sqlite('restaurant.db');

db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        table_id INTEGER,
        customer_name TEXT,
        items TEXT,
        total REAL,
        status TEXT DEFAULT 'pending',
        payment_method TEXT DEFAULT 'table',
        customer_note TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS menu (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        category TEXT,
        price REAL,
        description TEXT,
        image TEXT,
        available INTEGER DEFAULT 1,
        popular INTEGER DEFAULT 0,
        spicy INTEGER DEFAULT 0,
        vegan INTEGER DEFAULT 0
    );
`);

const menuCount = db.prepare('SELECT COUNT(*) as count FROM menu').get();
if (menuCount.count === 0) {
    const insert = db.prepare('INSERT INTO menu (name, category, price, description, image) VALUES (?, ?, ?, ?, ?)');
    const items = [
        ['Classic Burger', 'burgers', 8.99, 'Beef patty, lettuce, tomato, cheese', '/images/burger.jpg'],
        ['Margherita Pizza', 'pizza', 12.99, 'Fresh mozzarella, basil, tomatoes', '/images/pizza.jpg'],
        ['Caesar Salad', 'salads', 7.99, 'Romaine, parmesan, croutons', '/images/salad.jpg'],
        ['Pasta Carbonara', 'pasta', 11.99, 'Creamy sauce, pancetta, egg', '/images/pasta.jpg'],
        ['Chocolate Cake', 'desserts', 5.99, 'Rich chocolate cake', '/images/dessert.jpg'],
        ['Coca Cola', 'drinks', 2.49, 'Regular soda', '/images/drinks.jpg']
    ];
    for (const item of items) insert.run(...item);
}

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api/', limiter);

app.get('/api/menu', (req, res) => {
    const items = db.prepare('SELECT * FROM menu WHERE available = 1').all();
    res.json(items);
});

app.post('/api/orders', (req, res) => {
    const { tableId, customerName, items, total, paymentMethod, customerNote } = req.body;
    const orderId = uuidv4().substring(0, 8).toUpperCase();
    const stmt = db.prepare(`INSERT INTO orders (id, table_id, customer_name, items, total, payment_method, customer_note)
                             VALUES (?, ?, ?, ?, ?, ?, ?)`);
    stmt.run(orderId, tableId, customerName, JSON.stringify(items), total, paymentMethod, customerNote);
    res.json({ success: true, orderId });
});

app.get('/api/orders/:id', (req, res) => {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
});

app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
