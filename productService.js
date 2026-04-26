'use strict';

const Product = require('../models/Product');
const { PRODUCT_CATEGORY } = require('../config/constants');
const logger  = require('../config/logger');

const ProductService = {
  /** Get all available products (for bot menu) */
  async getAvailable() {
    return Product.find({ isAvailable: true }).sort({ category: 1, sortOrder: 1, name: 1 });
  },

  /** Get menu grouped by category */
  async getMenuGrouped() {
    return Product.getMenuGrouped();
  },

  /** List all products (admin) */
  async listAll() {
    return Product.find().sort({ category: 1, name: 1 });
  },

  /** Find by ID */
  async findById(id) {
    return Product.findById(id);
  },

  /** Find by name (case-insensitive) */
  async findByName(name) {
    return Product.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
  },

  /** Create a new product */
  async create(data) {
    const { name, price, category, description, imageUrl, stock } = data;

    if (!name || price === undefined) throw new Error('name and price are required');
    if (isNaN(price) || price < 0)    throw new Error('price must be a non-negative number');

    // Auto-assign short code
    const count = await Product.countDocuments();
    const code  = data.code || String(count + 1);

    const product = await Product.create({
      name, price, category, description, imageUrl, stock,
      code,
      isAvailable: data.isAvailable !== false,
    });

    logger.info(`Product created: ${product.name} (${product._id})`);
    return product;
  },

  /** Update a product */
  async update(id, data) {
    const product = await Product.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!product) throw new Error('Product not found');
    return product;
  },

  /** Toggle availability by name or ID */
  async toggleAvailability(nameOrId) {
    let product = await Product.findById(nameOrId).catch(() => null);
    if (!product) {
      product = await Product.findOne({ name: { $regex: new RegExp(nameOrId, 'i') } });
    }
    if (!product) throw new Error(`Product '${nameOrId}' not found`);

    product.isAvailable = !product.isAvailable;
    await product.save();
    return product;
  },

  /** Delete a product */
  async delete(id) {
    const product = await Product.findByIdAndDelete(id);
    if (!product) throw new Error('Product not found');
    return product;
  },

  /** Paginated list for REST API */
  async paginate({ page = 1, limit = 20, category, available } = {}) {
    const query = {};
    if (category  !== undefined) query.category    = category;
    if (available !== undefined) query.isAvailable = available === 'true' || available === true;

    const skip = (page - 1) * limit;
    const [products, total] = await Promise.all([
      Product.find(query).sort({ category: 1, sortOrder: 1, name: 1 }).skip(skip).limit(limit),
      Product.countDocuments(query),
    ]);

    return { products, total, page, pages: Math.ceil(total / limit) };
  },
};

module.exports = ProductService;
