# SamGo 微信小程序

## 1. 后端准备

1. 在 Supabase SQL Editor **按顺序**执行：
   - `supabase/migrations/001_initial_schema.sql`（若库尚未初始化）
   - `supabase/migrations/002_wechat_openid.sql`
   - `supabase/migrations/004_drop_profile_trigger.sql`（登录 500 / `Database error creating new user` 时**先跑这个**）
   - 或 `supabase/migrations/003_fix_handle_new_user.sql`（保留自动建 profile 的完整修复）
   - `supabase/migrations/005_leader_only_group_orders.sql`（仅团长 API 可创建拼单）
   - 本地一键（需 `.env.local` 配置 `SUPABASE_DB_URL`）：`pnpm db:apply:004`
2. 在项目根目录 `.env.local` 配置：
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `WECHAT_MINI_APP_ID` / `WECHAT_MINI_APP_SECRET`
   - `WECHAT_AUTH_SECRET`（随机长字符串）
   - `WECHAT_LEADER_OPENID`（团长微信 openid，仅此人可发起拼单；首次登录后在 Supabase `profiles.wechat_openid` 查看自己的值）
3. 部署 Next 到 HTTPS 域名（或本地隧道用于调试）

## 2. 小程序配置

1. 复制 `config.example.js` 为 `config.js`
2. 在 `project.config.json` 填写你的 **AppID**
3. 微信公众平台 → 开发管理 → 服务器域名：
   - request：`https://你的部署域名`、`https://xxx.supabase.co`

## 3. 打开项目

微信开发者工具 → 导入目录 `miniprogram/` → 本地调试可勾选「不校验合法域名」。

登录流程：`wx.login` → `POST /api/wechat/login` → 保存 Supabase session → 拉取拼单列表。

团长在浏览器维护商品与价格：`http://localhost:3000/admin/products`（`.env.local` 配置 `ADMIN_PASSWORD`）。
