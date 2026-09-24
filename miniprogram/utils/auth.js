const config = require("../config");

const SESSION_KEY = "samgo_session";

function getSession() {
  return wx.getStorageSync(SESSION_KEY) || null;
}

function setSession(session) {
  wx.setStorageSync(SESSION_KEY, session);
}

function clearSession() {
  wx.removeStorageSync(SESSION_KEY);
}

function loginWithWechat(nickname) {
  return new Promise((resolve, reject) => {
    wx.login({
      success: (loginRes) => {
        if (!loginRes.code) {
          reject(new Error("wx.login 未返回 code"));
          return;
        }
        wx.request({
          url: `${config.apiBase}/api/wechat/login`,
          method: "POST",
          header: { "content-type": "application/json" },
          data: {
            code: loginRes.code,
            nickname: nickname || undefined,
          },
          success: (res) => {
            if (res.statusCode !== 200 || !res.data?.access_token) {
              reject(new Error(res.data?.error || "登录失败"));
              return;
            }
            const session = {
              access_token: res.data.access_token,
              refresh_token: res.data.refresh_token,
              expires_at: res.data.expires_at,
              user: res.data.user,
            };
            setSession(session);
            resolve(session);
          },
          fail: (err) => reject(err),
        });
      },
      fail: reject,
    });
  });
}

module.exports = {
  getSession,
  setSession,
  clearSession,
  loginWithWechat,
};
