'use strict';

module.exports = {
  // Order statuses (immutable state machine)
  ORDER_STATUS: Object.freeze({
    PENDING:    'pending',
    CONFIRMED:  'confirmed',
    PREPARING:  'preparing',
    READY:      'ready',
    DELIVERED:  'delivered',
    CANCELLED:  'cancelled',
  }),

  // Valid transitions: key → allowed next states
  ORDER_TRANSITIONS: Object.freeze({
    pending:   ['confirmed', 'cancelled'],
    confirmed: ['preparing', 'cancelled'],
    preparing: ['ready', 'cancelled'],
    ready:     ['delivered'],
    delivered: [],
    cancelled: [],
  }),

  // User session flow states
  SESSION_STATE: Object.freeze({
    IDLE:          'idle',
    BROWSING:      'browsing',
    ORDERING:      'ordering',
    SELECTING_ITEM:'selecting_item',
    ADDING_QTY:    'adding_qty',
    CHECKOUT:      'checkout',
    AWAITING_MPESA:'awaiting_mpesa',
  }),

  // Product categories
  PRODUCT_CATEGORY: Object.freeze({
    FOOD:      'food',
    DRINKS:    'drinks',
    SNACKS:    'snacks',
    DESSERTS:  'desserts',
    OTHER:     'other',
  }),

  // Currency
  CURRENCY_SYMBOL: process.env.CURRENCY_SYMBOL || 'KSh',

  // Bot
  BOT_NAME:          process.env.BOT_NAME            || 'OrderBot',
  ORDER_ID_PREFIX:   process.env.ORDER_ID_PREFIX      || 'ORD',
  SESSION_TIMEOUT:   Number(process.env.SESSION_TIMEOUT_MINUTES || 30) * 60 * 1000,
  MAX_CART_ITEMS:    Number(process.env.MAX_CART_ITEMS || 20),

  // Roles
  ROLE: Object.freeze({
    USER:  'user',
    ADMIN: 'admin',
  }),

  // HTTP status helpers
  HTTP: Object.freeze({
    OK:         200,
    CREATED:    201,
    BAD_REQUEST:400,
    UNAUTHORIZED:401,
    FORBIDDEN:  403,
    NOT_FOUND:  404,
    CONFLICT:   409,
    SERVER_ERR: 500,
  }),
};
