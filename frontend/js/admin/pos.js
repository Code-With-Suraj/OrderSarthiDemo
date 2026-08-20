/**
 * OrderSarthi — POS (Point of Sale) Counter Controller
 * Lightning-fast billing, keyboard shortcuts, barcode scanner listener,
 * dynamic change calculation, stock deduction, and WhatsApp/thermal receipts.
 */

const PosController = {
  state: {
    products: [],
    categories: [],
    cart: [],
    selectedCategory: '',
    searchQuery: '',
    discount: 0,
    paymentMode: 'CASH',
    cashReceived: 0,
    isLoading: false,
    completedOrder: null
  },

  /**
   * Initialize POS Screen
   */
  async init() {
    Auth.requireAdmin();
    UI.renderAdminNav('pos');
    UI.setPageTitle('POS Counter Billing');

    this.setupKeyboardShortcuts();
    this.setupSearchInput();
    await this.loadInitialData();
  },

  /**
   * Setup keyboard navigation & barcode scanner listeners
   */
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // F2 -> New Sale
      if (e.key === 'F2') {
        e.preventDefault();
        this.resetRegister();
      }
      // '/' -> Focus Search (unless typing in an input)
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        const searchInput = document.getElementById('pos-search');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }
      // Ctrl + Enter -> Submit Sale
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        this.submitPosOrder();
      }
      // Escape -> Close Receipt Modal
      if (e.key === 'Escape') {
        this.closeReceiptModal();
        const qrModal = document.getElementById('store-qr-modal');
        if (qrModal) qrModal.classList.add('hidden');
      }
    });
  },

  /**
   * Setup Search & Barcode input listener
   */
  setupSearchInput() {
    const input = document.getElementById('pos-search');
    const clearBtn = document.getElementById('pos-clear-search');
    if (!input) return;

    input.addEventListener('input', (e) => {
      this.state.searchQuery = e.target.value.trim().toLowerCase();
      if (clearBtn) {
        clearBtn.classList.toggle('hidden', !this.state.searchQuery);
      }
      this.renderProducts();
    });

    // Barcode scanner sends 'Enter' at end of scan
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const val = input.value.trim();
        if (!val) return;

        // Try exact match by barcode, SKU or product ID
        const matched = this.state.products.find(p => 
          (p.barcode && String(p.barcode).trim() === val) ||
          (p.sku && String(p.sku).trim().toLowerCase() === val.toLowerCase()) ||
          (p.product_id && String(p.product_id).trim() === val)
        );

        if (matched) {
          this.addToCart(matched);
          input.value = '';
          this.state.searchQuery = '';
          if (clearBtn) clearBtn.classList.add('hidden');
          this.renderProducts();
          Utils.showToast(`Added ${matched.product_name}`, 'success');
        }
      }
    });
  },

  /**
   * Clear search bar
   */
  clearSearch() {
    const input = document.getElementById('pos-search');
    const clearBtn = document.getElementById('pos-clear-search');
    if (input) input.value = '';
    this.state.searchQuery = '';
    if (clearBtn) clearBtn.classList.add('hidden');
    this.renderProducts();
  },

  /**
   * Load products and categories from backend
   */
  async loadInitialData() {
    const container = document.getElementById('pos-products-container');
    if (container) {
      container.innerHTML = `
        <div class="col-span-full py-16 text-center text-slate-400 space-y-2">
          <div class="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p class="text-xs">Loading product catalog & real-time stock...</p>
        </div>
      `;
    }

    try {
      const [prodsRes, catsRes] = await Promise.all([
        api.get('adminProducts', {}, true),
        api.get('getCategories', {}, false)
      ]);

      this.state.products = Array.isArray(prodsRes) ? prodsRes : (prodsRes?.products || []);
      this.state.categories = Array.isArray(catsRes) ? catsRes : (catsRes?.categories || []);

      this.renderCategoryFilters();
      this.renderProducts();
    } catch (err) {
      console.error("Failed to load POS data:", err);
      if (container) {
        container.innerHTML = `
          <div class="col-span-full py-12 text-center text-rose-400 text-xs">
            Failed to load products: ${Utils.escapeHTML(err.message || 'Server error')}
            <br>
            <button onclick="PosController.loadInitialData()" class="mt-2 text-indigo-400 underline font-bold">Retry</button>
          </div>
        `;
      }
    }
  },

  /**
   * Render category filter chips
   */
  renderCategoryFilters() {
    const container = document.getElementById('pos-category-filters');
    if (!container) return;

    let html = `
      <button onclick="PosController.filterCategory('')" 
        class="pos-cat-pill ${this.state.selectedCategory === '' ? 'bg-[#0C831F] text-white font-extrabold shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 font-bold'} px-3 py-1.5 rounded-xl shrink-0 transition-all text-xs">
        All Items (${this.state.products.length})
      </button>
    `;

    this.state.categories.forEach(cat => {
      const count = this.state.products.filter(p => p.category_id === cat.category_id).length;
      const isActive = this.state.selectedCategory === cat.category_id;
      html += `
        <button onclick="PosController.filterCategory('${cat.category_id}')" 
          class="pos-cat-pill ${isActive ? 'bg-[#0C831F] text-white font-extrabold shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 font-bold'} px-3 py-1.5 rounded-xl shrink-0 transition-all text-xs">
          ${Utils.escapeHTML(cat.category_name)} (${count})
        </button>
      `;
    });

    container.innerHTML = html;
  },

  /**
   * Filter product list by category
   */
  filterCategory(catId) {
    this.state.selectedCategory = catId;
    this.renderCategoryFilters();
    this.renderProducts();
  },

  /**
   * Render Product Grid Cards
   */
  renderProducts() {
    const container = document.getElementById('pos-products-container');
    if (!container) return;

    let filtered = this.state.products.filter(p => p.is_active !== false && p.is_active !== "FALSE" && p.is_active !== "false");

    if (this.state.selectedCategory) {
      filtered = filtered.filter(p => p.category_id === this.state.selectedCategory);
    }

    if (this.state.searchQuery) {
      const q = this.state.searchQuery;
      filtered = filtered.filter(p => 
        (p.product_name || '').toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q) ||
        (p.barcode || '').includes(q) ||
        (p.product_id || '').toLowerCase().includes(q)
      );
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="col-span-full py-12 text-center text-slate-500 font-medium text-xs">
          No matching products found.
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(prod => {
      const stock = Number(prod.stock_quantity) || 0;
      const isOutOfStock = stock <= 0 || prod.stock_status === 'OUT_OF_STOCK';
      const cartItem = this.state.cart.find(c => c.product_id === prod.product_id);
      const inCartQty = cartItem ? cartItem.quantity : 0;
      const price = Number(prod.selling_price) || 0;

      return `
        <div onclick="PosController.addToCartById('${prod.product_id}')"
          class="relative bg-white border ${inCartQty > 0 ? 'border-[#0C831F] ring-2 ring-emerald-500/20 shadow-xs' : 'border-slate-200'} hover:border-slate-300 rounded-2xl p-3 flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.01] select-none group">
          
          <!-- Top Stock & In-Cart Badge -->
          <div class="flex items-center justify-between mb-2">
            <span class="text-[10px] font-extrabold px-2 py-0.5 rounded-full ${isOutOfStock ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-emerald-100 text-[#0C831F] border border-emerald-200'}">
              ${isOutOfStock ? 'Out of Stock' : `${stock} ${Utils.escapeHTML(prod.unit || 'in stock')}`}
            </span>
            ${inCartQty > 0 ? `
              <span class="w-5 h-5 bg-[#0C831F] text-white font-extrabold text-[10px] rounded-full flex items-center justify-center shadow-xs">
                ${inCartQty}
              </span>
            ` : ''}
          </div>

          <!-- Product Details -->
          <div class="space-y-1">
            <h4 class="text-xs font-extrabold text-slate-900 group-hover:text-[#0C831F] transition-colors line-clamp-2 leading-tight">
              ${Utils.escapeHTML(prod.product_name)}
            </h4>
            <div class="text-[10px] text-slate-500 font-medium">
              ${prod.sku ? `SKU: ${Utils.escapeHTML(prod.sku)} • ` : ''}₹${price}/${Utils.escapeHTML(prod.unit || 'unit')}
            </div>
          </div>

          <!-- Price & Quick Add Button -->
          <div class="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span class="text-sm font-black text-[#0C831F] font-display">
              ₹${price}
            </span>
            <button class="w-7 h-7 rounded-lg bg-emerald-100 hover:bg-[#0C831F] text-[#0C831F] hover:text-white flex items-center justify-center text-xs font-extrabold transition-all shadow-xs">
              +
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  /**
   * Add product to POS Cart by ID
   */
  addToCartById(productId) {
    const prod = this.state.products.find(p => p.product_id === productId);
    if (prod) this.addToCart(prod);
  },

  /**
   * Add product to POS Cart
   */
  addToCart(product) {
    const existing = this.state.cart.find(c => c.product_id === product.product_id);
    const stock = Number(product.stock_quantity) || 0;

    if (existing) {
      if (existing.quantity >= stock && stock > 0) {
        Utils.showToast(`Warning: Only ${stock} items available in stock.`, 'warning');
      }
      existing.quantity += 1;
      existing.item_total = existing.quantity * existing.price;
    } else {
      const price = Number(product.selling_price) || 0;
      this.state.cart.push({
        product_id: product.product_id,
        product_name: product.product_name,
        price: price,
        mrp: Number(product.mrp) || price,
        unit: product.unit || 'unit',
        stock_quantity: stock,
        quantity: 1,
        item_total: price
      });
    }

    this.renderCart();
    this.renderProducts();
  },

  /**
   * Update quantity of item in cart
   */
  updateCartQty(productId, delta) {
    const item = this.state.cart.find(c => c.product_id === productId);
    if (!item) return;

    item.quantity += delta;
    if (item.quantity <= 0) {
      this.removeFromCart(productId);
      return;
    }

    item.item_total = item.quantity * item.price;
    this.renderCart();
    this.renderProducts();
  },

  /**
   * Set exact quantity
   */
  setCartQty(productId, val) {
    const item = this.state.cart.find(c => c.product_id === productId);
    if (!item) return;

    const num = Math.max(1, parseInt(val) || 1);
    item.quantity = num;
    item.item_total = item.quantity * item.price;
    this.renderCart();
    this.renderProducts();
  },

  /**
   * Remove item from cart
   */
  removeFromCart(productId) {
    this.state.cart = this.state.cart.filter(c => c.product_id !== productId);
    this.renderCart();
    this.renderProducts();
  },

  /**
   * Clear all items in cart
   */
  clearCart() {
    if (this.state.cart.length === 0) return;
    this.state.cart = [];
    this.renderCart();
    this.renderProducts();
  },

  /**
   * Reset register for new sale
   */
  resetRegister() {
    this.state.cart = [];
    this.state.discount = 0;
    this.state.cashReceived = 0;
    this.state.paymentMode = 'CASH';

    const discInput = document.getElementById('pos-discount');
    const cashInput = document.getElementById('pos-cash-received');
    const nameInput = document.getElementById('pos-customer-name');
    const mobInput = document.getElementById('pos-customer-mobile');

    if (discInput) discInput.value = '0';
    if (cashInput) cashInput.value = '';
    if (nameInput) nameInput.value = '';
    if (mobInput) mobInput.value = '';

    this.setPaymentMode('CASH');
    this.renderCart();
    this.renderProducts();
    this.clearSearch();
  },

  /**
   * Toggle Customer Name & Mobile fields
   */
  toggleCustomerDetails() {
    const fields = document.getElementById('pos-customer-fields');
    const toggleBtn = document.getElementById('pos-cust-toggle');
    if (!fields) return;

    const isHidden = fields.classList.contains('hidden');
    fields.classList.toggle('hidden', !isHidden);
    if (toggleBtn) {
      toggleBtn.textContent = isHidden ? '− Hide Details' : '+ Add Mobile / Name';
    }
  },

  /**
   * Render Cart in Sidebar
   */
  renderCart() {
    const container = document.getElementById('pos-cart-items');
    const badge = document.getElementById('pos-item-count-badge');
    if (!container) return;

    const totalCount = this.state.cart.reduce((acc, c) => acc + c.quantity, 0);
    if (badge) badge.textContent = `${totalCount} item${totalCount === 1 ? '' : 's'}`;

    if (this.state.cart.length === 0) {
      container.innerHTML = `
        <div class="text-center py-10 text-slate-400 text-xs font-medium">
          <svg class="w-8 h-8 mx-auto mb-2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
          <span>No items in cart. Click or scan products to add.</span>
        </div>
      `;
      this.recalcTotals();
      return;
    }

    container.innerHTML = this.state.cart.map(item => `
      <div class="p-2.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2 text-xs">
        <div class="flex-1 min-w-0">
          <div class="font-extrabold text-slate-900 truncate">${Utils.escapeHTML(item.product_name)}</div>
          <div class="text-[11px] text-slate-500 font-medium">
            ₹${item.price} × ${item.quantity} = <strong class="text-slate-900 font-extrabold">₹${item.item_total.toFixed(2)}</strong>
          </div>
        </div>

        <!-- Quantity Controls -->
        <div class="flex items-center gap-1 shrink-0">
          <button onclick="PosController.updateCartQty('${item.product_id}', -1)"
            class="w-6 h-6 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-extrabold flex items-center justify-center shadow-xs">
            −
          </button>
          <input type="number" min="1" value="${item.quantity}" onchange="PosController.setCartQty('${item.product_id}', this.value)"
            class="w-10 bg-white border border-slate-200 rounded-lg text-center text-xs text-slate-900 py-0.5 font-extrabold focus:outline-none focus:border-[#0C831F]">
          <button onclick="PosController.updateCartQty('${item.product_id}', 1)"
            class="w-6 h-6 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-extrabold flex items-center justify-center shadow-xs">
            +
          </button>
          <button onclick="PosController.removeFromCart('${item.product_id}')"
            class="w-6 h-6 rounded-lg bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-600 flex items-center justify-center ml-1" title="Remove">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
      </div>
    `).join('');

    this.recalcTotals();
  },

  /**
   * Recalculate bill totals
   */
  recalcTotals() {
    const subtotal = this.state.cart.reduce((acc, c) => acc + c.item_total, 0);
    const discInput = document.getElementById('pos-discount');
    const discount = discInput ? Math.max(0, parseFloat(discInput.value) || 0) : 0;
    this.state.discount = discount;

    const grandTotal = Math.max(0, subtotal - discount);

    const subtotalEl = document.getElementById('pos-subtotal-val');
    const grandTotalEl = document.getElementById('pos-grand-total');

    if (subtotalEl) subtotalEl.textContent = Utils.formatCurrency(subtotal);
    if (grandTotalEl) grandTotalEl.textContent = Utils.formatCurrency(grandTotal);

    this.recalcChange();
  },

  /**
   * Set active payment method
   */
  setPaymentMode(mode) {
    this.state.paymentMode = mode;
    document.querySelectorAll('.pos-pay-btn').forEach(btn => {
      btn.className = 'pos-pay-btn py-2 rounded-xl text-xs font-extrabold bg-white text-slate-700 border border-slate-200 hover:border-slate-300 flex flex-col items-center gap-1 transition-all';
    });

    const activeBtn = document.getElementById(`pos-pay-${mode.toLowerCase()}`);
    if (activeBtn) {
      activeBtn.className = 'pos-pay-btn active py-2 rounded-xl text-xs font-extrabold bg-[#0C831F] text-white border border-emerald-600 flex flex-col items-center gap-1 transition-all shadow-xs';
    }

    const cashBox = document.getElementById('pos-cash-tender-box');
    if (cashBox) {
      cashBox.classList.toggle('hidden', mode !== 'CASH');
    }
  },

  /**
   * Recalculate cash change return
   */
  recalcChange() {
    const cashInput = document.getElementById('pos-cash-received');
    const changeEl = document.getElementById('pos-change-return');
    if (!cashInput || !changeEl) return;

    const subtotal = this.state.cart.reduce((acc, c) => acc + c.item_total, 0);
    const grandTotal = Math.max(0, subtotal - this.state.discount);
    const received = parseFloat(cashInput.value) || 0;
    this.state.cashReceived = received;

    const change = Math.max(0, received - grandTotal);
    changeEl.textContent = Utils.formatCurrency(change);
  },

  /**
   * Submit POS Order to backend
   */
  async submitPosOrder() {
    if (this.state.cart.length === 0) {
      Utils.showToast('Please add items to cart before completing sale.', 'error');
      return;
    }

    if (this.state.isLoading) return;
    this.state.isLoading = true;

    const submitBtn = document.getElementById('pos-submit-btn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        <span>Processing Sale & Updating Stock...</span>
      `;
    }

    try {
      const custName = (document.getElementById('pos-customer-name')?.value || '').trim() || 'Walk-in Customer';
      const custMob = (document.getElementById('pos-customer-mobile')?.value || '').trim().replace(/\D/g, '');

      const payload = {
        customerName: custName,
        customerMobile: custMob,
        paymentMethod: this.state.paymentMode,
        paymentStatus: this.state.paymentMode === 'DUE' ? 'PENDING' : 'PAID',
        discount: this.state.discount,
        tax: 0,
        items: this.state.cart.map(c => ({
          product_id: c.product_id,
          product_name: c.product_name,
          price: c.price,
          quantity: c.quantity,
          unit: c.unit
        }))
      };

      const result = await api.post('adminCreatePosOrder', payload, true);
      this.state.completedOrder = result;

      Utils.showToast(`Order ${result.orderId} completed! Stock updated.`, 'success');

      // Update local product stock quantities immediately
      payload.items.forEach(it => {
        const p = this.state.products.find(x => x.product_id === it.product_id);
        if (p) {
          p.stock_quantity = Math.max(0, (Number(p.stock_quantity) || 0) - it.quantity);
          if (p.stock_quantity <= 0) p.stock_status = 'OUT_OF_STOCK';
        }
      });

      // Show receipt modal
      this.showReceiptModal(result);

      // Clear cart
      this.state.cart = [];
      this.state.discount = 0;
      this.state.cashReceived = 0;
      const discInput = document.getElementById('pos-discount');
      const cashInput = document.getElementById('pos-cash-received');
      if (discInput) discInput.value = '0';
      if (cashInput) cashInput.value = '';

      this.renderCart();
      this.renderProducts();
    } catch (err) {
      console.error("POS sale submission failed:", err);
      Utils.showToast(`Sale failed: ${err.message || 'Server error'}`, 'error');
    } finally {
      this.state.isLoading = false;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
          <span>Complete Sale & Deduct Stock</span>
        `;
      }
    }
  },

  /**
   * Show receipt preview modal
   */
  showReceiptModal(order) {
    const modal = document.getElementById('pos-receipt-modal');
    const container = document.getElementById('printable-receipt');
    if (!modal || !container) return;

    const shop = CONFIG.getShopInfo();
    const shopName = shop.shop_name || CONFIG.DEFAULT_SHOP_NAME;

    let itemsRows = (order.items || []).map(i => `
      <div class="flex justify-between py-0.5 border-b border-dashed border-slate-300">
        <span class="truncate pr-2">${Utils.escapeHTML(i.product_name)} (x${i.quantity})</span>
        <span class="font-bold shrink-0">₹${Number(i.item_total).toFixed(2)}</span>
      </div>
    `).join('');

    container.innerHTML = `
      <div class="text-center space-y-1 pb-2 border-b border-dashed border-slate-400">
        <div class="text-sm font-black uppercase tracking-wider">${Utils.escapeHTML(shopName)}</div>
        <div class="text-[10px] text-slate-600">${Utils.escapeHTML(shop.address || 'Retail Store')}</div>
        <div class="text-[10px] text-slate-600">${shop.mobile ? 'Ph: ' + shop.mobile : ''}</div>
      </div>

      <div class="text-[11px] py-1 border-b border-dashed border-slate-300 space-y-0.5">
        <div class="flex justify-between">
          <span>Order No:</span>
          <span class="font-bold">${order.orderId}</span>
        </div>
        <div class="flex justify-between">
          <span>Date & Time:</span>
          <span>${order.createdAt || Utils.nowIST()}</span>
        </div>
        <div class="flex justify-between">
          <span>Customer:</span>
          <span>${Utils.escapeHTML(order.customerName || 'Walk-in')}</span>
        </div>
        ${order.customerMobile ? `
          <div class="flex justify-between">
            <span>Mobile:</span>
            <span>${order.customerMobile}</span>
          </div>
        ` : ''}
      </div>

      <!-- Line Items -->
      <div class="py-1 space-y-1">
        ${itemsRows}
      </div>

      <!-- Totals -->
      <div class="pt-2 border-t-2 border-dashed border-slate-400 space-y-1 text-xs">
        <div class="flex justify-between text-slate-700">
          <span>Subtotal:</span>
          <span>₹${Number(order.subtotal).toFixed(2)}</span>
        </div>
        ${order.discount > 0 ? `
          <div class="flex justify-between text-slate-700">
            <span>Discount:</span>
            <span>-₹${Number(order.discount).toFixed(2)}</span>
          </div>
        ` : ''}
        <div class="flex justify-between text-sm font-black border-t border-slate-400 pt-1">
          <span>TOTAL:</span>
          <span>₹${Number(order.totalAmount).toFixed(2)}</span>
        </div>
        <div class="flex justify-between text-[11px] text-slate-600">
          <span>Payment:</span>
          <span class="font-bold uppercase">${order.paymentMethod} (${order.paymentStatus})</span>
        </div>
      </div>

      <div class="text-center pt-3 border-t border-dashed border-slate-300 text-[10px] text-slate-500">
        <p>Thank you for shopping with us!</p>
        <p class="font-semibold text-slate-700 mt-0.5">Powered by OrderSarthi</p>
      </div>
    `;

    modal.classList.remove('hidden');
  },

  /**
   * Close Receipt Modal
   */
  closeReceiptModal() {
    const modal = document.getElementById('pos-receipt-modal');
    if (modal) modal.classList.add('hidden');
  },

  /**
   * Trigger browser thermal/PDF printing
   */
  printReceipt() {
    window.print();
  },

  /**
   * Format and share bill on WhatsApp
   */
  shareWhatsAppReceipt() {
    if (!this.state.completedOrder) return;
    const order = this.state.completedOrder;
    const shop = CONFIG.getShopInfo();
    const shopName = shop.shop_name || CONFIG.DEFAULT_SHOP_NAME;

    let itemsText = (order.items || []).map(i => `• ${i.product_name} x ${i.quantity} = ₹${i.item_total}`).join('\n');

    let text = `🧾 *${shopName}* — Order Bill\n\n`;
    text += `*Order ID:* ${order.orderId}\n`;
    text += `*Customer:* ${order.customerName}\n`;
    text += `*Date:* ${order.createdAt || ''}\n\n`;
    text += `*Items:*\n${itemsText}\n\n`;
    text += `*Total Amount:* ₹${order.totalAmount}\n`;
    text += `*Payment:* ${order.paymentMethod} (${order.paymentStatus})\n\n`;
    text += `Thank you for shopping with us! 🙏`;

    const mob = order.customerMobile ? `91${order.customerMobile}` : '';
    const url = `https://api.whatsapp.com/send?phone=${mob}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  },

  /**
   * Show Store QR code modal for table/counter scanning
   */
  showStoreQrModal() {
    const modal = document.getElementById('store-qr-modal');
    const img = document.getElementById('store-qr-img');
    const download = document.getElementById('store-qr-download');
    if (!modal || !img) return;

    // Get current public storefront URL with in-store source param
    const baseUrl = window.location.origin + window.location.pathname.replace(/\/admin\/.*$/, '') + '/index.html?source=qr';
    const qrApi = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(baseUrl)}`;

    img.src = qrApi;
    if (download) download.href = qrApi;

    modal.classList.remove('hidden');
  }
};
