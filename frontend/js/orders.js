/**
 * OrderSarthi — Customer Orders & Live Tracking Controller
 * Manages order history listing, visual status timelines, and rate-limited live tracking updates.
 */

const OrdersController = {
  state: {
    orders: [],
    currentOrder: null,
    pollingTimer: null,
    lastRefreshTime: 0
  },

  /**
   * Initialize Customer Order History View (orders.html)
   */
  async initOrdersPage() {
    UI.renderHeader('orders');
    UI.renderFooter();
    UI.setPageTitle('My Orders');

    if (!Auth.isCustomerLoggedIn()) {
      const container = document.getElementById('orders-list-container');
      if (container) {
        container.innerHTML = `
          <div class="bg-white border border-slate-200 rounded-2xl p-8 sm:p-12 text-center max-w-md mx-auto shadow-xs">
            <div class="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-4 text-[#0C831F]">
              <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
            </div>
            <h3 class="text-xl font-extrabold text-slate-900 font-display mb-2">Login to View Orders</h3>
            <p class="text-xs text-slate-500 mb-6 font-medium">Please login with your mobile number to view, track, and easily re-order your past orders.</p>
            <a href="./login.html?redirect=orders.html" class="btn-primary w-full text-sm font-extrabold">Login to Your Account</a>
          </div>
        `;
      }
      return;
    }

    await this.loadCustomerOrders();
  },

  /**
   * Load orders for current customer
   */
  async loadCustomerOrders() {
    const container = document.getElementById('orders-list-container');
    if (!container) return;

    try {
      this.state.orders = await api.get('getCustomerOrders');
      this.renderOrdersList();
    } catch (err) {
      container.innerHTML = `
        <div class="text-center py-12 text-rose-600 text-xs">
          Failed to load orders: ${Utils.escapeHTML(err.message)}
          <button onclick="OrdersController.loadCustomerOrders()" class="underline font-bold ml-2">Retry</button>
        </div>
      `;
    }
  },

  /**
   * Render orders cards list with items summary and re-order button
   */
  renderOrdersList() {
    const container = document.getElementById('orders-list-container');
    if (!container) return;

    if (this.state.orders.length === 0) {
      container.innerHTML = `
        <div class="bg-white border border-slate-200 rounded-2xl p-12 text-center max-w-md mx-auto shadow-xs">
          <div class="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-400">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
          </div>
          <h3 class="text-lg font-extrabold text-slate-900 font-display mb-1">No Orders Yet</h3>
          <p class="text-xs text-slate-500 mb-6 font-medium">You haven't placed any 10-minute pickup orders yet.</p>
          <a href="./shop.html" class="btn-primary text-sm font-extrabold">Start Shopping</a>
        </div>
      `;
      return;
    }

    container.innerHTML = this.state.orders.map(o => {
      const statusMeta = Utils.ORDER_STATUS_MAP[o.order_status] || { label: o.order_status, badgeClass: 'bg-slate-100 text-slate-700' };
      const isPaid = (o.payment_status === 'PAID');
      const isOnline = (o.payment_method === 'RAZORPAY');
      const items = o.items || [];
      const itemsPreview = items.length > 0
        ? items.map(i => `${i.quantity}x ${Utils.escapeHTML(i.product_name)}`).join(', ')
        : 'Store Pickup Items';

      return `
        <div class="bg-white rounded-3xl p-5 sm:p-6 flex flex-col gap-4 border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div class="flex items-center gap-2.5 flex-wrap">
              <span class="font-mono font-extrabold text-slate-900 text-base">${o.order_id}</span>
              <span class="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${statusMeta.badgeClass}">
                ${statusMeta.label}
              </span>
              <span class="px-2 py-0.5 rounded text-[10px] font-extrabold ${isPaid ? 'bg-emerald-100 text-[#0C831F] border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'}">
                ${isOnline ? (isPaid ? '✓ Paid Online (Razorpay)' : 'Razorpay Pending') : (isPaid ? '✓ Paid at Store' : 'Pay at Pickup')}
              </span>
            </div>
            <div class="text-xs text-slate-500 font-medium flex items-center gap-2">
              <span>📅 ${o.pickup_date} (${o.pickup_time_display})</span>
              <span>•</span>
              <span>${Utils.formatDate(o.created_at)}</span>
            </div>
          </div>

          <!-- Items Snippet -->
          <div class="text-xs text-slate-700 flex items-start gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 font-medium">
            <span class="text-[#0C831F] font-extrabold shrink-0">🛒 Items:</span>
            <span class="truncate text-slate-700">${itemsPreview}</span>
          </div>

          <!-- Bottom Actions & Total -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div>
              <div class="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Total Amount</div>
              <div class="text-lg font-extrabold text-[#0C831F] font-display">${Utils.formatCurrency(o.total_amount)}</div>
            </div>

            <div class="flex items-center gap-2.5">
              <!-- Re-order Button -->
              <button type="button" onclick="OrdersController.reorder('${o.order_id}')"
                class="btn-primary text-xs sm:text-sm !py-2 !px-3.5 flex items-center gap-1.5 shadow-xs font-extrabold hover:scale-105 transition-all"
                title="Re-order items from this order">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                <span>Re-order</span>
              </button>

              <!-- Track Order Button -->
              <a href="./track-order.html?id=${o.order_id}" class="btn-secondary text-xs sm:text-sm !py-2 !px-3.5 shrink-0 flex items-center gap-1.5 font-bold">
                <span>Track</span>
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"></path></svg>
              </a>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  /**
   * Re-order items from a past order
   * @param {string} orderId
   */
  async reorder(orderId) {
    if (!orderId) return;

    try {
      let order = this.state.orders.find(o => o.order_id === orderId);
      let items = order ? order.items : null;

      // If items not cached or empty, fetch from getOrderDetails
      if (!items || items.length === 0) {
        Utils.showToast('Fetching order items...', 'info');
        const details = await api.get('getOrderDetails', { orderId });
        items = details.items || [];
      }

      if (!items || items.length === 0) {
        Utils.showToast('No items found in this order to re-order.', 'warning');
        return;
      }

      // Add each item to Cart
      let addedCount = 0;
      for (const it of items) {
        Cart.addItem({
          product_id: it.product_id,
          product_name: it.product_name,
          selling_price: it.price,
          unit: it.unit || 'unit'
        }, it.quantity || 1);
        addedCount += (Number(it.quantity) || 1);
      }

      Utils.showToast(`${items.length} item(s) from Order #${orderId} added to your basket!`, 'success');
      setTimeout(() => {
        window.location.href = './cart.html';
      }, 500);
    } catch (err) {
      Utils.showToast(err.message || 'Failed to re-order items.', 'error');
    }
  },

  /**
   * Initialize Track Order Page (track-order.html)
   */
  async initTrackPage() {
    UI.renderHeader('track');
    UI.renderFooter();
    UI.setPageTitle('Live Order Tracking');

    const queryParams = Utils.getQueryParams();
    const orderId = queryParams.id;

    if (!orderId) {
      const container = document.getElementById('tracking-content');
      if (container) {
        container.innerHTML = `
          <div class="bg-white border border-slate-200 rounded-2xl p-8 text-center max-w-md mx-auto shadow-xs">
            <h3 class="text-lg font-extrabold text-slate-900 mb-2">Order ID Missing</h3>
            <p class="text-xs text-slate-500 mb-4 font-medium">Please provide a valid Order ID to track.</p>
            <a href="./orders.html" class="btn-primary text-xs font-extrabold">View My Orders</a>
          </div>
        `;
      }
      return;
    }

    await this.fetchTrackingDetails(orderId);

    // Setup auto-refresh every 15 seconds
    this.state.pollingTimer = setInterval(() => {
      this.fetchTrackingDetails(orderId, true);
    }, CONFIG.POLLING_INTERVAL_TRACKING_MS);
  },

  /**
   * Fetch single order details for live tracking
   * @param {string} orderId
   * @param {boolean} isBackground
   */
  async fetchTrackingDetails(orderId, isBackground = false) {
    const container = document.getElementById('tracking-content');
    if (!container) return;

    try {
      const order = await api.get('trackOrder', { orderId });
      this.state.currentOrder = order;
      this.renderTrackingView(order);
    } catch (err) {
      if (!isBackground) {
        container.innerHTML = `
          <div class="bg-white border border-slate-200 rounded-2xl p-8 text-center max-w-md mx-auto text-rose-600 text-xs shadow-xs">
            Failed to track order: ${Utils.escapeHTML(err.message)}
            <div class="mt-4"><a href="./orders.html" class="btn-secondary text-xs font-bold">Back to Orders</a></div>
          </div>
        `;
      }
    }
  },

  /**
   * Render tracking timeline and order summary
   * @param {Object} order
   */
  renderTrackingView(order) {
    const container = document.getElementById('tracking-content');
    if (!container) return;

    const statusMeta = Utils.ORDER_STATUS_MAP[order.order_status] || { label: order.order_status, badgeClass: 'bg-slate-100 text-slate-700', step: 1 };
    const currentStep = statusMeta.step;

    const steps = [
      { id: 'NEW', label: 'Order Received', desc: 'Shop has received your order request.', time: order.created_at },
      { id: 'ACCEPTED', label: 'Order Accepted', desc: 'Shop confirmed and scheduled your pickup.', time: order.accepted_at },
      { id: 'PREPARING', label: 'Preparing Items', desc: 'Shop staff is carefully packing your items.', time: order.preparing_at },
      { id: 'READY_FOR_PICKUP', label: 'Ready for Pickup', desc: 'Your package is ready! Visit store to collect.', time: order.ready_at },
      { id: 'PICKED_UP', label: 'Collected & Completed', desc: 'Order picked up at store. Thank you!', time: order.picked_up_at }
    ];

    const canCancel = (order.order_status === 'NEW' || order.order_status === 'ACCEPTED');

    container.innerHTML = `
      <!-- Order Header Card -->
      <div class="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 mb-6 shadow-xs">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-200">
          <div>
            <span class="text-xs font-extrabold text-[#0C831F] tracking-wider uppercase">Live Order Status</span>
            <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display mt-0.5">${order.order_id}</h1>
          </div>
          <div class="flex items-center gap-2.5 flex-wrap">
            <span class="px-3 py-1 rounded-full text-xs font-extrabold ${statusMeta.badgeClass}">
              ${statusMeta.label}
            </span>
            <!-- Re-order button on track page -->
            <button onclick="OrdersController.reorder('${order.order_id}')" class="btn-primary text-xs !py-1.5 !px-3 flex items-center gap-1 font-extrabold">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
              <span>Re-order</span>
            </button>
            <button onclick="OrdersController.fetchTrackingDetails('${order.order_id}')" class="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5" title="Refresh status">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
              <span>Refresh</span>
            </button>
          </div>
        </div>

        <!-- Pickup Slot Banner -->
        <div class="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 sm:p-5 flex items-center gap-4 mb-8">
          <div class="w-12 h-12 rounded-xl bg-[#0C831F] text-white flex items-center justify-center shrink-0 shadow-xs">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <div>
            <div class="text-xs text-[#0C831F] font-extrabold uppercase tracking-wider">Scheduled Pickup Window</div>
            <div class="text-base sm:text-lg font-extrabold text-slate-900 font-display">${order.pickup_date} • ${order.pickup_time_display}</div>
            <div class="text-xs text-slate-600 mt-0.5 font-medium">Please arrive at the store counter within this 30-minute window for 10-minute handover.</div>
          </div>
        </div>

        <!-- Visual Timeline Steps -->
        <div class="space-y-6 max-w-xl mx-auto py-2">
          ${steps.map((step, idx) => {
            const stepNum = idx + 1;
            const isDone = currentStep >= stepNum;
            const isCurrent = currentStep === stepNum;

            return `
              <div class="timeline-step flex items-start gap-4 ${isDone ? 'completed' : ''} ${isCurrent ? 'active' : ''}">
                <div class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-extrabold text-xs shadow-xs ${isDone ? 'bg-[#0C831F] text-white' : (isCurrent ? 'bg-[#0C831F] text-white ring-4 ring-emerald-200' : 'bg-slate-100 text-slate-400 border border-slate-200')}">
                  ${isDone ? `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>` : stepNum}
                </div>
                <div class="flex-1 pt-1">
                  <div class="flex items-center justify-between">
                    <h4 class="font-extrabold text-sm sm:text-base ${isDone || isCurrent ? 'text-slate-900' : 'text-slate-400'} font-display">${step.label}</h4>
                    ${step.time ? `<span class="text-[11px] text-slate-400 font-medium">${Utils.formatDate(step.time)}</span>` : ''}
                  </div>
                  <p class="text-xs text-slate-500 mt-0.5 font-medium">${step.desc}</p>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Payment Method Details Card -->
        <div class="mt-6 pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-medium">
          <div class="flex items-center gap-2">
            <span class="text-slate-500">Payment Status:</span>
            <span class="px-2.5 py-0.5 rounded text-[11px] font-extrabold ${order.payment_status === 'PAID' ? 'bg-emerald-100 text-[#0C831F] border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'}">
              ${order.payment_status === 'PAID' ? '✓ PAID' : 'PENDING'}
            </span>
          </div>
          <div class="text-slate-700 font-bold">
            ${order.payment_method === 'RAZORPAY' ? `<span class="text-[#0C831F] font-extrabold">Online Payment (Razorpay)</span>` : `<span>Pay at Store Counter (Cash/UPI)</span>`}
          </div>
        </div>

        ${canCancel ? `
          <div class="mt-6 pt-4 border-t border-slate-200 text-center">
            <button onclick="OrdersController.cancelOrder('${order.order_id}')" class="text-xs text-rose-600 hover:text-rose-700 font-extrabold transition-colors">
              Cancel This Order
            </button>
          </div>
        ` : ''}
      </div>

      <!-- Items Breakdown Card -->
      <div class="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-extrabold text-slate-900 font-display">Ordered Items</h3>
          <button onclick="OrdersController.reorder('${order.order_id}')" class="text-xs text-[#0C831F] hover:underline font-extrabold flex items-center gap-1">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
            <span>Re-order These Items</span>
          </button>
        </div>
        <div class="divide-y divide-slate-200">
          ${(order.items || []).map(item => `
            <div class="py-3 flex items-center justify-between gap-4 text-xs sm:text-sm">
              <div class="flex-1 font-medium">
                <span class="font-extrabold text-slate-900">${Utils.escapeHTML(item.product_name)}</span>
                <span class="text-slate-500 ml-1">(${Utils.escapeHTML(item.unit)}) × ${item.quantity}</span>
              </div>
              <div class="font-extrabold text-slate-900">${Utils.formatCurrency(item.item_total)}</div>
            </div>
          `).join('')}
        </div>

        <div class="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between text-base font-extrabold">
          <span class="text-slate-700">${order.payment_status === 'PAID' ? 'Total Paid Online' : 'Total Payable at Pickup'}</span>
          <span class="text-[#0C831F] text-xl font-display">${Utils.formatCurrency(order.total_amount)}</span>
        </div>
      </div>
    `;
  },

  /**
   * Cancel order
   * @param {string} orderId
   */
  async cancelOrder(orderId) {
    if (!confirm('Are you sure you want to cancel this order?')) return;

    try {
      await api.post('cancelOrder', { orderId });
      Utils.showToast('Order cancelled successfully.', 'info');
      await this.fetchTrackingDetails(orderId);
    } catch (err) {
      Utils.showToast(err.message || 'Failed to cancel order.', 'error');
    }
  }
};
