const {
  clearSession,
  ensureValidSession,
  getSession,
  isAuthErrorMessage,
  loginPageUrl,
} = require("../../utils/auth");
const { requestWithAuth } = require("../../utils/api");

function decorateOrders(rows) {
  return (rows || []).map((o) => ({
    ...o,
    statusLabel: orderStatusLabel(o.status),
    isOpen: isOrderOpen(o.status),
    deadlineShort: formatDeadlineShort(o.deadline),
  }));
}

function orderStatusLabel(status) {
  if (status === "open" || status === "closing") return "\u8fdb\u884c\u4e2d";
  return "\u5df2\u622a\u6b62";
}

function isOrderOpen(status) {
  return status === "open" || status === "closing";
}

function formatDeadlineShort(iso) {
  if (!iso) return "";
  const s = String(iso);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (m) {
    return `${m[2]}/${m[3]} ${m[4]}:${m[5]} \u622a\u6b62`;
  }
  return s.length > 16 ? s.slice(0, 16) : s;
}

Page({
  data: {
    user: null,
    orders: [],
    listTab: "active",
    loading: true,
    error: "",
  },

  async onShow() {
    const session = getSession();
    if (!session?.access_token) {
      this.setData({ user: null, orders: [], loading: false, error: "" });
      return;
    }
    try {
      const valid = await ensureValidSession();
      this.setData({ user: valid.user });
      this.loadOrders();
    } catch (_err) {
      clearSession();
      this.setData({ user: null, orders: [], loading: false, error: "" });
    }
  },

  async loadOrders() {
    const session = getSession();
    if (!session?.access_token) {
      this.setData({ orders: [], loading: false, error: "" });
      return;
    }
    this.setData({ loading: true, error: "" });
    try {
      await requestWithAuth("/api/group-orders/close-expired", "POST").catch(
        () => {},
      );
      const scope = this.data.listTab === "history" ? "history" : "active";
      const data = await requestWithAuth(
        `/api/group-orders/mine?scope=${scope}`,
        "GET",
      );
      const orders = decorateOrders(data.orders || []);
      this.setData({ orders, loading: false });
    } catch (err) {
      if (isAuthErrorMessage(err.message)) {
        clearSession();
        this.setData({
          user: null,
          orders: [],
          error: "",
          loading: false,
        });
        return;
      }
      this.setData({
        error: err.message || "\u52a0\u8f7d\u5931\u8d25",
        loading: false,
      });
    }
  },

  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab;
    if (!tab || tab === this.data.listTab) return;
    this.setData({ listTab: tab }, () => this.loadOrders());
  },

  onCreate() {
    const session = getSession();
    if (!session?.access_token) {
      wx.navigateTo({ url: loginPageUrl("/pages/create/create") });
      return;
    }
    wx.navigateTo({ url: "/pages/create/create" });
  },

  onOrderTap(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: `/pages/order/detail?id=${id}` });
  },

  onPullDownRefresh() {
    this.loadOrders().finally(() => wx.stopPullDownRefresh());
  },
});
