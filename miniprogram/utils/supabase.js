const config = require("../config");
const {
  getSession,
  ensureValidSession,
  refreshSessionWithToken,
  isAuthErrorMessage,
  clearSession,
} = require("./auth");

function restOnce(path, options, accessToken) {
  const url = `${config.supabaseUrl}/rest/v1/${path}`;

  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method: options.method || "GET",
      header: {
        apikey: config.supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
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
        const message =
          (res.data && (res.data.message || res.data.error)) || "\u8bf7\u6c42\u5931\u8d25";
        const err = new Error(message);
        err.statusCode = res.statusCode;
        reject(err);
      },
      fail: reject,
    });
  });
}

async function rest(path, options = {}) {
  let session = await ensureValidSession();

  try {
    return await restOnce(path, options, session.access_token);
  } catch (err) {
    const message = err.message || "";
    const expired =
      err.statusCode === 401 && isAuthErrorMessage(message);

    if (!expired || !session.refresh_token) {
      if (isAuthErrorMessage(message)) {
        clearSession();
      }
      throw err;
    }

    session = await refreshSessionWithToken(session.refresh_token);
    try {
      return await restOnce(path, options, session.access_token);
    } catch (retryErr) {
      if (isAuthErrorMessage(retryErr.message)) {
        clearSession();
      }
      throw retryErr;
    }
  }
}

function fetchOpenOrders() {
  return rest(
    "group_orders?select=id,title,status,deadline,delivery_address&order=created_at.desc",
  );
}

function createGroupOrder(fields) {
  return rest("group_orders", {
    method: "POST",
    body: fields,
  });
}

function joinGroupOrder(groupOrderId, userId) {
  return rest("participants", {
    method: "POST",
    body: {
      group_order_id: groupOrderId,
      user_id: userId,
    },
  });
}

module.exports = {
  rest,
  fetchOpenOrders,
  createGroupOrder,
  joinGroupOrder,
};
