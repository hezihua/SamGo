const { getSession } = require("../../utils/auth");
const { requestWithAuth } = require("../../utils/api");
const { rest } = require("../../utils/supabase");

function todayString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

Page({
  data: {
    title: "",
    deliveryAddress: "",
    date: "",
    time: "18:00",
    minParticipants: "2",
    today: "",
    products: [],
    productsLoading: true,
    selectedCount: 0,
    loading: false,
    error: "",
  },

  onLoad() {
    const session = getSession();
    if (!session?.access_token) {
      wx.redirectTo({ url: "/pages/login/login" });
      return;
    }
    this.setData({ today: todayString() });
    this.loadProducts();
  },

  async loadProducts() {
    this.setData({ productsLoading: true, error: "" });
    try {
      const rows = await rest("products?select=id,name,price,category&order=name.asc");
      const products = (rows || []).map((p) => ({ ...p, selected: false }));
      this.setData({ products, productsLoading: false });
    } catch (err) {
      this.setData({
        productsLoading: false,
        error: err.message || "\u52a0\u8f7d\u5546\u54c1\u5931\u8d25",
      });
    }
  },

  onToggleProduct(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    const products = this.data.products.map((p) =>
      p.id === id ? { ...p, selected: !p.selected } : p,
    );
    const selectedCount = products.filter((p) => p.selected).length;
    this.setData({ products, selectedCount });
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

  onMinInput(e) {
    this.setData({ minParticipants: e.detail.value });
  },

  onSubmit() {
    const { title, deliveryAddress, date, time, minParticipants, loading } =
      this.data;
    if (loading) return;

    const trimmedTitle = (title || "").trim();
    const trimmedAddress = (deliveryAddress || "").trim();
    if (!trimmedTitle) {
      this.setData({ error: "\u8bf7\u8f93\u5165\u62fc\u5355\u6807\u9898" });
      return;
    }
    if (!trimmedAddress) {
      this.setData({ error: "\u8bf7\u8f93\u5165\u53d6\u8d27\u5730\u5740" });
      return;
    }
    if (!date) {
      this.setData({ error: "\u8bf7\u9009\u62e9\u622a\u6b62\u65e5\u671f" });
      return;
    }

    const min = parseInt(minParticipants, 10);
    if (!min || min < 2) {
      this.setData({ error: "\u6700\u5c11\u4eba\u6570\u81f3\u5c11\u4e3a 2" });
      return;
    }

    const product_ids = this.data.products
      .filter((p) => p.selected)
      .map((p) => p.id);
    if (product_ids.length === 0) {
      this.setData({ error: "\u8bf7\u81f3\u5c11\u9009\u62e9\u4e00\u4e2a\u5546\u54c1" });
      return;
    }

    const session = getSession();
    if (!session?.user?.id) {
      wx.redirectTo({ url: "/pages/login/login" });
      return;
    }

    const deadline = `${date}T${time}:00+08:00`;

    this.setData({ loading: true, error: "" });

    requestWithAuth("/api/group-orders", "POST", {
      title: trimmedTitle,
      delivery_address: trimmedAddress,
      deadline,
      min_participants: min,
      product_ids,
    })
      .then((result) => {
        if (!result?.order?.id) {
          throw new Error("\u521b\u5efa\u5931\u8d25");
        }
      })
      .then(() => {
        wx.showToast({ title: "\u53d1\u5e03\u6210\u529f", icon: "success" });
        setTimeout(() => wx.navigateBack(), 1500);
      })
      .catch((err) => {
        this.setData({
          error: err.message || "\u53d1\u5e03\u5931\u8d25",
          loading: false,
        });
      });
  },
});
