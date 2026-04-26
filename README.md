# 🤖 WhatsApp Order Bot

> Production-ready WhatsApp ordering system built with Node.js, whatsapp-web.js, Express, and MongoDB.
> Architected as a scalable SaaS product with clean separation of concerns.

---

## 📐 Architecture

```
whatsapp-order-bot/
├── server.js                    ← Bootstrap (DB + Express + Bot)
├── src/
│   ├── app.js                   ← Express setup (middleware, routes)
│   ├── bot/
│   │   ├── WhatsAppClient.js    ← WA client singleton + lifecycle events
│   │   ├── MessageHandler.js    ← Central message router
│   │   └── commands/
│   │       ├── userCommands.js  ← Customer conversational flow
│   │       └── adminCommands.js ← Admin ! commands
│   ├── config/
│   │   ├── database.js          ← MongoDB connection
│   │   ├── logger.js            ← Winston logger
│   │   └── constants.js         ← App-wide enums & config
│   ├── controllers/             ← REST request handlers
│   ├── middleware/
│   │   ├── auth.js              ← JWT auth + admin guard
│   │   ├── errorHandler.js      ← Global error handler
│   │   ├── rateLimiter.js       ← Route-level rate limits
│   │   └── validator.js         ← express-validator rules
│   ├── models/                  ← Mongoose schemas
│   ├── routes/                  ← Express route definitions
│   ├── services/                ← Business logic layer
│   │   ├── orderService.js
│   │   ├── productService.js
│   │   ├── cartService.js
│   │   ├── userService.js
│   │   ├── mpesaService.js      ← M-Pesa Daraja integration
│   │   └── notificationService.js
│   ├── sessions/
│   │   └── SessionManager.js    ← In-memory cart/state (Redis-ready)
│   └── utils/
│       └── formatters.js        ← WhatsApp message templates
├── scripts/
│   └── seed.js                  ← Database seeder
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

---

## 🚀 Quick Start (Local)

### Prerequisites
- Node.js ≥ 18
- MongoDB (local or Atlas)
- A real WhatsApp account for the bot

### 1. Clone & install
```bash
git clone https://github.com/yourname/whatsapp-order-bot.git
cd whatsapp-order-bot
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env — set MONGODB_URI and ADMIN_NUMBERS at minimum
```

### 3. Seed the database
```bash
npm run seed
```

### 4. Start the server
```bash
npm run dev        # development (nodemon)
# or
npm start          # production
```

### 5. Scan the QR code
The terminal will print a QR code. Open WhatsApp on your phone → Linked Devices → Link a Device → scan.

---

## 🐳 Docker (Recommended for Production)

```bash
# 1. Copy and configure environment
cp .env.example .env

# 2. Build & start all services
docker-compose up -d

# 3. Check logs for QR code
docker-compose logs -f app

# 4. Scan QR code with WhatsApp

# 5. Seed the database (first time only)
docker-compose exec app node scripts/seed.js
```

---

## 📱 Bot Commands (Customer)

| Command | Description |
|---------|-------------|
| `hi` / `hello` | Welcome message |
| `menu` | Browse products |
| `order` | Start placing an order |
| `cart` | View current cart |
| `checkout` | Review and confirm order |
| `track <OrderID>` | Real-time order status |
| `my orders` | List last 5 orders |
| `cancel` | Reset current action |
| `help` | Show all commands |

**Example ordering flow:**
```
User:  order
Bot:   [shows menu with numbered items]
User:  1
Bot:   Classic Beef Burger — how many?
User:  2
Bot:   Added 2x Classic Beef Burger ✅
User:  6
Bot:   Coca-Cola — how many?
User:  1
Bot:   Added 1x Coca-Cola ✅
User:  checkout
Bot:   [shows cart summary + total]
User:  YES
Bot:   Order placed! ID: ORD-2024-AB1C2D
```

---

## 🔧 Admin Commands (WhatsApp)

Admin numbers are set in `ADMIN_NUMBERS` in `.env`.

| Command | Description |
|---------|-------------|
| `!help` | List admin commands |
| `!orders` | List all orders |
| `!orders pending` | Filter by status |
| `!order ORD-2024-XXX` | View order details |
| `!complete ORD-2024-XXX` | Mark delivered |
| `!cancel ORD-2024-XXX` | Cancel order |
| `!status ORD-2024-XXX preparing` | Set any status |
| `!stats` | Today's revenue summary |
| `!products` | List all products |
| `!toggle Chicken Sandwich` | Toggle availability |
| `!addproduct {"name":"New Item","price":200,"category":"food"}` | Add product |
| `!broadcast Your message here` | Message all users |

---

## 🌐 REST API

Base URL: `http://localhost:3000/api`

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Login with phone + password → JWT |

### Products (Public menu, Admin CRUD)
| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/products/menu` | None |
| GET | `/products` | JWT |
| POST | `/products` | Admin |
| PATCH | `/products/:id` | Admin |
| DELETE | `/products/:id` | Admin |
| PATCH | `/products/:id/toggle` | Admin |

### Orders
| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/orders` | Admin |
| GET | `/orders/my` | User |
| GET | `/orders/summary` | Admin |
| GET | `/orders/:id` | User (own) |
| PATCH | `/orders/:id/status` | Admin |

### Payments
| Method | Endpoint | Auth |
|--------|----------|------|
| POST | `/payments/mpesa/stk` | User |
| POST | `/payments/mpesa/callback` | None (Safaricom) |

### Bot Control
| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/bot/status` | Admin |
| GET | `/bot/sessions` | Admin |
| DELETE | `/bot/sessions/:phone` | Admin |

---

## 🏗️ Scaling & Production

### Horizontal Scaling
The session store in `SessionManager.js` uses `node-cache` (in-process).
To scale across multiple instances, swap it for **Redis**:

```js
// src/sessions/SessionManager.js
const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL);

// get: redis.get(phone)
// set: redis.setex(phone, TTL, JSON.stringify(session))
```

### WhatsApp Business API Migration
When volume grows, migrate from `whatsapp-web.js` to the official **Cloud API**:
- Replace `WhatsAppClient.js` with Cloud API webhook handler
- All business logic in `services/` stays unchanged
- `MessageHandler.js` routing stays unchanged

### Environment Variables for Production
```env
NODE_ENV=production
MONGODB_URI_PROD=mongodb+srv://...
JWT_SECRET=<64-char random string>
ADMIN_NUMBERS=254712345678
```

---

## 🚀 Deploy on Render

1. Push to GitHub
2. Create a new **Web Service** on Render
3. Set Build Command: `npm install`
4. Set Start Command: `npm start`
5. Add all environment variables from `.env.example`
6. Add a **MongoDB** instance (MongoDB Atlas free tier)
7. Check logs for the QR code, scan it

---

## 🚀 Deploy on VPS (Ubuntu)

```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
npm install -g pm2

# Clone and setup
git clone https://github.com/yourname/whatsapp-order-bot.git
cd whatsapp-order-bot
npm install
cp .env.example .env
# Edit .env

# Start with PM2
pm2 start server.js --name whatsapp-bot
pm2 save
pm2 startup

# View logs (including QR code)
pm2 logs whatsapp-bot
```

---

## 📄 License

MIT — build something great.
