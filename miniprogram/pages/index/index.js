const { getSession, clearSession } = require("../../utils/auth");
const { fetchOpenOrders } = require("../../utils/supabase");

const STATUS_LABEL = {
  open: "\u8fdb\u884c\u4e2d",
  closing: "\u5373\u5c06\u622a\u6b62",
  closed: "\u5df2\u622a\u6b62",
  completed: "\u5df2\u5b8c\u6210",
};

Page({
  data: {
    user: null,
    orders: [],
    loading: true,
    error: "",
  },

  onShow() {
    const session = getSession();
    if (!session?.access_token) {
      wx.redirectTo({ url: "/pages/login/login" });
      return;
    }
    this.setData({ user: session.user });
    this.loadOrders();
  },

  async loadOrders() {
    this.setData({ loading: true, error: "" });
    try {
      const rows = await fetchOpenOrders();
      const orders = (rows || [])
        .filter((o) => o.status === "open" || o.status === "closing")
        .map((o) => ({
          ...o,
          statusLabel: STATUS_LABEL[o.status] || o.status,
        }));
      this.setData({ orders, loading: false });
    } catch (err) {
      this.setData({
        error: err.message || "\u52a0\u8f7d\u5931\u8d25",
        loading: false,
      });
    }
  },

  onCreate() {
    wx.navigateTo({ url: "/pages/create/create" });
  },

  onOrderTap(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: `/pages/order/detail?id=${id}` });
  },

  onLogout() {
    clearSession();
    wx.redirectTo({ url: "/pages/login/login" });
  },

  onPullDownRefresh() {
    this.loadOrders().finally(() => wx.stopPullDownRefresh());
  },
});
