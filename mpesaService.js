'use strict';

/**
 * mpesaService.js
 * Safaricom Daraja API — STK Push (Lipa Na M-Pesa Online)
 *
 * Set MPESA_ENVIRONMENT=sandbox for testing.
 * Switch to 'production' when go-live approved.
 */

const axios  = require('axios');
const logger = require('../config/logger');

const BASE_URL = process.env.MPESA_ENVIRONMENT === 'production'
  ? 'https://api.safaricom.co.ke'
  : 'https://sandbox.safaricom.co.ke';

/**
 * Generate OAuth access token from Daraja.
 */
const getAccessToken = async () => {
  const { MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET } = process.env;

  if (!MPESA_CONSUMER_KEY || !MPESA_CONSUMER_SECRET) {
    throw new Error('M-Pesa credentials not configured');
  }

  const credentials = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString('base64');

  const { data } = await axios.get(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${credentials}` },
  });

  return data.access_token;
};

/**
 * Generate the Base64-encoded password for STK push.
 */
const generatePassword = (timestamp) => {
  const { MPESA_SHORTCODE, MPESA_PASSKEY } = process.env;
  return Buffer.from(`${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`).toString('base64');
};

/**
 * Initiate STK Push (customer receives a payment prompt on their phone).
 *
 * @param {string} phone     — customer phone in format 254XXXXXXXXX
 * @param {number} amount    — amount in KES (integer)
 * @param {string} orderId   — used as AccountReference
 * @returns {Object}         — Daraja API response
 */
const stkPush = async (phone, amount, orderId) => {
  const token     = await getAccessToken();
  const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);
  const password  = generatePassword(timestamp);

  const payload = {
    BusinessShortCode: process.env.MPESA_SHORTCODE,
    Password:          password,
    Timestamp:         timestamp,
    TransactionType:   'CustomerPayBillOnline',
    Amount:            Math.ceil(amount),   // must be integer
    PartyA:            phone,
    PartyB:            process.env.MPESA_SHORTCODE,
    PhoneNumber:       phone,
    CallBackURL:       process.env.MPESA_CALLBACK_URL,
    AccountReference:  orderId,
    TransactionDesc:   `Payment for ${orderId}`,
  };

  logger.info(`Initiating STK Push → ${phone} for ${amount} KES (order: ${orderId})`);

  const { data } = await axios.post(
    `${BASE_URL}/mpesa/stkpush/v1/processrequest`,
    payload,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  logger.info(`STK Push response: ${JSON.stringify(data)}`);
  return data;
};

/**
 * Handle the M-Pesa payment callback from Safaricom.
 * Called by POST /api/payments/mpesa/callback
 *
 * @param {Object} body — raw callback body from Daraja
 * @returns {{ success, mpesaRef, phone, amount, orderId }}
 */
const processCallback = (body) => {
  const stk = body?.Body?.stkCallback;
  if (!stk) throw new Error('Invalid callback payload');

  const success   = stk.ResultCode === 0;
  const metadata  = stk.CallbackMetadata?.Item || [];

  const get = (name) => metadata.find(i => i.Name === name)?.Value;

  return {
    success,
    resultDesc: stk.ResultDesc,
    mpesaRef:   get('MpesaReceiptNumber') || '',
    phone:      String(get('PhoneNumber') || ''),
    amount:     get('Amount') || 0,
    orderId:    stk.CallbackMetadata ? get('AccountReference') : '',
  };
};

/**
 * Check transaction status (query STK).
 */
const queryStatus = async (checkoutRequestId) => {
  const token     = await getAccessToken();
  const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);
  const password  = generatePassword(timestamp);

  const { data } = await axios.post(
    `${BASE_URL}/mpesa/stkpushquery/v1/query`,
    {
      BusinessShortCode: process.env.MPESA_SHORTCODE,
      Password:          password,
      Timestamp:         timestamp,
      CheckoutRequestID: checkoutRequestId,
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return data;
};

module.exports = { stkPush, processCallback, queryStatus };
