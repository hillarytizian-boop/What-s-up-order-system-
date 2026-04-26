'use strict';

/**
 * seed.js — Populate the database with sample products and an admin user.
 * Run: node scripts/seed.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Product  = require('../src/models/Product');
const User     = require('../src/models/User');
const logger   = require('../src/config/logger');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp_order_bot';

const PRODUCTS = [
  // Food
  { code: '1',  name: 'Classic Beef Burger',    price: 350, category: 'food',     description: 'Juicy beef patty with fresh veggies', sortOrder: 1 },
  { code: '2',  name: 'Chicken Sandwich',        price: 280, category: 'food',     description: 'Crispy chicken fillet with mayo',     sortOrder: 2 },
  { code: '3',  name: 'Veggie Wrap',             price: 220, category: 'food',     description: 'Fresh vegetables in a tortilla',      sortOrder: 3 },
  { code: '4',  name: 'Beef Pizza (8")',         price: 550, category: 'food',     description: 'Loaded with beef and mozzarella',     sortOrder: 4 },
  { code: '5',  name: 'Grilled Chicken Salad',   price: 300, category: 'food',     description: 'Light and healthy option',            sortOrder: 5 },
  // Drinks
  { code: '6',  name: 'Coca-Cola (500ml)',       price:  80, category: 'drinks',   description: 'Ice cold',                            sortOrder: 1 },
  { code: '7',  name: 'Mango Juice',             price: 120, category: 'drinks',   description: 'Freshly blended',                     sortOrder: 2 },
  { code: '8',  name: 'Mineral Water',           price:  50, category: 'drinks',   description: '500ml chilled',                       sortOrder: 3 },
  { code: '9',  name: 'Iced Coffee',             price: 180, category: 'drinks',   description: 'Espresso over ice with milk',         sortOrder: 4 },
  // Snacks
  { code: '10', name: 'Fries (Regular)',         price: 150, category: 'snacks',   description: 'Golden and crispy',                   sortOrder: 1 },
  { code: '11', name: 'Onion Rings',             price: 170, category: 'snacks',   description: 'Battered and fried',                  sortOrder: 2 },
  { code: '12', name: 'Chicken Wings (6pc)',     price: 400, category: 'snacks',   description: 'Spicy or BBQ flavour',                sortOrder: 3 },
  // Desserts
  { code: '13', name: 'Chocolate Lava Cake',    price: 250, category: 'desserts', description: 'Warm with vanilla ice cream',         sortOrder: 1 },
  { code: '14', name: 'Vanilla Ice Cream',      price: 150, category: 'desserts', description: '2 scoops',                            sortOrder: 2 },
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    logger.info('Connected to MongoDB');

    // Clear existing products
    await Product.deleteMany({});
    logger.info('Cleared existing products');

    // Insert products
    const products = await Product.insertMany(PRODUCTS);
    logger.info(`✅ Inserted ${products.length} products`);

    // Ensure admin user exists
    const adminPhone = (process.env.ADMIN_NUMBERS || '254700000000').split(',')[0].trim();
    const admin = await User.findOrCreate(adminPhone, 'Admin');
    if (admin.role !== 'admin') {
      admin.role = 'admin';
      await admin.save();
    }
    logger.info(`✅ Admin user: ${admin.phone}`);

    logger.info('\n🎉 Seed complete! You can now start the server.\n');
    process.exit(0);
  } catch (err) {
    logger.error('Seed failed:', err);
    process.exit(1);
  }
}

seed();
