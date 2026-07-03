# SamGo - 山姆超市拼单

基于 Next.js + Supabase 的全栈山姆超市拼单应用。支持发起拼单、加入拼单、从商品库选购、自定义商品、拼单状态管理等核心功能。

## 功能特性

- **用户认证** — 邮箱注册/登录（Supabase Auth）
- **发起拼单** — 设置标题、取货地址、截止时间、最低人数
- **加入拼单** — 浏览进行中的拼单，一键加入
- **商品选购** — 从预置山姆商品库选择，或自定义商品
- **拼单管理** — 发起人可截止/完成拼单，查看每人选购清单和金额
- **个人中心** — 管理昵称、手机号

## 技术栈

- **框架**: Next.js 16 (App Router, Server Actions)
- **数据库**: Supabase (PostgreSQL + Auth + RLS)
- **样式**: Tailwind CSS 4
- **语言**: TypeScript

## 快速开始

### 1. 创建 Supabase 项目

1. 前往 [supabase.com](https://supabase.com) 创建新项目
2. 在 SQL Editor 中执行 `supabase/migrations/001_initial_schema.sql`
3. 在 Settings → API 中获取 Project URL 和 anon key

### 2. 配置环境变量

```bash
cp .env.example .env.local
```

编辑 `.env.local`，填入 Supabase 凭证：

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### 3. 启动开发服务器

```bash
npm install
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)

## 项目结构

```
src/
├── app/
│   ├── actions/        # Server Actions (认证、拼单)
│   ├── login/          # 登录/注册页
│   ├── orders/
│   │   ├── new/        # 发起拼单
│   │   └── [id]/       # 拼单详情
│   ├── profile/        # 个人中心
│   └── page.tsx        # 首页（拼单列表）
├── components/
│   ├── ui/             # 基础 UI 组件
│   ├── navbar.tsx
│   ├── order-card.tsx
│   ├── order-detail.tsx
│   └── add-item-form.tsx
├── lib/
│   ├── supabase/       # Supabase 客户端
│   └── utils.ts
└── types/
    └── database.ts     # 类型定义
supabase/
└── migrations/         # 数据库迁移
```

## 数据库表

| 表名 | 说明 |
|------|------|
| `profiles` | 用户资料 |
| `group_orders` | 拼单活动 |
| `products` | 山姆商品库 |
| `participants` | 拼单参与者 |
| `order_items` | 用户选购项 |

## 部署

推荐部署到 [Vercel](https://vercel.com)，在项目设置中添加环境变量即可。

```bash
npm run build
```

## License

MIT
