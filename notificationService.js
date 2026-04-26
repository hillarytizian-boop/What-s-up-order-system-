'use strict';

/**
 * notificationService.js
 * Centralised notification dispatcher.
 * Currently supports: webhook POST.
 * Extend with: email (SendGrid/Nodemailer), SMS (Africa's Talking), push (FCM).
 */

const axios  = require('axios');
const logger = require('../config/logger');

const ENABLED      = process.env.NOTIFICATION_ENABLED === 'true';
const WEBHOOK_URL  = process.env.WEBHOOK_URL;

/**
 * Send an order event notification.
 * @param {string} event    — 'order.created' | 'order.updated' | 'order.cancelled'
 * @param {Object} payload  — serialisable data
 */
const sendOrderNotification = async (event, payload) => {
  if (!ENABLED) return;
  try {
    await dispatchWebhook({ event, payload, timestamp: new Date().toISOString() });
  } catch (err) {
    // Non-fatal: log and continue
    logger.warn(`Notification failed [${event}]:`, err.message);
  }
};

const dispatchWebhook = async (data) => {
  if (!WEBHOOK_URL) return;
  await axios.post(WEBHOOK_URL, data, {
    timeout: 5000,
    headers: { 'Content-Type': 'application/json' },
  });
  logger.debug(`Webhook dispatched: ${data.event}`);
};

/**
 * Stub: send email notification.
 * Wire up SendGrid or Nodemailer here.
 */
const sendEmail = async ({ to, subject, body }) => {
  logger.info(`[EMAIL STUB] To: ${to} | Subject: ${subject}`);
  // TODO: implement with SendGrid SDK or nodemailer
};

/**
 * Stub: send SMS notification.
 * Wire up Africa's Talking or Twilio here.
 */
const sendSMS = async ({ phone, message }) => {
  logger.info(`[SMS STUB] To: ${phone} | Msg: ${message}`);
  // TODO: implement with Africa's Talking SDK
};

module.exports = { sendOrderNotification, sendEmail, sendSMS };
