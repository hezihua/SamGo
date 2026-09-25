const config = require("../config");

const SESSION_KEY = "samgo_session";
const EXPIRY_BUFFER_SEC = 120;

function getSession() {
  return wx.getStorageSync(SESSION_KEY) || null;
}

function setSession(session) {
  wx.setStorageSync(SESSION_KEY, session);
}

function clearSession() {
  wx.removeStorageSync(SESSION_KEY);
}

function strContains(str, part) {
  return String(str).indexOf(part) !== -1;
}

function sessionNeedsRefresh(session) {
  if (!session || !session.expires_at) {
    return true;
  }
  const now = Math.floor(Date.now() / 1000);
  return now >= session.expires_at - EXPIRY_BUFFER_SEC;
}

function refreshSessionWithToken(refreshToken) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${config.apiBase}/api/wechat/refresh`,
      method: "POST",
      header: { "content-type": "application/json" },
      data: { refresh_token: refreshToken },
      success: (res) => {
        if (res.statusCode !== 200 || !(res.data && res.data.access_token)) {
          reject(
            new Error(
              (res.data && res.data.error) ||
                "\u767b\u5f55\u5df2\u8fc7\u671f\uff0c\u8bf7\u91cd\u65b0\u767b\u5f55",
            ),
          );
          return;
        }
        const session = {
          access_token: res.data.access_token,
          refresh_token: res.data.refresh_token,
          expires_at: res.data.expires_at,
          user: res.data.user,
          is_leader: Boolean(res.data.is_leader),
        };
        setSession(session);
        resolve(session);
      },
      fail: (err) => reject(err),
    });
  });
}

function ensureValidSession() {
  const session = getSession();
  if (!session || !session.access_token) {
    return Promise.reject(new Error("\u8bf7\u5148\u767b\u5f55"));
  }
  if (!sessionNeedsRefresh(session)) {
    return Promise.resolve(session);
  }
  if (!session.refresh_token) {
    clearSession();
    return Promise.reject(new Error("\u767b\u5f55\u5df2\u8fc7\u671f\uff0c\u8bf7\u91cd\u65b0\u767b\u5f55"));
  }
  return refreshSessionWithToken(session.refresh_token);
}

function isAuthErrorMessage(message) {
  if (!message) return false;
  const m = String(message);
  return (
    strContains(m, "JWT expired") ||
    strContains(m, "Invalid JWT") ||
    strContains(m, "\u767b\u5f55\u5df2\u8fc7\u671f") ||
    strContains(m, "\u8bf7\u5148\u767b\u5f55")
  );
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
            if (res.statusCode !== 200 || !(res.data && res.data.access_token)) {
              reject(
                new Error((res.data && res.data.error) || "\u767b\u5f55\u5931\u8d25"),
              );
              return;
            }
            const session = {
              access_token: res.data.access_token,
              refresh_token: res.data.refresh_token,
              expires_at: res.data.expires_at,
              user: res.data.user,
              is_leader: Boolean(res.data.is_leader),
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
  ensureValidSession,
  refreshSessionWithToken,
  isAuthErrorMessage,
};
