'use strict';

const mongoose = require('mongoose');
const logger   = require('./logger');

const MONGO_URI = process.env.NODE_ENV === 'production'
  ? process.env.MONGODB_URI_PROD
  : process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp_order_bot';

const options = {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS:         45000,
  maxPoolSize:             10,
};

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected. Attempting reconnect…');
});

mongoose.connection.on('error', (err) => {
  logger.error('MongoDB connection error:', err);
});

const connectDB = async () => {
  await mongoose.connect(MONGO_URI, options);
};

module.exports = connectDB;
