const { loginWithWechat, getSession, clearSession, ensureValidSession } = require("../../utils/auth");

Page({
  data: { loggedIn: false, user: null, userInitial: "\u62fc", nickname: "", loading: false, error: "" },
  onShow() { this.refreshSession(); },
  async refreshSession() {
    try {
      const session = await ensureValidSession();
      const n = (session.user && session.user.nickname) || "\u62fc";
      this.setData({ loggedIn: true, user: session.user, userInitial: n.trim().charAt(0) || "\u62fc", error: "" });
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
  onNicknameInput(e) { this.setData({ nickname: e.detail.value }); },
  async onWechatLogin() {
    this.setData({ loading: true, error: "" });
    try {
      await loginWithWechat((this.data.nickname || "").trim());
      await this.refreshSession();
      this.setData({ loading: false, nickname: "" });
    } catch (err) {
      this.setData({ error: err.message || "\u767b\u5f55\u5931\u8d25", loading: false });
    }
  },
  onGoOrders() { wx.navigateTo({ url: "/pages/index/index" }); },
  onGoProducts() { wx.navigateTo({ url: "/pages/product-submit/product-submit" }); },
  onLogout() { clearSession(); this.setData({ loggedIn: false, user: null }); },
});
