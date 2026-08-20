/**
 * OrderSarthi — Shared UI Components & White-Label Branding System
 * Dynamic shop profile injection, custom headers, footers, and modal helpers.
 */

const UI = {
  /**
   * Helper to resolve relative path prefix depending on if current page is in admin/ or root
   */
  getPathPrefix() {
    const isInsideAdmin = window.location.pathname.includes('/admin/');
    return isInsideAdmin ? '../' : './';
  },

  /**
   * Automatically inject PWA manifest & meta tags if missing from head
   */
  initPwaHead() {
    const p = this.getPathPrefix();
    if (!document.querySelector('link[rel="manifest"]')) {
      const manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      manifestLink.href = `${p}manifest.json`;
      document.head.appendChild(manifestLink);
    }
    if (!document.querySelector('link[rel="apple-touch-icon"]')) {
      const iconLink = document.createElement('link');
      iconLink.rel = 'apple-touch-icon';
      iconLink.href = `${p}icons/icon.svg`;
      document.head.appendChild(iconLink);
    }
    if (!document.querySelector('meta[name="theme-color"]')) {
      const metaTheme = document.createElement('meta');
      metaTheme.name = 'theme-color';
      metaTheme.content = '#F8CB46';
      document.head.appendChild(metaTheme);
    }
    if (!document.querySelector('meta[name="apple-mobile-web-app-capable"]')) {
      const metaIos = document.createElement('meta');
      metaIos.name = 'apple-mobile-web-app-capable';
      metaIos.content = 'yes';
      document.head.appendChild(metaIos);
    }

    // Auto-load pwa.js if not already present
    if (!window.PWA && !document.querySelector('script[src*="pwa.js"]')) {
      const script = document.createElement('script');
      script.src = `${p}js/pwa.js`;
      document.body.appendChild(script);
    }
  },

  /**
   * Fetch latest shop info from backend and sync branding
   */
  async initShopBranding() {
    this.initPwaHead();
    try {
      // Background non-blocking fetch to sync shop profile
      api.get('getShop').then((shop) => {
        if (shop && shop.shop_name) {
          localStorage.setItem(CONFIG.STORAGE_KEYS.SHOP_INFO, JSON.stringify(shop));
          this.applyShopBrandingToDOM(shop);
        }
      }).catch(() => {});
    } catch (e) {}
  },

  /**
   * Apply shop branding elements across currently loaded DOM
   * @param {Object} shop
   */
  applyShopBrandingToDOM(shop) {
    if (!shop) shop = CONFIG.getShopInfo();
    const shopName = shop.shop_name || CONFIG.DEFAULT_SHOP_NAME;
    const logoUrl = shop.logo_url || '';
    const minOrderVal = (shop.min_order_value !== undefined && shop.min_order_value !== "") ? Number(shop.min_order_value) : CONFIG.DEFAULT_MIN_ORDER_VALUE;

    document.querySelectorAll('.shop-name-display').forEach(el => {
      el.textContent = shopName;
    });

    document.querySelectorAll('.shop-tagline-display').forEach(el => {
      el.textContent = shop.description || shop.tagline || CONFIG.TAGLINE;
    });

    document.querySelectorAll('.min-order-display').forEach(el => {
      if (minOrderVal > 0) {
        el.textContent = `Min. Order: ₹${minOrderVal}`;
        el.classList.remove('hidden');
      } else {
        el.textContent = 'No Min. Order';
        el.classList.add('hidden');
      }
    });

    if (logoUrl) {
      document.querySelectorAll('.shop-logo-container').forEach(el => {
        el.innerHTML = `<img src="${logoUrl}" alt="${Utils.escapeHTML(shopName)}" class="w-full h-full object-cover rounded-xl" />`;
      });
    }
  },

  /**
   * Dynamically update document title with Shop Name & Powered By
   * @param {string} pageTitle
   */
  setPageTitle(pageTitle) {
    const shopName = CONFIG.getShopName();
    document.title = `${pageTitle} — ${shopName} | ${CONFIG.POWERED_BY}`;
  },

  /**
   * Render the standard customer navigation bar into #site-header
   * @param {string} activePage
   */
  renderHeader(activePage = '') {
    const headerEl = document.getElementById('site-header');
    if (!headerEl) return;

    const isLoggedIn = Auth.isCustomerLoggedIn();
    const customer = Auth.getCustomer();
    const cartCount = Cart.getTotalCount();
    const p = this.getPathPrefix();
    const shop = CONFIG.getShopInfo();
    const shopName = shop.shop_name || CONFIG.DEFAULT_SHOP_NAME;
    const logoUrl = shop.logo_url || '';
    const minOrder = CONFIG.getMinOrderValue();
    const isInstore = window.location.search.includes('source=qr') || window.location.search.includes('mode=instore') || sessionStorage.getItem('ordersarthi_instore_mode') === 'true';
    if (window.location.search.includes('source=qr') || window.location.search.includes('mode=instore')) {
      sessionStorage.setItem('ordersarthi_instore_mode', 'true');
    }

    headerEl.innerHTML = `
      ${isInstore ? `
        <div class="bg-[#F8CB46] text-slate-900 text-xs font-bold px-4 py-2 text-center flex items-center justify-center gap-2 shadow-xs">
          <svg class="w-4 h-4 animate-pulse text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path></svg>
          <span><strong>In-Store Mode:</strong> Scan QR, order from phone & pick up at counter!</span>
        </div>
      ` : ''}
      <header class="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between h-16 sm:h-20">
            <!-- Brand Logo & Dynamic Shop Name -->
            <a href="${p}index.html" class="flex items-center gap-3 group shrink-0">
              <div class="shop-logo-container w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#F8CB46] flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform shrink-0 overflow-hidden border border-amber-300">
                ${logoUrl ? `<img src="${logoUrl}" alt="${Utils.escapeHTML(shopName)}" class="w-full h-full object-cover" />` : `
                  <svg class="w-6 h-6 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
                  </svg>
                `}
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <span class="shop-name-display text-lg sm:text-xl font-extrabold tracking-tight font-display text-slate-900 truncate">${Utils.escapeHTML(shopName)}</span>
                </div>
                <div class="flex items-center flex-wrap gap-1.5 text-[10px] sm:text-xs">
                  <span class="text-slate-500 font-medium">by <span class="text-slate-900 font-bold">OrderSarthi</span></span>
                  <span class="text-slate-300">•</span>
                  <span class="px-1.5 py-0.5 rounded-full bg-emerald-100 text-[#0C831F] font-extrabold text-[10px] tracking-wide">⚡ 10 MIN PICKUP</span>
                  ${minOrder > 0 ? `
                    <span class="min-order-display px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-extrabold text-[10px] tracking-wide border border-amber-200">
                      MIN ₹${minOrder}
                    </span>
                  ` : ''}
                </div>
              </div>
            </a>

            <!-- Navigation Links -->
            <nav class="hidden md:flex items-center gap-1">
              <a href="${p}index.html" class="px-4 py-2 rounded-lg text-xs font-bold transition-colors ${activePage === 'home' ? 'text-slate-900 bg-slate-100' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}">Home</a>
              <a href="${p}shop.html" class="px-4 py-2 rounded-lg text-xs font-bold transition-colors ${activePage === 'shop' ? 'text-slate-900 bg-slate-100' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}">Categories & Products</a>
              <a href="${p}orders.html" class="px-4 py-2 rounded-lg text-xs font-bold transition-colors ${activePage === 'orders' ? 'text-slate-900 bg-slate-100' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}">My Orders</a>
            </nav>

            <!-- Actions (Cart & Auth & Install) -->
            <div class="flex items-center gap-2 sm:gap-3">
              <!-- Install App Button (PWA) -->
              <button onclick="PWA.promptInstall()" class="pwa-install-btn hidden px-3 py-2 rounded-xl bg-[#0C831F] text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm hover:bg-[#096818] transition-all" title="Install App">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                <span class="hidden sm:inline">Install App</span>
              </button>

              <!-- Cart Button -->
              <a href="${p}cart.html" class="relative flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-[#0C831F] font-bold text-xs sm:text-sm transition-all" title="Pickup Basket">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path>
                </svg>
                <span class="hidden sm:inline">My Basket</span>
                <span class="cart-badge-count ${cartCount === 0 ? 'hidden' : ''} bg-[#0C831F] text-white font-extrabold text-xs px-2 py-0.5 rounded-full shadow-xs">
                  ${cartCount}
                </span>
              </a>

              <!-- User Auth Action -->
              ${isLoggedIn ? `
                <a href="${p}profile.html" class="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all" title="Customer Profile">
                  <div class="w-7 h-7 rounded-lg bg-slate-900 text-white font-extrabold flex items-center justify-center text-xs">
                    ${customer?.name ? customer.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span class="hidden sm:inline">${Utils.escapeHTML(customer?.name || 'Account')}</span>
                </a>
              ` : `
                <a href="${p}login.html" class="btn-primary text-xs sm:text-sm !py-2 !px-4 font-extrabold">
                  <span>Login</span>
                </a>
              `}
            </div>
          </div>
        </div>
      </header>
    `;

    // Trigger async background sync of shop data & PWA head
    this.initShopBranding();
  },

  /**
   * Render the standard footer
   */
  renderFooter() {
    const footerEl = document.getElementById('site-footer');
    if (!footerEl) return;
    const p = this.getPathPrefix();
    const shop = CONFIG.getShopInfo();
    const shopName = shop.shop_name || CONFIG.DEFAULT_SHOP_NAME;
    const logoUrl = shop.logo_url || '';

    footerEl.innerHTML = `
      <footer class="mt-auto border-t border-slate-200 bg-white text-slate-700">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            <div class="space-y-3">
              <div class="flex items-center gap-2.5">
                <div class="shop-logo-container w-8 h-8 rounded-lg bg-[#F8CB46] flex items-center justify-center text-slate-900 font-extrabold text-xs shadow-xs overflow-hidden shrink-0">
                  ${logoUrl ? `<img src="${logoUrl}" alt="${Utils.escapeHTML(shopName)}" class="w-full h-full object-cover" />` : Utils.escapeHTML((shopName.charAt(0) || 'S').toUpperCase())}
                </div>
                <div>
                  <span class="shop-name-display text-base font-extrabold text-slate-900 font-display block leading-tight">${Utils.escapeHTML(shopName)}</span>
                  <span class="text-[10px] text-slate-500 font-medium">powered by <strong class="text-slate-900">OrderSarthi</strong></span>
                </div>
              </div>
              <p class="text-xs text-slate-500 leading-relaxed shop-tagline-display">${Utils.escapeHTML(shop.description || shop.tagline || CONFIG.TAGLINE)}</p>
              
              <!-- Install Mobile App Link -->
              <button onclick="PWA.promptInstall()" class="pwa-install-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[#0C831F] hover:bg-emerald-100 text-xs font-bold transition-all">
                <svg class="w-4 h-4 text-[#0C831F]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                <span>📲 Install Mobile App</span>
              </button>
            </div>
            <div>
              <h4 class="text-slate-900 font-bold text-xs tracking-wider uppercase mb-3 font-display">Quick Links</h4>
              <ul class="space-y-2 text-xs">
                <li><a href="${p}index.html" class="hover:text-slate-900 transition-colors">Home</a></li>
                <li><a href="${p}shop.html" class="hover:text-slate-900 transition-colors">Categories & Products</a></li>
                <li><a href="${p}cart.html" class="hover:text-slate-900 transition-colors">My Basket</a></li>
                <li><a href="${p}orders.html" class="hover:text-slate-900 transition-colors">Order History & Re-order</a></li>
              </ul>
            </div>
            <div>
              <h4 class="text-slate-900 font-bold text-xs tracking-wider uppercase mb-3 font-display">How 10-Min Pickup Works</h4>
              <ul class="space-y-2 text-xs">
                <li>1. Add groceries to basket</li>
                <li>2. Choose pickup time slot</li>
                <li>3. Store handpicks & packs fresh</li>
                <li>4. Collect & pay at store with zero queue</li>
              </ul>
            </div>
            <div>
              <h4 class="text-slate-900 font-bold text-xs tracking-wider uppercase mb-3 font-display">Store Owner Admin</h4>
              <p class="text-xs text-slate-500 mb-3">Shop owner login, POS billing & order fulfillment portal.</p>
              <div class="flex flex-col gap-2">
                <a href="${p}admin/pos.html" class="inline-flex items-center gap-1.5 text-xs text-[#0C831F] hover:underline font-extrabold">
                  <span>⚡ Counter POS Billing</span>
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                </a>
                <a href="${p}admin/index.html" class="inline-flex items-center gap-1.5 text-xs text-slate-700 hover:text-slate-900 font-bold">
                  <span>Shop Owner Portal</span>
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                </a>
              </div>
            </div>
          </div>
          <div class="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <p>© ${new Date().getFullYear()} <span class="shop-name-display font-bold text-slate-700">${Utils.escapeHTML(shopName)}</span>. All rights reserved.</p>
            <p class="text-slate-500 flex items-center gap-1">
              <span>Platform by</span>
              <strong class="text-slate-900 font-bold">OrderSarthi</strong>
              <span>— Instant Store Pickup</span>
            </p>
          </div>
        </div>
      </footer>
    `;
  },

  /**
   * Render mobile sticky cart drawer/bar at bottom of viewport
   */
  renderMobileCartBar() {
    let barEl = document.getElementById('mobile-cart-bar');
    const p = this.getPathPrefix();

    if (!barEl) {
      barEl = document.createElement('div');
      barEl.id = 'mobile-cart-bar';
      barEl.className = 'mobile-cart-bar fixed bottom-0 left-0 right-0 z-40 md:hidden p-3.5 ' + (Cart.getTotalCount() === 0 ? 'hidden' : '');
      document.body.appendChild(barEl);
    }

    const count = Cart.getTotalCount();
    const subtotal = Cart.getSubtotal();
    const movStatus = Cart.getMinOrderStatus();

    barEl.innerHTML = `
      <div class="flex items-center justify-between gap-4 max-w-md mx-auto">
        <div class="flex flex-col">
          <span class="text-xs text-emerald-100 font-medium"><span class="cart-badge-count font-extrabold text-white">${count}</span> ITEMS IN BASKET</span>
          <div class="flex items-center gap-2">
            <span class="text-base font-extrabold text-white font-display cart-subtotal-display">${Utils.formatCurrency(subtotal)}</span>
            <span class="mobile-cart-mov-pill text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-400 text-amber-950 ${count > 0 && !movStatus.isMet ? '' : 'hidden'}">
              Add ₹${movStatus.deficit} for Min. ₹${movStatus.minOrder}
            </span>
          </div>
        </div>
        <a href="${p}cart.html" class="bg-white text-[#0C831F] font-extrabold text-xs py-2.5 px-4 rounded-xl hover:bg-emerald-50 transition-colors shadow-sm flex items-center gap-1 shrink-0">
          <span>View Basket</span>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
        </a>
      </div>
    `;
  },

  /**
   * Render Admin Navigation Header and Sidebar
   * @param {string} activePage
   */
  renderAdminNav(activePage = 'dashboard') {
    const navEl = document.getElementById('admin-nav');
    if (!navEl) return;

    this.initPwaHead();
    const admin = Auth.getAdmin();
    const p = window.location.pathname;
    const isInsideAdmin = p.includes('/admin/') || p.endsWith('/admin');
    const adminPrefix = isInsideAdmin ? (p.endsWith('/admin') ? './admin/' : './') : './admin/';
    const storePrefix = isInsideAdmin ? (p.endsWith('/admin') ? './' : '../') : './';
    const shop = CONFIG.getShopInfo();
    const shopName = shop.shop_name || CONFIG.DEFAULT_SHOP_NAME;
    const logoUrl = shop.logo_url || '';

    navEl.innerHTML = `
      <header class="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between h-16 sm:h-20">
            <!-- Brand & Admin Badge -->
            <div class="flex items-center gap-3">
              <a href="${adminPrefix}dashboard.html" class="flex items-center gap-2.5 group">
                <div class="shop-logo-container w-10 h-10 rounded-xl bg-[#F8CB46] flex items-center justify-center text-slate-900 font-extrabold font-display shadow-xs overflow-hidden shrink-0 border border-amber-300 group-hover:scale-105 transition-transform">
                  ${logoUrl ? `<img src="${logoUrl}" alt="${Utils.escapeHTML(shopName)}" class="w-full h-full object-cover" />` : Utils.escapeHTML((shopName.charAt(0) || 'S').toUpperCase())}
                </div>
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="shop-name-display text-base sm:text-lg font-extrabold text-slate-900 font-display leading-tight block truncate">${Utils.escapeHTML(shopName)}</span>
                  </div>
                  <span class="text-[10px] text-slate-500 font-medium block">powered by <strong class="text-slate-900">OrderSarthi</strong></span>
                </div>
              </a>
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide bg-amber-100 text-amber-900 border border-amber-200 shrink-0">Store Owner</span>
            </div>

            <!-- Admin Desktop Nav -->
            <nav class="hidden lg:flex items-center gap-1.5">
              <a href="${adminPrefix}pos.html" class="px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-xs ${activePage === 'pos' ? 'bg-[#0C831F] text-white shadow-emerald-700/20' : 'bg-emerald-50 text-[#0C831F] border border-emerald-200 hover:bg-[#0C831F] hover:text-white'}">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                <span>POS Billing</span>
              </a>
              <a href="${adminPrefix}dashboard.html" class="px-3 py-2 rounded-xl text-xs font-extrabold transition-colors ${activePage === 'dashboard' ? 'text-slate-900 bg-slate-100 border border-slate-200' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}">Dashboard</a>
              <a href="${adminPrefix}orders.html" class="px-3 py-2 rounded-xl text-xs font-extrabold transition-colors ${activePage === 'orders' ? 'text-slate-900 bg-slate-100 border border-slate-200' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}">Orders</a>
              <a href="${adminPrefix}products.html" class="px-3 py-2 rounded-xl text-xs font-extrabold transition-colors ${activePage === 'products' ? 'text-slate-900 bg-slate-100 border border-slate-200' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}">Products</a>
              <a href="${adminPrefix}categories.html" class="px-3 py-2 rounded-xl text-xs font-extrabold transition-colors ${activePage === 'categories' ? 'text-slate-900 bg-slate-100 border border-slate-200' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}">Categories</a>
              <a href="${adminPrefix}pickup-slots.html" class="px-3 py-2 rounded-xl text-xs font-extrabold transition-colors ${activePage === 'slots' ? 'text-slate-900 bg-slate-100 border border-slate-200' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}">Slots</a>
              <a href="${adminPrefix}customers.html" class="px-3 py-2 rounded-xl text-xs font-extrabold transition-colors ${activePage === 'customers' ? 'text-slate-900 bg-slate-100 border border-slate-200' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}">Customers</a>
              <a href="${adminPrefix}reports.html" class="px-3 py-2 rounded-xl text-xs font-extrabold transition-colors ${activePage === 'reports' ? 'text-slate-900 bg-slate-100 border border-slate-200' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}">Reports</a>
              <a href="${adminPrefix}settings.html" class="px-3 py-2 rounded-xl text-xs font-extrabold transition-colors ${activePage === 'settings' ? 'text-slate-900 bg-slate-100 border border-slate-200' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}">Settings</a>
            </nav>

            <!-- Admin Actions -->
            <div class="flex items-center gap-2 sm:gap-3">
              <button onclick="PWA.promptInstall()" class="pwa-install-btn hidden py-2 px-3 rounded-xl bg-emerald-50 border border-emerald-200 text-[#0C831F] hover:bg-emerald-100 text-xs font-extrabold flex items-center gap-1.5 transition-all" title="Install Mobile App">
                <svg class="w-4 h-4 text-[#0C831F]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                <span class="hidden sm:inline">Install App</span>
              </button>
              <span class="hidden xl:inline text-xs text-slate-600 font-bold">${Utils.escapeHTML(admin?.name || 'Administrator')}</span>
              <a href="${storePrefix}index.html" target="_blank" class="p-2.5 rounded-xl bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-xs font-extrabold flex items-center gap-1.5 transition-all" title="View Customer Storefront">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                <span class="hidden md:inline">View Shop</span>
              </a>
              <button onclick="Auth.logoutAdmin()" class="p-2.5 rounded-xl bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all" title="Logout">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
              </button>
            </div>
          </div>

          <!-- Mobile subnav for Admin -->
          <div class="flex lg:hidden overflow-x-auto py-2.5 gap-1.5 border-t border-slate-200 no-scrollbar text-xs">
            <a href="${adminPrefix}pos.html" class="px-3 py-1.5 rounded-xl shrink-0 flex items-center gap-1 font-black ${activePage === 'pos' ? 'bg-[#0C831F] text-white' : 'bg-emerald-50 text-[#0C831F] border border-emerald-200'}">
              <span>⚡ POS</span>
            </a>
            <a href="${adminPrefix}dashboard.html" class="px-3 py-1.5 rounded-xl shrink-0 font-extrabold ${activePage === 'dashboard' ? 'bg-slate-900 text-white' : 'text-slate-600 bg-slate-100'}">Dashboard</a>
            <a href="${adminPrefix}orders.html" class="px-3 py-1.5 rounded-xl shrink-0 font-extrabold ${activePage === 'orders' ? 'bg-slate-900 text-white' : 'text-slate-600 bg-slate-100'}">Orders</a>
            <a href="${adminPrefix}products.html" class="px-3 py-1.5 rounded-xl shrink-0 font-extrabold ${activePage === 'products' ? 'bg-slate-900 text-white' : 'text-slate-600 bg-slate-100'}">Products</a>
            <a href="${adminPrefix}categories.html" class="px-3 py-1.5 rounded-xl shrink-0 font-extrabold ${activePage === 'categories' ? 'bg-slate-900 text-white' : 'text-slate-600 bg-slate-100'}">Categories</a>
            <a href="${adminPrefix}pickup-slots.html" class="px-3 py-1.5 rounded-xl shrink-0 font-extrabold ${activePage === 'slots' ? 'bg-slate-900 text-white' : 'text-slate-600 bg-slate-100'}">Slots</a>
            <a href="${adminPrefix}customers.html" class="px-3 py-1.5 rounded-xl shrink-0 font-extrabold ${activePage === 'customers' ? 'bg-slate-900 text-white' : 'text-slate-600 bg-slate-100'}">Customers</a>
            <a href="${adminPrefix}reports.html" class="px-3 py-1.5 rounded-xl shrink-0 font-extrabold ${activePage === 'reports' ? 'bg-slate-900 text-white' : 'text-slate-600 bg-slate-100'}">Reports</a>
            <a href="${adminPrefix}settings.html" class="px-3 py-1.5 rounded-xl shrink-0 font-extrabold ${activePage === 'settings' ? 'bg-slate-900 text-white' : 'text-slate-600 bg-slate-100'}">Settings</a>
          </div>
        </div>
      </header>
    `;
  }
};
