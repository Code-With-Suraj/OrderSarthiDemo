/**
 * OrderSarthi — Products & Catalog Controller
 * Manages category filtering, debounced search, product card rendering, and stock status.
 */

const ProductsController = {
  state: {
    products: [],
    categories: [],
    bestsellers: [],
    selectedCategory: '',
    searchQuery: '',
    page: 1,
    limit: 30,
    hasMore: false,
    isLoading: false
  },

  /**
   * Initialize Catalog Page
   */
  async initShopPage() {
    UI.renderHeader('shop');
    UI.renderFooter();
    UI.renderMobileCartBar();
    UI.setPageTitle('Shop Catalog');

    const queryParams = Utils.getQueryParams();
    if (queryParams.category) this.state.selectedCategory = queryParams.category;
    if (queryParams.q) this.state.searchQuery = queryParams.q;

    await this.loadCategories();
    this.loadBestSellers();
    await this.loadProducts(true);

    this.setupEventListeners();
  },

  /**
   * Load Best Seller items instantly (0-1ms)
   */
  async loadBestSellers() {
    const section = document.getElementById('bestsellers-section');
    if (!section) return;

    // STEP 1: Instant 0.1ms render from local recommendation cache
    if (typeof Recommendations !== 'undefined') {
      const instantBS = Recommendations.getInstantBestSellers(8);
      if (instantBS && instantBS.length > 0) {
        this.state.bestsellers = instantBS;
        this.renderBestSellers();
      }
    }

    // STEP 2: Background refresh if cache is empty or stale
    try {
      if (typeof Recommendations !== 'undefined') {
        Recommendations.preload(false);
      }
      if (!this.state.bestsellers || this.state.bestsellers.length === 0) {
        const res = await api.get('getBestSellers', { limit: 8 });
        this.state.bestsellers = res.products || [];
        this.renderBestSellers();
      }
    } catch (err) {
      console.warn('Failed to load best sellers:', err);
      if (section && (!this.state.bestsellers || this.state.bestsellers.length === 0)) {
        section.classList.add('hidden');
      }
    }
  },

  /**
   * Render Best Sellers section based on current filters
   */
  renderBestSellers() {
    const section = document.getElementById('bestsellers-section');
    const grid = document.getElementById('bestsellers-grid');
    if (!section || !grid) return;

    // Show bestsellers only when browsing all categories without active search
    const hasFilter = Boolean(this.state.selectedCategory || this.state.searchQuery);
    if (hasFilter || !this.state.bestsellers || this.state.bestsellers.length === 0) {
      section.classList.add('hidden');
      return;
    }

    section.classList.remove('hidden');
    grid.innerHTML = this.state.bestsellers.map(p => {
      const isOutOfStock = p.stock_status === 'OUT_OF_STOCK';
      const hasDiscount = p.mrp > p.selling_price;
      const discountPercent = hasDiscount ? Math.round(((p.mrp - p.selling_price) / p.mrp) * 100) : 0;
      const imgUrl = Utils.formatImageUrl(p.image_url, 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300');

      return `
        <div class="w-40 sm:w-48 shrink-0 bg-white border border-slate-200 hover:border-amber-400 rounded-2xl p-3 flex flex-col justify-between group transition-all hover:shadow-md">
          <a href="./product.html?id=${p.product_id}" class="block relative aspect-square rounded-xl overflow-hidden mb-2 bg-slate-50 border border-slate-100 p-1.5">
            <img src="${imgUrl}" alt="${Utils.escapeHTML(p.product_name)}" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1542838132-92c53300491e?w=300'" class="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 ${isOutOfStock ? 'opacity-40 grayscale' : ''}" loading="lazy" />
            <span class="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-500 text-white shadow-xs">
              ★ Best Seller
            </span>
            ${hasDiscount && !isOutOfStock ? `
              <span class="absolute bottom-1.5 left-1.5 px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-[#2563EB] text-white shadow-xs">
                ${discountPercent}% OFF
              </span>
            ` : ''}
          </a>

          <div class="flex-1">
            <div class="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">${Utils.escapeHTML(p.unit || '1 unit')}</div>
            <a href="./product.html?id=${p.product_id}" class="block font-bold text-xs sm:text-sm text-slate-900 hover:text-[#0C831F] transition-colors line-clamp-2 leading-snug mb-2">
              ${Utils.escapeHTML(p.product_name)}
            </a>
          </div>

          <div class="mt-auto pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
            <div>
              <div class="text-sm font-extrabold text-slate-900 font-display">
                ${Utils.formatCurrency(p.selling_price)}
              </div>
              ${hasDiscount ? `<div class="text-[10px] text-slate-400 line-through">${Utils.formatCurrency(p.mrp)}</div>` : ''}
            </div>

            <button onclick="Cart.addItem(${JSON.stringify(p).replace(/"/g, '&quot;')})"
              ${isOutOfStock ? 'disabled' : ''}
              class="btn-add-outline text-xs font-extrabold !py-1 !px-3 shrink-0 ${isOutOfStock ? 'opacity-40 !cursor-not-allowed' : ''}">
              ADD
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  /**
   * Load active categories from API
   */
  async loadCategories() {
    const container = document.getElementById('category-pills');
    if (!container) return;

    try {
      this.state.categories = await api.get('getCategories');
      this.renderCategoryPills();
    } catch (err) {
      console.warn("Failed to load categories:", err.message);
    }
  },

  /**
   * Render category tabs/pills
   */
  renderCategoryPills() {
    const container = document.getElementById('category-pills');
    if (!container) return;

    let html = `
      <button onclick="ProductsController.selectCategory('')"
        class="px-4 py-2 rounded-xl text-xs font-extrabold tracking-wide shrink-0 transition-all ${!this.state.selectedCategory ? 'bg-[#0C831F] text-white shadow-xs' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'}">
        All Items
      </button>
    `;

    this.state.categories.forEach(cat => {
      const isSelected = this.state.selectedCategory === cat.category_id;
      html += `
        <button onclick="ProductsController.selectCategory('${cat.category_id}')"
          class="px-4 py-2 rounded-xl text-xs font-extrabold tracking-wide shrink-0 transition-all ${isSelected ? 'bg-[#0C831F] text-white shadow-xs' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'}">
          ${Utils.escapeHTML(cat.category_name)}
        </button>
      `;
    });

    container.innerHTML = html;
  },

  /**
   * Select a category filter
   * @param {string} categoryId
   */
  async selectCategory(categoryId) {
    this.state.selectedCategory = categoryId;
    this.renderCategoryPills();
    this.renderBestSellers();
    await this.loadProducts(true);
  },

  /**
   * Load products with pagination
   * @param {boolean} reset
   */
  async loadProducts(reset = false) {
    if (this.state.isLoading) return;
    this.state.isLoading = true;

    if (reset) {
      this.state.page = 1;
      this.state.products = [];
      this.renderLoadingSkeletons();
    }

    const grid = document.getElementById('product-grid');
    const loadMoreBtn = document.getElementById('load-more-btn');

    try {
      const queryParams = {
        category: this.state.selectedCategory,
        search: this.state.searchQuery,
        page: this.state.page,
        limit: this.state.limit
      };
      if (reset) queryParams._t = Date.now();

      const result = await api.get('getProducts', queryParams);

      const newProducts = result.products || [];
      this.state.hasMore = result.pagination?.has_more || false;

      // Automatically warm recommendations catalog cache
      if (typeof Recommendations !== 'undefined' && newProducts.length > 0) {
        Recommendations.feedCatalog(newProducts);
      }

      if (reset) {
        this.state.products = newProducts;
      } else {
        this.state.products.push(...newProducts);
      }

      this.renderProductGrid();

      if (loadMoreBtn) {
        loadMoreBtn.classList.toggle('hidden', !this.state.hasMore);
      }
    } catch (err) {
      if (grid) {
        grid.innerHTML = `
          <div class="col-span-full py-16 text-center text-slate-500">
            <svg class="w-12 h-12 mx-auto mb-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <p class="text-base font-bold text-slate-800">Unable to load products</p>
            <p class="text-xs text-slate-500 mt-1">${Utils.escapeHTML(err.message)}</p>
            <button onclick="ProductsController.loadProducts(true)" class="btn-secondary text-xs mt-4">Try Again</button>
          </div>
        `;
      }
    } finally {
      this.state.isLoading = false;
    }
  },

  /**
   * Render loading skeletons in product grid
   */
  renderLoadingSkeletons() {
    const grid = document.getElementById('product-grid');
    if (!grid) return;

    let html = '';
    for (let i = 0; i < 8; i++) {
      html += `
        <div class="bg-white border border-slate-200 rounded-2xl p-3.5 flex flex-col justify-between">
          <div class="w-full aspect-square skeleton rounded-xl mb-3"></div>
          <div class="h-4 skeleton rounded w-3/4 mb-2"></div>
          <div class="h-3 skeleton rounded w-1/2 mb-4"></div>
          <div class="flex items-center justify-between mt-auto pt-2 border-t border-slate-100">
            <div class="h-5 skeleton rounded w-16"></div>
            <div class="h-8 skeleton rounded w-20"></div>
          </div>
        </div>
      `;
    }
    grid.innerHTML = html;
  },

  /**
   * Render product cards in grid
   */
  renderProductGrid() {
    const grid = document.getElementById('product-grid');
    if (!grid) return;

    if (this.state.products.length === 0) {
      grid.innerHTML = `
        <div class="col-span-full py-16 text-center">
          <div class="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-400">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
          <h3 class="text-lg font-extrabold text-slate-900 font-display">No products found</h3>
          <p class="text-xs text-slate-500 mt-1 max-w-sm mx-auto">Try changing your search query or selecting a different category.</p>
          <button onclick="ProductsController.selectCategory(''); document.getElementById('search-input').value = ''; ProductsController.state.searchQuery = '';" class="btn-secondary text-xs mt-4 font-bold">
            Reset Filters
          </button>
        </div>
      `;
      return;
    }

    grid.innerHTML = this.state.products.map(p => this.createProductCardHtml(p)).join('');
  },

  /**
   * Create HTML markup for single product card (Blinkit Quick-Commerce Style)
   * @param {Object} p
   * @returns {string}
   */
  createProductCardHtml(p) {
    const isOutOfStock = p.stock_status === 'OUT_OF_STOCK';
    const hasDiscount = p.mrp > p.selling_price;
    const discountPercent = hasDiscount ? Math.round(((p.mrp - p.selling_price) / p.mrp) * 100) : 0;
    const imgUrl = Utils.formatImageUrl(p.image_url, 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400');

    return `
      <div class="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-3 sm:p-4 flex flex-col justify-between group relative transition-all duration-200 hover:shadow-md">
        <!-- Image & Discount Badge -->
        <a href="./product.html?id=${p.product_id}" class="block relative aspect-square rounded-xl overflow-hidden mb-3 bg-slate-50 border border-slate-100">
          <img src="${imgUrl}" alt="${Utils.escapeHTML(p.product_name)}" loading="lazy"
            onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1542838132-92c53300491e?w=400'"
            class="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300 ${isOutOfStock ? 'opacity-40 grayscale' : ''}" />
          
          ${hasDiscount && !isOutOfStock ? `
            <span class="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-[#2563EB] text-white shadow-xs">
              ${discountPercent}% OFF
            </span>
          ` : ''}

          ${isOutOfStock ? `
            <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center">
              <span class="px-2 py-1 rounded-md text-[11px] font-extrabold bg-slate-900 text-white">Out of Stock</span>
            </div>
          ` : ''}
        </a>

        <!-- Content -->
        <div class="flex-1 flex flex-col">
          <div class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">${Utils.escapeHTML(p.unit || '1 unit')}</div>
          <a href="./product.html?id=${p.product_id}" class="block font-bold text-xs sm:text-sm text-slate-900 hover:text-[#0C831F] transition-colors line-clamp-2 leading-snug mb-2">
            ${Utils.escapeHTML(p.product_name)}
          </a>
        </div>

        <!-- Price & Add Button -->
        <div class="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
          <div>
            <div class="text-sm sm:text-base font-extrabold text-slate-900 font-display">
              ${Utils.formatCurrency(p.selling_price)}
            </div>
            ${hasDiscount ? `
              <div class="text-[11px] text-slate-400 line-through">
                ${Utils.formatCurrency(p.mrp)}
              </div>
            ` : ''}
          </div>

          <button onclick="Cart.addItem(${JSON.stringify(p).replace(/"/g, '&quot;')})"
            ${isOutOfStock ? 'disabled' : ''}
            class="btn-add-outline text-xs font-extrabold shrink-0 ${isOutOfStock ? 'opacity-40 !cursor-not-allowed' : ''}">
            ADD
          </button>
        </div>
      </div>
    `;
  },

  /**
   * Setup search input debounce listener
   */
  setupEventListeners() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      if (this.state.searchQuery) searchInput.value = this.state.searchQuery;

      searchInput.addEventListener('input', Utils.debounce((e) => {
        this.state.searchQuery = e.target.value;
        this.renderBestSellers();
        this.loadProducts(true);
      }, CONFIG.SEARCH_DEBOUNCE_MS));
    }

    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', () => {
        this.state.page += 1;
        this.loadProducts(false);
      });
    }
  }
};
