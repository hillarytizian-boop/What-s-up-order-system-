'use strict';

/**
 * WhatsApp Order Bot — Server Entry Point
 * Bootstraps Express API and WhatsApp bot concurrently
 */

require('dotenv').config();
const app        = require('./src/app');
const connectDB  = require('./src/config/database');
const logger     = require('./src/config/logger');
const { initBot } = require('./src/bot/WhatsAppClient');

const PORT = process.env.PORT || 3000;

(async () => {
  try {
    // 1. Connect to MongoDB
    await connectDB();
    logger.info('✅ MongoDB connected');

    // 2. Start Express REST API
    const server = app.listen(PORT, () => {
      logger.info(`✅ REST API running on port ${PORT} [${process.env.NODE_ENV}]`);
    });

    // 3. Initialise WhatsApp bot (non-blocking)
    initBot().catch(err => {
      logger.error('WhatsApp bot failed to initialise:', err);
    });

    // --- Graceful shutdown ---
    const shutdown = async (signal) => {
      logger.info(`${signal} received. Shutting down gracefully…`);
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));

  } catch (err) {
    logger.error('Fatal startup error:', err);
    process.exit(1);
  }
})();
