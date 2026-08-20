/**
 * OrderSarthi — Checkout Controller
 * Pickup slot selector, idempotency key generation, customer detail collection,
 * dynamic payment options (Online Razorpay vs Offline Pickup), and payment processing.
 */

const CheckoutController = {
  state: {
    selectedDate: '',
    selectedSlotId: '',
    availableSlots: [],
    storeHours: null,
    isStoreClosedToday: false,
    idempotencyKey: '',
    isSubmitting: false,
    shopInfo: null,
    selectedPaymentMethod: 'PAY_AT_PICKUP' // 'PAY_AT_PICKUP' | 'RAZORPAY'
  },

  /**
   * Initialize Checkout Page
   */
  async init() {
    // Guard: Enforce mandatory customer account before placing order
    if (!Auth.isCustomerLoggedIn()) {
      Auth.requireCustomer('login.html');
      return;
    }

    UI.renderHeader('checkout');
    UI.renderFooter();
    UI.setPageTitle('Checkout & Pickup Slot');

    const items = Cart.getItems();
    if (items.length === 0) {
      window.location.href = './cart.html';
      return;
    }

    // Generate or retrieve idempotency key for this session
    let existingKey = sessionStorage.getItem(CONFIG.STORAGE_KEYS.CHECKOUT_SESSION);
    if (!existingKey) {
      existingKey = Utils.uuid();
      sessionStorage.setItem(CONFIG.STORAGE_KEYS.CHECKOUT_SESSION, existingKey);
    }
    this.state.idempotencyKey = existingKey;

    const today = this.getLocalDateString(new Date());
    this.state.selectedDate = today;

    this.renderOrderSummary();
    this.prefillCustomerDetails();
    this.setupDateButtons();

    // Check for In-Store QR shopping mode
    if (sessionStorage.getItem('ordersarthi_instore_mode') === 'true') {
      const noteInput = document.getElementById('customer-note');
      if (noteInput && !noteInput.value) {
        noteInput.value = 'In-Store QR Walk-in Order (Immediate Counter Pickup)';
      }
    }

    // Fetch shop settings to configure payment modes
    await this.loadShopPaymentConfig();

    // Initial slot load for today
    await this.loadPickupSlots(today, true);

    this.setupSubmitHandler();
  },

  /**
   * Helper to format Date object into YYYY-MM-DD local string
   */
  getLocalDateString(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  /**
   * Prefill name & mobile if customer is logged in
   */
  prefillCustomerDetails() {
    const user = Auth.getCustomer();
    if (user) {
      const nameInput = document.getElementById('customer-name');
      const mobileInput = document.getElementById('customer-mobile');
      const badgeEl = document.getElementById('customer-account-badge');
      if (nameInput && user.name) nameInput.value = user.name;
      if (mobileInput && user.mobile) {
        mobileInput.value = user.mobile;
        mobileInput.readOnly = true;
      }
      if (badgeEl) {
        badgeEl.innerHTML = `
          <div class="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs mb-3">
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-[#0C831F] animate-pulse"></span>
              <span class="text-slate-700">Verified Account: <strong class="text-slate-900">${Utils.escapeHTML(user.name)}</strong> (${user.mobile})</span>
            </div>
            <a href="./profile.html" class="text-[#0C831F] hover:underline font-extrabold">Profile</a>
          </div>
        `;
      }
    }
  },

  /**
   * Load Shop Payment Modes and Render Payment Method Selector
   */
  async loadShopPaymentConfig() {
    try {
      this.state.shopInfo = await api.get('getShop');
    } catch (e) {
      this.state.shopInfo = CONFIG.getShopInfo();
    }

    const paymentMode = this.state.shopInfo?.payment_mode || CONFIG.DEFAULT_PAYMENT_MODE || 'BOTH';
    const razorpayEnabled = (this.state.shopInfo?.razorpay_enabled !== false);
    const container = document.getElementById('payment-methods-container');
    const tagEl = document.getElementById('payment-mode-tag');

    if (!container) return;

    // Determine available methods
    if (paymentMode === 'ONLINE_ONLY' || (!razorpayEnabled && paymentMode === 'ONLINE_ONLY')) {
      this.state.selectedPaymentMethod = 'RAZORPAY';
      if (tagEl) tagEl.textContent = 'Prepaid Only';
      container.innerHTML = `
        <label class="flex items-start gap-3.5 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 cursor-pointer shadow-xs">
          <input type="radio" name="payment_method" value="RAZORPAY" checked class="w-4 h-4 text-[#0C831F] border-slate-300 mt-1" />
          <div class="flex-1">
            <div class="flex items-center justify-between">
              <span class="text-xs sm:text-sm font-extrabold text-slate-900">Online Payment (Razorpay)</span>
              <span class="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-100 text-[#0C831F] border border-emerald-200">UPI / Cards / NetBanking</span>
            </div>
            <div class="text-[11px] text-slate-600 mt-1">Instant digital payment via Google Pay, PhonePe, Paytm, UPI Apps, Debit/Credit Cards, or NetBanking.</div>
            <div class="flex items-center gap-2 mt-2 pt-2 border-t border-emerald-200 text-[10px] text-[#0C831F] font-bold">
              <svg class="w-3.5 h-3.5 text-[#0C831F]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
              <span>100% Secure 256-bit Encrypted Checkout</span>
            </div>
          </div>
        </label>
      `;
    } else if (paymentMode === 'OFFLINE_ONLY' || !razorpayEnabled) {
      this.state.selectedPaymentMethod = 'PAY_AT_PICKUP';
      if (tagEl) tagEl.textContent = 'Pay at Pickup';
      container.innerHTML = `
        <label class="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer shadow-xs">
          <input type="radio" name="payment_method" value="PAY_AT_PICKUP" checked class="w-4 h-4 text-[#0C831F] border-slate-300 mt-1" />
          <div class="flex-1">
            <div class="flex items-center justify-between">
              <span class="text-xs sm:text-sm font-extrabold text-slate-900">Pay at Store Pickup</span>
              <span class="text-[10px] font-extrabold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">Counter Payment</span>
            </div>
            <div class="text-[11px] text-slate-600 mt-1">Pay conveniently via Cash or Shop UPI QR code when collecting your packed items at the store.</div>
          </div>
        </label>
      `;
    } else {
      // BOTH options available
      this.state.selectedPaymentMethod = 'RAZORPAY'; // Default to online for convenience
      if (tagEl) tagEl.textContent = 'Choose Payment Mode';
      container.innerHTML = `
        <div class="space-y-3">
          <!-- Razorpay Option -->
          <label class="payment-method-card flex items-start gap-3.5 p-4 rounded-2xl bg-emerald-50 border border-emerald-300 cursor-pointer hover:border-emerald-500 transition-all">
            <input type="radio" name="payment_method" value="RAZORPAY" checked onchange="CheckoutController.onPaymentMethodChange('RAZORPAY')" class="w-4 h-4 text-[#0C831F] border-slate-300 mt-1" />
            <div class="flex-1">
              <div class="flex items-center justify-between">
                <span class="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                  <span>Pay Online (Razorpay)</span>
                  <span class="text-[9px] px-1.5 py-0.2 rounded bg-emerald-600 text-white font-extrabold">Fastest</span>
                </span>
                <span class="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-100 text-[#0C831F] border border-emerald-200">UPI / Cards</span>
              </div>
              <div class="text-[11px] text-slate-600 mt-1 font-medium">Pay via Google Pay, PhonePe, Paytm, UPI, Cards, NetBanking for priority contactless pickup.</div>
            </div>
          </label>

          <!-- Pay at Pickup Option -->
          <label class="payment-method-card flex items-start gap-3.5 p-4 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer hover:border-slate-300 transition-all">
            <input type="radio" name="payment_method" value="PAY_AT_PICKUP" onchange="CheckoutController.onPaymentMethodChange('PAY_AT_PICKUP')" class="w-4 h-4 text-[#0C831F] border-slate-300 mt-1" />
            <div class="flex-1">
              <div class="flex items-center justify-between">
                <span class="text-xs sm:text-sm font-extrabold text-slate-900">Pay at Store Pickup</span>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">Cash / Store UPI</span>
              </div>
              <div class="text-[11px] text-slate-500 mt-1 font-medium">Pay at the store counter when you collect your items.</div>
            </div>
          </label>
        </div>
      `;
    }

    this.updateButtonLabel();
  },

  /**
   * Handle radio payment method change
   * @param {string} method
   */
  onPaymentMethodChange(method) {
    this.state.selectedPaymentMethod = method;
    this.updateButtonLabel();
  },

  /**
   * Update button and total label according to selected payment method
   */
  updateButtonLabel() {
    const btnText = document.getElementById('place-order-btn-text');
    const totalLabel = document.getElementById('checkout-total-label');
    const subtotal = Cart.getSubtotal();

    if (this.state.selectedPaymentMethod === 'RAZORPAY') {
      if (btnText) btnText.textContent = `Pay ${Utils.formatCurrency(subtotal)} & Confirm Order`;
      if (totalLabel) totalLabel.textContent = 'Total Online Payable:';
    } else {
      if (btnText) btnText.textContent = 'Confirm Order & Pickup Slot';
      if (totalLabel) totalLabel.textContent = 'Total Payable at Pickup:';
    }
  },

  /**
   * Setup date toggle buttons (Today, Tomorrow, Day After)
   */
  setupDateButtons() {
    const container = document.getElementById('date-selector-container');
    if (!container) return;

    const dates = [];
    for (let i = 0; i < 3; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const iso = this.getLocalDateString(d);
      const label = i === 0 ? 'Today' : (i === 1 ? 'Tomorrow' : Utils.formatDate(d, false).split(',')[0]);
      dates.push({ iso, label, isToday: i === 0 });
    }

    container.innerHTML = dates.map((d) => {
      const isSelected = this.state.selectedDate === d.iso;
      const isClosedToday = d.isToday && this.state.isStoreClosedToday;

      return `
        <button type="button" onclick="CheckoutController.selectDate('${d.iso}')"
          id="date-btn-${d.iso}"
          class="date-option-btn flex-1 py-3 px-3 rounded-xl border text-center font-bold text-xs sm:text-sm transition-all ${isSelected ? 'bg-[#0C831F] border-[#0C831F] text-white shadow-xs' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'} ${isClosedToday ? 'opacity-50' : ''}">
          <div class="font-extrabold flex items-center justify-center gap-1">
            <span>${d.label}</span>
            ${isClosedToday ? `<span class="text-[9px] px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 border border-rose-200">Closed</span>` : ''}
          </div>
          <div class="text-[11px] opacity-80 mt-0.5">${d.iso}</div>
        </button>
      `;
    }).join('');
  },

  /**
   * Switch selected pickup date
   * @param {string} dateStr
   */
  async selectDate(dateStr) {
    this.state.selectedDate = dateStr;
    this.state.selectedSlotId = '';
    this.setupDateButtons();
    await this.loadPickupSlots(dateStr);
  },

  /**
   * Load pickup slots for selected date
   * @param {string} dateStr
   * @param {boolean} isInitialCheck
   */
  async loadPickupSlots(dateStr, isInitialCheck = false) {
    const container = document.getElementById('slots-grid');
    if (!container) return;

    container.innerHTML = `
      <div class="col-span-full py-8 text-center text-slate-500 text-xs font-medium">
        <svg class="w-6 h-6 animate-spin mx-auto mb-2 text-[#0C831F]" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
        Checking store hours & pickup slots...
      </div>
    `;

    try {
      const res = await api.get('getPickupSlots', { date: dateStr });
      
      let rawSlots = [];
      if (Array.isArray(res)) {
        rawSlots = res;
      } else if (res && res.slots) {
        rawSlots = res.slots;
        this.state.storeHours = res.store_hours;

        // If today and store is closed for today, automatically shift to Tomorrow
        if (res.is_today && res.is_store_closed_for_today) {
          this.state.isStoreClosedToday = true;
          
          if (isInitialCheck || this.state.selectedDate === dateStr) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowIso = this.getLocalDateString(tomorrow);
            
            Utils.showToast(`Store is closed for today. Tomorrow's pickup slots are selected.`, 'info');
            this.state.selectedDate = tomorrowIso;
            this.setupDateButtons();
            return await this.loadPickupSlots(tomorrowIso, false);
          }
        }
      }

      this.state.availableSlots = rawSlots || [];

      // Auto-select the first open available slot if none selected
      const firstAvailable = this.state.availableSlots.find(s => !s.is_full && !s.is_past && s.is_active);
      if (firstAvailable && (!this.state.selectedSlotId || !this.state.availableSlots.some(s => s.slot_id === this.state.selectedSlotId))) {
        this.state.selectedSlotId = firstAvailable.slot_id;
      }

      this.setupDateButtons();
      this.renderPickupSlots();
    } catch (err) {
      container.innerHTML = `
        <div class="col-span-full py-6 text-center text-rose-600 text-xs">
          Failed to load slots. <button onclick="CheckoutController.loadPickupSlots('${dateStr}')" class="underline font-bold ml-1">Retry</button>
        </div>
      `;
    }
  },

  /**
   * Render pickup slots grid
   */
  renderPickupSlots() {
    const container = document.getElementById('slots-grid');
    if (!container) return;

    const slots = this.state.availableSlots;

    if (slots.length === 0) {
      container.innerHTML = `
        <div class="col-span-full py-8 text-center text-slate-500 text-xs bg-white border border-slate-200 rounded-2xl p-6">
          <p class="font-extrabold text-slate-900 mb-1">No Pickup Slots Available</p>
          <p class="text-[11px] text-slate-500">The store is closed or all pickup windows are booked for this date. Please select another date.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = slots.map(s => {
      const isPast = Boolean(s.is_past);
      const isFull = Boolean(s.is_full || !s.is_active || isPast);
      const isSelected = Boolean(this.state.selectedSlotId && this.state.selectedSlotId === s.slot_id);
      
      const startTimeFormatted = Utils.formatTime12(s.start_time);
      const endTimeFormatted = Utils.formatTime12(s.end_time);

      let statusBadge = `Available (${s.available_slots} left)`;
      if (isPast) {
        statusBadge = 'Window Passed';
      } else if (isFull) {
        statusBadge = 'Slot Full';
      }

      return `
        <button type="button"
          onclick="CheckoutController.selectSlot('${s.slot_id}')"
          ${isFull ? 'disabled' : ''}
          class="slot-btn p-3 rounded-xl border text-left transition-all relative cursor-pointer ${isSelected ? 'bg-emerald-50 border-[#0C831F] text-slate-900 ring-2 ring-[#0C831F]/30 shadow-xs' : (isFull ? 'bg-slate-100 border-slate-200 opacity-50 cursor-not-allowed text-slate-400' : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300 hover:bg-slate-50')}">
          <div class="text-xs sm:text-sm font-extrabold flex items-center justify-between">
            <span>${startTimeFormatted} – ${endTimeFormatted}</span>
            ${isSelected ? `
              <span class="w-5 h-5 rounded-full bg-[#0C831F] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                ✓
              </span>
            ` : ''}
          </div>
          <div class="text-[11px] mt-1 ${isFull ? 'text-rose-600 font-bold' : (isSelected ? 'text-[#0C831F] font-extrabold' : 'text-[#0C831F] font-bold')}">
            ${isSelected ? '● Selected Slot' : statusBadge}
          </div>
        </button>
      `;
    }).join('');
  },

  /**
   * Select a pickup slot
   * @param {string} slotId
   */
  selectSlot(slotId) {
    if (!slotId) return;
    this.state.selectedSlotId = slotId;
    this.renderPickupSlots();
  },

  /**
   * Render order summary breakdown
   */
  renderOrderSummary() {
    const container = document.getElementById('checkout-items-list');
    const totalDisplay = document.getElementById('checkout-total-display');
    const items = Cart.getItems();
    const subtotal = Cart.getSubtotal();

    if (totalDisplay) totalDisplay.textContent = Utils.formatCurrency(subtotal);

    if (container) {
      container.innerHTML = items.map(i => `
        <div class="flex items-center justify-between py-2.5 text-xs border-b border-slate-100 last:border-0">
          <div class="truncate max-w-[210px] text-slate-800 font-medium">
            <span class="font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded text-[11px] mr-1.5">${i.quantity}x</span> ${Utils.escapeHTML(i.product_name)}
          </div>
          <div class="font-mono font-extrabold text-slate-900">${Utils.formatCurrency(i.selling_price * i.quantity)}</div>
        </div>
      `).join('');
    }
  },

  /**
   * Launch Razorpay Standard Checkout Popup
   * @param {Object} orderPayload
   * @param {HTMLButtonElement} submitBtn
   */
  launchRazorpayPayment(orderPayload, submitBtn) {
    const keyId = this.state.shopInfo?.razorpay_key_id || CONFIG.RAZORPAY_KEY_ID;
    const subtotal = Cart.getSubtotal();
    const customer = Auth.getCustomer() || {};
    const shopName = this.state.shopInfo?.shop_name || CONFIG.DEFAULT_SHOP_NAME;

    if (typeof Razorpay === 'undefined') {
      Utils.showToast('Razorpay SDK is loading or blocked by your browser. Please try again.', 'error');
      this.resetSubmitButton(submitBtn);
      return;
    }

    const options = {
      key: keyId,
      amount: Math.round(subtotal * 100), // in paise
      currency: "INR",
      name: shopName,
      description: `Store Pickup Order (${Cart.getItems().length} items)`,
      image: this.state.shopInfo?.logo_url || "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=200&auto=format&fit=crop&q=80",
      prefill: {
        name: orderPayload.customer_name || customer.name || "",
        contact: orderPayload.customer_mobile || customer.mobile || "",
        email: customer.email || ""
      },
      notes: {
        pickup_slot_id: orderPayload.pickup_slot_id,
        notes: orderPayload.order_notes || "OrderSarthi Store Pickup"
      },
      theme: {
        color: "#4f46e5"
      },
      handler: async (response) => {
        // Payment success callback from Razorpay
        try {
          if (submitBtn) {
            submitBtn.innerHTML = `
              <svg class="w-4 h-4 animate-spin inline-block mr-2" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
              Confirming Online Payment...
            `;
          }

          // Attach verified Razorpay payment transaction id
          orderPayload.payment_method = 'RAZORPAY';
          orderPayload.razorpay_payment_id = response.razorpay_payment_id;
          orderPayload.razorpay_order_id = response.razorpay_order_id || '';
          orderPayload.razorpay_signature = response.razorpay_signature || '';

          const result = await api.post('createOrder', orderPayload);

          // Save order context for WhatsApp sharing on success page
          this.saveOrderContextForWhatsApp(result.orderId, orderPayload, true);

          sessionStorage.removeItem(CONFIG.STORAGE_KEYS.CHECKOUT_SESSION);
          Cart.clear();

          window.location.href = `./order-success.html?id=${encodeURIComponent(result.orderId)}&paid=true`;
        } catch (err) {
          this.resetSubmitButton(submitBtn);
          Utils.showToast(err.message || 'Payment received but failed to register order. Please contact store support.', 'error');
        }
      },
      modal: {
        ondismiss: () => {
          this.resetSubmitButton(submitBtn);
          Utils.showToast('Online payment cancelled. You can retry or switch payment method.', 'info');
        }
      }
    };

    try {
      const rzpInstance = new Razorpay(options);
      rzpInstance.on('payment.failed', (response) => {
        this.resetSubmitButton(submitBtn);
        Utils.showToast(`Payment Failed: ${response.error?.description || 'Transaction declined'}`, 'error');
      });
      rzpInstance.open();
    } catch (err) {
      this.resetSubmitButton(submitBtn);
      Utils.showToast('Failed to initialize Razorpay checkout popup. ' + err.message, 'error');
    }
  },

  /**
   * Reset Submit Button State
   * @param {HTMLButtonElement} submitBtn
   */
  resetSubmitButton(submitBtn) {
    this.state.isSubmitting = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      this.updateButtonLabel();
    }
  },

  /**
   * Form submission handler
   */
  setupSubmitHandler() {
    const form = document.getElementById('checkout-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (this.state.isSubmitting) return;

      if (!this.state.selectedSlotId) {
        Utils.showToast('Please select a pickup time slot.', 'warning');
        return;
      }

      const name = document.getElementById('customer-name').value.trim();
      const mobile = document.getElementById('customer-mobile').value.trim();
      const note = document.getElementById('customer-note')?.value.trim() || '';

      if (!name) {
        Utils.showToast('Please enter your full name.', 'warning');
        return;
      }

      if (!Utils.validateMobile(mobile)) {
        Utils.showToast('Please enter a valid 10-digit mobile number.', 'warning');
        return;
      }

      const items = Cart.getItems();
      if (items.length === 0) {
        Utils.showToast('Your cart is empty.', 'warning');
        return;
      }

      // Check selected payment method
      const methodRadio = document.querySelector('input[name="payment_method"]:checked');
      const selectedMethod = methodRadio ? methodRadio.value : this.state.selectedPaymentMethod;

      const submitBtn = document.getElementById('place-order-btn');
      this.state.isSubmitting = true;
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
          <svg class="w-4 h-4 animate-spin inline-block mr-2" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
          Processing...
        `;
      }

      const basePayload = {
        customer_name: name,
        customer_mobile: mobile.replace(/\D/g, ''),
        pickup_slot_id: this.state.selectedSlotId,
        order_notes: note,
        payment_method: selectedMethod,
        idempotency_key: this.state.idempotencyKey,
        items: items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity
        }))
      };

      // Flow 1: Online Razorpay
      if (selectedMethod === 'RAZORPAY') {
        this.launchRazorpayPayment(basePayload, submitBtn);
        return;
      }

      // Flow 2: Offline Pay at Store Pickup
      try {
        const result = await api.post('createOrder', basePayload);

        // Save order context for WhatsApp sharing on success page
        this.saveOrderContextForWhatsApp(result.orderId, basePayload, false);

        sessionStorage.removeItem(CONFIG.STORAGE_KEYS.CHECKOUT_SESSION);
        Cart.clear();

        window.location.href = `./order-success.html?id=${encodeURIComponent(result.orderId)}`;
      } catch (err) {
        this.resetSubmitButton(submitBtn);
        Utils.showToast(err.message || 'Failed to place order. Please try again.', 'error');
      }
    });
  },
  /**
   * Save order context to sessionStorage for WhatsApp sharing on success page
   * @param {string} orderId
   * @param {Object} payload
   * @param {boolean} isPaid
   */
  saveOrderContextForWhatsApp(orderId, payload, isPaid) {
    try {
      const items = Cart.getItems();
      const shopInfo = this.state.shopInfo || CONFIG.getShopInfo();
      const selectedSlot = this.state.availableSlots.find(s => s.slot_id === this.state.selectedSlotId);

      const context = {
        orderId: orderId,
        customerName: payload.customer_name,
        customerMobile: payload.customer_mobile,
        items: items.map(i => ({
          name: i.product_name,
          qty: i.quantity,
          price: i.selling_price,
          total: i.selling_price * i.quantity
        })),
        totalAmount: Cart.getSubtotal(),
        paymentMethod: payload.payment_method,
        isPaid: isPaid,
        pickupDate: this.state.selectedDate,
        pickupTime: selectedSlot ? `${Utils.formatTime12(selectedSlot.start_time)} – ${Utils.formatTime12(selectedSlot.end_time)}` : '',
        shopName: shopInfo?.shop_name || CONFIG.DEFAULT_SHOP_NAME,
        ownerWhatsApp: shopInfo?.whatsapp_number || shopInfo?.mobile || ''
      };

      sessionStorage.setItem('ordersarthi_wa_order_context', JSON.stringify(context));
    } catch (e) {
      console.warn('Failed to save WhatsApp order context:', e);
    }
  }
};

