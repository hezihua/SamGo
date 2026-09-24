# SamGo - 山姆拼单（微信小程序）

Next.js 提供微信登录等 API，拼单数据在 Supabase；客户端为 `miniprogram/` 微信小程序。

## 快速开始

### 1. Supabase

在 SQL Editor 按顺序执行（若尚未初始化）：

- `supabase/migrations/001_initial_schema.sql`
- `supabase/migrations/002_wechat_openid.sql`
- `supabase/migrations/004_drop_profile_trigger.sql`（若 Auth 建用户报 Database error）

### 2. 环境变量

```bash
cp .env.example .env.local
```

填写 Supabase、微信小程序与 `WECHAT_AUTH_SECRET`（见 `.env.example`）。

### 3. 后端 API

```bash
pnpm install
pnpm dev
```

默认 `http://localhost:3000`，小程序 `config.js` 中 `apiBase` 指向该地址。

### 4. 小程序

见 [miniprogram/README.md](./miniprogram/README.md)。

## 项目结构

```
src/app/api/wechat/login/   # 微信 code → Supabase session
src/lib/wechat-auth.ts
src/lib/supabase/admin.ts
miniprogram/                # 微信小程序
supabase/migrations/
scripts/apply-supabase-migration.mjs
```

## 部署

将 Next 部署到 HTTPS（如 Vercel），配置与 `.env.local` 相同的环境变量；小程序 `apiBase` 改为生产域名，并在微信公众平台配置 request 合法域名。

```bash
pnpm build
```
