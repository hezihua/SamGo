const { clearSession, ensureValidSession, getSession } = require("../../utils/auth");

const NICKNAME_PREF_KEY = "samgo_nickname_pref";

function loadNicknamePref() {
  try {
    return wx.getStorageSync(NICKNAME_PREF_KEY) || "";
  } catch (_e) {
    return "";
  }
}

function saveNicknamePref(nick) {
  try {
    const v = (nick || "").trim();
    if (v) wx.setStorageSync(NICKNAME_PREF_KEY, v);
  } catch (_e) {}
}

Page({
  data: {
    loggedIn: false,
    user: null,
    userInitial: "拼",
  },

  onShow() {
    this.refreshSession();
  },

  async refreshSession() {
    const session = getSession();
    if (!session?.access_token) {
      this.setData({ loggedIn: false, user: null });
      return;
    }
    try {
      const valid = await ensureValidSession();
      const n = (valid.user && valid.user.nickname) || "拼";
      this.setData({
        loggedIn: true,
        user: valid.user,
        userInitial: n.trim().charAt(0) || "拼",
      });
      this.openPendingOrder();
    } catch (_e) {
      this.setData({ loggedIn: false, user: null });
    }
  },

  openPendingOrder() {
    try {
      const pending = wx.getStorageSync("samgo_pending_order_id") || "";
      if (pending) {
        wx.removeStorageSync("samgo_pending_order_id");
        wx.navigateTo({ url: "/pages/order/detail?id=" + pending });
      }
    } catch (_e) {}
  },

  onGoOrders() {
    wx.navigateTo({ url: "/pages/index/index" });
  },

  onGoProducts() {
    wx.navigateTo({ url: "/pages/product-submit/product-submit" });
  },

  onLogout() {
    const nick = (this.data.user && this.data.user.nickname) || "";
    saveNicknamePref(nick);
    clearSession();
    this.setData({
      loggedIn: false,
      user: null,
    });
  },
});
