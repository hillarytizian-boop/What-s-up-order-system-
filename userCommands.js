'use strict';

/**
 * userCommands.js
 * All customer-facing conversational flows:
 *   menu, order, track, checkout, cart, cancel, help
 */

const SessionManager  = require('../../sessions/SessionManager');
const ProductService  = require('../../services/productService');
const OrderService    = require('../../services/orderService');
const CartService     = require('../../services/cartService');
const { formatMenu, formatCart, formatOrderStatus, formatOrderConfirmation } = require('../../utils/formatters');
const { SESSION_STATE, MAX_CART_ITEMS, CURRENCY_SYMBOL } = require('../../config/constants');
const logger          = require('../../config/logger');

// ── Helpers ──────────────────────────────────────────────────────────────────

const reply = (message, text) => message.reply(text);

const unknownCommand = (message) =>
  reply(message,
    `🤖 I didn't understand that.\n\n` +
    `Type one of the following:\n` +
    `• *menu* — Browse our products\n` +
    `• *order* — Start ordering\n` +
    `• *cart* — View your cart\n` +
    `• *checkout* — Place your order\n` +
    `• *track <OrderID>* — Check order status\n` +
    `• *cancel* — Cancel current action\n` +
    `• *help* — Show this message`
  );

// ── Main dispatcher ──────────────────────────────────────────────────────────

const handle = async (message, client, user, session) => {
  const phone = user.phone;
  const body  = message.body.trim().toLowerCase();

  // --- Cancel always resets state ---
  if (body === 'cancel' || body === 'exit' || body === 'quit') {
    SessionManager.reset(phone);
    return reply(message, '✅ Action cancelled. Type *menu* or *order* to continue.');
  }

  // --- Context-aware dispatch based on session state ---
  switch (session.state) {
    case SESSION_STATE.ORDERING:
    case SESSION_STATE.SELECTING_ITEM:
      return handleItemSelection(message, phone, body, session);

    case SESSION_STATE.ADDING_QTY:
      return handleQuantityInput(message, phone, body, session);

    case SESSION_STATE.CHECKOUT:
      return handleCheckoutConfirm(message, client, phone, user, body, session);

    default:
      return dispatchCommand(message, client, user, phone, body, session);
  }
};

// ── Top-level command dispatcher ─────────────────────────────────────────────

const dispatchCommand = async (message, client, user, phone, body, session) => {
  // track <orderId>
  if (body.startsWith('track')) {
    const parts   = body.split(/\s+/);
    const orderId = parts[1];
    return cmdTrack(message, orderId, user);
  }

  switch (body) {
    case 'hi':
    case 'hello':
    case 'start':
      return cmdGreet(message, user);
    case 'menu':
      return cmdMenu(message);
    case 'order':
      return cmdOrder(message, phone, session);
    case 'cart':
      return cmdCart(message, phone, session);
    case 'checkout':
      return cmdCheckout(message, phone, user, session);
    case 'orders':
    case 'my orders':
      return cmdMyOrders(message, user);
    case 'help':
      return unknownCommand(message);
    default:
      return unknownCommand(message);
  }
};

// ── Command implementations ──────────────────────────────────────────────────

const cmdGreet = async (message, user) => {
  const name = user.name || 'there';
  return reply(message,
    `👋 Hello *${name}*! Welcome to *${process.env.BOT_NAME || 'OrderBot'}* 🛒\n\n` +
    `What would you like to do?\n\n` +
    `• Type *menu* to see our products\n` +
    `• Type *order* to start ordering\n` +
    `• Type *track <OrderID>* to check your order\n` +
    `• Type *help* for all commands`
  );
};

const cmdMenu = async (message) => {
  const grouped = await ProductService.getMenuGrouped();
  const text    = formatMenu(grouped);
  await reply(message, text);
  await reply(message, '👆 Type *order* to start placing your order!');
};

const cmdOrder = async (message, phone, session) => {
  const products = await ProductService.getAvailable();
  if (!products.length) {
    return reply(message, '😔 No products available right now. Check back soon!');
  }

  // Store product list in session for quick lookup
  SessionManager.update(phone, {
    state:    SESSION_STATE.SELECTING_ITEM,
    products: products.map(p => ({ id: p._id.toString(), code: p.code, name: p.name, price: p.price })),
  });

  const grouped = await ProductService.getMenuGrouped();
  const menuText = formatMenu(grouped);
  await reply(message, menuText);
  await reply(message, '✏️ *Type the item number or name* to add it to your cart.\nType *cart* to review, *checkout* to place order, or *cancel* to stop.');
};

const handleItemSelection = async (message, phone, body, session) => {
  const products = session.products || [];
  if (!products.length) {
    SessionManager.reset(phone);
    return reply(message, '⚠️ Session expired. Type *order* to start again.');
  }

  // Find product by code or partial name
  const match = products.find(p =>
    p.code === body ||
    p.name.toLowerCase().includes(body) ||
    p.name.toLowerCase() === body
  );

  if (!match) {
    return reply(message,
      `❓ I couldn't find "*${body}*".\n` +
      `Please type the item number/name exactly as shown, or type *menu* to see the list again.`
    );
  }

  // Ask for quantity
  SessionManager.update(phone, {
    state:           SESSION_STATE.ADDING_QTY,
    pendingProduct:  match,
  });

  return reply(message,
    `🛒 *${match.name}* — ${CURRENCY_SYMBOL} ${match.price.toFixed(2)}\n\n` +
    `How many would you like? (Enter a number, e.g. *2*)`
  );
};

const handleQuantityInput = async (message, phone, body, session) => {
  const qty = parseInt(body, 10);

  if (isNaN(qty) || qty < 1 || qty > 99) {
    return reply(message, '⚠️ Please enter a valid quantity (1–99).');
  }

  const product = session.pendingProduct;
  if (!product) {
    SessionManager.reset(phone);
    return reply(message, '⚠️ Session expired. Type *order* to start again.');
  }

  // Add to cart
  const cart    = session.cart || [];
  const cartLen = cart.reduce((s, i) => s + i.quantity, 0);

  if (cartLen + qty > MAX_CART_ITEMS) {
    return reply(message,
      `⚠️ Cart limit is ${MAX_CART_ITEMS} items. You currently have ${cartLen}.\n` +
      `Type *cart* to review or *checkout* to place order.`
    );
  }

  const updatedCart = CartService.addItem(cart, product, qty);

  SessionManager.update(phone, {
    state:          SESSION_STATE.SELECTING_ITEM,
    cart:           updatedCart,
    pendingProduct: null,
  });

  const cartSummary = CartService.getSummary(updatedCart);

  return reply(message,
    `✅ Added *${qty}x ${product.name}* to cart!\n\n` +
    `🛒 Cart: *${cartSummary.itemCount} item(s)* — Total: *${CURRENCY_SYMBOL} ${cartSummary.total.toFixed(2)}*\n\n` +
    `Continue adding items, type *cart* to review, or *checkout* to place order.`
  );
};

const cmdCart = async (message, phone, session) => {
  const cart = session.cart || [];
  if (!cart.length) {
    return reply(message, '🛒 Your cart is empty. Type *order* to start adding items!');
  }
  const text = formatCart(cart);
  await reply(message, text);
  await reply(message, 'Type *checkout* to place your order, or continue adding items.');
};

const cmdCheckout = async (message, phone, user, session) => {
  const cart = session.cart || [];
  if (!cart.length) {
    return reply(message, '🛒 Your cart is empty. Type *order* to add items first!');
  }

  const summary = CartService.getSummary(cart);

  SessionManager.update(phone, { state: SESSION_STATE.CHECKOUT });

  const text = formatCart(cart);
  await reply(message, text);
  await reply(message,
    `💳 *Total: ${CURRENCY_SYMBOL} ${summary.total.toFixed(2)}*\n\n` +
    `Type *YES* to confirm your order or *cancel* to go back.`
  );
};

const handleCheckoutConfirm = async (message, client, phone, user, body, session) => {
  if (body !== 'yes') {
    return reply(message, 'Type *YES* to confirm your order, or *cancel* to go back.');
  }

  const cart = session.cart || [];
  if (!cart.length) {
    SessionManager.reset(phone);
    return reply(message, '⚠️ Cart is empty. Type *order* to start again.');
  }

  try {
    const order = await OrderService.createFromCart(user, cart);

    // Clear cart and reset session
    SessionManager.reset(phone);

    await reply(message, formatOrderConfirmation(order));

    // Notify admins
    await notifyAdmins(client, user, order);

  } catch (err) {
    logger.error('Order creation failed:', err);
    return reply(message, '⚠️ Could not place your order. Please try again.');
  }
};

const cmdTrack = async (message, orderId, user) => {
  if (!orderId) {
    return reply(message, '⚠️ Please provide an order ID. Example: *track ORD-2024-ABC123*');
  }

  const order = await OrderService.findByOrderId(orderId.toUpperCase());
  if (!order) {
    return reply(message, `❌ Order *${orderId.toUpperCase()}* not found. Check the ID and try again.`);
  }

  // Users can only track their own orders (admins can track any)
  if (order.userPhone !== user.phone && user.role !== 'admin') {
    return reply(message, `❌ Order *${orderId.toUpperCase()}* not found.`);
  }

  return reply(message, formatOrderStatus(order));
};

const cmdMyOrders = async (message, user) => {
  const orders = await OrderService.findByUser(user._id, { limit: 5 });
  if (!orders.length) {
    return reply(message, '📋 You have no previous orders. Type *order* to make your first one!');
  }

  const lines = orders.map(o =>
    `• *${o.orderId}* — ${o.status.toUpperCase()} — ${CURRENCY_SYMBOL} ${o.total.toFixed(2)}`
  );

  return reply(message,
    `📋 *Your Recent Orders:*\n\n${lines.join('\n')}\n\n` +
    `Type *track <OrderID>* for details on any order.`
  );
};

// ── Internal helpers ─────────────────────────────────────────────────────────

const notifyAdmins = async (client, user, order) => {
  const adminNumbers = (process.env.ADMIN_NUMBERS || '').split(',').map(n => n.trim()).filter(Boolean);
  const summary = CartService.getSummary(order.items);

  const msg =
    `🔔 *New Order Received!*\n\n` +
    `📋 ID: *${order.orderId}*\n` +
    `👤 Customer: ${user.name} (${user.phone})\n` +
    `🛒 Items: ${order.items.length}\n` +
    `💰 Total: ${CURRENCY_SYMBOL} ${order.total.toFixed(2)}\n\n` +
    `Type *!complete ${order.orderId}* to mark as complete\n` +
    `Type *!cancel ${order.orderId}* to cancel`;

  for (const num of adminNumbers) {
    try {
      await client.sendMessage(`${num}@c.us`, msg);
    } catch (err) {
      logger.warn(`Could not notify admin ${num}:`, err.message);
    }
  }
};

module.exports = { handle };
