const config = require("../config");
const { getSession } = require("./auth");

function requestWithAuth(path, method, body) {
  const session = getSession();
  if (!session?.access_token) {
    return Promise.reject(new Error("请先登录"));
  }

  const url = `${config.apiBase}${path}`;

  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method: method || "GET",
      header: {
        "content-type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      data: body,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
          return;
        }
        reject(new Error(res.data?.error || "请求失败"));
      },
      fail: (err) => reject(err),
    });
  });
}

module.exports = {
  requestWithAuth,
};
