/**
 * OrderSarthi — Admin Store Settings Controller
 * Store details, operating hours, and database schema setup.
 */

const AdminSettings = {
  async init() {
    Auth.requireAdmin();
    UI.renderAdminNav('settings');

    await this.loadShopInfo();
    this.setupListeners();
  },

  async loadShopInfo() {
    try {
      let shop = {};
      try {
        shop = await api.get('adminGetShop', {}, true);
      } catch (e) {
        shop = await api.get('getShop', {}, true);
      }

      document.getElementById('shop-name').value = shop.shop_name || '';
      document.getElementById('shop-phone').value = shop.mobile || '';
      document.getElementById('shop-email').value = shop.email || '';
      document.getElementById('shop-address').value = shop.address || '';
      document.getElementById('shop-open-time').value = shop.opening_time || '09:00';
      document.getElementById('shop-close-time').value = shop.closing_time || '21:00';
      document.getElementById('shop-desc').value = shop.description || '';

      // WhatsApp Number (if same as mobile, leave empty to show placeholder)
      const waInput = document.getElementById('shop-whatsapp');
      if (waInput) {
        waInput.value = (shop.whatsapp_number && shop.whatsapp_number !== shop.mobile) ? shop.whatsapp_number : '';
      }

      // Payment Mode
      const paymentMode = shop.payment_mode || 'BOTH';
      if (paymentMode === 'ONLINE_ONLY') {
        const rOnline = document.getElementById('mode-online');
        if (rOnline) rOnline.checked = true;
      } else if (paymentMode === 'OFFLINE_ONLY') {
        const rOffline = document.getElementById('mode-offline');
        if (rOffline) rOffline.checked = true;
      } else {
        const rBoth = document.getElementById('mode-both');
        if (rBoth) rBoth.checked = true;
      }

      // Shop Logo
      const logoUrl = shop.logo_url || '';
      const logoUrlInput = document.getElementById('shop-logo-url');
      if (logoUrlInput) logoUrlInput.value = logoUrl;
      this.updateLogoPreview(logoUrl);

      // Razorpay Credentials & Toggle
      const rzpKeyInput = document.getElementById('razorpay-key-id');
      const rzpSecretInput = document.getElementById('razorpay-key-secret');
      const rzpEnabledInput = document.getElementById('razorpay-enabled');
      if (rzpKeyInput) rzpKeyInput.value = shop.razorpay_key_id || CONFIG.RAZORPAY_KEY_ID || '';
      if (rzpSecretInput) rzpSecretInput.value = shop.razorpay_key_secret || '';
      if (rzpEnabledInput) rzpEnabledInput.checked = (shop.razorpay_enabled !== false);

      // Minimum Order Value (MOV)
      const movInput = document.getElementById('min-order-value');
      const movVal = (shop.min_order_value !== undefined && shop.min_order_value !== "") ? Number(shop.min_order_value) : 50;
      if (movInput) {
        movInput.value = isNaN(movVal) ? 0 : movVal;
      }
      this.onMovChange(movVal);

      // Render Store QR Standee
      this.renderQrStandee(shop);
    } catch (err) {
      Utils.showToast('Failed to load shop settings: ' + err.message, 'error');
    }
  },

  onMovChange(val) {
    const num = Number(val) || 0;
    const badge = document.getElementById('mov-preview-badge');
    if (badge) {
      badge.textContent = num > 0 ? `Min. Order: ₹${num}` : 'No Minimum Order';
      badge.className = num > 0 
        ? 'self-start sm:self-auto px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#0C831F] text-white shadow-xs'
        : 'self-start sm:self-auto px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-slate-200 text-slate-700 shadow-xs';
    }
  },

  setMovPreset(amount) {
    const input = document.getElementById('min-order-value');
    if (input) {
      input.value = amount;
      this.onMovChange(amount);
      Utils.showToast(`Minimum order set to ₹${amount}`, 'info');
    }
  },

  updateLogoPreview(url) {
    const preview = document.getElementById('shop-logo-preview');
    if (!preview) return;
    if (url) {
      preview.innerHTML = `<img src="${url}" alt="Logo" class="w-full h-full object-cover" />`;
    } else {
      preview.innerHTML = `
        <svg class="w-8 h-8 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
      `;
    }
  },

  handleLogoFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      Utils.showToast('Please select a valid image file (PNG, JPG, SVG).', 'error');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      Utils.showToast('Logo image size should be under 2MB.', 'warning');
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result;
      document.getElementById('shop-logo-base64').value = base64;
      document.getElementById('shop-logo-url').value = '';
      this.updateLogoPreview(base64);
      Utils.showToast('Logo selected! Click Save to apply.', 'info');
    };
    reader.readAsDataURL(file);
  },

  clearLogo() {
    const fileInput = document.getElementById('shop-logo-file');
    const base64Input = document.getElementById('shop-logo-base64');
    const urlInput = document.getElementById('shop-logo-url');

    if (fileInput) fileInput.value = '';
    if (base64Input) base64Input.value = '';
    if (urlInput) urlInput.value = '';
    this.updateLogoPreview('');
  },

  renderQrStandee(shop) {
    const shopName = shop?.shop_name || CONFIG.DEFAULT_SHOP_NAME;
    const storeUrl = window.location.origin + window.location.pathname.replace(/\/admin\/.*$/, '') + '/index.html?source=qr';
    const qrApi = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(storeUrl)}`;

    const qrImg = document.getElementById('settings-qr-img');
    const qrUrlInput = document.getElementById('store-qr-url');
    const qrDownload = document.getElementById('download-qr-btn');
    const standeeName = document.getElementById('standee-shop-name');
    const standeeInitial = document.getElementById('standee-initial');

    if (qrImg) qrImg.src = qrApi;
    if (qrUrlInput) qrUrlInput.value = storeUrl;
    if (qrDownload) qrDownload.href = qrApi;
    if (standeeName) standeeName.textContent = shopName;
    if (standeeInitial) standeeInitial.textContent = (shopName.charAt(0) || 'S').toUpperCase();
  },

  async saveShopInfo(e) {
    e.preventDefault();
    const btn = document.getElementById('save-settings-btn');
    if (btn) btn.disabled = true;

    try {
      const selectedPaymentModeEl = document.querySelector('input[name="payment_mode"]:checked');
      const paymentMode = selectedPaymentModeEl ? selectedPaymentModeEl.value : 'BOTH';
      const razorpayKeyId = document.getElementById('razorpay-key-id')?.value.trim() || '';
      const razorpayKeySecret = document.getElementById('razorpay-key-secret')?.value.trim() || '';
      const razorpayEnabled = document.getElementById('razorpay-enabled')?.checked ?? true;
      const logoBase64 = document.getElementById('shop-logo-base64')?.value || '';
      const logoUrl = document.getElementById('shop-logo-url')?.value.trim() || '';

      const payload = {
        shop_name: document.getElementById('shop-name').value.trim(),
        mobile: document.getElementById('shop-phone').value.trim(),
        whatsapp_number: document.getElementById('shop-whatsapp')?.value.trim() || document.getElementById('shop-phone').value.trim(),
        email: document.getElementById('shop-email').value.trim(),
        address: document.getElementById('shop-address').value.trim(),
        opening_time: document.getElementById('shop-open-time').value,
        closing_time: document.getElementById('shop-close-time').value,
        description: document.getElementById('shop-desc').value.trim(),
        payment_mode: paymentMode,
        min_order_value: Math.max(0, Number(document.getElementById('min-order-value')?.value) || 0),
        razorpay_key_id: razorpayKeyId,
        razorpay_enabled: razorpayEnabled
      };

      if (logoBase64) {
        payload.logo_base64 = logoBase64;
      } else if (logoUrl !== undefined) {
        payload.logo_url = logoUrl;
      }

      if (razorpayKeySecret !== undefined) {
        payload.razorpay_key_secret = razorpayKeySecret;
      }

      const updatedShop = await api.post('adminUpdateShop', payload, true);
      if (updatedShop.razorpay_key_secret) {
        const secretInput = document.getElementById('razorpay-key-secret');
        if (secretInput) secretInput.value = updatedShop.razorpay_key_secret;
      }
      localStorage.setItem(CONFIG.STORAGE_KEYS.SHOP_INFO, JSON.stringify(updatedShop));
      this.updateLogoPreview(updatedShop.logo_url);
      this.renderQrStandee(updatedShop);
      UI.applyShopBrandingToDOM(updatedShop);
      Utils.showToast('Store profile & logo updated successfully!', 'success');
    } catch (err) {
      Utils.showToast(err.message || 'Failed to update settings.', 'error');
    } finally {
      if (btn) btn.disabled = false;
    }
  },

  setupListeners() {
    const form = document.getElementById('shop-settings-form');
    if (form) {
      form.addEventListener('submit', (e) => this.saveShopInfo(e));
    }

    const urlInput = document.getElementById('shop-logo-url');
    if (urlInput) {
      urlInput.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        if (val) {
          document.getElementById('shop-logo-base64').value = '';
          this.updateLogoPreview(val);
        }
      });
    }
  }
};

function copyStoreQrUrl() {
  const input = document.getElementById('store-qr-url');
  if (input) {
    input.select();
    navigator.clipboard.writeText(input.value);
    Utils.showToast('Store QR link copied to clipboard!', 'success');
  }
}

function printQrStandee() {
  const card = document.getElementById('qr-standee-card');
  if (!card) return;
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <html>
      <head>
        <title>In-Store QR Standee Poster</title>
        <style>
          body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #fff; }
          .standee { border: 3px solid #4f46e5; border-radius: 24px; padding: 32px; text-align: center; max-width: 320px; }
          .title { font-size: 22px; font-weight: 900; margin: 8px 0 4px; color: #1e1b4b; }
          .subtitle { font-size: 12px; font-weight: bold; color: #4f46e5; text-transform: uppercase; letter-spacing: 1px; }
          .qr-box { margin: 20px auto; padding: 12px; border: 1px solid #e2e8f0; border-radius: 16px; width: 220px; height: 220px; }
          .qr-box img { width: 100%; height: 100%; }
          .footer-badge { font-size: 13px; font-weight: bold; color: #059669; }
          .footer-sub { font-size: 10px; color: #64748b; margin-top: 4px; }
        </style>
      </head>
      <body>
        <div class="standee">
          <div class="subtitle">OrderSarthi Click & Collect</div>
          <div class="title">${document.getElementById('standee-shop-name')?.textContent || 'Store'}</div>
          <div class="qr-box">
            <img src="${document.getElementById('settings-qr-img')?.src || ''}" alt="QR" />
          </div>
          <div class="footer-badge">⚡ Instant In-Store Ordering</div>
          <div class="footer-sub">Scan with phone camera to order & collect at counter</div>
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
