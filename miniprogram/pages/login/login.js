const { loginWithWechat, sanitizeLoginRedirect } = require("../../utils/auth");

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
    nickname: loadNicknamePref(),
    loading: false,
    error: "",
  },

  onLoad(options) {
    this.redirectPath = sanitizeLoginRedirect(options.redirect);
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
      wx.redirectTo({ url: this.redirectPath });
    } catch (err) {
      this.setData({
        error: err.message || "登录失败",
        loading: false,
      });
    }
  },
});
