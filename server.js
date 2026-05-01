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
        available INTEGER DEFAULT 1
    );
`);

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
    stmt.run(orderId, tableId || null, customerName || 'Guest', JSON.stringify(items), total, paymentMethod || 'table', customerNote || '');
    res.json({ success: true, orderId });
});

app.get('/api/orders/:id', (req, res) => {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
});

// Serve static files from 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// All other routes go to index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
