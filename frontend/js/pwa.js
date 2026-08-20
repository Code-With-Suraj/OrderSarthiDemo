/**
 * OrderSarthi — Progressive Web App (PWA) Manager
 * Service Worker Registration, Native App Install Prompts, and iOS Add-to-Home-Screen helper.
 */

const PWA = {
  deferredPrompt: null,
  isInstalled: false,

  init() {
    this.registerServiceWorker();
    this.listenInstallPrompt();
    this.checkInstallationState();
    this.renderInstallUI();
  },

  /**
   * Register Service Worker
   */
  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        const isInsideAdmin = window.location.pathname.includes('/admin/');
        const swPath = isInsideAdmin ? '../sw.js' : './sw.js';

        navigator.serviceWorker.register(swPath)
          .then((reg) => {
            console.log('OrderSarthi PWA ServiceWorker registered with scope:', reg.scope);
          })
          .catch((err) => {
            console.warn('OrderSarthi ServiceWorker registration failed:', err);
          });
      });
    }
  },

  /**
   * Listen to browser install prompt event
   */
  listenInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent default mini-infobar on mobile
      e.preventDefault();
      this.deferredPrompt = e;

      // Show install buttons
      document.querySelectorAll('.pwa-install-btn').forEach(btn => {
        btn.classList.remove('hidden');
      });

      this.renderFloatingInstallPill();
    });

    window.addEventListener('appinstalled', () => {
      this.isInstalled = true;
      this.deferredPrompt = null;
      console.log('OrderSarthi App was successfully installed!');
      document.querySelectorAll('.pwa-install-btn, #pwa-floating-pill').forEach(el => {
        el.classList.add('hidden');
      });
      if (typeof Utils !== 'undefined' && Utils.showToast) {
        Utils.showToast('OrderSarthi App installed on your device!', 'success');
      }
    });
  },

  /**
   * Check if app is already running in standalone / PWA mode
   */
  checkInstallationState() {
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
      this.isInstalled = true;
      document.querySelectorAll('.pwa-install-btn, #pwa-floating-pill').forEach(el => {
        el.classList.add('hidden');
      });
    }
  },

  /**
   * Trigger native install prompt
   */
  async promptInstall() {
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('User accepted PWA installation');
      } else {
        console.log('User dismissed PWA installation');
      }
      this.deferredPrompt = null;
      const pill = document.getElementById('pwa-floating-pill');
      if (pill) pill.classList.add('hidden');
    } else {
      // iOS or unsupported browser fallback
      this.showIosOrManualModal();
    }
  },

  /**
   * Show iOS or manual install guidance modal
   */
  showIosOrManualModal() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    let modal = document.getElementById('pwa-install-modal');

    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'pwa-install-modal';
      modal.className = 'fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="bg-white max-w-sm w-full rounded-3xl p-6 border border-slate-200 space-y-4 shadow-2xl text-center">
        <div class="w-14 h-14 rounded-2xl bg-[#F8CB46] text-[#0C831F] mx-auto flex items-center justify-center shadow-xs border border-amber-300">
          <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
        </div>

        <div class="space-y-1">
          <h3 class="text-base font-extrabold text-slate-900 font-display">Install OrderSarthi App</h3>
          <p class="text-xs text-slate-500 font-medium">Install as a native mobile app for 10-minute store pickup & instant tracking.</p>
        </div>

        ${isIOS ? `
          <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs text-slate-700 space-y-2 font-medium">
            <div class="font-extrabold text-[#0C831F]">On iPhone / iPad:</div>
            <div class="flex items-center gap-2">
              <span class="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center font-extrabold text-[10px]">1</span>
              <span>Tap the <strong>Share button</strong> in Safari's bottom toolbar (<svg class="inline w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg>).</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center font-extrabold text-[10px]">2</span>
              <span>Scroll down and tap <strong>'Add to Home Screen'</strong> (+).</span>
            </div>
          </div>
        ` : `
          <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs text-slate-700 space-y-2 font-medium">
            <div class="font-extrabold text-[#0C831F]">On Android / Chrome:</div>
            <div class="flex items-center gap-2">
              <span class="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center font-extrabold text-[10px]">1</span>
              <span>Tap the <strong>⋮ (Menu)</strong> at the top right corner.</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center font-extrabold text-[10px]">2</span>
              <span>Tap <strong>'Install App'</strong> or <strong>'Add to Home screen'</strong>.</span>
            </div>
          </div>
        `}

        <button onclick="document.getElementById('pwa-install-modal').classList.add('hidden')" class="w-full btn-primary text-xs !py-2.5 font-extrabold">
          Got It
        </button>
      </div>
    `;

    modal.classList.remove('hidden');
  },

  /**
   * Render Floating Install Pill for Mobile Viewports
   */
  renderFloatingInstallPill() {
    if (this.isInstalled || document.getElementById('pwa-floating-pill')) return;

    const isInsideAdmin = window.location.pathname.includes('/admin/');
    const pill = document.createElement('div');
    pill.id = 'pwa-floating-pill';
    pill.className = 'fixed bottom-20 right-4 z-40 md:bottom-6 md:right-6 animate-bounce';
    pill.innerHTML = `
      <button onclick="PWA.promptInstall()" class="px-3.5 py-2.5 rounded-full bg-[#0C831F] text-white font-extrabold text-xs flex items-center gap-2 shadow-lg hover:bg-[#096818] transition-all border border-emerald-400/40">
        <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
        <span>${isInsideAdmin ? 'Install POS App' : 'Install App'}</span>
      </button>
    `;
    document.body.appendChild(pill);
  },

  /**
   * Dynamic helper called on page loads
   */
  renderInstallUI() {
    // Expose globally
    window.PWA = this;
  }
};

// Auto-initialize on load
document.addEventListener('DOMContentLoaded', () => {
  PWA.init();
});
