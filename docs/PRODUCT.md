# SamGo 产品说明

## 已锁定规则

1. **登录用户均可发起拼单**：走服务端 `POST /api/group-orders`；发起时须从后台 `products` 勾选本单商品（`group_order_products`）。
2. **价格仅来自商品库**：加购只提交 `product_id` 与数量；服务端从 `products` 读价写入 `order_items`。
3. **成员须微信登录**：`wx.login` → `POST /api/wechat/login`；API 使用 Bearer 鉴权。

## 功能清单

### 小程序

- 登录与会话（含可选 `is_leader`）
- 首页进行中拼单、发起拼单（信息 + 勾选商品）
- 拼单详情：商品图、加减加购、我的选购、**全团按商品汇总**、全团选购（按人）、分享、**拼单小程序码**
- 首页 **进行中 / 历史拼单**（我发起或参与且已截止）
- **截止拼单**：到 `deadline` 自动改为 `closed`（每日 Cron + 打开列表/详情时同步）；发起人或团长仍可手动 `POST /api/group-orders/:id/close`
- **复制汇总发群**：`GET /api/group-orders/:id/summary` → 剪贴板

### Web 管理

- `/admin/products`：密码 `ADMIN_PASSWORD`，维护商品与 OSS 图片

### API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/wechat/login` | 微信登录 |
| POST | `/api/group-orders` | 创建拼单 + 关联商品 |
| POST | `/api/group-orders/close-expired` | 登录用户触发：批量截止已过期拼单 |
| GET/POST | `/api/cron/close-expired-orders` | Vercel Cron（`Authorization: Bearer CRON_SECRET`） |
| POST | `/api/group-orders/:id/close` | 截止拼单 |
| GET | `/api/group-orders/:id/summary` | 汇总文案（含 `products` 按商品聚合） |
| GET | `/api/group-orders/:id/wxacode` | 拼单小程序码（Base64 PNG，`scene`=去横杠 UUID） |
| GET | `/api/group-orders/mine?scope=active\|history` | 进行中 / 历史拼单列表 |
| POST | `/api/order-items` | 加购 |
| PATCH/DELETE | `/api/order-items/:id` | 改数量 / 删除（仅本人，拼单未截止） |

## 数据库迁移（按顺序）

`001` → `002` → `004`（或 `003`）→ `005` → **`006_group_order_products.sql`**

## 上线检查

1. Next 部署 HTTPS（如 Vercel），配置与 `.env.local` 相同的环境变量（含 `CRON_SECRET`，见 `vercel.json` 定时任务）
2. 小程序 `config.js`：`apiBase` 为 `https://sam-go-ochre.vercel.app`；域名见 `docs/WECHAT-DOMAINS.md`
3. 微信公众平台 **request 合法域名**：Next 域名 + Supabase 域名
4. **downloadFile 合法域名**：若展示 OSS 商品图，添加 Bucket/CDN 域名
5. 关闭开发工具的「不校验合法域名」后再真机验证
