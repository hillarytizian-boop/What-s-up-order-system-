'use strict';

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const { ROLE } = require('../config/constants');

const userSchema = new mongoose.Schema(
  {
    phone: {
      type:     String,
      required: [true, 'Phone number is required'],
      unique:   true,
      trim:     true,
      // Store without '+' or spaces: 254712345678
      match: [/^\d{7,15}$/, 'Invalid phone number format'],
      index:    true,
    },
    name: {
      type:    String,
      trim:    true,
      default: 'Customer',
      maxlength: [60, 'Name too long'],
    },
    role: {
      type:    String,
      enum:    Object.values(ROLE),
      default: ROLE.USER,
    },
    // For REST API access (optional — bot uses phone-based auth)
    passwordHash: {
      type:   String,
      select: false,  // never return in queries by default
    },
    apiKey: {
      type:   String,
      select: false,
    },
    isBlocked: {
      type:    Boolean,
      default: false,
    },
    lastSeen: {
      type: Date,
    },
    totalOrders: {
      type:    Number,
      default: 0,
    },
    totalSpend: {
      type:    Number,
      default: 0,
    },
  },
  {
    timestamps: true,   // createdAt, updatedAt
    toJSON: {
      transform: (_doc, ret) => {
        delete ret.passwordHash;
        delete ret.apiKey;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Hash password before saving if changed
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

// Instance method: compare password
userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.passwordHash);
};

// Static: find or create user by phone (called on every WhatsApp message)
userSchema.statics.findOrCreate = async function (phone, name) {
  let user = await this.findOne({ phone });
  if (!user) {
    const adminNumbers = (process.env.ADMIN_NUMBERS || '').split(',').map(n => n.trim());
    user = await this.create({
      phone,
      name:  name || 'Customer',
      role:  adminNumbers.includes(phone) ? 'admin' : 'user',
    });
  } else if (name && user.name === 'Customer') {
    user.name = name;
    await user.save();
  }
  return user;
};

module.exports = mongoose.model('User', userSchema);
