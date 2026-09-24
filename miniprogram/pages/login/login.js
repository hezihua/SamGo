const { loginWithWechat, getSession } = require("../../utils/auth");

Page({
  data: {
    nickname: "",
    loading: false,
    error: "",
  },

  onLoad() {
    const session = getSession();
    if (session?.access_token) {
      wx.redirectTo({ url: "/pages/index/index" });
    }
  },

  onNicknameInput(e) {
    this.setData({ nickname: e.detail.value });
  },

  async onWechatLogin() {
    this.setData({ loading: true, error: "" });
    try {
      await loginWithWechat(this.data.nickname.trim());
      wx.redirectTo({ url: "/pages/index/index" });
    } catch (err) {
      this.setData({
        error: err.message || "登录失败",
        loading: false,
      });
    }
  },
});
