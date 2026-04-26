'use strict';

/**
 * formatters.js
 * WhatsApp message templates.
 * WhatsApp uses *bold*, _italic_, ~strikethrough~ for formatting.
 */

const { CURRENCY_SYMBOL } = require('../config/constants');
const SYM = CURRENCY_SYMBOL || 'KSh';

// ── Menu ─────────────────────────────────────────────────────────────────────

const CATEGORY_EMOJI = {
  food:     '🍔',
  drinks:   '🥤',
  snacks:   '🍟',
  desserts: '🍰',
  other:    '📦',
};

/**
 * Format the full menu grouped by category.
 * @param {Object} grouped — { category: [product, …], … }
 */
const formatMenu = (grouped) => {
  const botName = process.env.BOT_NAME || 'OrderBot';
  const lines   = [`🛍️ *${botName} Menu*\n`];

  for (const [category, products] of Object.entries(grouped)) {
    const emoji = CATEGORY_EMOJI[category] || '📦';
    lines.push(`${emoji} *${category.toUpperCase()}*`);
    for (const p of products) {
      lines.push(`  ${p.code || '•'}) ${p.name} — *${SYM} ${p.price.toFixed(2)}*`);
      if (p.description) lines.push(`     _${p.description}_`);
    }
    lines.push('');
  }

  lines.push('✏️ Type an item number or name to order.');
  return lines.join('\n');
};

// ── Cart ─────────────────────────────────────────────────────────────────────

/**
 * Format a cart for display.
 * @param {Array} cart — session cart items
 */
const formatCart = (cart) => {
  if (!cart.length) return '🛒 Your cart is empty.';

  const lines = ['🛒 *Your Cart:*\n'];
  let   total = 0;

  for (const item of cart) {
    lines.push(
      `• ${item.quantity}x *${item.name}*\n` +
      `  ${SYM} ${item.price.toFixed(2)} × ${item.quantity} = *${SYM} ${item.subtotal.toFixed(2)}*`
    );
    total += item.subtotal;
  }

  lines.push(`\n💰 *Total: ${SYM} ${total.toFixed(2)}*`);
  return lines.join('\n');
};

// ── Order Confirmation ────────────────────────────────────────────────────────

const formatOrderConfirmation = (order) => {
  const lines = [
    `✅ *Order Placed Successfully!*\n`,
    `📋 Order ID: *${order.orderId}*`,
    `🕐 Status:   *PENDING*\n`,
    `*Items:*`,
  ];

  for (const item of order.items) {
    lines.push(`  • ${item.quantity}x ${item.name} — ${SYM} ${item.subtotal.toFixed(2)}`);
  }

  lines.push(`\n💰 *Total: ${SYM} ${order.total.toFixed(2)}*`);
  lines.push(`\nTo check your order, type: *track ${order.orderId}*`);
  lines.push(`\nThank you for your order! 🙏`);

  return lines.join('\n');
};

// ── Order Status ─────────────────────────────────────────────────────────────

const STATUS_EMOJI = {
  pending:   '⏳',
  confirmed: '✅',
  preparing: '👨‍🍳',
  ready:     '🎉',
  delivered: '📦',
  cancelled: '❌',
};

/**
 * Format order status for customer (and optionally admin detail).
 */
const formatOrderStatus = (order, adminDetail = false) => {
  const emoji = STATUS_EMOJI[order.status] || '📋';
  const user  = order.user || {};

  const lines = [
    `${emoji} *Order ${order.orderId}*`,
    `Status: *${order.status.toUpperCase()}*`,
    `Date:   ${new Date(order.createdAt).toLocaleString()}`,
  ];

  if (adminDetail) {
    lines.push(`Customer: ${user.name || '—'} (${user.phone || order.userPhone})`);
  }

  lines.push(`\n*Items:*`);
  for (const item of order.items) {
    lines.push(`  • ${item.quantity}x ${item.name} — ${SYM} ${item.subtotal.toFixed(2)}`);
  }
  lines.push(`\n💰 Total: *${SYM} ${order.total.toFixed(2)}*`);

  if (order.timeline?.length) {
    const last = order.timeline[order.timeline.length - 1];
    if (last.note) lines.push(`\n_${last.note}_`);
  }

  return lines.join('\n');
};

// ── Admin Order List ──────────────────────────────────────────────────────────

const formatAdminOrderList = (orders) => {
  const lines = [`📋 *Orders (${orders.length}):*\n`];
  for (const o of orders) {
    const user = o.user || {};
    const emoji = STATUS_EMOJI[o.status] || '📋';
    lines.push(
      `${emoji} *${o.orderId}*\n` +
      `   ${user.name || '—'} | ${SYM} ${o.total.toFixed(2)} | ${o.status.toUpperCase()}\n` +
      `   ${new Date(o.createdAt).toLocaleDateString()}`
    );
  }
  return lines.join('\n');
};

module.exports = {
  formatMenu,
  formatCart,
  formatOrderConfirmation,
  formatOrderStatus,
  formatAdminOrderList,
};
