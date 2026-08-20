/**
 * OrderSarthi — Admin Order Management Controller
 * Handles tabbed order workflows, state transitions with skeleton animations, detailed inspection modal, and auto-refresh.
 */

const AdminOrders = {
  state: {
    orders: [],
    selectedStatus: 'ALL',
    selectedDate: '',
    searchQuery: '',
    page: 1,
    limit: 30,
    hasMore: false,
    selectedOrderForModal: null,
    pollTimer: null,
    isActionPending: false
  },

  /**
   * Initialize Admin Orders View
   */
  async init() {
    Auth.requireAdmin();
    UI.renderAdminNav('orders');

    const queryParams = Utils.getQueryParams();
    if (queryParams.status) this.state.selectedStatus = queryParams.status;
    if (queryParams.date) this.state.selectedDate = queryParams.date;

    this.renderTabs();
    await this.loadOrders(true, true);

    this.setupListeners();

    // Auto-refresh orders every 30 seconds (without full skeleton flicker)
    this.state.pollTimer = setInterval(() => {
      if (!this.state.isActionPending) {
        this.loadOrders(false, false);
      }
    }, CONFIG.POLLING_INTERVAL_ORDERS_MS);
  },

  /**
   * Render status filter tabs
   */
  renderTabs() {
    const tabs = [
      { id: 'ALL', label: 'All Orders' },
      { id: 'NEW', label: 'New' },
      { id: 'ACCEPTED', label: 'Accepted' },
      { id: 'PREPARING', label: 'Preparing' },
      { id: 'READY_FOR_PICKUP', label: 'Ready' },
      { id: 'PICKED_UP', label: 'Picked Up' },
      { id: 'CANCELLED', label: 'Cancelled' },
      { id: 'REJECTED', label: 'Declined' }
    ];

    const container = document.getElementById('order-status-tabs');
    if (!container) return;

    container.innerHTML = tabs.map(t => `
      <button onclick="AdminOrders.setStatusTab('${t.id}')"
        class="px-3.5 py-1.5 rounded-xl text-xs font-extrabold tracking-wide shrink-0 transition-all ${this.state.selectedStatus === t.id ? 'bg-slate-900 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'}">
        ${t.label}
      </button>
    `).join('');
  },

  /**
   * Set active tab with skeleton loading
   * @param {string} status
   */
  async setStatusTab(status) {
    this.state.selectedStatus = status;
    this.renderTabs();
    await this.loadOrders(true, true);
  },

  /**
   * Render skeleton placeholder rows in the table
   * @param {number} count
   */
  renderSkeletonTable(count = 5) {
    const tbody = document.getElementById('orders-table-tbody');
    if (!tbody) return;

    const rows = [];
    for (let i = 0; i < count; i++) {
      rows.push(`
        <tr class="border-b border-slate-100 text-xs">
          <td class="py-4 px-4">
            <div class="h-4 w-28 skeleton mb-2"></div>
            <div class="h-3 w-20 skeleton"></div>
          </td>
          <td class="py-4 px-4">
            <div class="h-4 w-24 skeleton mb-2"></div>
            <div class="h-3 w-20 skeleton"></div>
          </td>
          <td class="py-4 px-4">
            <div class="h-4 w-24 skeleton mb-2"></div>
            <div class="h-3 w-16 skeleton"></div>
          </td>
          <td class="py-4 px-4">
            <div class="h-5 w-16 skeleton"></div>
          </td>
          <td class="py-4 px-4">
            <div class="h-5 w-20 skeleton rounded-full"></div>
          </td>
          <td class="py-4 px-4">
            <div class="h-5 w-16 skeleton rounded"></div>
          </td>
          <td class="py-4 px-4 text-right">
            <div class="h-7 w-28 skeleton rounded-xl ml-auto"></div>
          </td>
        </tr>
      `);
    }

    tbody.innerHTML = rows.join('');
  },

  /**
   * Load orders from server
   * @param {boolean} reset
   * @param {boolean} showSkeleton
   */
  async loadOrders(reset = false, showSkeleton = false) {
    if (reset) this.state.page = 1;
    if (showSkeleton) this.renderSkeletonTable(5);

    try {
      const result = await api.get('adminOrders', {
        status: this.state.selectedStatus,
        date: this.state.selectedDate,
        search: this.state.searchQuery,
        page: this.state.page,
        limit: this.state.limit
      }, true);

      this.state.orders = result.orders || [];
      this.state.hasMore = result.pagination?.has_more || false;
      this.renderOrdersTable();
    } catch (err) {
      console.warn("Failed to load admin orders:", err.message);
      const tbody = document.getElementById('orders-table-tbody');
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-12 text-rose-600 text-xs font-bold">Failed to load orders: ${Utils.escapeHTML(err.message)} <button onclick="AdminOrders.loadOrders(true, true)" class="underline font-bold ml-2">Retry</button></td></tr>`;
      }
    }
  },

  /**
   * Format pickup date cleanly (e.g. "2026-08-20")
   * @param {string} rawDate
   * @returns {string}
   */
  formatPickupDate(rawDate) {
    if (!rawDate) return '—';
    const str = String(rawDate).trim();
    if (str.includes('T')) return str.split('T')[0];
    if (str.includes(' ')) return str.split(' ')[0];
    return str;
  },

  /**
   * Render orders table rows
   */
  renderOrdersTable() {
    const tbody = document.getElementById('orders-table-tbody');
    if (!tbody) return;

    if (this.state.orders.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-12 text-slate-500 text-xs font-medium">No orders matching criteria.</td></tr>`;
      return;
    }

    tbody.innerHTML = this.state.orders.map(o => {
      const statusMeta = Utils.ORDER_STATUS_MAP[o.order_status] || { label: o.order_status, badgeClass: 'bg-slate-100 text-slate-700 border border-slate-200' };
      const cleanDate = this.formatPickupDate(o.pickup_date);

      return `
        <tr id="order-row-${o.order_id}" class="hover:bg-slate-50 transition-colors text-xs">
          <td class="py-3.5 px-4 font-mono font-extrabold text-slate-900">
            <button onclick="AdminOrders.viewOrderDetails('${o.order_id}')" class="text-[#0C831F] hover:underline flex items-center gap-1 text-left font-extrabold">
              <span>${o.order_id}</span>
              <svg class="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
            </button>
            <div class="text-[10px] text-slate-500 font-sans font-medium mt-0.5">${Utils.formatDate(o.created_at)}</div>
          </td>
          <td class="py-3.5 px-4 font-semibold text-slate-900">
            <div class="font-extrabold text-slate-900">${Utils.escapeHTML(o.customer_name)}</div>
            <div class="text-[11px] text-slate-500 font-mono font-medium">${o.customer_mobile || '—'}</div>
          </td>
          <td class="py-3.5 px-4">
            <div class="font-extrabold text-slate-900">${cleanDate}</div>
            <div class="text-[11px] text-emerald-800 font-semibold">${o.pickup_start} – ${o.pickup_end}</div>
          </td>
          <td class="py-3.5 px-4 font-extrabold text-slate-900 font-display text-sm">
            ${Utils.formatCurrency(o.total_amount)}
          </td>
          <td class="py-3.5 px-4">
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${statusMeta.badgeClass}">
              ${statusMeta.label}
            </span>
          </td>
          <td class="py-3.5 px-4">
            <div class="flex flex-col gap-1">
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold w-fit ${o.payment_status === 'PAID' ? 'bg-emerald-100 text-[#0C831F] border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'}">
                ${o.payment_status}
              </span>
              <span class="text-[10px] font-medium text-slate-500">
                ${o.payment_method === 'RAZORPAY' ? '⚡ Razorpay' : '🏪 Cash/UPI'}
              </span>
            </div>
          </td>
          <td class="py-3.5 px-4 text-right" id="action-cell-${o.order_id}">
            ${this.renderActionButtons(o)}
          </td>
        </tr>
      `;
    }).join('');
  },

  /**
   * Render action buttons based on current state machine node
   * @param {Object} o
   * @returns {string}
   */
  renderActionButtons(o) {
    const status = o.order_status;

    if (status === 'NEW') {
      return `
        <div class="flex items-center justify-end gap-1.5">
          <button onclick="AdminOrders.transitionStatus('${o.order_id}', 'ACCEPTED')" class="btn-primary !py-1.5 !px-3 text-[11px] shadow-xs">
            Accept
          </button>
          <button onclick="AdminOrders.transitionStatus('${o.order_id}', 'REJECTED')" class="btn-secondary !py-1.5 !px-2.5 text-[11px] text-rose-600 hover:bg-rose-50 border-rose-200">
            Decline
          </button>
          <button onclick="AdminOrders.sendWhatsAppStatusUpdate('${o.order_id}', '${Utils.escapeHTML(o.customer_name)}', '${o.customer_mobile}', '${status}', ${o.total_amount})" class="p-1.5 rounded-lg hover:bg-emerald-100 text-[#0C831F] transition-colors" title="Send WhatsApp update to customer">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          </button>
        </div>
      `;
    }

    if (status === 'ACCEPTED') {
      return `
        <div class="flex items-center justify-end gap-1.5">
          <button onclick="AdminOrders.transitionStatus('${o.order_id}', 'PREPARING')" class="btn-primary !py-1.5 !px-3.5 text-[11px] !bg-amber-600 hover:!bg-amber-700 shadow-xs">
            Start Preparing
          </button>
          <button onclick="AdminOrders.transitionStatus('${o.order_id}', 'CANCELLED')" class="btn-secondary !py-1.5 !px-2.5 text-[11px] text-rose-600 hover:bg-rose-50 border-rose-200">
            Cancel
          </button>
          <button onclick="AdminOrders.sendWhatsAppStatusUpdate('${o.order_id}', '${Utils.escapeHTML(o.customer_name)}', '${o.customer_mobile}', '${status}', ${o.total_amount})" class="p-1.5 rounded-lg hover:bg-emerald-100 text-[#0C831F] transition-colors" title="Send WhatsApp update to customer">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          </button>
        </div>
      `;
    }

    if (status === 'PREPARING') {
      return `
        <div class="flex items-center justify-end gap-1.5">
          <button onclick="AdminOrders.transitionStatus('${o.order_id}', 'READY_FOR_PICKUP')" class="btn-primary !py-1.5 !px-3.5 text-[11px] !bg-blue-600 hover:!bg-blue-700 shadow-xs">
            Mark Ready
          </button>
          <button onclick="AdminOrders.sendWhatsAppStatusUpdate('${o.order_id}', '${Utils.escapeHTML(o.customer_name)}', '${o.customer_mobile}', '${status}', ${o.total_amount})" class="p-1.5 rounded-lg hover:bg-emerald-100 text-[#0C831F] transition-colors" title="Send WhatsApp update to customer">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          </button>
        </div>
      `;
    }

    if (status === 'READY_FOR_PICKUP') {
      return `
        <div class="flex items-center justify-end gap-1.5">
          <button onclick="AdminOrders.transitionStatus('${o.order_id}', 'PICKED_UP')" class="btn-primary !py-1.5 !px-3.5 text-[11px] shadow-xs">
            Confirm Picked Up
          </button>
          <button onclick="AdminOrders.sendWhatsAppStatusUpdate('${o.order_id}', '${Utils.escapeHTML(o.customer_name)}', '${o.customer_mobile}', '${status}', ${o.total_amount})" class="p-1.5 rounded-lg hover:bg-emerald-100 text-[#0C831F] transition-colors" title="Send WhatsApp update to customer">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          </button>
        </div>
      `;
    }

    return `<span class="text-slate-400 text-[11px] font-mono">—</span>`;
  },

  /**
   * Execute state transition with skeleton row loading
   * @param {string} orderId
   * @param {string} nextStatus
   */
  async transitionStatus(orderId, nextStatus) {
    this.state.isActionPending = true;

    // Apply skeleton animation to the target row immediately
    const row = document.getElementById(`order-row-${orderId}`);
    if (row) {
      row.innerHTML = `
        <td class="py-4 px-4"><div class="h-4 w-28 skeleton mb-2"></div><div class="h-3 w-20 skeleton"></div></td>
        <td class="py-4 px-4"><div class="h-4 w-24 skeleton mb-2"></div><div class="h-3 w-20 skeleton"></div></td>
        <td class="py-4 px-4"><div class="h-4 w-24 skeleton mb-2"></div><div class="h-3 w-16 skeleton"></div></td>
        <td class="py-4 px-4"><div class="h-5 w-16 skeleton"></div></td>
        <td class="py-4 px-4"><div class="h-5 w-20 skeleton rounded-full"></div></td>
        <td class="py-4 px-4"><div class="h-5 w-16 skeleton rounded"></div></td>
        <td class="py-4 px-4 text-right"><div class="h-7 w-28 skeleton rounded-xl ml-auto"></div></td>
      `;
    }

    try {
      await api.post('adminUpdateOrderStatus', {
        orderId: orderId,
        status: nextStatus
      }, true);

      Utils.showToast(`Order #${orderId} moved to ${nextStatus}`, 'success');
      
      // Close modal if open for this order
      const modal = document.getElementById('order-detail-modal');
      if (modal && !modal.classList.contains('hidden')) {
        modal.classList.add('hidden');
      }

      // Offer to send WhatsApp update to customer
      const order = this.state.orders.find(o => o.order_id === orderId);
      if (order && order.customer_mobile) {
        this.promptWhatsAppUpdate(orderId, order.customer_name, order.customer_mobile, nextStatus, order.total_amount);
      }

      await this.loadOrders(false, false);
    } catch (err) {
      Utils.showToast(err.message || 'Status update failed.', 'error');
      await this.loadOrders(false, false);
    } finally {
      this.state.isActionPending = false;
    }
  },

  /**
   * View order items in modal dialog with skeleton loading
   * @param {string} orderId
   */
  async viewOrderDetails(orderId) {
    this.showSkeletonModal(orderId);

    try {
      const order = await api.get('getOrderDetails', { orderId }, true);
      this.showOrderModal(order);
    } catch (err) {
      Utils.showToast('Failed to fetch details: ' + err.message, 'error');
      const modal = document.getElementById('order-detail-modal');
      if (modal) modal.classList.add('hidden');
    }
  },

  /**
   * Show Skeleton loading modal placeholder
   * @param {string} orderId
   */
  showSkeletonModal(orderId) {
    let modal = document.getElementById('order-detail-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'order-detail-modal';
      modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm';
      document.body.appendChild(modal);
    }

    modal.classList.remove('hidden');
    modal.innerHTML = `
      <div class="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-200 shadow-2xl relative">
        <div class="flex items-center justify-between mb-4">
          <div>
            <div class="h-3 w-20 skeleton mb-2"></div>
            <h3 class="text-xl font-extrabold text-slate-900 font-mono">${orderId || 'Loading...'}</h3>
          </div>
          <button onclick="document.getElementById('order-detail-modal').classList.add('hidden')" class="text-slate-400 hover:text-slate-600 p-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div class="grid grid-cols-2 gap-3 py-4 border-y border-slate-100 mb-4">
          <div>
            <div class="h-3 w-16 skeleton mb-2"></div>
            <div class="h-4 w-28 skeleton mb-1"></div>
            <div class="h-3 w-20 skeleton"></div>
          </div>
          <div>
            <div class="h-3 w-16 skeleton mb-2"></div>
            <div class="h-4 w-28 skeleton mb-1"></div>
            <div class="h-3 w-20 skeleton"></div>
          </div>
        </div>

        <div class="space-y-3 mb-6">
          <div class="h-8 w-full skeleton rounded-xl"></div>
          <div class="h-8 w-full skeleton rounded-xl"></div>
          <div class="h-8 w-full skeleton rounded-xl"></div>
        </div>

        <div class="flex items-center justify-between pt-3 border-t border-slate-100">
          <div class="h-5 w-24 skeleton"></div>
          <div class="h-6 w-20 skeleton"></div>
        </div>
      </div>
    `;
  },

  /**
   * Show Order Details Modal
   * @param {Object} o
   */
  showOrderModal(o) {
    let modal = document.getElementById('order-detail-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'order-detail-modal';
      modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm';
      document.body.appendChild(modal);
    }

    const cleanDate = this.formatPickupDate(o.pickup_date);
    const statusMeta = Utils.ORDER_STATUS_MAP[o.order_status] || { label: o.order_status, badgeClass: 'bg-slate-100 text-slate-700 border border-slate-200' };

    modal.classList.remove('hidden');
    modal.innerHTML = `
      <div class="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-200 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button onclick="document.getElementById('order-detail-modal').classList.add('hidden')" class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>

        <div class="mb-4">
          <div class="flex items-center gap-2">
            <span class="text-xs text-[#0C831F] font-extrabold uppercase tracking-wider">Order Packing Slip</span>
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${statusMeta.badgeClass}">
              ${statusMeta.label}
            </span>
          </div>
          <h3 class="text-xl font-extrabold text-slate-900 font-display mt-0.5">${o.order_id}</h3>
        </div>

        <div class="grid grid-cols-2 gap-3 py-3 border-y border-slate-100 text-xs mb-4">
          <div>
            <span class="text-slate-500 block font-medium">Customer</span>
            <span class="font-extrabold text-slate-900">${Utils.escapeHTML(o.customer_name)}</span>
            <span class="text-slate-500 block font-mono text-[11px] font-medium">${o.customer_mobile || '—'}</span>
          </div>
          <div>
            <span class="text-slate-500 block font-medium">Pickup Window</span>
            <span class="font-extrabold text-slate-900">${cleanDate}</span>
            <span class="text-emerald-800 font-bold block">${o.pickup_time_display}</span>
          </div>
        </div>

        <h4 class="text-xs font-extrabold text-slate-900 uppercase tracking-wider mb-2 font-display">Items Packing List</h4>
        <div class="divide-y divide-slate-100 mb-4 max-h-48 overflow-y-auto pr-1">
          ${(o.items || []).map(i => `
            <div class="py-2.5 flex items-center justify-between text-xs">
              <div>
                <span class="font-extrabold text-slate-900">${Utils.escapeHTML(i.product_name)}</span>
                <span class="text-slate-500 font-medium">(${Utils.escapeHTML(i.unit)}) × <strong class="text-slate-900 font-mono font-extrabold">${i.quantity}</strong></span>
              </div>
              <span class="font-extrabold text-slate-900 font-mono">${Utils.formatCurrency(i.item_total)}</span>
            </div>
          `).join('')}
        </div>

        ${o.customer_note ? `
          <div class="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 mb-4 font-medium">
            <strong>Customer Note:</strong> ${Utils.escapeHTML(o.customer_note)}
          </div>
        ` : ''}

        <div class="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2 mb-4">
          <div class="flex items-center justify-between">
            <span class="text-slate-500 font-medium">Payment Mode:</span>
            <span class="font-extrabold text-slate-900">${o.payment_method === 'RAZORPAY' ? '⚡ Online (Razorpay)' : '🏪 Offline (Pay at Pickup)'}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-slate-500 font-medium">Payment Status:</span>
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${o.payment_status === 'PAID' ? 'bg-emerald-100 text-[#0C831F] border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'}">
              ${o.payment_status === 'PAID' ? 'PAID' : 'PENDING'}
            </span>
          </div>
          ${o.transaction_id ? `
            <div class="flex items-center justify-between pt-1 border-t border-slate-200">
              <span class="text-slate-500 font-medium">Transaction ID:</span>
              <span class="font-mono text-[11px] text-slate-800 font-extrabold">${Utils.escapeHTML(o.transaction_id)}</span>
            </div>
          ` : ''}
        </div>

        <div class="pt-3 border-t border-slate-200 flex items-center justify-between font-extrabold text-sm mb-6">
          <span class="text-slate-700">Total Amount:</span>
          <span class="text-[#0C831F] text-lg font-display">${Utils.formatCurrency(o.total_amount)}</span>
        </div>

        <div class="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div>
            ${this.renderActionButtons(o)}
          </div>
          <button onclick="document.getElementById('order-detail-modal').classList.add('hidden')" class="btn-secondary text-xs !py-1.5 !px-3 font-bold">
            Close
          </button>
        </div>
      </div>
    `;
  },

  /**
   * Prompt admin to send WhatsApp update after status transition
   * @param {string} orderId
   * @param {string} customerName
   * @param {string} customerMobile
   * @param {string} newStatus
   * @param {number} totalAmount
   */
  promptWhatsAppUpdate(orderId, customerName, customerMobile, newStatus, totalAmount) {
    // Show a floating prompt for 8 seconds
    let promptEl = document.getElementById('wa-status-prompt');
    if (promptEl) promptEl.remove();

    promptEl = document.createElement('div');
    promptEl.id = 'wa-status-prompt';
    promptEl.className = 'fixed bottom-5 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 px-5 py-3.5 rounded-2xl text-sm font-bold shadow-2xl border bg-white border-emerald-200 text-slate-900 transition-all';
    promptEl.innerHTML = `
      <svg class="w-5 h-5 text-[#0C831F] shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
      <span class="text-slate-800">Notify <strong class="text-slate-900 font-extrabold">${Utils.escapeHTML(customerName)}</strong> on WhatsApp?</span>
      <button onclick="AdminOrders.sendWhatsAppStatusUpdate('${orderId}', '${Utils.escapeHTML(customerName)}', '${customerMobile}', '${newStatus}', ${totalAmount}); document.getElementById('wa-status-prompt')?.remove();" class="px-3.5 py-1.5 rounded-xl text-xs font-extrabold text-white bg-[#0C831F] hover:bg-[#096818] transition-all shadow-xs">
        Send Update
      </button>
      <button onclick="document.getElementById('wa-status-prompt')?.remove()" class="text-slate-400 hover:text-slate-600 p-1">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
      </button>
    `;
    document.body.appendChild(promptEl);

    // Auto-dismiss after 8 seconds
    setTimeout(() => {
      promptEl?.remove();
    }, 8000);
  },

  /**
   * Send WhatsApp status update message to customer via deep link
   * @param {string} orderId
   * @param {string} customerName
   * @param {string} customerMobile
   * @param {string} currentStatus
   * @param {number} totalAmount
   */
  sendWhatsAppStatusUpdate(orderId, customerName, customerMobile, currentStatus, totalAmount) {
    if (!customerMobile) {
      Utils.showToast('Customer mobile number not available.', 'warning');
      return;
    }

    // Format phone: ensure country code (91 for India)
    let phone = String(customerMobile).replace(/\D/g, '');
    if (phone.length === 10) phone = '91' + phone;

    const shopName = CONFIG.getShopName();
    const statusMeta = Utils.ORDER_STATUS_MAP[currentStatus] || { label: currentStatus };

    // Build status-specific messages in Hindi+English
    const statusMessages = {
      'NEW': `📋 आपका ऑर्डर मिल गया है! हम जल्दी ही इसे confirm करेंगे।\n\n_Your order has been received. We will confirm it shortly._`,
      'ACCEPTED': `✅ आपका ऑर्डर accept कर लिया गया है! हम इसे तैयार करना शुरू करेंगे।\n\n_Your order has been accepted and will be prepared soon._`,
      'PREPARING': `👨‍🍳 आपका ऑर्डर तैयार हो रहा है! थोड़ी देर में ready होगा।\n\n_Your order is being prepared. It will be ready shortly._`,
      'READY_FOR_PICKUP': `🎉 आपका ऑर्डर तैयार है! कृपया store counter पर आकर collect करें।\n\n_Your order is READY FOR PICKUP! Please visit the store counter to collect._`,
      'PICKED_UP': `🙏 धन्यवाद! आपका ऑर्डर successfully handover हो गया है। फिर से आइए!\n\n_Thank you! Your order has been picked up. Visit us again!_`,
      'CANCELLED': `❌ आपका ऑर्डर cancel कर दिया गया है। किसी भी query के लिए store से संपर्क करें।\n\n_Your order has been cancelled. Contact the store for any queries._`,
      'REJECTED': `⚠️ माफ़ कीजिए, आपका ऑर्डर accept नहीं हो सका। कृपया store से संपर्क करें।\n\n_Sorry, your order could not be accepted. Please contact the store._`
    };

    let msg = `🏪 *${shopName} — Order Update*\n\n`;
    msg += `📋 *Order:* ${orderId}\n`;
    msg += `👤 *Customer:* ${customerName}\n`;
    msg += `📊 *Status:* ${statusMeta.label}\n`;
    if (totalAmount) msg += `💵 *Amount:* ₹${totalAmount}\n`;
    msg += `\n${statusMessages[currentStatus] || `Your order status has been updated to: ${statusMeta.label}`}`;
    msg += `\n\n_${shopName} — OrderSarthi_`;

    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
  },

  /**
   * Setup listeners for search & date filter
   */
  setupListeners() {
    const searchInput = document.getElementById('admin-order-search');
    if (searchInput) {
      searchInput.addEventListener('input', Utils.debounce((e) => {
        this.state.searchQuery = e.target.value;
        this.loadOrders(true, true);
      }, CONFIG.SEARCH_DEBOUNCE_MS));
    }

    const dateInput = document.getElementById('admin-order-date');
    if (dateInput) {
      dateInput.addEventListener('change', (e) => {
        this.state.selectedDate = e.target.value;
        this.loadOrders(true, true);
      });
    }
  }
};

