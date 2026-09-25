const { loginWithWechat, getSession } = require("../../utils/auth");

const PENDING_ORDER_KEY = "samgo_pending_order_id";

function redirectAfterLogin() {
  let pending = "";
  try {
    pending = wx.getStorageSync(PENDING_ORDER_KEY) || "";
    if (pending) wx.removeStorageSync(PENDING_ORDER_KEY);
  } catch (_e) {}
  if (pending) {
    wx.redirectTo({ url: `/pages/order/detail?id=${pending}` });
    return;
  }
  wx.redirectTo({ url: "/pages/index/index" });
}

Page({
  data: {
    nickname: "",
    loading: false,
    error: "",
  },

  onLoad() {
    const session = getSession();
    if (session && session.access_token) {
      redirectAfterLogin();
    }
  },

  onNicknameInput(e) {
    this.setData({ nickname: e.detail.value });
  },

  async onWechatLogin() {
    this.setData({ loading: true, error: "" });
    try {
      await loginWithWechat(this.data.nickname.trim());
      redirectAfterLogin();
    } catch (err) {
      this.setData({
        error: err.message || "登录失败",
        loading: false,
      });
    }
  },
});
