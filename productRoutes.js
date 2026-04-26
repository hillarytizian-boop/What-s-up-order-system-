'use strict';

const router = require('express').Router();
const ctrl   = require('../controllers/productController');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { createProductRules, updateProductRules, paginationRules } = require('../middleware/validator');

// Public routes
router.get('/menu', ctrl.menu);

// Protected routes
router.use(authenticate);

router.get('/',    paginationRules, ctrl.index);
router.get('/:id', ctrl.show);

// Admin only
router.post('/',            requireAdmin, createProductRules, ctrl.create);
router.patch('/:id',        requireAdmin, updateProductRules, ctrl.update);
router.delete('/:id',       requireAdmin, ctrl.destroy);
router.patch('/:id/toggle', requireAdmin, ctrl.toggle);

module.exports = router;
