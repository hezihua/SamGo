# SamGo 产品说明

## 核心概念

| 概念 | 含义 |
|------|------|
| **商品库 `products`** | 后台维护的参考价与图片；`review_status=approved` 为已上架，可被选进拼单 |
| **本单 SKU `group_order_products`** | 某拼单包含哪些商品 + **本单成交价** `unit_price`（发起或添加时从库价复制，发起人可改价） |
| **加购 `order_items`** | 用户在某拼单下的选购行；单价来自加购时的本单 `unit_price`，写入 `product_price` |
| **参与** | **加购**才写入 `order_items` / `participants`；仅打开分享链接不算参与。发起人靠 `creator_id` 出现在「我的拼单」 |
| **我的拼单列表** | `GET .../mine?scope=active\|history`：我发起的 **或** 我加购过的，不是全站进行中列表 |
| **拼单状态** | 仅 `open`（进行中）/ `closed`（已截止）；无最少成团人数 |
| **团长 `is_leader`** | 环境变量 `WECHAT_LEADER_OPENID` 对应用户；**不能**代替发起人改价/增删 SKU，但可对**任意进行中**拼单手动截止（与发起人相同入口） |

## 已锁定规则

1. **登录用户均可发起拼单**：`POST /api/group-orders`；须勾选本单商品（写入 `group_order_products`）。
2. **价格**：库价为参考；本单价在 `group_order_products.unit_price`；加购快照到 `order_items.product_price`；发起人进行中可 **改价**（同步已有加购行的 `product_price`）。
3. **成员须微信登录**：`wx.login` → `POST /api/wechat/login`（可选 `POST /api/wechat/refresh`）；API 使用 Bearer 鉴权。
4. **本单增删 SKU**（非全量替换）：进行中且 **仅发起人** — **加**已上架且本单未包含的商品；**删**仅当全团该商品名在 `order_items` 数量合计为 0。

## 功能清单

### 小程序

- **首页** `pages/home/home`：登录；进入拼单管理 / 商品管理
- **拼单管理** `pages/index/index`：进行中 / 历史（规则见上）
- **发起拼单** `pages/create/create`：截止时间与勾选商品；成功后跳转详情
- **拼单详情** `pages/order/detail`：加减加购、**我的应付**、参考价 vs 本单价、全团按商品汇总、按人明细、分享、**小程序码**、复制汇总
- 发起人（进行中）：**改价**、**添加商品**、**移除**（零加购 SKU）
- **商品管理** `pages/product-submit`：用户提报新品 → 待审核；可查看 **审核未通过** 及驳回原因并重新提交
- **发现拼单**：群分享 / 小程序码进详情（`scene` 为去横杠的拼单 UUID）

### Web 管理

- `/admin/products`：密码 `ADMIN_PASSWORD`；**待审核 / 已上架** Tab；通过/驳回（可填 `review_note`）；OSS 图片

### API（主要）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/wechat/login` | 微信登录 |
| POST | `/api/wechat/refresh` | 刷新 session |
| POST | `/api/group-orders` | 创建拼单 + 关联商品 |
| GET | `/api/group-orders/mine?scope=active\|history` | 我的进行中 / 历史 |
| POST | `/api/group-orders/:id/close` | 截止（发起人或团长，进行中） |
| POST | `/api/group-orders/close-expired` | 登录用户触发：批量截止已过期 |
| GET/POST | `/api/cron/close-expired-orders` | Vercel Cron（`Authorization: Bearer CRON_SECRET`） |
| GET | `/api/group-orders/:id/summary` | 汇总文案 |
| GET | `/api/group-orders/:id/wxacode` | 拼单小程序码（Base64 PNG） |
| POST | `/api/group-orders/:id/products` | 本单添加商品（发起人） |
| PATCH | `/api/group-orders/:id/products/:productId` | 本单改价（发起人） |
| DELETE | `/api/group-orders/:id/products/:productId` | 本单移除 SKU（发起人，零加购） |
| POST | `/api/order-items` | 加购 |
| PATCH/DELETE | `/api/order-items/:id` | 改数量 / 删除（仅本人，未截止） |
| POST | `/api/products/submit` | 用户提报商品 |
| GET | `/api/products/my-submissions` | 我的提报（含审核状态） |
| PATCH | `/api/products/submissions/:id` | 重新提交（驳回后） |
| POST | `/api/products/upload-image` | 提报图上传（登录用户） |
| POST | `/api/admin/upload-image` | 后台商品图（管理密码） |

## 数据库迁移（按顺序）

| 文件 | 要点 |
|------|------|
| `001` | 初始 schema |
| `002` | 微信 openid |
| `004` | 去掉 profile 触发器（新库推荐；或 `003`） |
| `005` | RLS：拼单创建等走 API |
| `006` | `group_order_products` 本单商品关联 |
| `007` | 商品审核 `review_status` |
| `008` | `group_order_products.unit_price` |
| `009` | 驳回原因 `review_note` |
| `010` | 状态仅 `open` / `closed` |

根目录可执行：`pnpm db:apply:004`、`db:apply:007` … `db:apply:010`（见 `package.json`）。生产 Supabase 需与代码版本一致。

## 文档索引

- 小程序本地配置与迁移明细：[miniprogram/README.md](../miniprogram/README.md)
- 服务器域名：[WECHAT-DOMAINS.md](./WECHAT-DOMAINS.md)
- 国内真机 API 可达性：[API-HOSTING-CN.md](./API-HOSTING-CN.md)

## 上线检查

1. Next 部署 HTTPS，环境变量与 `.env.local` 一致（含 `CRON_SECRET`，见 `vercel.json`）
2. 小程序 `config.js` / `resolve-api-base.js`：体验版 `apiBase` 为国内可达域名（如 `https://samgo.haylee.site`）
3. 微信公众平台 **request**：Next 域名 + Supabase；**downloadFile**：OSS 域名（见 `WECHAT-DOMAINS.md`）
4. 关闭「不校验合法域名」后真机：登录 → 发起 → 加购 → 改价/增删 SKU → 汇总 → 截止
5. 确认 Supabase 已执行至 **010**
