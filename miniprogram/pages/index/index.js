const {
  getSession,
  clearSession,
  ensureValidSession,
  isAuthErrorMessage,
} = require("../../utils/auth");
const { requestWithAuth } = require("../../utils/api");

const STATUS_LABEL = {
  open: "\u8fdb\u884c\u4e2d",
  closing: "\u5373\u5c06\u622a\u6b62",
  closed: "\u5df2\u622a\u6b62",
  completed: "\u5df2\u5b8c\u6210",
};

function formatDeadlineShort(iso) {
  if (!iso) return "";
  const s = String(iso);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (m) {
    return `${m[2]}/${m[3]} ${m[4]}:${m[5]} \u622a\u6b62`;
  }
  return s.length > 16 ? s.slice(0, 16) : s;
}

function userInitial(nickname) {
  const n = (nickname || "\u62fc").trim();
  return n.charAt(0) || "\u62fc";
}

Page({
  data: {
    user: null,
    userInitial: "\u62fc",
    orders: [],
    listTab: "active",
    loading: true,
    error: "",
  },

  async onShow() {
    try {
      const session = await ensureValidSession();
      this.setData({
        user: session.user,
        userInitial: userInitial(session.user && session.user.nickname),
      });
      this.loadOrders();
    } catch (_err) {
      clearSession();
      wx.redirectTo({ url: "/pages/login/login" });
    }
  },

  async loadOrders() {
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
      const orders = (data.orders || []).map((o) => ({
          ...o,
          statusLabel: STATUS_LABEL[o.status] || o.status,
          deadlineShort: formatDeadlineShort(o.deadline),
        }));
      this.setData({ orders, loading: false });
    } catch (err) {
      if (isAuthErrorMessage(err.message)) {
        clearSession();
        wx.redirectTo({ url: "/pages/login/login" });
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
