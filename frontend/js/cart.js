/**
 * OrderSarthi — Shopping Cart Manager
 * Local storage cart management with quantity controls, subtotal calculations, and badge sync.
 */

const Cart = {
  /**
   * Get all items currently in cart
   * @returns {Array<Object>}
   */
  getItems() {
    try {
      const data = localStorage.getItem(CONFIG.STORAGE_KEYS.CART);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  /**
   * Save items array to localStorage and notify listeners
   * @param {Array<Object>} items
   */
  saveItems(items) {
    localStorage.setItem(CONFIG.STORAGE_KEYS.CART, JSON.stringify(items));
    this.updateBadges();
    window.dispatchEvent(new CustomEvent('cart:updated', { detail: { items } }));
  },

  /**
   * Add a product to cart
   * @param {Object} product
   * @param {number} quantity
   */
  addItem(product, quantity = 1) {
    if (!product || !product.product_id) return;
    if (product.stock_status === 'OUT_OF_STOCK') {
      Utils.showToast(`${product.product_name} is currently out of stock`, 'warning');
      return;
    }

    const items = this.getItems();
    const existingIndex = items.findIndex(item => item.product_id === product.product_id);

    if (existingIndex > -1) {
      items[existingIndex].quantity += Number(quantity);
    } else {
      items.push({
        product_id: product.product_id,
        product_name: product.product_name,
        selling_price: Number(product.selling_price) || 0,
        mrp: Number(product.mrp) || Number(product.selling_price) || 0,
        unit: product.unit || 'unit',
        image_url: product.image_url || '',
        quantity: Number(quantity)
      });
    }

    this.saveItems(items);
    Utils.showToast(`Added ${product.product_name} to cart`, 'success');
  },

  /**
   * Update quantity of an item in cart
   * @param {string} productId
   * @param {number} newQuantity
   */
  updateQuantity(productId, newQuantity) {
    let items = this.getItems();
    const qty = Number(newQuantity);

    if (qty <= 0) {
      items = items.filter(item => item.product_id !== productId);
    } else {
      const target = items.find(item => item.product_id === productId);
      if (target) {
        target.quantity = qty;
      }
    }

    this.saveItems(items);
  },

  /**
   * Remove item from cart completely
   * @param {string} productId
   */
  removeItem(productId) {
    const items = this.getItems().filter(item => item.product_id !== productId);
    this.saveItems(items);
    Utils.showToast('Item removed from cart', 'info');
  },

  /**
   * Clear entire cart
   */
  clear() {
    localStorage.removeItem(CONFIG.STORAGE_KEYS.CART);
    this.updateBadges();
    window.dispatchEvent(new CustomEvent('cart:updated', { detail: { items: [] } }));
  },

  /**
   * Calculate total item count in cart
   * @returns {number}
   */
  getTotalCount() {
    return this.getItems().reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  },

  /**
   * Calculate subtotal (for customer UI preview)
   * Note: Server recalculates authoritative totals at checkout
   * @returns {number}
   */
  getSubtotal() {
    return this.getItems().reduce((sum, item) => sum + ((Number(item.selling_price) || 0) * (Number(item.quantity) || 0)), 0);
  },

  /**
   * Update all cart badges across header & sticky bottom bar
   */
  updateBadges() {
    const count = this.getTotalCount();
    const subtotal = this.getSubtotal();

    // Badge elements
    document.querySelectorAll('.cart-badge-count').forEach(el => {
      el.textContent = count;
      el.classList.toggle('hidden', count === 0);
    });

    // Subtotal elements
    document.querySelectorAll('.cart-subtotal-display').forEach(el => {
      el.textContent = Utils.formatCurrency(subtotal);
    });

    // Sticky mobile cart bar
    const mobileCartBar = document.getElementById('mobile-cart-bar');
    if (mobileCartBar) {
      mobileCartBar.classList.toggle('hidden', count === 0);
    }
  }
};

// Initialize badges on page load
document.addEventListener('DOMContentLoaded', () => {
  Cart.updateBadges();
});
