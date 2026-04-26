'use strict';

const User   = require('../models/User');
const logger = require('../config/logger');

const UserService = {
  async findOrCreate(phone, name) {
    return User.findOrCreate(phone, name);
  },

  async findByPhone(phone) {
    return User.findOne({ phone });
  },

  async findById(id) {
    return User.findById(id);
  },

  async updateLastSeen(userId) {
    return User.findByIdAndUpdate(userId, { lastSeen: new Date() });
  },

  async setBlocked(phone, blocked) {
    const user = await User.findOne({ phone });
    if (!user) throw new Error('User not found');
    user.isBlocked = blocked;
    await user.save();
    return user;
  },

  async setRole(phone, role) {
    const user = await User.findOne({ phone });
    if (!user) throw new Error('User not found');
    user.role = role;
    await user.save();
    return user;
  },

  async getAllActive() {
    return User.find({ isBlocked: false }).select('phone name');
  },

  async paginate({ page = 1, limit = 20 } = {}) {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      User.find().sort('-createdAt').skip(skip).limit(limit),
      User.countDocuments(),
    ]);
    return { users, total, page, pages: Math.ceil(total / limit) };
  },
};

module.exports = UserService;
