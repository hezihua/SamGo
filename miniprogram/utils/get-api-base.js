const { resolveApiBase } = require("./resolve-api-base");

/** 始终按环境解析；忽略 config.js 里写死的 apiBase */
function getApiBase() {
  let force = "";
  try {
    const c = require("../config");
    force = c.forceApiBase || c.FORCE_API_BASE || "";
  } catch (_e) {}
  return resolveApiBase(force);
}

module.exports = { getApiBase };
