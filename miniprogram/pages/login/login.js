const config = require("../../config");
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
    networkWarning: "",
    apiBaseLabel: "",
  },

  onLoad() {
    const session = getSession();
    if (session && session.access_token) {
      redirectAfterLogin();
      return;
    }
    const base = (config.apiBase || "").replace(/\/$/, "");
    if (!base) return;
    this.setData({ apiBaseLabel: base });
    wx.request({
      url: `${base}/api/health/supabase-config`,
      method: "GET",
      timeout: 15000,
      success: (res) => {
        if (res.statusCode !== 200) {
          this.setData({
            networkWarning:
              "API \u54cd\u5e94\u5f02\u5e38\uff08HTTP " + res.statusCode + "\uff09",
          });
        }
      },
      fail: () => {
        this.setData({
          networkWarning:
            "\u624b\u673a\u65e0\u6cd5\u8bbf\u95ee\u8be5 API\uff08\u6d77\u5916 Vercel \u5e38\u8d85\u65f6\uff09\u3002\u8bf7\u6539 config.js \u7684 apiBase \u6216\u89c1 docs/API-HOSTING-CN.md",
        });
      },
    });
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
