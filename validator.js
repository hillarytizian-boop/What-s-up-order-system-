'use strict';

const { body, param, query, validationResult } = require('express-validator');

/**
 * Run validations and return 422 if any fail.
 */
const validate = (validations) => async (req, res, next) => {
  await Promise.all(validations.map(v => v.run(req)));
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  return res.status(422).json({
    success: false,
    message: 'Validation failed',
    errors:  errors.array().map(e => ({ field: e.path, message: e.msg })),
  });
};

// ── Product validators ────────────────────────────────────────────────────────

const createProductRules = validate([
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a non-negative number'),
  body('category').optional().isIn(['food','drinks','snacks','desserts','other']),
  body('description').optional().trim().isLength({ max: 300 }),
  body('stock').optional().isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
]);

const updateProductRules = validate([
  param('id').isMongoId().withMessage('Invalid product ID'),
  body('name').optional().trim().notEmpty().isLength({ max: 100 }),
  body('price').optional().isFloat({ min: 0 }),
  body('category').optional().isIn(['food','drinks','snacks','desserts','other']),
  body('isAvailable').optional().isBoolean(),
]);

// ── Order validators ──────────────────────────────────────────────────────────

const updateStatusRules = validate([
  param('id').notEmpty().withMessage('Order ID is required'),
  body('status').isIn(['pending','confirmed','preparing','ready','delivered','cancelled']),
  body('note').optional().trim().isLength({ max: 300 }),
]);

// ── Auth validators ───────────────────────────────────────────────────────────

const loginRules = validate([
  body('phone').trim().notEmpty().matches(/^\d{7,15}$/).withMessage('Valid phone number required'),
  body('password').notEmpty().withMessage('Password required'),
]);

// ── Pagination ────────────────────────────────────────────────────────────────

const paginationRules = validate([
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1–100'),
]);

module.exports = {
  createProductRules,
  updateProductRules,
  updateStatusRules,
  loginRules,
  paginationRules,
  validate,
};
