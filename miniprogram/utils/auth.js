const config = require("../config");

const SESSION_KEY = "samgo_session";
const EXPIRY_BUFFER_SEC = 120;

function wxFailMessage(err) {
  const msg = (err && (err.errMsg || err.message)) || "";
  if (!msg) return "\u7f51\u7edc\u8bf7\u6c42\u5931\u8d25\uff0c\u8bf7\u68c0\u67e5\u7f51\u7edc\u540e\u91cd\u8bd5";
  if (
    /ERR_CONNECTION_TIMED_OUT|CONNECTION_TIMED_OUT|time out|timeout/i.test(msg)
  ) {
    return "\u624b\u673a\u8fde\u4e0d\u4e0a\u5f53\u524d API\uff08\u6d77\u5916\u8282\u70b9\u5e38\u5728\u56fd\u5185\u8d85\u65f6\uff09\u3002\u8bf7\u628a config.js \u7684 apiBase \u6539\u4e3a\u56fd\u5185\u53ef\u8bbf\u95ee\u7684\u5730\u5740\uff1a\u5f00\u53d1\u7528 cpolar \u7a7f\u900f\u672c\u673a\uff0c\u6b63\u5f0f\u7528\u56fd\u5185\u670d\u52a1\u5668\u90e8\u7f72\uff0c\u89c1 docs/API-HOSTING-CN.md";
  }
  if (/domain list|url not in/i.test(msg)) {
    return "\u65e0\u6cd5\u8fde\u63a5\u670d\u52a1\u5668\uff1a\u8bf7\u5728\u5fae\u4fe1\u516c\u4f17\u5e73\u53f0\u914d\u7f6e request \u5408\u6cd5\u57df\u540d";
  }
  return msg;
}

function isRequestTimeout(err) {
  const msg = (err && (err.errMsg || err.message)) || "";
  return /ERR_CONNECTION_TIMED_OUT|CONNECTION_TIMED_OUT|time out|timeout/i.test(
    msg,
  );
}

function postJson(url, data, timeoutMs) {
  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method: "POST",
      timeout: timeoutMs || 60000,
      header: { "content-type": "application/json" },
      data,
      success: resolve,
      fail: reject,
    });
  });
}

async function postJsonWithRetry(url, data) {
  try {
    return await postJson(url, data, 60000);
  } catch (first) {
    if (!isRequestTimeout(first)) {
      throw first;
    }
    return postJson(url, data, 90000);
  }
}

function apiErrorMessage(res, fallback) {
  const data = res && res.data;
  const fromBody = data && (data.error || data.message);
  if (fromBody) return String(fromBody);
  const code = res && res.statusCode;
  if (code >= 500) return "\u670d\u52a1\u5668\u9519\u8bef\uff08" + code + "\uff09";
  return fallback || "\u767b\u5f55\u5931\u8d25";
}

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
      timeout: 60000,
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
      fail: (err) => reject(new Error(wxFailMessage(err))),
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
        postJsonWithRetry(`${config.apiBase}/api/wechat/login`, {
          code: loginRes.code,
          nickname: nickname || undefined,
        })
          .then((res) => {
            if (res.statusCode !== 200 || !(res.data && res.data.access_token)) {
              reject(new Error(apiErrorMessage(res, "\u767b\u5f55\u5931\u8d25")));
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
          })
          .catch((err) => reject(new Error(wxFailMessage(err))));
      },
      fail: (err) => reject(new Error(wxFailMessage(err))),
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
