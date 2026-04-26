'use strict';

const jwt    = require('jsonwebtoken');
const User   = require('../models/User');
const { createError } = require('./errorHandler');
const { ROLE } = require('../config/constants');

/**
 * Verify JWT and attach user to req.user.
 * Expects: Authorization: Bearer <token>
 */
const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) {
      return next(createError('No token provided', 401));
    }

    const token = header.slice(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select('+role');
    if (!user)           return next(createError('User not found', 401));
    if (user.isBlocked)  return next(createError('Account suspended', 403));

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Restrict route to admins only.
 * Must be chained after authenticate.
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== ROLE.ADMIN) {
    return next(createError('Admin access required', 403));
  }
  next();
};

/**
 * Generate a signed JWT for a user.
 */
const signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

module.exports = { authenticate, requireAdmin, signToken };
