/**
 * OrderSarthi — Admin Reports & Analytics Controller
 * Daily sales trends, total revenue, average order value (AOV), and top-selling product metrics.
 */

const AdminReports = {
  state: {
    startDate: '',
    endDate: '',
    salesData: null,
    productData: []
  },

  async init() {
    Auth.requireAdmin();
    UI.renderAdminNav('reports');

    const today = new Date().toISOString().split('T')[0];
    this.state.startDate = today;
    this.state.endDate = today;

    const startInput = document.getElementById('report-start-date');
    const endInput = document.getElementById('report-end-date');
    if (startInput) startInput.value = today;
    if (endInput) endInput.value = today;

    await this.loadReports();
    this.setupListeners();
  },

  async loadReports() {
    try {
      const result = await api.get('adminReports', {
        startDate: this.state.startDate,
        endDate: this.state.endDate
      }, true);

      this.state.salesData = result.sales || {};
      this.state.productData = result.products || [];

      this.renderSummaryCards();
      this.renderProductPerformanceTable();
    } catch (err) {
      Utils.showToast('Failed to load reports: ' + err.message, 'error');
    }
  },

  renderSummaryCards() {
    const s = this.state.salesData;
    if (!s) return;

    document.getElementById('report-revenue').textContent = Utils.formatCurrency(s.totalRevenue || 0);
    document.getElementById('report-total-orders').textContent = s.totalOrders || 0;
    document.getElementById('report-completed-orders').textContent = s.completedOrders || 0;
    document.getElementById('report-cancelled-orders').textContent = s.cancelledOrders || 0;
    document.getElementById('report-aov').textContent = Utils.formatCurrency(s.averageOrderValue || 0);
  },

  renderProductPerformanceTable() {
    const tbody = document.getElementById('product-performance-tbody');
    if (!tbody) return;

    if (this.state.productData.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-slate-400 font-medium text-xs">No sales data recorded yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = this.state.productData.map((p, idx) => `
      <tr class="hover:bg-slate-50 transition-colors text-xs">
        <td class="py-3.5 px-4 font-mono font-bold text-slate-500">#${idx + 1}</td>
        <td class="py-3.5 px-4 font-extrabold text-slate-900">${Utils.escapeHTML(p.product_name)}</td>
        <td class="py-3.5 px-4 text-slate-700 font-bold">${p.total_units_sold} ${p.unit || ''}</td>
        <td class="py-3.5 px-4 font-mono font-medium text-slate-600">${p.order_count}</td>
        <td class="py-3.5 px-4 font-black text-[#0C831F] text-right font-display text-sm">${Utils.formatCurrency(p.total_revenue)}</td>
      </tr>
    `).join('');
  },

  setupListeners() {
    const form = document.getElementById('report-filter-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.state.startDate = document.getElementById('report-start-date').value;
        this.state.endDate = document.getElementById('report-end-date').value;
        this.loadReports();
      });
    }
  }
};
