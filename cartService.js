'use strict';

/**
 * CartService.js
 * Pure utility functions for cart manipulation.
 * No database calls — operates on plain arrays from SessionManager.
 */

const CartService = {
  /**
   * Add a product to the cart, merging quantities if already present.
   * @param {Array}  cart     — current cart items
   * @param {Object} product  — { id, name, price, code, category }
   * @param {number} quantity
   * @returns {Array} new cart array
   */
  addItem(cart, product, quantity) {
    const existing = cart.find(i => i.id === product.id);

    if (existing) {
      existing.quantity += quantity;
      existing.subtotal  = parseFloat((existing.price * existing.quantity).toFixed(2));
      return [...cart];
    }

    return [
      ...cart,
      {
        id:       product.id,
        code:     product.code,
        name:     product.name,
        price:    product.price,
        category: product.category,
        quantity,
        subtotal: parseFloat((product.price * quantity).toFixed(2)),
      },
    ];
  },

  /**
   * Remove an item from the cart by product id.
   */
  removeItem(cart, productId) {
    return cart.filter(i => i.id !== productId);
  },

  /**
   * Update quantity of an item. Removes if qty <= 0.
   */
  updateQuantity(cart, productId, quantity) {
    if (quantity <= 0) return this.removeItem(cart, productId);
    return cart.map(i =>
      i.id === productId
        ? { ...i, quantity, subtotal: parseFloat((i.price * quantity).toFixed(2)) }
        : i
    );
  },

  /**
   * Get cart summary: total price and item count.
   */
  getSummary(cart) {
    const itemCount = cart.reduce((sum, i) => sum + i.quantity, 0);
    const total     = parseFloat(cart.reduce((sum, i) => sum + i.subtotal, 0).toFixed(2));
    return { itemCount, total };
  },

  /**
   * Clear the cart.
   */
  clear() {
    return [];
  },
};

module.exports = CartService;
