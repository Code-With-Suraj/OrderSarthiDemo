/**
 * OrderSarthi — Admin Category Management Controller
 * Category listing, add/edit modal, reordering and activation toggles.
 */

const AdminCategories = {
  state: {
    categories: [],
    editingCategory: null
  },

  async init() {
    Auth.requireAdmin();
    UI.renderAdminNav('categories');

    await this.loadCategories();
    this.setupListeners();
  },

  async loadCategories() {
    try {
      this.state.categories = await api.get('adminCategories', {}, true);
      this.renderTable();
    } catch (err) {
      Utils.showToast('Failed to load categories: ' + err.message, 'error');
    }
  },

  renderTable() {
    const tbody = document.getElementById('categories-table-tbody');
    if (!tbody) return;

    if (this.state.categories.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-slate-400 font-medium text-xs">No categories created yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = this.state.categories.map(c => {
      const isActive = c.is_active === true || c.is_active === "TRUE" || c.is_active === "true";

      return `
        <tr class="hover:bg-slate-50 transition-colors text-xs ${!isActive ? 'opacity-40' : ''}">
          <td class="py-3 px-4">
            <div class="flex items-center gap-3">
              <img src="${c.image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100'}" class="w-10 h-10 rounded-xl object-cover bg-slate-100 border border-slate-200 shrink-0" />
              <div>
                <div class="font-extrabold text-slate-900">${Utils.escapeHTML(c.category_name)}</div>
                <div class="text-[10px] text-slate-400 font-mono font-medium">${c.category_id}</div>
              </div>
            </div>
          </td>
          <td class="py-3 px-4 text-slate-600 font-medium max-w-xs truncate">${Utils.escapeHTML(c.description || '—')}</td>
          <td class="py-3 px-4 font-mono text-slate-700 font-bold">${c.sort_order || 0}</td>
          <td class="py-3 px-4">
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${isActive ? 'bg-emerald-100 text-[#0C831F] border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}">
              ${isActive ? 'Active' : 'Inactive'}
            </span>
          </td>
          <td class="py-3 px-4 text-right">
            <div class="flex items-center justify-end gap-3">
              <button onclick="AdminCategories.openEditModal('${c.category_id}')" class="text-[#0C831F] hover:underline font-extrabold text-xs">Edit</button>
              <button onclick="AdminCategories.toggleActive('${c.category_id}', ${!isActive})" class="text-slate-500 hover:text-slate-900 font-bold text-xs">${isActive ? 'Deactivate' : 'Activate'}</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  async toggleActive(categoryId, newActive) {
    try {
      await api.post('adminToggleCategory', {
        categoryId,
        isActive: newActive
      }, true);

      Utils.showToast('Category visibility updated', 'info');
      await this.loadCategories();
    } catch(e) {
      Utils.showToast(e.message, 'error');
    }
  },

  openEditModal(categoryId = null) {
    const modal = document.getElementById('category-form-modal');
    if (!modal) return;

    this.state.editingCategory = categoryId ? this.state.categories.find(c => c.category_id === categoryId) : null;
    const c = this.state.editingCategory || {};

    document.getElementById('cat-modal-title').textContent = categoryId ? 'Edit Category' : 'Add New Category';
    document.getElementById('cat-name').value = c.category_name || '';
    document.getElementById('cat-desc').value = c.description || '';
    document.getElementById('cat-image-url').value = c.image_url || '';
    document.getElementById('cat-order').value = c.sort_order || 1;

    modal.classList.remove('hidden');
  },

  closeModal() {
    document.getElementById('category-form-modal')?.classList.add('hidden');
  },

  async saveCategory(e) {
    e.preventDefault();
    const btn = document.getElementById('save-cat-btn');
    if (btn) btn.disabled = true;

    try {
      const payload = {
        category_name: document.getElementById('cat-name').value.trim(),
        description: document.getElementById('cat-desc').value.trim(),
        image_url: document.getElementById('cat-image-url').value.trim(),
        sort_order: Number(document.getElementById('cat-order').value) || 0
      };

      if (this.state.editingCategory) {
        payload.categoryId = this.state.editingCategory.category_id;
        await api.post('adminUpdateCategory', payload, true);
        Utils.showToast('Category updated successfully.', 'success');
      } else {
        await api.post('adminCreateCategory', payload, true);
        Utils.showToast('New category created successfully.', 'success');
      }

      this.closeModal();
      await this.loadCategories();
    } catch (err) {
      Utils.showToast(err.message || 'Failed to save category.', 'error');
    } finally {
      if (btn) btn.disabled = false;
    }
  },

  setupListeners() {
    const form = document.getElementById('category-edit-form');
    if (form) {
      form.addEventListener('submit', (e) => this.saveCategory(e));
    }
  }
};
