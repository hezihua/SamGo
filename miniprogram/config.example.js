/** 复制为 config.js 并填写（config.js 已在 .gitignore） */
/** apiBase 由 utils/get-api-base.js 按环境自动选择，无需在此写死 */

/** 可选：覆盖自动 apiBase（如真机调试本机 http://192.168.x.x:3000） */
const FORCE_API_BASE = "";

module.exports = {
  FORCE_API_BASE,
  supabaseUrl: "https://xxxx.supabase.co",
  supabaseAnonKey: "your_supabase_anon_key",
};
