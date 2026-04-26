'use strict';

const UserService  = require('../services/userService');
const { signToken }= require('../middleware/auth');
const { HTTP }     = require('../config/constants');

const UserController = {
  /** POST /api/auth/login — phone + password */
  async login(req, res, next) {
    try {
      const { phone, password } = req.body;
      const user = await UserService.findByPhone(phone);

      if (!user) {
        return res.status(HTTP.UNAUTHORIZED).json({ success: false, message: 'Invalid credentials' });
      }

      const valid = await user.comparePassword(password);
      if (!valid) {
        return res.status(HTTP.UNAUTHORIZED).json({ success: false, message: 'Invalid credentials' });
      }

      if (user.isBlocked) {
        return res.status(HTTP.FORBIDDEN).json({ success: false, message: 'Account suspended' });
      }

      const token = signToken(user._id);
      res.json({ success: true, token, user });
    } catch (err) { next(err); }
  },

  /** GET /api/users — list all (admin) */
  async index(req, res, next) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const result = await UserService.paginate({ page: Number(page), limit: Number(limit) });
      res.json({ success: true, ...result });
    } catch (err) { next(err); }
  },

  /** GET /api/users/me */
  async me(req, res, next) {
    try {
      res.json({ success: true, data: req.user });
    } catch (err) { next(err); }
  },

  /** PATCH /api/users/:phone/block */
  async block(req, res, next) {
    try {
      const user = await UserService.setBlocked(req.params.phone, true);
      res.json({ success: true, data: user });
    } catch (err) { next(err); }
  },

  /** PATCH /api/users/:phone/unblock */
  async unblock(req, res, next) {
    try {
      const user = await UserService.setBlocked(req.params.phone, false);
      res.json({ success: true, data: user });
    } catch (err) { next(err); }
  },
};

module.exports = UserController;
