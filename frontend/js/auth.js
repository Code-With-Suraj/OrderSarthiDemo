/**
 * OrderSarthi — Authentication Manager
 * Handles customer and admin authentication state, sessions, login, registration, and logout.
 */

const Auth = {
  /**
   * Get relative path prefix
   */
  getPathPrefix() {
    const p = window.location.pathname;
    const isInsideAdmin = p.includes('/admin/') || p.endsWith('/admin');
    return isInsideAdmin ? '../' : './';
  },

  /**
   * Check if customer is currently logged in
   * @returns {boolean}
   */
  isCustomerLoggedIn() {
    return !!localStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
  },

  /**
   * Get logged-in customer data
   * @returns {Object|null}
   */
  getCustomer() {
    try {
      const data = localStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_USER);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  /**
   * Save customer session to localStorage
   * @param {string} token
   * @param {Object} user
   */
  setCustomerSession(token, user) {
    localStorage.setItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN, token);
    localStorage.setItem(CONFIG.STORAGE_KEYS.AUTH_USER, JSON.stringify(user));
  },

  /**
   * Logout customer
   */
  async logoutCustomer() {
    const p = this.getPathPrefix();
    try {
      const token = localStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
      if (token) {
        // Fire-and-forget server logout to invalidate CacheService
        api.post('customerLogout', { token }).catch(() => {});
      }
    } finally {
      localStorage.removeItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
      localStorage.removeItem(CONFIG.STORAGE_KEYS.AUTH_USER);
      window.location.href = `${p}login.html`;
    }
  },

  /**
   * Register a new customer
   * @param {string} name
   * @param {string} mobile
   * @param {string} email
   * @param {string} password
   */
  async registerCustomer(name, mobile, email, password) {
    if (!name || !name.trim()) throw new Error('Please enter your full name.');
    if (!Utils.validateMobile(mobile)) throw new Error('Please enter a valid 10-digit mobile number.');
    if (!password || password.length < 6) throw new Error('Password must be at least 6 characters.');

    const result = await api.post('customerRegister', {
      name: name.trim(),
      mobile: mobile.replace(/\D/g, ''),
      email: email ? email.trim().toLowerCase() : '',
      password: password
    });

    this.setCustomerSession(result.token, result.user);
    return result;
  },

  /**
   * Login customer
   * @param {string} mobile
   * @param {string} password
   */
  async loginCustomer(mobile, password) {
    if (!Utils.validateMobile(mobile)) throw new Error('Please enter a valid 10-digit mobile number.');
    if (!password) throw new Error('Please enter your password.');

    const result = await api.post('customerLogin', {
      mobile: mobile.replace(/\D/g, ''),
      password: password
    });

    this.setCustomerSession(result.token, result.user);
    return result;
  },

  // -------------------------------------------------------------
  // ADMIN AUTHENTICATION
  // -------------------------------------------------------------

  /**
   * Check if Admin is logged in
   * @returns {boolean}
   */
  isAdminLoggedIn() {
    return !!localStorage.getItem(CONFIG.STORAGE_KEYS.ADMIN_TOKEN);
  },

  /**
   * Get logged-in admin data
   * @returns {Object|null}
   */
  getAdmin() {
    try {
      const data = localStorage.getItem(CONFIG.STORAGE_KEYS.ADMIN_USER);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  /**
   * Save Admin session
   * @param {string} token
   * @param {Object} admin
   */
  setAdminSession(token, admin) {
    localStorage.setItem(CONFIG.STORAGE_KEYS.ADMIN_TOKEN, token);
    localStorage.setItem(CONFIG.STORAGE_KEYS.ADMIN_USER, JSON.stringify(admin));
  },

  /**
   * Admin login
   * @param {string} username (mobile or email)
   * @param {string} password
   */
  async loginAdmin(username, password) {
    if (!username || !username.trim()) throw new Error('Please enter username or mobile.');
    if (!password) throw new Error('Please enter admin password.');

    const result = await api.post('adminLogin', {
      username: username.trim(),
      password: password
    }, true);

    this.setAdminSession(result.token, result.admin);
    return result;
  },

  /**
   * Admin logout
   */
  async logoutAdmin() {
    const p = window.location.pathname;
    const isInsideAdmin = p.includes('/admin/') || p.endsWith('/admin');
    const adminLoginUrl = isInsideAdmin ? (p.endsWith('/admin') ? './admin/index.html' : './index.html') : './admin/index.html';
    try {
      const token = localStorage.getItem(CONFIG.STORAGE_KEYS.ADMIN_TOKEN);
      if (token) {
        api.post('adminLogout', { token }, true).catch(() => {});
      }
    } finally {
      localStorage.removeItem(CONFIG.STORAGE_KEYS.ADMIN_TOKEN);
      localStorage.removeItem(CONFIG.STORAGE_KEYS.ADMIN_USER);
      window.location.href = adminLoginUrl;
    }
  },

  /**
   * Guard route for logged in customer
   * @param {string} redirectUrl
   */
  requireCustomer(redirectUrl = 'login.html') {
    if (!this.isCustomerLoggedIn()) {
      const p = this.getPathPrefix();
      const current = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `${p}${redirectUrl}?redirect=${current}`;
    }
  },

  /**
   * Guard route for Admin
   * @param {string} redirectUrl
   */
  requireAdmin(redirectUrl = 'index.html') {
    if (!this.isAdminLoggedIn()) {
      const p = window.location.pathname;
      const isInsideAdmin = p.includes('/admin/') || p.endsWith('/admin');
      const target = isInsideAdmin ? (p.endsWith('/admin') ? `./admin/${redirectUrl}` : `./${redirectUrl}`) : `./admin/${redirectUrl}`;
      window.location.href = target;
    }
  }
};
