'use strict';

const router   = require('express').Router();
const ctrl     = require('../controllers/orderController');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { updateStatusRules, paginationRules } = require('../middleware/validator');

// All routes require authentication
router.use(authenticate);

// GET  /api/orders/summary  — admin dashboard stats
router.get('/summary', requireAdmin, ctrl.summary);

// GET  /api/orders/my       — authenticated user's own orders
router.get('/my', ctrl.myOrders);

// GET  /api/orders          — admin: list all orders
router.get('/', requireAdmin, paginationRules, ctrl.index);

// GET  /api/orders/:id      — show single order
router.get('/:id', ctrl.show);

// PATCH /api/orders/:id/status — admin: update status
router.patch('/:id/status', requireAdmin, updateStatusRules, ctrl.updateStatus);

module.exports = router;
