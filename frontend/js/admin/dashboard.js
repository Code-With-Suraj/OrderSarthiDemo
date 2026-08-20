/**
 * OrderSarthi — Admin Dashboard Controller
 * Real-time sales metrics, pending order alerts, low stock warnings, and 30-second background polling.
 */

const AdminDashboard = {
  state: {
    stats: null,
    pollTimer: null
  },

  /**
   * Initialize Admin Dashboard
   */
  async init() {
    Auth.requireAdmin();
    UI.renderAdminNav('dashboard');

    await this.loadStats();

    // 30-second background polling
    this.state.pollTimer = setInterval(() => {
      this.loadStats(true);
    }, CONFIG.POLLING_INTERVAL_ORDERS_MS);
  },

  /**
   * Load dashboard metrics
   * @param {boolean} isBackground
   */
  async loadStats(isBackground = false) {
    try {
      this.state.stats = await api.get('adminDashboard', {}, true);
      this.renderMetrics();
      this.renderRecentOrders();
      this.renderLowStock();
    } catch (err) {
      if (!isBackground) {
        Utils.showToast('Failed to load dashboard: ' + err.message, 'error');
      }
    }
  },

  /**
   * Render Top KPI Cards
   */
  renderMetrics() {
    const s = this.state.stats;
    if (!s) return;

    document.getElementById('metric-today-sales').textContent = Utils.formatCurrency(s.today_sales || 0);
    document.getElementById('metric-today-orders').textContent = s.today_orders || 0;
    document.getElementById('metric-pending-orders').textContent = s.pending_orders || 0;
    document.getElementById('metric-preparing-orders').textContent = s.preparing_orders || 0;
    document.getElementById('metric-ready-orders').textContent = s.ready_orders || 0;
    document.getElementById('metric-completed-orders').textContent = s.completed_orders || 0;
  },

  /**
   * Render recent orders table
   */
  renderRecentOrders() {
    const s = this.state.stats;
    const tableBody = document.getElementById('recent-orders-tbody');
    if (!tableBody || !s) return;

    const orders = s.recent_orders || [];
    if (orders.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-slate-500 text-xs">No orders recorded yet today.</td></tr>`;
      return;
    }

    tableBody.innerHTML = orders.map(o => {
      const statusMeta = Utils.ORDER_STATUS_MAP[o.order_status] || { label: o.order_status, badgeClass: 'bg-slate-100 text-slate-700 border border-slate-200' };

      return `
        <tr class="hover:bg-slate-50 transition-colors text-xs">
          <td class="py-3.5 px-4 font-mono font-extrabold text-slate-900">${o.order_id}</td>
          <td class="py-3.5 px-4 font-semibold text-slate-900">
            <div>${Utils.escapeHTML(o.customer_name)}</div>
            <div class="text-[10px] text-slate-500 font-mono font-medium">${o.customer_mobile || ''}</div>
          </td>
          <td class="py-3.5 px-4 font-extrabold text-slate-900 font-mono">${Utils.formatCurrency(o.total_amount)}</td>
          <td class="py-3.5 px-4 text-slate-600 font-medium">${o.pickup_start} – ${o.pickup_end}</td>
          <td class="py-3.5 px-4">
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${statusMeta.badgeClass}">
              ${statusMeta.label}
            </span>
          </td>
          <td class="py-3.5 px-4 text-right">
            <a href="./orders.html?id=${o.order_id}" class="text-[#0C831F] hover:underline font-extrabold">Manage →</a>
          </td>
        </tr>
      `;
    }).join('');
  },

  /**
   * Render low stock alert panel
   */
  renderLowStock() {
    const s = this.state.stats;
    const container = document.getElementById('low-stock-container');
    if (!container || !s) return;

    const items = s.low_stock_items || [];
    if (items.length === 0) {
      container.innerHTML = `<div class="text-center py-6 text-[#0C831F] text-xs font-extrabold">✓ All product inventory healthy.</div>`;
      return;
    }

    container.innerHTML = items.map(p => `
      <div class="flex items-center justify-between py-2.5 border-b border-slate-100 text-xs">
        <div>
          <div class="font-extrabold text-slate-900">${Utils.escapeHTML(p.product_name)}</div>
          <div class="text-[10px] text-slate-500 font-medium">Stock: ${p.stock_quantity} ${p.unit || ''}</div>
        </div>
        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${p.stock_status === 'OUT_OF_STOCK' ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-amber-100 text-amber-800 border border-amber-200'}">
          ${p.stock_status === 'OUT_OF_STOCK' ? 'Out of Stock' : 'Low Stock'}
        </span>
      </div>
    `).join('');
  }
};
