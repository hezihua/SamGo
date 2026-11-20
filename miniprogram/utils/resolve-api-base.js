/** 生产 API（体验版 / 正式版 / 真机预览） */
const PROD_API_BASE = "https://samgo.haylee.site";

/** 开发者工具模拟器 + 本机 pnpm dev */
const DEV_API_BASE = "http://127.0.0.1:3000";

function isDevtoolsSimulator() {
  try {
    return wx.getSystemInfoSync().platform === "devtools";
  } catch (_e) {
    return false;
  }
}

/**
 * @param {string} [forceBase] 非空则优先使用（如真机连本机 Next：http://192.168.x.x:3000）
 */
function resolveApiBase(forceBase) {
  const forced = (forceBase || "").trim().replace(/\/$/, "");
  if (forced) return forced;

  let envVersion = "release";
  try {
    envVersion = wx.getAccountInfoSync().miniProgram.envVersion;
  } catch (_e) {}

  // 仅「开发者工具模拟器」走本机；真机调试/预览虽也是 develop，手机访问不到 127.0.0.1
  if (envVersion === "develop" && isDevtoolsSimulator()) {
    return DEV_API_BASE;
  }

  return PROD_API_BASE;
}

module.exports = {
  resolveApiBase,
  PROD_API_BASE,
  DEV_API_BASE,
};
