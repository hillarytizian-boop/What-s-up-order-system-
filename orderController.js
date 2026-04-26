'use strict';

const OrderService = require('../services/orderService');
const { HTTP }     = require('../config/constants');

const OrderController = {
  /** GET /api/orders — list orders (admin) */
  async index(req, res, next) {
    try {
      const { page = 1, limit = 20, status, phone } = req.query;
      const result = await OrderService.paginate({
        page: Number(page), limit: Number(limit), status, userPhone: phone,
      });
      res.json({ success: true, ...result });
    } catch (err) { next(err); }
  },

  /** GET /api/orders/summary — dashboard stats (admin) */
  async summary(req, res, next) {
    try {
      const data = await OrderService.getSummary();
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** GET /api/orders/my — authenticated user's own orders */
  async myOrders(req, res, next) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const skip   = (Number(page) - 1) * Number(limit);
      const orders = await OrderService.findByUser(req.user._id, { limit: Number(limit), skip });
      res.json({ success: true, orders });
    } catch (err) { next(err); }
  },

  /** GET /api/orders/:id — single order */
  async show(req, res, next) {
    try {
      const order = await OrderService.findByOrderId(req.params.id.toUpperCase());
      if (!order) return res.status(HTTP.NOT_FOUND).json({ success: false, message: 'Order not found' });

      // Users can only see their own orders
      if (req.user.role !== 'admin' && order.userPhone !== req.user.phone) {
        return res.status(HTTP.FORBIDDEN).json({ success: false, message: 'Forbidden' });
      }

      res.json({ success: true, data: order });
    } catch (err) { next(err); }
  },

  /** PATCH /api/orders/:id/status — update status (admin) */
  async updateStatus(req, res, next) {
    try {
      const { status, note } = req.body;
      const { order, customer } = await OrderService.updateStatus(
        req.params.id.toUpperCase(), status, note
      );
      res.json({ success: true, data: { order, customer } });
    } catch (err) { next(err); }
  },
};

module.exports = OrderController;
