const { getSession } = require("../../utils/auth");
const { requestWithAuth } = require("../../utils/api");
const {
  CATALOG_DEFAULT_LIMIT,
  buildCatalogPath,
} = require("../../utils/catalog-api");

const SEARCH_DEBOUNCE_MS = 350;

function todayString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function mergeSelectedFlags(rows, selectedIds) {
  const map = selectedIds || {};
  return (rows || []).map((p) => ({
    ...p,
    selected: Boolean(map[p.id]),
  }));
}

function countSelected(selectedIds) {
  return Object.keys(selectedIds || {}).filter((k) => selectedIds[k]).length;
}

Page({
  data: {
    title: "",
    deliveryAddress: "",
    date: "",
    time: "18:00",
    today: "",
    displayProducts: [],
    productSearch: "",
    categoryFilter: "",
    categories: [],
    productsLoading: true,
    catalogLoadingMore: false,
    catalogTotal: 0,
    catalogOffset: 0,
    hasMore: false,
    selectedIds: {},
    selectedCount: 0,
    loading: false,
    error: "",
  },

  onLoad() {
    const session = getSession();
    if (!session?.access_token) {
      wx.redirectTo({ url: "/pages/home/home" });
      return;
    }
    this._searchDebounceTimer = null;
    this.setData({ today: todayString() });
    this.loadProducts({ reset: true });
  },

  onUnload() {
    if (this._searchDebounceTimer) {
      clearTimeout(this._searchDebounceTimer);
      this._searchDebounceTimer = null;
    }
  },

  onPullDownRefresh() {
    this.loadProducts({ reset: true }).finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.productsLoading && !this.data.catalogLoadingMore) {
      this.loadProducts({ append: true });
    }
  },

  async loadProducts(options) {
    const reset = !options || options.reset !== false;
    const append = options && options.append;

    if (append && !this.data.hasMore) return;

    if (reset) {
      this.setData({ productsLoading: true, error: "", catalogOffset: 0 });
    } else {
      this.setData({ catalogLoadingMore: true });
    }

    const offset = reset ? 0 : this.data.catalogOffset;
    const path = buildCatalogPath({
      q: this.data.productSearch,
      category: this.data.categoryFilter,
      limit: CATALOG_DEFAULT_LIMIT,
      offset,
    });

    try {
      const data = await requestWithAuth(path, "GET");
      const rows = data.products || [];
      const merged = mergeSelectedFlags(rows, this.data.selectedIds);
      const displayProducts = append
        ? this.data.displayProducts.concat(merged)
        : merged;

      const total = typeof data.total === "number" ? data.total : rows.length;
      const nextOffset = offset + rows.length;
      const categories =
        Array.isArray(data.categories) && data.categories.length > 0
          ? data.categories
          : this.data.categories;

      this.setData({
        displayProducts,
        categories,
        catalogTotal: total,
        catalogOffset: nextOffset,
        hasMore: nextOffset < total,
        productsLoading: false,
        catalogLoadingMore: false,
      });
    } catch (err) {
      this.setData({
        productsLoading: false,
        catalogLoadingMore: false,
        error: err.message || "加载商品失败",
      });
    }
  },

  onToggleProduct(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    const selectedIds = { ...this.data.selectedIds };
    if (selectedIds[id]) {
      delete selectedIds[id];
    } else {
      selectedIds[id] = true;
    }
    const displayProducts = this.data.displayProducts.map((p) =>
      p.id === id ? { ...p, selected: Boolean(selectedIds[id]) } : p,
    );
    this.setData({
      selectedIds,
      displayProducts,
      selectedCount: countSelected(selectedIds),
    });
  },

  onProductSearchInput(e) {
    const productSearch = e.detail.value || "";
    this.setData({ productSearch });
    if (this._searchDebounceTimer) {
      clearTimeout(this._searchDebounceTimer);
    }
    this._searchDebounceTimer = setTimeout(() => {
      this.loadProducts({ reset: true });
    }, SEARCH_DEBOUNCE_MS);
  },

  onClearProductSearch() {
    if (this._searchDebounceTimer) {
      clearTimeout(this._searchDebounceTimer);
      this._searchDebounceTimer = null;
    }
    this.setData({ productSearch: "" });
    this.loadProducts({ reset: true });
  },

  onCategoryTap(e) {
    const cat = e.currentTarget.dataset.cat;
    const categoryFilter = cat === undefined || cat === null ? "" : String(cat);
    if (categoryFilter === this.data.categoryFilter) return;
    if (this._searchDebounceTimer) {
      clearTimeout(this._searchDebounceTimer);
      this._searchDebounceTimer = null;
    }
    this.setData({ categoryFilter });
    this.loadProducts({ reset: true });
  },

  onTitleInput(e) {
    this.setData({ title: e.detail.value });
  },

  onAddressInput(e) {
    this.setData({ deliveryAddress: e.detail.value });
  },

  onDateChange(e) {
    this.setData({ date: e.detail.value });
  },

  onTimeChange(e) {
    this.setData({ time: e.detail.value });
  },

  onSubmit() {
    const { title, deliveryAddress, date, time, loading } = this.data;
    if (loading) return;

    const trimmedTitle = (title || "").trim();
    const trimmedAddress = (deliveryAddress || "").trim();
    if (!trimmedTitle) {
      this.setData({ error: "请输入拼单标题" });
      return;
    }
    if (!trimmedAddress) {
      this.setData({ error: "请输入取货地址" });
      return;
    }
    if (!date) {
      this.setData({ error: "请选择截止日期" });
      return;
    }

    const product_ids = Object.keys(this.data.selectedIds || {}).filter(
      (id) => this.data.selectedIds[id],
    );
    if (product_ids.length === 0) {
      this.setData({ error: "请至少选择一个商品" });
      return;
    }

    const session = getSession();
    if (!session?.user?.id) {
      wx.redirectTo({ url: "/pages/home/home" });
      return;
    }

    const deadline = `${date}T${time}:00+08:00`;

    this.setData({ loading: true, error: "" });

    requestWithAuth("/api/group-orders", "POST", {
      title: trimmedTitle,
      delivery_address: trimmedAddress,
      deadline,
      product_ids,
    })
      .then((result) => {
        const orderId = result?.order?.id;
        if (!orderId) {
          throw new Error("创建失败");
        }
        return orderId;
      })
      .then((orderId) => {
        wx.showToast({ title: "发布成功", icon: "success" });
        setTimeout(() => {
          wx.redirectTo({ url: `/pages/order/detail?id=${orderId}` });
        }, 600);
      })
      .catch((err) => {
        this.setData({
          error: err.message || "发布失败",
          loading: false,
        });
      });
  },
});
