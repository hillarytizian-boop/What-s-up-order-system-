'use strict';

const mongoose          = require('mongoose');
const { v4: uuidv4 }    = require('uuid');
const { ORDER_STATUS, ORDER_TRANSITIONS, ORDER_ID_PREFIX } = require('../config/constants');

// Sub-schema for individual line items
const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'Product',
    },
    // Snapshot of product data at order time (denormalised)
    name:     { type: String, required: true },
    price:    { type: Number, required: true },
    category: { type: String },
    quantity: { type: Number, required: true, min: 1 },
    subtotal: { type: Number, required: true },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type:    String,
      unique:  true,
      index:   true,
    },
    user: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
      index:    true,
    },
    userPhone: {
      type:  String,
      index: true,
    },
    items: {
      type:     [orderItemSchema],
      validate: [(v) => v.length > 0, 'Order must contain at least one item'],
    },
    total: {
      type:     Number,
      required: true,
      min:      0,
    },
    status: {
      type:    String,
      enum:    Object.values(ORDER_STATUS),
      default: ORDER_STATUS.PENDING,
      index:   true,
    },
    // Delivery details (optional)
    deliveryAddress: {
      type:    String,
      default: '',
    },
    notes: {
      type:    String,
      default: '',
      maxlength: [300, 'Notes too long'],
    },
    // Payment
    paymentStatus: {
      type:    String,
      enum:    ['unpaid', 'pending', 'paid', 'failed'],
      default: 'unpaid',
    },
    mpesaRef: {
      type:    String,
      default: '',
    },
    // Status timeline
    timeline: [
      {
        status:    String,
        timestamp: { type: Date, default: Date.now },
        note:      String,
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// Generate human-readable order ID before saving
orderSchema.pre('save', function (next) {
  if (!this.orderId) {
    const prefix = process.env.ORDER_ID_PREFIX || 'ORD';
    // e.g. ORD-2024-A1B2
    const shortId = uuidv4().replace(/-/g, '').slice(0, 6).toUpperCase();
    const year    = new Date().getFullYear();
    this.orderId  = `${prefix}-${year}-${shortId}`;
  }
  next();
});

// Instance method: transition status
orderSchema.methods.transition = function (newStatus, note = '') {
  const allowed = ORDER_TRANSITIONS[this.status] || [];
  if (!allowed.includes(newStatus)) {
    throw new Error(`Cannot transition from '${this.status}' to '${newStatus}'`);
  }
  this.status = newStatus;
  this.timeline.push({ status: newStatus, note });
  return this;
};

// Virtual: item count
orderSchema.virtual('itemCount').get(function () {
  return this.items.reduce((sum, i) => sum + i.quantity, 0);
});

// Static: get orders summary for admin
orderSchema.statics.getSummary = async function () {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [totals] = await this.aggregate([
    {
      $facet: {
        byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
        today:    [
          { $match: { createdAt: { $gte: today } } },
          { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: '$total' } } },
        ],
        overall:  [{ $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: '$total' } } }],
      },
    },
  ]);

  return {
    byStatus: totals.byStatus.reduce((acc, s) => { acc[s._id] = s.count; return acc; }, {}),
    today:    totals.today[0]   || { count: 0, revenue: 0 },
    overall:  totals.overall[0] || { count: 0, revenue: 0 },
  };
};

module.exports = mongoose.model('Order', orderSchema);
