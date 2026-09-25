# SamGo 微信小程序

## 1. 后端准备

1. 在 Supabase SQL Editor **按顺序**执行：
   - `supabase/migrations/001_initial_schema.sql`（若库尚未初始化）
   - `supabase/migrations/002_wechat_openid.sql`
   - `supabase/migrations/004_drop_profile_trigger.sql`（登录 500 / `Database error creating new user` 时**先跑这个**）
   - 或 `supabase/migrations/003_fix_handle_new_user.sql`（保留自动建 profile 的完整修复）
   - `supabase/migrations/005_leader_only_group_orders.sql`（拼单创建仅走 API，禁止客户端直写）
   - `supabase/migrations/006_group_order_products.sql`（发起拼单勾选商品）
   - 本地一键（需 `.env.local` 配置 `SUPABASE_DB_URL`）：`pnpm db:apply:004`
2. 在项目根目录 `.env.local` 配置：
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `WECHAT_MINI_APP_ID` / `WECHAT_MINI_APP_SECRET`
   - `WECHAT_AUTH_SECRET`（随机长字符串）
   - `WECHAT_LEADER_OPENID`（可选，登录响应 `is_leader`；发起拼单不限团长）
3. 部署 Next 到 HTTPS 域名（或本地隧道用于调试）

## 2. 小程序配置

1. 复制 `config.example.js` 为 `config.js`
2. 在 `project.config.json` 填写你的 **AppID**
3. 微信公众平台 → 开发管理 → 服务器域名：
   - request：`https://你的部署域名`、`https://xxx.supabase.co`
   - downloadFile（商品图 OSS/CDN）：如 `https://hzh-samgo.oss-cn-shenzhen.aliyuncs.com`

## 3. 打开项目

微信开发者工具 → 导入目录 `miniprogram/` → 本地调试可勾选「不校验合法域名」。

登录流程：`wx.login` → `POST /api/wechat/login` → 保存 Supabase session → 拉取拼单列表。

`config.js` 通过 `utils/resolve-api-base.js` **按环境选 apiBase**：开发者工具模拟器 → `http://127.0.0.1:3000`（需本机 `pnpm dev`）；体验版/正式版/手机预览 → `https://samgo.haylee.site`。真机调试本机 API 时在 `config.js` 设 `FORCE_API_BASE` 为电脑局域网地址。

生产管理后台：https://samgo.haylee.site/admin/products（Vercel 环境变量 `ADMIN_PASSWORD`）。

域名清单见 [docs/WECHAT-DOMAINS.md](../docs/WECHAT-DOMAINS.md)。
