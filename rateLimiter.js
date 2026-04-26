'use strict';

const rateLimit = require('express-rate-limit');

const options = (max, windowMs, message) => ({
  windowMs,
  max,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message },
});

/** Strict limiter for auth endpoints */
const authLimiter = rateLimit(
  options(10, 15 * 60 * 1000, 'Too many login attempts, try again in 15 minutes.')
);

/** Moderate limiter for write operations */
const writeLimiter = rateLimit(
  options(30, 60 * 1000, 'Too many requests, please slow down.')
);

/** Very strict limiter for admin-only destructive actions */
const adminLimiter = rateLimit(
  options(50, 60 * 1000, 'Too many admin requests.')
);

module.exports = { authLimiter, writeLimiter, adminLimiter };
