# 国内访问 API（小程序真机超时）

国内手机访问 `*.vercel.app` 时，微信开发者工具或真机常见：

`ERR_CONNECTION_TIMED_OUT` /「手机连不上当前 API」

原因：Vercel 边缘节点在海外，国内网络到该域名不稳定或被阻断；**与代码、Supabase 配置无关**。

小程序 `miniprogram/config.js` 的 `apiBase` 必须是**国内手机能 HTTPS 访问**的 Next 根地址（无末尾 `/`）。

---

## 方案 A：cpolar 穿透本机（开发 / 联调）

本机跑 Next，用 [cpolar](https://www.cpolar.com/) 把 `localhost:3000` 映射为公网 HTTPS 域名。

1. 安装 cpolar，登录后创建 **HTTPS 隧道**，本地地址：`http://127.0.0.1:3000`。
2. 本机：`pnpm dev`（默认 3000）。
3. 复制 cpolar 分配的域名（形如 `https://xxxx.cpolar.cn`），写入 `miniprogram/config.js`：

```js
apiBase: "https://xxxx.cpolar.cn",
```

4. 微信公众平台 → **服务器域名** → **request 合法域名**：加入该主机名（仅域名，无 `https://`）。其余见 [WECHAT-DOMAINS.md](./WECHAT-DOMAINS.md)。
5. 开发者工具 **编译**；真机预览前关闭长期依赖「不校验合法域名」。

注意：免费隧道域名可能变；仅适合开发。`.env.local` 与 Vercel 环境变量保持一致即可。

---

## 方案 B：国内云部署（正式环境）

将同一套 Next 项目部署到**国内**可备案的 HTTPS 服务，例如：

- 阿里云 / 腾讯云 / 华为云：ECS + Nginx，或函数计算 / 容器
- 已备案域名 + SSL 证书

步骤概要：

1. `pnpm build` 通过，在服务器配置与 `.env.local` 相同的环境变量（Supabase、微信、`WECHAT_AUTH_SECRET`、`CRON_SECRET` 等，见 `.env.example`）。
2. 对外提供 `https://你的域名`。
3. `config.js`：`apiBase: "https://你的域名"`。
4. 公众平台 **request 合法域名** 改为该域名；管理后台浏览器访问同一域名下的 `/admin/products`。

Cron：若使用 `vercel.json` 中的定时任务，在国内需改为云厂商定时触发或自建 cron 调用 `/api/cron/close-expired-orders`。

---

## 方案 C：不推荐把 Vercel 作为国内 `apiBase`

| 场景 | 建议 |
|------|------|
| 海外用户 / 仅浏览器访问管理后台 | 可继续用 Vercel |
| 国内微信小程序真机 | **不要**用 `*.vercel.app` 作 `apiBase`；生产用 `https://samgo.haylee.site` |
| 团队演示、CI 预览 | Vercel 可用；小程序联调请用方案 A 或 B |

Vercel 部署仍可保留作海外或后台入口；国内小程序 API 与 [WECHAT-DOMAINS.md](./WECHAT-DOMAINS.md) 中的 request 域名应指向国内可达地址。

---

## 自检

- 手机浏览器能否打开 `apiBase`（应能连上 Next，不必是漂亮页面）。
- `apiBase` 与公众平台 **request 合法域名** 主机名一致。
- 登录页仍失败时，看小程序报错是否仍提示超时 → 换域名或检查隧道/防火墙。
