'use strict';

/**
 * WhatsAppClient.js
 * Manages the whatsapp-web.js client lifecycle.
 * Separated from business logic — only handles connection & event routing.
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode                = require('qrcode-terminal');
const logger                = require('../config/logger');
const MessageHandler        = require('./MessageHandler');

let client = null;

/**
 * Returns the singleton WhatsApp client instance.
 * Throws if not yet initialised.
 */
const getClient = () => {
  if (!client) throw new Error('WhatsApp client not yet initialised');
  return client;
};

/**
 * Initialise the WhatsApp client.
 * - LocalAuth persists session to disk → survives restarts.
 * - Puppeteer args are tuned for Docker/VPS environments.
 */
const initBot = async () => {
  logger.info('Initialising WhatsApp client…');

  client = new Client({
    authStrategy: new LocalAuth({
      dataPath: process.env.SESSION_PATH || './.wwebjs_auth',
    }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
      ],
    },
    // Re-try on auth failure
    restartOnAuthFail: true,
  });

  // ── QR Code ─────────────────────────────────────────────────────────────────
  client.on('qr', (qr) => {
    logger.info('QR Code generated — scan with WhatsApp:');
    qrcode.generate(qr, { small: true });
  });

  // ── Ready ────────────────────────────────────────────────────────────────────
  client.on('ready', () => {
    logger.info(`✅ WhatsApp bot connected as: ${client.info?.wid?.user}`);
  });

  // ── Auth failure ─────────────────────────────────────────────────────────────
  client.on('auth_failure', (msg) => {
    logger.error('WhatsApp auth failure:', msg);
  });

  // ── Disconnected ─────────────────────────────────────────────────────────────
  client.on('disconnected', (reason) => {
    logger.warn('WhatsApp disconnected:', reason);
    // Attempt re-initialise after 10 s
    setTimeout(() => {
      logger.info('Attempting WhatsApp reconnect…');
      client.initialize().catch(err => logger.error('Reconnect failed:', err));
    }, 10_000);
  });

  // ── Incoming messages ────────────────────────────────────────────────────────
  client.on('message', async (message) => {
    // Ignore group messages and status broadcasts
    if (message.isGroupMsg || message.from === 'status@broadcast') return;

    try {
      await MessageHandler.handle(message, client);
    } catch (err) {
      logger.error(`Error handling message from ${message.from}:`, err);
      try {
        await message.reply(
          '⚠️ An unexpected error occurred. Please try again or type *menu* to start over.'
        );
      } catch (_) { /* silent */ }
    }
  });

  // ── Message ACK (delivery confirmation) ─────────────────────────────────────
  client.on('message_ack', (msg, ack) => {
    // ack: 1=sent, 2=delivered, 3=read
    if (ack < 2) {
      logger.debug(`Message ${msg.id.id} not yet delivered (ack=${ack})`);
    }
  });

  await client.initialize();
  return client;
};

module.exports = { initBot, getClient };
