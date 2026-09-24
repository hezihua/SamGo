const { getSession, clearSession } = require("../../utils/auth");
const { fetchOpenOrders } = require("../../utils/supabase");

const STATUS_LABEL = {
  open: "进行中",
  closing: "即将截止",
  closed: "已截止",
  completed: "已完成",
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
        error: err.message || "加载失败",
        loading: false,
      });
    }
  },

  onLogout() {
    clearSession();
    wx.redirectTo({ url: "/pages/login/login" });
  },

  onPullDownRefresh() {
    this.loadOrders().finally(() => wx.stopPullDownRefresh());
  },
});
