'use strict';

const mongoose             = require('mongoose');
const { PRODUCT_CATEGORY } = require('../config/constants');

const productSchema = new mongoose.Schema(
  {
    name: {
      type:      String,
      required:  [true, 'Product name is required'],
      trim:      true,
      maxlength: [100, 'Product name too long'],
    },
    description: {
      type:    String,
      trim:    true,
      default: '',
      maxlength: [300, 'Description too long'],
    },
    price: {
      type:     Number,
      required: [true, 'Price is required'],
      min:      [0,    'Price cannot be negative'],
    },
    category: {
      type:    String,
      enum:    Object.values(PRODUCT_CATEGORY),
      default: PRODUCT_CATEGORY.OTHER,
      index:   true,
    },
    // Short code customers type to select item (e.g., "1", "2")
    // Set at seed time; auto-assigned if blank
    code: {
      type:   String,
      unique: true,
      sparse: true,
      trim:   true,
    },
    imageUrl: {
      type:    String,
      default: '',
    },
    isAvailable: {
      type:    Boolean,
      default: true,
      index:   true,
    },
    stock: {
      type:    Number,
      default: null,   // null = unlimited
      min:     0,
    },
    sortOrder: {
      type:    Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// Virtual: formatted price
productSchema.virtual('formattedPrice').get(function () {
  const symbol = process.env.CURRENCY_SYMBOL || 'KSh';
  return `${symbol} ${this.price.toFixed(2)}`;
});

// Text index for search
productSchema.index({ name: 'text', description: 'text' });

// Static: get full menu grouped by category
productSchema.statics.getMenuGrouped = async function () {
  const products = await this.find({ isAvailable: true }).sort({ category: 1, sortOrder: 1, name: 1 });
  return products.reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {});
};

module.exports = mongoose.model('Product', productSchema);
