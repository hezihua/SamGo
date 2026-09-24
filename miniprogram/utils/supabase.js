const config = require("../config");
const { getSession } = require("./auth");

function rest(path, options = {}) {
  const session = getSession();
  if (!session?.access_token) {
    return Promise.reject(new Error("请先登录"));
  }

  const url = `${config.supabaseUrl}/rest/v1/${path}`;

  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method: options.method || "GET",
      header: {
        apikey: config.supabaseAnonKey,
        Authorization: `Bearer ${session.access_token}`,
        "content-type": "application/json",
        Prefer: options.prefer || "return=representation",
        ...options.header,
      },
      data: options.body,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
          return;
        }
        reject(new Error(res.data?.message || "请求失败"));
      },
      fail: reject,
    });
  });
}

function fetchOpenOrders() {
  return rest(
    "group_orders?select=id,title,status,deadline,delivery_address&order=created_at.desc"
  );
}

module.exports = {
  rest,
  fetchOpenOrders,
};
