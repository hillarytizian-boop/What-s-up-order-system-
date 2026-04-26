'use strict';

const Order   = require('../models/Order');
const User    = require('../models/User');
const Product = require('../models/Product');
const CartService = require('./cartService');
const { ORDER_STATUS } = require('../config/constants');
const logger  = require('../config/logger');

const OrderService = {
  /**
   * Create an order from a cart array.
   * @param {Object} user    — Mongoose User document
   * @param {Array}  cart    — cart items from SessionManager
   */
  async createFromCart(user, cart) {
    const summary = CartService.getSummary(cart);

    const items = cart.map(item => ({
      product:  item.id,
      name:     item.name,
      price:    item.price,
      category: item.category || 'other',
      quantity: item.quantity,
      subtotal: item.subtotal,
    }));

    const order = await Order.create({
      user:      user._id,
      userPhone: user.phone,
      items,
      total:     summary.total,
      timeline:  [{ status: ORDER_STATUS.PENDING, note: 'Order placed via WhatsApp' }],
    });

    // Update user stats
    await User.findByIdAndUpdate(user._id, {
      $inc: { totalOrders: 1, totalSpend: summary.total },
    });

    // Decrement stock where applicable
    for (const item of cart) {
      if (item.id) {
        await Product.findOneAndUpdate(
          { _id: item.id, stock: { $ne: null } },
          { $inc: { stock: -item.quantity } }
        );
      }
    }

    logger.info(`Order created: ${order.orderId} by ${user.phone}`);
    return order;
  },

  /**
   * Find order by human-readable orderId.
   */
  async findByOrderId(orderId) {
    return Order.findOne({ orderId }).populate('user', 'name phone');
  },

  /**
   * List orders by user.
   */
  async findByUser(userId, { limit = 10, skip = 0 } = {}) {
    return Order.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
  },

  /**
   * List orders (admin).
   */
  async listOrders({ status, limit = 50, skip = 0, sort = '-createdAt' } = {}) {
    const query = status ? { status } : {};
    return Order.find(query)
      .populate('user', 'name phone')
      .sort(sort)
      .skip(skip)
      .limit(limit);
  },

  /**
   * Update order status with validation.
   * Returns { order, customer }.
   */
  async updateStatus(orderId, newStatus, note = '') {
    const order = await Order.findOne({ orderId }).populate('user', 'name phone');
    if (!order) throw new Error(`Order ${orderId} not found`);

    order.transition(newStatus, note);
    await order.save();

    logger.info(`Order ${orderId} → ${newStatus}`);
    return { order, customer: order.user };
  },

  /**
   * Get dashboard summary statistics.
   */
  async getSummary() {
    return Order.getSummary();
  },

  /**
   * Paginated list for REST API.
   */
  async paginate({ page = 1, limit = 20, status, userPhone } = {}) {
    const query  = {};
    if (status)    query.status    = status;
    if (userPhone) query.userPhone = userPhone;

    const skip  = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      Order.find(query).populate('user', 'name phone').sort('-createdAt').skip(skip).limit(limit),
      Order.countDocuments(query),
    ]);

    return { orders, total, page, pages: Math.ceil(total / limit) };
  },
};

module.exports = OrderService;
