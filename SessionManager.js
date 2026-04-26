'use strict';

/**
 * SessionManager.js
 * In-memory session store for WhatsApp user state (cart, flow position, etc.)
 * Each session key = phone number.
 *
 * For horizontal scaling, swap the Map for Redis:
 *   const redis = require('ioredis');
 *   and implement the same get/set/update/reset API.
 */

const NodeCache = require('node-cache');
const { SESSION_STATE, SESSION_TIMEOUT } = require('../config/constants');
const logger    = require('../config/logger');

// TTL in seconds; after this the session expires (user starts fresh)
const TTL_SECONDS = Math.floor(SESSION_TIMEOUT / 1000) || 1800;

const cache = new NodeCache({
  stdTTL:      TTL_SECONDS,
  checkperiod: 120,       // clean up expired keys every 2 min
  useClones:   false,     // we manage immutability ourselves
});

cache.on('expired', (key) => {
  logger.debug(`Session expired: ${key}`);
});

/**
 * Default session shape
 */
const defaultSession = () => ({
  state:          SESSION_STATE.IDLE,
  cart:           [],         // [{ id, code, name, price, quantity, subtotal }]
  products:       [],         // snapshot of available products for current ordering flow
  pendingProduct: null,       // product being quantity-selected
  lastActivity:   Date.now(),
});

const SessionManager = {
  /**
   * Get session for a phone number. Creates a fresh session if not found.
   */
  get(phone) {
    const session = cache.get(phone);
    if (!session) {
      const fresh = defaultSession();
      cache.set(phone, fresh);
      return fresh;
    }
    // Reset TTL on access
    cache.ttl(phone, TTL_SECONDS);
    session.lastActivity = Date.now();
    return session;
  },

  /**
   * Merge updates into an existing session (upsert).
   */
  update(phone, updates) {
    const session = this.get(phone);
    Object.assign(session, updates, { lastActivity: Date.now() });
    cache.set(phone, session, TTL_SECONDS);
    return session;
  },

  /**
   * Completely reset a session to default.
   */
  reset(phone) {
    const fresh = defaultSession();
    cache.set(phone, fresh, TTL_SECONDS);
    logger.debug(`Session reset: ${phone}`);
    return fresh;
  },

  /**
   * Delete a session (logout / block).
   */
  delete(phone) {
    cache.del(phone);
  },

  /**
   * Return all active sessions (for debugging).
   */
  all() {
    return cache.keys().map(k => ({ phone: k, session: cache.get(k) }));
  },

  /**
   * Session count — useful for monitoring.
   */
  count() {
    return cache.keys().length;
  },
};

module.exports = SessionManager;
