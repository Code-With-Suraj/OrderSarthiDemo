/**
 * OrderSarthi — Frontend Configuration
 * Central configuration file for all API endpoints, shop defaults, and app behavior.
 */

const CONFIG = {
  // Replace this with your deployed Google Apps Script Web App URL
  API_BASE_URL: "https://script.google.com/macros/s/AKfycbw6wAt-yNXG-y2fLtWwSXW-5ysS-wggjuRyvnmYssvKRmVoUU9BO2O653QxmBd11hP8Qg/exec",

  // App & White-Label Platform Settings
  DEFAULT_SHOP_NAME: "Local Express Shop",
  PLATFORM_NAME: "OrderSarthi",
  POWERED_BY: "powered by OrderSarthi",
  TAGLINE: "Click & Collect • Zero Queue Store Pickup",
  CURRENCY: "₹",
  LOCALE: "en-IN",
  TIMEZONE: "Asia/Kolkata",

  // Razorpay Gateway Defaults
  RAZORPAY_KEY_ID: "rzp_live_Sugpl07IegaqDU",
  DEFAULT_PAYMENT_MODE: "BOTH", // 'BOTH' | 'ONLINE_ONLY' | 'OFFLINE_ONLY'
  DEFAULT_MIN_ORDER_VALUE: 50,

  // Concurrency & Cache Optimizations
  SEARCH_DEBOUNCE_MS: 300,
  POLLING_INTERVAL_ORDERS_MS: 30000,      // 30 seconds for Admin Order Dashboard
  POLLING_INTERVAL_TRACKING_MS: 15000,    // 15 seconds for Customer Order Tracking
  REQUEST_TIMEOUT_MS: 30000,              // 30 seconds HTTP timeout

  // Pagination Defaults
  DEFAULT_PAGE_SIZE: 30,
  MAX_PAGE_SIZE: 50,

  // LocalStorage Keys
  STORAGE_KEYS: {
    AUTH_TOKEN: "ordersarthi_auth_token",
    AUTH_USER: "ordersarthi_auth_user",
    ADMIN_TOKEN: "ordersarthi_admin_token",
    ADMIN_USER: "ordersarthi_admin_user",
    CART: "ordersarthi_cart_items",
    CHECKOUT_SESSION: "ordersarthi_checkout_idempotency",
    SHOP_INFO: "ordersarthi_shop_info"
  },

  /**
   * Get cached or fallback shop info
   * @returns {Object}
   */
  getShopInfo() {
    try {
      const cached = localStorage.getItem(this.STORAGE_KEYS.SHOP_INFO);
      if (cached) return JSON.parse(cached);
    } catch (e) { }
    return {
      shop_name: this.DEFAULT_SHOP_NAME,
      tagline: this.TAGLINE,
      logo_url: "",
      min_order_value: this.DEFAULT_MIN_ORDER_VALUE
    };
  },

  /**
   * Helper to get active shop name
   * @returns {string}
   */
  getShopName() {
    const info = this.getShopInfo();
    return info?.shop_name || this.DEFAULT_SHOP_NAME;
  },

  /**
   * Helper to get active Minimum Order Value
   * @returns {number}
   */
  getMinOrderValue() {
    const info = this.getShopInfo();
    if (info && info.min_order_value !== undefined && info.min_order_value !== "") {
      const val = Number(info.min_order_value);
      return isNaN(val) ? 0 : Math.max(0, val);
    }
    return this.DEFAULT_MIN_ORDER_VALUE;
  }
};

// Freeze storage keys
Object.freeze(CONFIG.STORAGE_KEYS);
