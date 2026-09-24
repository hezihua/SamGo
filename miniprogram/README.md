# SamGo 微信小程序

## 1. 后端准备

1. 在 Supabase SQL Editor 执行 `supabase/migrations/002_wechat_openid.sql`
2. 在项目根目录 `.env.local` 配置：
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `WECHAT_MINI_APP_ID` / `WECHAT_MINI_APP_SECRET`
   - `WECHAT_AUTH_SECRET`（随机长字符串）
3. 部署 Next 到 HTTPS 域名（或本地隧道用于调试）

## 2. 小程序配置

1. 复制 `config.example.js` 为 `config.js`
2. 在 `project.config.json` 填写你的 **AppID**
3. 微信公众平台 → 开发管理 → 服务器域名：
   - request：`https://你的部署域名`、`https://xxx.supabase.co`

## 3. 打开项目

微信开发者工具 → 导入目录 `miniprogram/` → 本地调试可勾选「不校验合法域名」。

登录流程：`wx.login` → `POST /api/wechat/login` → 保存 Supabase session → 拉取拼单列表。
