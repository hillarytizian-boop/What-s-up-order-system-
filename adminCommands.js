'use strict';

/**
 * adminCommands.js
 * Admin-only WhatsApp commands (prefix: !)
 *
 *  !help              — list admin commands
 *  !orders            — list pending/active orders
 *  !order <id>        — view order detail
 *  !status <id> <s>   — manually set status
 *  !complete <id>     — mark order delivered
 *  !cancel <id>       — cancel order
 *  !stats             — daily stats
 *  !addproduct        — guided product addition flow
 *  !products          — list all products
 *  !toggle <name>     — toggle product availability
 *  !broadcast <msg>   — send msg to all users (use carefully!)
 */

const OrderService   = require('../../services/orderService');
const ProductService = require('../../services/productService');
const UserService    = require('../../services/userService');
const SessionManager = require('../../sessions/SessionManager');
const { formatOrderStatus, formatAdminOrderList } = require('../../utils/formatters');
const { ORDER_STATUS, CURRENCY_SYMBOL }            = require('../../config/constants');
const logger = require('../../config/logger');

const reply = (msg, text) => msg.reply(text);

const handle = async (message, client, admin, session) => {
  const body  = message.body.trim();
  const parts = body.split(/\s+/);
  const cmd   = parts[0].toLowerCase(); // e.g. !orders
  const args  = parts.slice(1);

  switch (cmd) {
    case '!help':       return cmdHelp(message);
    case '!orders':     return cmdOrders(message, args);
    case '!order':      return cmdOrderDetail(message, args[0]);
    case '!complete':   return cmdComplete(message, args[0], admin);
    case '!cancel':     return cmdCancelOrder(message, args[0], admin);
    case '!status':     return cmdSetStatus(message, args[0], args[1], admin);
    case '!stats':      return cmdStats(message);
    case '!products':   return cmdProducts(message);
    case '!toggle':     return cmdToggle(message, args.join(' '));
    case '!addproduct': return cmdAddProduct(message, admin.phone, args, session);
    case '!broadcast':  return cmdBroadcast(message, client, args.join(' '));
    default:
      return reply(message, `❓ Unknown admin command: ${cmd}\nType *!help* for the list.`);
  }
};

// ── Commands ─────────────────────────────────────────────────────────────────

const cmdHelp = (message) =>
  reply(message,
    `🔧 *Admin Commands*\n\n` +
    `*Orders:*\n` +
    `• !orders [status] — List orders (e.g. !orders pending)\n` +
    `• !order <ID>      — View order details\n` +
    `• !complete <ID>   — Mark order as delivered\n` +
    `• !cancel <ID>     — Cancel an order\n` +
    `• !status <ID> <s> — Set status manually\n\n` +
    `*Products:*\n` +
    `• !products        — List all products\n` +
    `• !toggle <name>   — Toggle availability\n` +
    `• !addproduct      — Add a new product\n\n` +
    `*Reports:*\n` +
    `• !stats           — Today's summary\n\n` +
    `*Other:*\n` +
    `• !broadcast <msg> — Message all users`
  );

const cmdOrders = async (message, args) => {
  const filterStatus = args[0] || null;
  const validStatuses = Object.values(ORDER_STATUS);

  if (filterStatus && !validStatuses.includes(filterStatus)) {
    return reply(message, `⚠️ Invalid status. Valid: ${validStatuses.join(', ')}`);
  }

  const orders = await OrderService.listOrders({ status: filterStatus, limit: 20 });
  if (!orders.length) {
    return reply(message, `📋 No ${filterStatus || ''} orders found.`);
  }

  return reply(message, formatAdminOrderList(orders));
};

const cmdOrderDetail = async (message, orderId) => {
  if (!orderId) return reply(message, '⚠️ Usage: !order <OrderID>');

  const order = await OrderService.findByOrderId(orderId.toUpperCase());
  if (!order) return reply(message, `❌ Order *${orderId}* not found.`);

  return reply(message, formatOrderStatus(order, true));
};

const cmdComplete = async (message, orderId, admin) => {
  if (!orderId) return reply(message, '⚠️ Usage: !complete <OrderID>');
  return updateOrderStatus(message, orderId, ORDER_STATUS.DELIVERED, admin, 'Marked as delivered by admin');
};

const cmdCancelOrder = async (message, orderId, admin) => {
  if (!orderId) return reply(message, '⚠️ Usage: !cancel <OrderID>');
  return updateOrderStatus(message, orderId, ORDER_STATUS.CANCELLED, admin, 'Cancelled by admin');
};

const cmdSetStatus = async (message, orderId, status, admin) => {
  if (!orderId || !status) return reply(message, '⚠️ Usage: !status <OrderID> <status>');
  const validStatuses = Object.values(ORDER_STATUS);
  if (!validStatuses.includes(status)) {
    return reply(message, `⚠️ Invalid status. Valid: ${validStatuses.join(', ')}`);
  }
  return updateOrderStatus(message, orderId, status, admin, `Status set to '${status}' by admin`);
};

const updateOrderStatus = async (message, orderId, newStatus, admin, note) => {
  try {
    const { order, customer } = await OrderService.updateStatus(orderId.toUpperCase(), newStatus, note);

    await reply(message,
      `✅ Order *${order.orderId}* → *${newStatus.toUpperCase()}*\n` +
      `Customer: ${customer?.name} (${customer?.phone})`
    );

    // Notify customer via WhatsApp
    try {
      const { getClient } = require('../WhatsAppClient');
      const client = getClient();
      const statusEmoji = {
        confirmed: '✅', preparing: '👨‍🍳', ready: '🎉',
        delivered: '📦', cancelled: '❌',
      }[newStatus] || '📋';

      await client.sendMessage(
        `${customer.phone}@c.us`,
        `${statusEmoji} *Order Update*\n\n` +
        `Your order *${order.orderId}* is now *${newStatus.toUpperCase()}*.\n\n` +
        `${newStatus === 'delivered' ? '🎉 Thank you for your order!' : ''}`
      );
    } catch (notifyErr) {
      logger.warn('Could not notify customer:', notifyErr.message);
    }

  } catch (err) {
    logger.error('Status update error:', err);
    return reply(message, `❌ Error: ${err.message}`);
  }
};

const cmdStats = async (message) => {
  try {
    const summary = await OrderService.getSummary();
    const sym = CURRENCY_SYMBOL;

    return reply(message,
      `📊 *Dashboard Summary*\n\n` +
      `*Today:*\n` +
      `• Orders: ${summary.today.count}\n` +
      `• Revenue: ${sym} ${(summary.today.revenue || 0).toFixed(2)}\n\n` +
      `*All Time:*\n` +
      `• Total Orders: ${summary.overall.count}\n` +
      `• Total Revenue: ${sym} ${(summary.overall.revenue || 0).toFixed(2)}\n\n` +
      `*By Status:*\n` +
      Object.entries(summary.byStatus)
        .map(([s, c]) => `• ${s}: ${c}`)
        .join('\n')
    );
  } catch (err) {
    logger.error('Stats error:', err);
    return reply(message, '❌ Could not load stats.');
  }
};

const cmdProducts = async (message) => {
  const products = await ProductService.listAll();
  if (!products.length) return reply(message, '📦 No products in database.');

  const lines = products.map(p =>
    `${p.isAvailable ? '🟢' : '🔴'} *${p.name}* (${p.code || '—'}) — ${CURRENCY_SYMBOL} ${p.price.toFixed(2)} [${p.category}]`
  );

  return reply(message, `📦 *All Products (${products.length}):*\n\n${lines.join('\n')}`);
};

const cmdToggle = async (message, name) => {
  if (!name) return reply(message, '⚠️ Usage: !toggle <product name>');

  try {
    const product = await ProductService.toggleAvailability(name);
    const status  = product.isAvailable ? '🟢 Available' : '🔴 Unavailable';
    return reply(message, `✅ *${product.name}* → ${status}`);
  } catch (err) {
    return reply(message, `❌ ${err.message}`);
  }
};

const cmdAddProduct = async (message, adminPhone, args, session) => {
  // Simple guided flow via session state
  // For brevity, accept JSON in one message: !addproduct {"name":"...","price":...,"category":"..."}
  const jsonStr = args.join(' ');
  if (!jsonStr) {
    return reply(message,
      `⚠️ Usage: !addproduct {"name":"Burger","price":350,"category":"food","description":"Beef burger"}\n\n` +
      `Categories: food, drinks, snacks, desserts, other`
    );
  }
  try {
    const data    = JSON.parse(jsonStr);
    const product = await ProductService.create(data);
    return reply(message,
      `✅ Product added!\n\n` +
      `*${product.name}* | ${CURRENCY_SYMBOL} ${product.price} | ${product.category}\n` +
      `Code: ${product.code}`
    );
  } catch (err) {
    return reply(message, `❌ Error: ${err.message}`);
  }
};

const cmdBroadcast = async (message, client, text) => {
  if (!text) return reply(message, '⚠️ Usage: !broadcast <your message>');

  try {
    const users     = await UserService.getAllActive();
    let   sentCount = 0;

    for (const user of users) {
      try {
        await client.sendMessage(`${user.phone}@c.us`, `📢 *Announcement:*\n\n${text}`);
        sentCount++;
        // Throttle to avoid WhatsApp spam detection
        await new Promise(r => setTimeout(r, 1500));
      } catch (_) { /* skip failed sends */ }
    }

    return reply(message, `✅ Broadcast sent to ${sentCount}/${users.length} users.`);
  } catch (err) {
    logger.error('Broadcast error:', err);
    return reply(message, `❌ Broadcast failed: ${err.message}`);
  }
};

module.exports = { handle };
