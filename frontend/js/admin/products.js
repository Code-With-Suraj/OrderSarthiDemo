/**
 * OrderSarthi — Admin Products Management Controller
 * Product list, add/edit modal, instant stock toggle, and image upload.
 */

const AdminProducts = {
  state: {
    products: [],
    categories: [],
    searchQuery: '',
    selectedCategory: '',
    editingProduct: null
  },

  /**
   * Initialize
   */
  async init() {
    Auth.requireAdmin();
    UI.renderAdminNav('products');

    await this.loadCategories();
    await this.loadProducts();
    this.setupListeners();
  },

  /**
   * Load Categories for dropdown
   */
  async loadCategories() {
    try {
      this.state.categories = await api.get('adminCategories', {}, true);
      const catSelect = document.getElementById('prod-category-select');
      const filterSelect = document.getElementById('filter-category-select');

      const optionsHtml = this.state.categories.map(c => `
        <option value="${c.category_id}">${Utils.escapeHTML(c.category_name)}</option>
      `).join('');

      if (catSelect) catSelect.innerHTML = `<option value="">Select Category</option>` + optionsHtml;
      if (filterSelect) filterSelect.innerHTML = `<option value="">All Categories</option>` + optionsHtml;
    } catch(e) {}
  },

  /**
   * Render skeleton placeholder rows in the products table
   * @param {number} count
   */
  renderSkeletonTable(count = 5) {
    const tbody = document.getElementById('products-table-tbody');
    if (!tbody) return;

    const rows = [];
    for (let i = 0; i < count; i++) {
      rows.push(`
        <tr class="border-b border-slate-100 text-xs">
          <td class="py-3 px-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg bg-slate-100 animate-pulse shrink-0"></div>
              <div>
                <div class="h-4 w-32 bg-slate-100 animate-pulse mb-1.5 rounded"></div>
                <div class="h-3 w-16 bg-slate-100 animate-pulse rounded"></div>
              </div>
            </div>
          </td>
          <td class="py-3 px-4"><div class="h-4 w-12 bg-slate-100 animate-pulse rounded"></div></td>
          <td class="py-3 px-4"><div class="h-4 w-16 bg-slate-100 animate-pulse rounded"></div></td>
          <td class="py-3 px-4"><div class="h-4 w-12 bg-slate-100 animate-pulse rounded"></div></td>
          <td class="py-3 px-4"><div class="h-6 w-24 bg-slate-100 animate-pulse rounded-full"></div></td>
          <td class="py-3 px-4"><div class="h-5 w-16 bg-slate-100 animate-pulse rounded"></div></td>
          <td class="py-3 px-4 text-right"><div class="h-6 w-20 bg-slate-100 animate-pulse rounded-lg ml-auto"></div></td>
        </tr>
      `);
    }

    tbody.innerHTML = rows.join('');
  },

  /**
   * Load Products list
   * @param {boolean} showSkeleton
   */
  async loadProducts(showSkeleton = false) {
    if (showSkeleton) this.renderSkeletonTable(6);
    try {
      this.state.products = await api.get('adminProducts', {}, true);
      this.renderTable();
    } catch (err) {
      Utils.showToast('Failed to load products: ' + err.message, 'error');
    }
  },

  /**
   * Render table
   */
  renderTable() {
    const tbody = document.getElementById('products-table-tbody');
    if (!tbody) return;

    let filtered = this.state.products;

    if (this.state.selectedCategory) {
      filtered = filtered.filter(p => p.category_id === this.state.selectedCategory);
    }

    if (this.state.searchQuery) {
      const q = this.state.searchQuery.toLowerCase();
      filtered = filtered.filter(p => (p.product_name || '').toLowerCase().indexOf(q) > -1 || (p.sku || '').toLowerCase().indexOf(q) > -1);
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-slate-500 font-medium text-xs">No products found.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(p => {
      const isOutOfStock = p.stock_status === 'OUT_OF_STOCK' || Number(p.stock_quantity) <= 0;
      const isActive = p.is_active === true || p.is_active === "TRUE" || p.is_active === "true";

      return `
        <tr class="hover:bg-slate-50/80 transition-colors text-xs ${!isActive ? 'opacity-50' : ''}">
          <td class="py-3 px-4">
            <div class="flex items-center gap-3">
              <img src="${p.image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100'}" class="w-10 h-10 rounded-xl object-cover bg-slate-100 shrink-0 border border-slate-200" />
              <div>
                <div class="font-extrabold text-slate-900">${Utils.escapeHTML(p.product_name)}</div>
                <div class="text-[10px] text-slate-500 font-mono font-medium">SKU: ${p.sku || '—'}</div>
              </div>
            </div>
          </td>
          <td class="py-3 px-4 text-slate-600 font-semibold">${p.unit || 'unit'}</td>
          <td class="py-3 px-4 font-black text-slate-900">${Utils.formatCurrency(p.selling_price)}</td>
          <td class="py-3 px-4 text-slate-400 font-semibold line-through">${p.mrp ? Utils.formatCurrency(p.mrp) : '—'}</td>
          <td class="py-3 px-4">
            <button onclick="AdminProducts.toggleStock('${p.product_id}', '${isOutOfStock ? 'IN_STOCK' : 'OUT_OF_STOCK'}')"
              class="px-2.5 py-1 rounded-full text-[10px] font-extrabold transition-all cursor-pointer ${isOutOfStock ? 'bg-rose-100 text-rose-700 border border-rose-200 hover:bg-rose-200' : 'bg-emerald-100 text-[#0C831F] border border-emerald-200 hover:bg-emerald-200'}">
              ${isOutOfStock ? 'Out of Stock' : `In Stock (${p.stock_quantity || '✓'})`}
            </button>
          </td>
          <td class="py-3 px-4">
            <span class="px-2.5 py-1 rounded-full text-[10px] font-extrabold ${isActive ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}">
              ${isActive ? 'Active' : 'Inactive'}
            </span>
          </td>
          <td class="py-3 px-4 text-right">
            <div class="flex items-center justify-end gap-2">
              <button onclick="AdminProducts.openEditModal('${p.product_id}')" class="text-slate-700 hover:text-[#0C831F] font-bold text-xs px-2 py-1 rounded hover:bg-slate-100">Edit</button>
              <button onclick="AdminProducts.toggleActive('${p.product_id}', ${!isActive})" class="text-slate-500 hover:text-slate-900 font-bold text-xs px-2 py-1 rounded hover:bg-slate-100">${isActive ? 'Deactivate' : 'Activate'}</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  /**
   * Fast toggle stock status
   * @param {string} productId
   * @param {string} newStatus
   */
  async toggleStock(productId, newStatus) {
    try {
      const qty = newStatus === 'IN_STOCK' ? 50 : 0;
      await api.post('adminUpdateStock', {
        productId,
        stockStatus: newStatus,
        stockQuantity: qty
      }, true);

      Utils.showToast('Stock status updated', 'success');
      await this.loadProducts();
    } catch(e) {
      Utils.showToast(e.message, 'error');
    }
  },

  /**
   * Fast toggle active status
   * @param {string} productId
   * @param {boolean} newActive
   */
  async toggleActive(productId, newActive) {
    try {
      await api.post('adminToggleProduct', {
        productId,
        isActive: newActive
      }, true);

      Utils.showToast('Product visibility updated', 'info');
      await this.loadProducts();
    } catch(e) {
      Utils.showToast(e.message, 'error');
    }
  },

  /**
   * Open Modal for creating or editing product
   * @param {string|null} productId
   */
  openEditModal(productId = null) {
    const modal = document.getElementById('product-form-modal');
    if (!modal) return;

    this.state.editingProduct = productId ? this.state.products.find(p => p.product_id === productId) : null;
    const p = this.state.editingProduct || {};

    document.getElementById('modal-title').textContent = productId ? 'Edit Product' : 'Add New Product';
    document.getElementById('prod-name').value = p.product_name || '';
    document.getElementById('prod-category-select').value = p.category_id || '';
    document.getElementById('prod-price').value = p.selling_price || '';
    document.getElementById('prod-mrp').value = p.mrp || '';
    document.getElementById('prod-unit').value = p.unit || '1 unit';
    document.getElementById('prod-stock').value = p.stock_quantity || 50;
    document.getElementById('prod-sku').value = p.sku || '';
    document.getElementById('prod-image-url').value = p.image_url || '';
    document.getElementById('prod-desc').value = p.description || '';

    this.setDescTab('write');
    this.updateLivePreview();

    modal.classList.remove('hidden');
  },

  closeModal() {
    document.getElementById('product-form-modal')?.classList.add('hidden');
  },

  /**
   * Toggle between Write tab and Live Preview tab for description
   * @param {'write'|'preview'} tab
   */
  setDescTab(tab) {
    const writeContainer = document.getElementById('desc-write-container');
    const previewContainer = document.getElementById('desc-preview-container');
    const toolbar = document.getElementById('desc-toolbar');
    const tabWriteBtn = document.getElementById('desc-tab-write');
    const tabPrevBtn = document.getElementById('desc-tab-preview');

    if (tab === 'preview') {
      if (writeContainer) writeContainer.classList.add('hidden');
      if (toolbar) toolbar.classList.add('hidden');
      if (previewContainer) previewContainer.classList.remove('hidden');
      if (tabWriteBtn) {
        tabWriteBtn.className = 'px-2.5 py-1 rounded-md text-slate-500 hover:text-slate-900 transition-all font-medium';
      }
      if (tabPrevBtn) {
        tabPrevBtn.className = 'px-2.5 py-1 rounded-md bg-white text-slate-900 shadow-2xs font-extrabold transition-all';
      }
      this.updateLivePreview();
    } else {
      if (writeContainer) writeContainer.classList.remove('hidden');
      if (toolbar) toolbar.classList.remove('hidden');
      if (previewContainer) previewContainer.classList.add('hidden');
      if (tabWriteBtn) {
        tabWriteBtn.className = 'px-2.5 py-1 rounded-md bg-white text-slate-900 shadow-2xs font-extrabold transition-all';
      }
      if (tabPrevBtn) {
        tabPrevBtn.className = 'px-2.5 py-1 rounded-md text-slate-500 hover:text-slate-900 transition-all font-medium';
      }
    }
  },

  /**
   * Update the live formatted preview of product description
   */
  updateLivePreview() {
    const textarea = document.getElementById('prod-desc');
    const output = document.getElementById('desc-preview-output');
    if (!textarea || !output) return;

    const val = textarea.value.trim();
    if (!val) {
      output.innerHTML = '<p class="text-slate-400 italic text-center py-4">Live preview will appear here as you type...</p>';
      return;
    }

    output.innerHTML = Utils.renderRichText(val);
  },

  /**
   * Insert Markdown snippets into description textarea at cursor
   * @param {string} type
   */
  insertFormat(type) {
    const textarea = document.getElementById('prod-desc');
    if (!textarea) return;

    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const currentVal = textarea.value;
    const selected = currentVal.substring(start, end);

    let snippet = '';
    let cursorOffset = 0;

    switch (type) {
      case 'heading':
        snippet = `\n## ${selected || 'Main Heading'}\n`;
        break;
      case 'subheading':
        snippet = `\n### ${selected || 'Sub-heading'}\n`;
        break;
      case 'bold':
        snippet = `**${selected || 'Bold Text'}**`;
        break;
      case 'bullet':
        snippet = selected ? selected.split('\n').map(l => `- ${l}`).join('\n') : `\n- 100% Fresh & Authentic Quality\n- Carefully packaged & hygienic\n`;
        break;
      case 'numlist':
        snippet = selected ? selected.split('\n').map((l, i) => `${i + 1}. ${l}`).join('\n') : `\n1. Store in cool and dry place\n2. Consume within recommended shelf life\n`;
        break;
      case 'spec':
        snippet = `\nBrand: Quality Express\nShelf Life: 6 Months\nCountry of Origin: India\n`;
        break;
      case 'highlight':
        snippet = `\n> Special Note: Keep refrigerated after opening\n`;
        break;
      default:
        return;
    }

    textarea.value = currentVal.substring(0, start) + snippet + currentVal.substring(end);
    textarea.focus();
    textarea.selectionStart = start + snippet.length;
    textarea.selectionEnd = start + snippet.length;

    this.updateLivePreview();
  },

  /**
   * Save Product (Create or Update)
   */
  async saveProduct(e) {
    e.preventDefault();
    const btn = document.getElementById('save-prod-btn');
    if (btn) btn.disabled = true;

    try {
      const payload = {
        product_name: document.getElementById('prod-name').value.trim(),
        category_id: document.getElementById('prod-category-select').value,
        selling_price: Number(document.getElementById('prod-price').value),
        mrp: Number(document.getElementById('prod-mrp').value),
        unit: document.getElementById('prod-unit').value.trim(),
        stock_quantity: Number(document.getElementById('prod-stock').value),
        sku: document.getElementById('prod-sku').value.trim(),
        image_url: document.getElementById('prod-image-url').value.trim(),
        description: document.getElementById('prod-desc').value.trim()
      };

      if (this.state.editingProduct) {
        payload.productId = this.state.editingProduct.product_id;
        await api.post('adminUpdateProduct', payload, true);
        Utils.showToast('Product updated successfully.', 'success');
      } else {
        await api.post('adminCreateProduct', payload, true);
        Utils.showToast('New product created successfully.', 'success');
      }

      this.closeModal();
      await this.loadProducts();
    } catch (err) {
      Utils.showToast(err.message || 'Failed to save product.', 'error');
    } finally {
      if (btn) btn.disabled = false;
    }
  },

  setupListeners() {
    const search = document.getElementById('admin-prod-search');
    if (search) {
      search.addEventListener('input', Utils.debounce((e) => {
        this.state.searchQuery = e.target.value;
        this.renderTable();
      }, 200));
    }

    const filter = document.getElementById('filter-category-select');
    if (filter) {
      filter.addEventListener('change', (e) => {
        this.state.selectedCategory = e.target.value;
        this.renderTable();
      });
    }

    const form = document.getElementById('product-edit-form');
    if (form) {
      form.addEventListener('submit', (e) => this.saveProduct(e));
    }
  }
};
