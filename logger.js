'use strict';

const { createLogger, format, transports } = require('winston');
require('winston-daily-rotate-file');
const path = require('path');
const fs   = require('fs');

const LOG_DIR   = process.env.LOG_DIR   || './logs';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

const { combine, timestamp, printf, colorize, errors } = format;

// Custom log format
const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `[${timestamp}] ${level}: ${stack || message}`;
});

const logger = createLogger({
  level: LOG_LEVEL,
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    logFormat,
  ),
  transports: [
    // Console (coloured in dev)
    new transports.Console({
      format: combine(
        colorize({ all: true }),
        timestamp({ format: 'HH:mm:ss' }),
        logFormat,
      ),
      silent: process.env.NODE_ENV === 'test',
    }),

    // Daily rotating error log
    new transports.DailyRotateFile({
      filename:     path.join(LOG_DIR, 'error-%DATE%.log'),
      datePattern:  'YYYY-MM-DD',
      level:        'error',
      maxSize:      '20m',
      maxFiles:     '30d',
      zippedArchive: true,
    }),

    // Daily rotating combined log
    new transports.DailyRotateFile({
      filename:     path.join(LOG_DIR, 'combined-%DATE%.log'),
      datePattern:  'YYYY-MM-DD',
      maxSize:      '20m',
      maxFiles:     '14d',
      zippedArchive: true,
    }),
  ],
  exceptionHandlers: [
    new transports.File({ filename: path.join(LOG_DIR, 'exceptions.log') }),
  ],
  rejectionHandlers: [
    new transports.File({ filename: path.join(LOG_DIR, 'rejections.log') }),
  ],
});

module.exports = logger;
