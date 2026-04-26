'use strict';

const router = require('express').Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const SessionManager = require('../sessions/SessionManager');
const logger = require('../config/logger');

router.use(authenticate, requireAdmin);

/** GET /api/bot/status — WhatsApp connection state */
router.get('/status', (req, res) => {
  let state = 'not_initialized';
  try {
    const { getClient } = require('../bot/WhatsAppClient');
    const client = getClient();
    state = client.info ? 'connected' : 'connecting';
  } catch (_) {}

  res.json({
    success: true,
    data: {
      state,
      activeSessions: SessionManager.count(),
    },
  });
});

/** GET /api/bot/sessions — active sessions (debug) */
router.get('/sessions', (req, res) => {
  const sessions = SessionManager.all().map(({ phone, session }) => ({
    phone,
    state: session.state,
    cartItems: session.cart?.length || 0,
    lastActivity: new Date(session.lastActivity).toISOString(),
  }));
  res.json({ success: true, data: sessions });
});

/** DELETE /api/bot/sessions/:phone — reset a session */
router.delete('/sessions/:phone', (req, res) => {
  SessionManager.reset(req.params.phone);
  logger.info(`Admin reset session for ${req.params.phone}`);
  res.json({ success: true, message: 'Session reset' });
});

module.exports = router;
