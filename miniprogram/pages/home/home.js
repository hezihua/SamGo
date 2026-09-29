const { loginWithWechat, clearSession, ensureValidSession } = require("../../utils/auth");

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
    userInitial: "\u62fc",
    nickname: loadNicknamePref(),
    loading: false,
    error: "",
  },
  onShow() {
    this.refreshSession();
  },
  async refreshSession() {
    try {
      const session = await ensureValidSession();
      const n = (session.user && session.user.nickname) || "\u62fc";
      this.setData({ loggedIn: true, user: session.user, userInitial: n.trim().charAt(0) || "\u62fc", error: "" });
      this.openPendingOrder();
    } catch (_e) {
      this.setData({
        loggedIn: false,
        user: null,
        nickname: loadNicknamePref(),
      });
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
  onNicknameInput(e) {
    const nickname = e.detail.value;
    this.setData({ nickname });
    saveNicknamePref(nickname);
  },
  async onWechatLogin() {
    this.setData({ loading: true, error: "" });
    const nick = (this.data.nickname || "").trim();
    try {
      await loginWithWechat(nick);
      saveNicknamePref(nick);
      await this.refreshSession();
      this.setData({ loading: false });
    } catch (err) {
      this.setData({ error: err.message || "\u767b\u5f55\u5931\u8d25", loading: false });
    }
  },
  onGoOrders() { wx.navigateTo({ url: "/pages/index/index" }); },
  onGoProducts() { wx.navigateTo({ url: "/pages/product-submit/product-submit" }); },
  onLogout() {
    const nick =
      (this.data.user && this.data.user.nickname) || this.data.nickname;
    saveNicknamePref(nick);
    clearSession();
    this.setData({
      loggedIn: false,
      user: null,
      nickname: loadNicknamePref(),
    });
  },
});
