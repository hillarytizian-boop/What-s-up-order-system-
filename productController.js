'use strict';

const ProductService = require('../services/productService');
const { HTTP } = require('../config/constants');

const ProductController = {
  /** GET /api/products — paginated list */
  async index(req, res, next) {
    try {
      const { page = 1, limit = 20, category, available } = req.query;
      const result = await ProductService.paginate({
        page: Number(page), limit: Number(limit), category, available,
      });
      res.json({ success: true, ...result });
    } catch (err) { next(err); }
  },

  /** GET /api/products/menu — grouped menu (public) */
  async menu(req, res, next) {
    try {
      const grouped = await ProductService.getMenuGrouped();
      res.json({ success: true, data: grouped });
    } catch (err) { next(err); }
  },

  /** GET /api/products/:id */
  async show(req, res, next) {
    try {
      const product = await ProductService.findById(req.params.id);
      if (!product) return res.status(HTTP.NOT_FOUND).json({ success: false, message: 'Product not found' });
      res.json({ success: true, data: product });
    } catch (err) { next(err); }
  },

  /** POST /api/products — create (admin) */
  async create(req, res, next) {
    try {
      const product = await ProductService.create(req.body);
      res.status(HTTP.CREATED).json({ success: true, data: product });
    } catch (err) { next(err); }
  },

  /** PATCH /api/products/:id — update (admin) */
  async update(req, res, next) {
    try {
      const product = await ProductService.update(req.params.id, req.body);
      res.json({ success: true, data: product });
    } catch (err) { next(err); }
  },

  /** DELETE /api/products/:id — delete (admin) */
  async destroy(req, res, next) {
    try {
      await ProductService.delete(req.params.id);
      res.json({ success: true, message: 'Product deleted' });
    } catch (err) { next(err); }
  },

  /** PATCH /api/products/:id/toggle — toggle availability (admin) */
  async toggle(req, res, next) {
    try {
      const product = await ProductService.toggleAvailability(req.params.id);
      res.json({ success: true, data: product });
    } catch (err) { next(err); }
  },
};

module.exports = ProductController;
