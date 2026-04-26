'use strict';

const router = require('express').Router();
const Order  = require('../models/Order');
const mpesa  = require('../services/mpesaService');
const logger = require('../config/logger');
const { authenticate } = require('../middleware/auth');

/**
 * POST /api/payments/mpesa/callback
 * Safaricom sends payment confirmation here.
 * Must be publicly accessible (no auth).
 */
router.post('/mpesa/callback', async (req, res) => {
  // Acknowledge immediately — Daraja expects HTTP 200 fast
  res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });

  try {
    const result = mpesa.processCallback(req.body);
    logger.info('M-Pesa callback:', result);

    if (result.success && result.orderId) {
      await Order.findOneAndUpdate(
        { orderId: result.orderId },
        {
          paymentStatus: 'paid',
          mpesaRef:      result.mpesaRef,
          $push: {
            timeline: { status: 'confirmed', note: `Payment received: ${result.mpesaRef}` },
          },
          status: 'confirmed',
        }
      );
      logger.info(`Payment confirmed for order ${result.orderId}: ${result.mpesaRef}`);
    } else {
      logger.warn(`Payment failed for order ${result.orderId}: ${result.resultDesc}`);
    }
  } catch (err) {
    logger.error('M-Pesa callback processing error:', err);
  }
});

/**
 * POST /api/payments/mpesa/stk — initiate STK push (authenticated user)
 */
router.post('/mpesa/stk', authenticate, async (req, res, next) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findOne({ orderId, userPhone: req.user.phone });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const data = await mpesa.stkPush(req.user.phone, order.total, orderId);

    await Order.findByIdAndUpdate(order._id, { paymentStatus: 'pending' });

    res.json({ success: true, message: 'STK push sent to your phone', data });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
