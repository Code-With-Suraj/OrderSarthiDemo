/**
 * OrderSarthi — Admin Pickup Slots Controller
 * View and configure pickup slot capacity for any date.
 */

const AdminSlots = {
  state: {
    selectedDate: '',
    slots: []
  },

  async init() {
    Auth.requireAdmin();
    UI.renderAdminNav('slots');

    const today = new Date().toISOString().split('T')[0];
    this.state.selectedDate = today;

    const dateInput = document.getElementById('slot-date-picker');
    if (dateInput) dateInput.value = today;

    await this.loadSlots();
    this.setupListeners();
  },

  async loadSlots() {
    try {
      const res = await api.get('getPickupSlots', { date: this.state.selectedDate }, true);
      this.state.slots = Array.isArray(res) ? res : (res?.slots || []);
      this.renderSlots();
    } catch (err) {
      Utils.showToast('Failed to load slots: ' + err.message, 'error');
    }
  },

  renderSlots() {
    const grid = document.getElementById('admin-slots-grid');
    if (!grid) return;

    if (this.state.slots.length === 0) {
      grid.innerHTML = `<div class="col-span-full py-8 text-center text-slate-400 font-medium text-xs">No slots found for this date.</div>`;
      return;
    }

    grid.innerHTML = this.state.slots.map(s => {
      const isFull = s.current_orders >= s.max_orders;

      return `
        <div class="bg-white rounded-2xl p-4 flex flex-col justify-between border ${isFull ? 'border-rose-200 bg-rose-50/30' : 'border-slate-200'} shadow-xs">
          <div>
            <div class="text-xs font-mono font-bold text-[#0C831F]">${s.slot_id}</div>
            <h4 class="text-base font-extrabold text-slate-900 font-display mt-0.5">${Utils.formatTime12(s.start_time)} – ${Utils.formatTime12(s.end_time)}</h4>
          </div>

          <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <div>
              <span class="text-slate-500 font-medium">Booked:</span>
              <span class="font-extrabold text-slate-900 ml-1">${s.current_orders} / ${s.max_orders}</span>
            </div>
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${isFull ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-emerald-100 text-[#0C831F] border border-emerald-200'}">
              ${isFull ? 'Full' : `${s.available_slots} Open`}
            </span>
          </div>
        </div>
      `;
    }).join('');
  },

  setupListeners() {
    const dateInput = document.getElementById('slot-date-picker');
    if (dateInput) {
      dateInput.addEventListener('change', (e) => {
        this.state.selectedDate = e.target.value;
        this.loadSlots();
      });
    }
  }
};
