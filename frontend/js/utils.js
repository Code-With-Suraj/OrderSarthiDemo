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
   * Format and convert Google Drive and CDN URLs to direct image URLs
   * @param {string} url
   * @param {string} fallback
   * @returns {string}
   */
  formatImageUrl(url, fallback = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500') {
    if (!url || typeof url !== 'string') return fallback;
    let clean = url.trim();
    if (!clean) return fallback;

    // Handle Google Drive Links (view, open, uc)
    const driveMatch = clean.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || 
                       clean.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
                       clean.match(/\/d\/([a-zA-Z0-9_-]+)/);

    if (driveMatch && (clean.includes('drive.google.com') || clean.includes('docs.google.com') || clean.includes('google.com'))) {
      const fileId = driveMatch[1];
      return `https://lh3.googleusercontent.com/d/${fileId}`;
    }

    return clean;
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
   * Safe Rich Text & Markdown Parser for Product Descriptions
   * Converts Markdown (headings, bullets, bold, lists, quotes) or plain text into semantic styled HTML.
   * @param {string} rawText
   * @returns {string} Safe HTML string
   */
  renderRichText(rawText) {
    if (!rawText || !String(rawText).trim()) {
      return '<p class="text-xs sm:text-sm text-slate-500 font-medium italic">No detailed description provided for this product.</p>';
    }

    const text = String(rawText).trim();
    // Normalize newlines
    const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = normalized.split('\n');

    let html = '';
    let inUl = false;
    let inOl = false;
    let paragraphBuffer = [];

    const flushParagraph = () => {
      if (paragraphBuffer.length > 0) {
        const pContent = paragraphBuffer.map(l => this.renderInlineMarkdown(l)).join('<br/>');
        html += `<p class="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium mb-2.5">${pContent}</p>`;
        paragraphBuffer = [];
      }
    };

    const closeLists = () => {
      if (inUl) { html += '</ul>'; inUl = false; }
      if (inOl) { html += '</ol>'; inOl = false; }
    };

    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i];
      const trimmed = rawLine.trim();

      // Blank line
      if (!trimmed) {
        flushParagraph();
        closeLists();
        continue;
      }

      // Divider (--- or ***)
      if (/^(\-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
        flushParagraph();
        closeLists();
        html += '<hr class="my-3.5 border-slate-200" />';
        continue;
      }

      // Headings (#, ##, ###, ####)
      const h4Match = trimmed.match(/^####\s+(.+)$/);
      if (h4Match) {
        flushParagraph();
        closeLists();
        html += `<h5 class="text-xs font-extrabold text-slate-800 uppercase tracking-wide mt-3 mb-1 font-display">${this.renderInlineMarkdown(h4Match[1])}</h5>`;
        continue;
      }

      const h3Match = trimmed.match(/^###\s+(.+)$/);
      if (h3Match) {
        flushParagraph();
        closeLists();
        html += `<h4 class="text-xs sm:text-sm font-extrabold text-slate-900 font-display mt-3.5 mb-1.5 flex items-center gap-1.5"><span class="w-1.5 h-3.5 bg-[#0C831F] rounded-full inline-block"></span><span>${this.renderInlineMarkdown(h3Match[1])}</span></h4>`;
        continue;
      }

      const h2Match = trimmed.match(/^##\s+(.+)$/);
      if (h2Match) {
        flushParagraph();
        closeLists();
        html += `<h3 class="text-sm sm:text-base font-extrabold text-slate-900 font-display mt-4 mb-2 pb-1 border-b border-slate-100 flex items-center gap-2">${this.renderInlineMarkdown(h2Match[1])}</h3>`;
        continue;
      }

      const h1Match = trimmed.match(/^#\s+(.+)$/);
      if (h1Match) {
        flushParagraph();
        closeLists();
        html += `<h2 class="text-base sm:text-lg font-black text-slate-900 font-display mt-4 mb-2 pb-1.5 border-b border-slate-200">${this.renderInlineMarkdown(h1Match[1])}</h2>`;
        continue;
      }

      // Blockquotes (> Quote)
      const bqMatch = trimmed.match(/^>\s+(.+)$/);
      if (bqMatch) {
        flushParagraph();
        closeLists();
        html += `<div class="my-2.5 p-3 rounded-2xl bg-amber-50 border-l-4 border-amber-500 text-amber-900 text-xs font-medium leading-relaxed">${this.renderInlineMarkdown(bqMatch[1])}</div>`;
        continue;
      }

      // Bullet List (- Item, * Item, • Item)
      const bulletMatch = trimmed.match(/^[-*•]\s+(.+)$/);
      if (bulletMatch) {
        flushParagraph();
        if (inOl) { html += '</ol>'; inOl = false; }
        if (!inUl) { html += '<ul class="space-y-1.5 my-2.5">'; inUl = true; }
        html += `<li class="flex items-start gap-2 text-xs sm:text-sm text-slate-700 leading-relaxed"><span class="w-1.5 h-1.5 rounded-full bg-[#0C831F] mt-1.5 shrink-0"></span><span>${this.renderInlineMarkdown(bulletMatch[1])}</span></li>`;
        continue;
      }

      // Numbered List (1. Item, 2. Item)
      const numMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
      if (numMatch) {
        flushParagraph();
        if (inUl) { html += '</ul>'; inUl = false; }
        if (!inOl) { html += '<ol class="space-y-1.5 my-2.5 list-decimal list-inside text-xs sm:text-sm text-slate-700 leading-relaxed">'; inOl = true; }
        html += `<li><span>${this.renderInlineMarkdown(numMatch[2])}</span></li>`;
        continue;
      }

      // Key-Value Feature Spec line (e.g. "Brand: Nestle", "Shelf Life: 6 Months")
      const kvMatch = trimmed.match(/^([A-Za-z0-9\s\-_/&]+):\s+(.+)$/);
      if (kvMatch && !trimmed.startsWith('http') && kvMatch[1].length < 30) {
        flushParagraph();
        closeLists();
        html += `
          <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 font-medium mr-2 mb-2 shadow-2xs">
            <span class="font-extrabold text-slate-900">${this.escapeHTML(kvMatch[1])}:</span>
            <span class="text-slate-600">${this.renderInlineMarkdown(kvMatch[2])}</span>
          </div>
        `;
        continue;
      }

      // Regular paragraph line
      closeLists();
      paragraphBuffer.push(trimmed);
    }

    flushParagraph();
    closeLists();

    return html;
  },

  /**
   * Inline Markdown styling (Bold, Italic, Code badges, Links)
   * @param {string} text
   * @returns {string}
   */
  renderInlineMarkdown(text) {
    if (!text) return '';
    let escaped = this.escapeHTML(text);

    // Bold (**text** or __text__)
    escaped = escaped.replace(/\*\*(.+?)\*\*/g, '<strong class="font-black text-slate-900">$1</strong>');
    escaped = escaped.replace(/__(.+?)__/g, '<strong class="font-black text-slate-900">$1</strong>');

    // Italic (*text* or _text_)
    escaped = escaped.replace(/\*(.+?)\*/g, '<em class="italic text-slate-800">$1</em>');
    escaped = escaped.replace(/_(.+?)_/g, '<em class="italic text-slate-800">$1</em>');

    // Code / Tag badge (`badge`)
    escaped = escaped.replace(/`(.+?)`/g, '<span class="inline-block px-1.5 py-0.2 rounded bg-slate-100 border border-slate-200 text-slate-800 font-mono text-[11px] font-bold">$1</span>');

    return escaped;
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

