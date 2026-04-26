'use strict';

const logger = require('../config/logger');

/**
 * Global Express error handler.
 * Must be registered last with app.use(errorHandler).
 */
const errorHandler = (err, req, res, next) => {
  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ success: false, message: 'Validation failed', errors: messages });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0];
    return res.status(409).json({ success: false, message: `Duplicate value for field: ${field}` });
  }

  // Mongoose cast error (bad ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, message: `Invalid ${err.path}: ${err.value}` });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Token expired' });
  }

  // Operational errors (thrown intentionally with status)
  if (err.isOperational) {
    return res.status(err.status || 400).json({ success: false, message: err.message });
  }

  // Unexpected errors — log full stack
  logger.error('Unhandled error:', { message: err.message, stack: err.stack, url: req.url });

  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
};

/**
 * Utility: create an operational error with HTTP status.
 */
const createError = (message, status = 400) => {
  const err         = new Error(message);
  err.isOperational = true;
  err.status        = status;
  return err;
};

module.exports = errorHandler;
module.exports.createError = createError;
