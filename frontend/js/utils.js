/**
 * OrderSarthi — Utility Helpers & Validators
 * Reusable functions for formatting, validation, debouncing, and DOM manipulation.
 */

const Utils = {
  /**
   * Format a number as Indian Currency (INR / ₹)
   * @param {number|string} amount
   * @returns {string} e.g. "₹1,450" or "₹120.50"
   */
  formatCurrency(amount) {
    const num = Number(amount) || 0;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: num % 1 === 0 ? 0 : 2,
      minimumFractionDigits: 0
    }).format(num);
  },

  /**
   * Format ISO or standard date to user-friendly Indian format
   * @param {string|Date} dateStr
   * @param {boolean} includeTime
   * @returns {string} e.g. "19 Aug 2026, 06:30 PM"
   */
  formatDate(dateStr, includeTime = true) {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return String(dateStr);

    const options = {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    };

    if (includeTime) {
      options.hour = '2-digit',
      options.minute = '2-digit',
      options.hour12 = true;
    }

    return new Intl.DateTimeFormat('en-IN', options).format(date);
  },

  /**
   * Format 24-hour time to 12-hour AM/PM string
   * @param {string} timeStr e.g. "18:30" or "09:00"
   * @returns {string} e.g. "06:30 PM" or "09:00 AM"
   */
  formatTime12(timeStr) {
    if (!timeStr) return '';
    let str = String(timeStr).trim();
    if (str.includes(' ')) str = str.split(' ')[1] || str;
    if (str.includes('T')) str = str.split('T')[1] || str;
    const parts = str.split(':');
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1] || '0', 10);
    if (isNaN(h)) return str;
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    const minStr = String(m || 0).padStart(2, '0');
    return `${String(hour12).padStart(2, '0')}:${minStr} ${period}`;
  },

  /**
   * Generate UUID v4 for idempotency keys and client tracking
   * @returns {string}
   */
  uuid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  },

  /**
   * Validate Indian 10-digit mobile number (starts with 6, 7, 8, 9)
   * @param {string} mobile
   * @returns {boolean}
   */
  validateMobile(mobile) {
    if (!mobile) return false;
    const cleaned = String(mobile).replace(/\D/g, '');
    return /^[6-9]\d{9}$/.test(cleaned);
  },

  /**
   * Validate Email format
   * @param {string} email
   * @returns {boolean}
   */
  validateEmail(email) {
    if (!email) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
  },

  /**
   * Debounce function execution (for search inputs)
   * @param {Function} func
   * @param {number} wait
   * @returns {Function}
   */
  debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  /**
   * Throttle function execution
   * @param {Function} func
   * @param {number} limit
   * @returns {Function}
   */
  throttle(func, limit = 1000) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  /**
   * Sanitize text string for safe HTML display
   * @param {string} str
   * @returns {string}
   */
  escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  /**
   * Parse query parameters from current window URL
   * @returns {Object}
   */
  getQueryParams() {
    const params = {};
    const searchParams = new URLSearchParams(window.location.search);
    for (const [key, value] of searchParams.entries()) {
      params[key] = value;
    }
    return params;
  },

  /**
   * Show toast notification on screen
   * @param {string} message
   * @param {'success'|'error'|'info'|'warning'} type
   * @param {number} duration
   */
  showToast(message, type = 'info', duration = 3500) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `pointer-events-auto flex items-center gap-3 p-4 rounded-xl shadow-lg border text-sm font-medium transition-all duration-300 transform translate-y-3 opacity-0`;

    const bgColors = {
      success: 'bg-slate-900 border-emerald-500 text-white shadow-xl',
      error: 'bg-rose-950 border-rose-600 text-white shadow-xl',
      warning: 'bg-amber-950 border-amber-600 text-white shadow-xl',
      info: 'bg-slate-900 border-slate-700 text-white shadow-xl'
    };

    const icons = {
      success: `<svg class="w-5 h-5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>`,
      error: `<svg class="w-5 h-5 text-rose-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>`,
      warning: `<svg class="w-5 h-5 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`,
      info: `<svg class="w-5 h-5 text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`
    };

    toast.className += ` ${bgColors[type] || bgColors.info} backdrop-blur-md`;
    toast.innerHTML = `
      ${icons[type] || icons.info}
      <span class="flex-1 leading-snug font-medium">${this.escapeHTML(message)}</span>
      <button class="text-slate-400 hover:text-white shrink-0 ml-1" onclick="this.parentElement.remove()">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
      </button>
    `;

    container.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-3', 'opacity-0');
    });

    // Auto dismiss
    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  /**
   * Order Status configuration maps (Badge colors, user-friendly labels, icons)
   */
  ORDER_STATUS_MAP: {
    NEW: {
      label: 'Order Placed',
      badgeClass: 'bg-blue-100 text-blue-900 border border-blue-200',
      step: 1
    },
    ACCEPTED: {
      label: 'Accepted',
      badgeClass: 'bg-indigo-100 text-indigo-900 border border-indigo-200',
      step: 2
    },
    PREPARING: {
      label: 'Preparing',
      badgeClass: 'bg-amber-100 text-amber-900 border border-amber-200',
      step: 3
    },
    READY_FOR_PICKUP: {
      label: 'Ready for Pickup',
      badgeClass: 'bg-emerald-100 text-[#0C831F] border border-emerald-200',
      step: 4
    },
    PICKED_UP: {
      label: 'Picked Up',
      badgeClass: 'bg-teal-100 text-teal-900 border border-teal-200',
      step: 5
    },
    CANCELLED: {
      label: 'Cancelled',
      badgeClass: 'bg-rose-100 text-rose-900 border border-rose-200',
      step: -1
    },
    REJECTED: {
      label: 'Declined',
      badgeClass: 'bg-slate-100 text-slate-800 border border-slate-200',
      step: -1
    }
  }
};

// Freeze Utils
Object.freeze(Utils);
Object.freeze(Utils.ORDER_STATUS_MAP);
