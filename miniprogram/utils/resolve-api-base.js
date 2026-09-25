/** 生产 API（体验版 / 正式版 / 真机预览） */
const PROD_API_BASE = "https://samgo.haylee.site";

/** 开发者工具模拟器 + 本机 pnpm dev */
const DEV_API_BASE = "http://127.0.0.1:3000";

/**
 * @param {string} [forceBase] 非空则优先使用（如真机调试填电脑局域网 IP:3000）
 */
function resolveApiBase(forceBase) {
  const forced = (forceBase || "").trim().replace(/\/$/, "");
  if (forced) return forced;

  let envVersion = "release";
  try {
    envVersion = wx.getAccountInfoSync().miniProgram.envVersion;
  } catch (_e) {}

  // 开发版（含开发者工具模拟器）：默认本机 Next；上传后的体验版/正式版走线上
  // 手机扫「预览码」也是 develop，无法访问 127.0.0.1，请改用体验版或设 FORCE_API_BASE 为电脑局域网 IP
  if (envVersion === "develop") {
    return DEV_API_BASE;
  }

  return PROD_API_BASE;
}

module.exports = {
  resolveApiBase,
  PROD_API_BASE,
  DEV_API_BASE,
};
