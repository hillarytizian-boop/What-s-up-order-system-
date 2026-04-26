'use strict';

/**
 * MessageHandler.js
 * Central router for all incoming WhatsApp messages.
 * Resolves user identity, checks for blocks/admin role,
 * and delegates to the appropriate command handler.
 */

const logger           = require('../config/logger');
const SessionManager   = require('../sessions/SessionManager');
const UserService      = require('../services/userService');
const userCommands     = require('./commands/userCommands');
const adminCommands    = require('./commands/adminCommands');
const { ROLE, SESSION_STATE } = require('../config/constants');

class MessageHandler {
  /**
   * Main entry point — called for every inbound message.
   * @param {import('whatsapp-web.js').Message} message
   * @param {import('whatsapp-web.js').Client}  client
   */
  static async handle(message, client) {
    const rawPhone = message.from.replace('@c.us', '');
    const body     = (message.body || '').trim();

    logger.info(`MSG [${rawPhone}]: ${body.slice(0, 80)}`);

    // 1. Resolve or create user
    const contact = await message.getContact().catch(() => null);
    const name    = contact?.pushname || contact?.name || 'Customer';
    const user    = await UserService.findOrCreate(rawPhone, name);

    // 2. Block check
    if (user.isBlocked) {
      await message.reply('🚫 Your account has been suspended. Contact support.');
      return;
    }

    // 3. Update last seen
    await UserService.updateLastSeen(user._id);

    // 4. Retrieve or initialise session
    const session = SessionManager.get(rawPhone);

    // 5. Route to admin handler if admin and message starts with '!'
    if (user.role === ROLE.ADMIN && body.startsWith('!')) {
      await adminCommands.handle(message, client, user, session);
      return;
    }

    // 6. Route to user command handler
    await userCommands.handle(message, client, user, session);
  }
}

module.exports = MessageHandler;
