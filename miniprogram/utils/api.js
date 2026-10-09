const { getApiBase } = require("./get-api-base");
const {
  ensureValidSession,
  refreshSessionWithToken,
  isAuthErrorMessage,
  clearSession,
} = require("./auth");

function requestOnce(path, method, body, accessToken) {
  const url = `${getApiBase()}${path}`;

  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method: method || "GET",
      header: {
        "content-type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      data: method === "GET" || method === "DELETE" ? undefined : body,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
          return;
        }
        const err = new Error(
          (res.data && res.data.error) || "\u8bf7\u6c42\u5931\u8d25",
        );
        err.statusCode = res.statusCode;
        reject(err);
      },
      fail: (err) => reject(err),
    });
  });
}

async function requestWithAuth(path, method, body) {
  let session = await ensureValidSession();

  try {
    return await requestOnce(path, method, body, session.access_token);
  } catch (err) {
    if (err.statusCode !== 401 || !session.refresh_token) {
      if (isAuthErrorMessage(err.message)) {
        clearSession();
      }
      throw err;
    }
    session = await refreshSessionWithToken(session.refresh_token);
    try {
      return await requestOnce(path, method, body, session.access_token);
    } catch (retryErr) {
      if (isAuthErrorMessage(retryErr.message)) {
        clearSession();
      }
      throw retryErr;
    }
  }
}

function uploadOnce(path, filePath, formData, accessToken) {
  const url = `${getApiBase()}${path}`;
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url,
      filePath,
      name: "file",
      formData: formData || {},
      header: {
        Authorization: `Bearer ${accessToken}`,
      },
      success: (res) => {
        let data = {};
        try {
          data = JSON.parse(res.data || "{}");
        } catch (_e) {
          const err = new Error(
            res.statusCode === 401 ? "请先登录" : "上传失败（服务返回异常）",
          );
          err.statusCode = res.statusCode;
          reject(err);
          return;
        }
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
          return;
        }
        const err = new Error((data && data.error) || "上传失败");
        err.statusCode = res.statusCode;
        reject(err);
      },
      fail: (err) => {
        reject(
          new Error(
            (err && err.errMsg) || "上传失败，请检查网络与 request 合法域名",
          ),
        );
      },
    });
  });
}

async function uploadWithAuth(path, filePath, formData) {
  let session = await ensureValidSession();
  try {
    return await uploadOnce(path, filePath, formData, session.access_token);
  } catch (err) {
    if (err.statusCode !== 401 || !session.refresh_token) {
      if (isAuthErrorMessage(err.message)) {
        clearSession();
      }
      throw err;
    }
    session = await refreshSessionWithToken(session.refresh_token);
    try {
      return await uploadOnce(path, filePath, formData, session.access_token);
    } catch (retryErr) {
      if (isAuthErrorMessage(retryErr.message)) {
        clearSession();
      }
      throw retryErr;
    }
  }
}

module.exports = {
  requestWithAuth,
  uploadWithAuth,
};
