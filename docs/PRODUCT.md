# SamGo 产品说明

## 已锁定规则

1. **仅团长可发起拼单**：环境变量 `WECHAT_LEADER_OPENID` 对应的微信用户为团长；小程序创建拼单走服务端 `POST /api/group-orders`，数据库已移除普通用户直接 `INSERT group_orders` 的 RLS 策略（见 `supabase/migrations/005_leader_only_group_orders.sql`）。
2. **价格仅来自商品库**：选购时客户端只提交 `product_id` 与数量；服务端从 `products` 表读取名称与单价，写入 `order_items.product_name` / `product_price`，用户不能自填价格。
3. **成员须微信登录**：小程序通过 `wx.login` → `POST /api/wechat/login` 获取 Supabase 会话；未登录无法调用需鉴权的 API 或拉取个人选购记录。

## P0 功能清单

- 微信登录与会话持久化（含 `is_leader` 标识）
- 首页展示进行中拼单列表；团长可见「发起拼单」入口
- 团长发起拼单（标题、取货地址、截止时间、最少人数）
- 拼单详情：查看活动信息、浏览商品库、添加选购（API）、查看「我的选购」
- 分享拼单详情页（`onShareAppMessage` 带拼单 id）
- 服务端 API：`/api/group-orders`、`/api/order-items`（Bearer 鉴权）
- **Web 商品库**（仅团长）：`/admin/products`，密码 `ADMIN_PASSWORD`；数据写入 Supabase `products`，小程序加购仍走库内价格
