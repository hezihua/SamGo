# 微信小程序服务器域名（复制到公众平台）

登录 [微信公众平台](https://mp.weixin.qq.com) → **开发管理** → **开发设置** → **服务器域名**。

## request 合法域名

```
sam-go-ochre.vercel.app
ciltmxjnydsqgcpvwwie.supabase.co
```

## downloadFile 合法域名（商品图 OSS）

```
hzh-samgo.oss-cn-shenzhen.aliyuncs.com
```

## 小程序本地配置

`miniprogram/config.js` 中 `apiBase` 应为：

`https://sam-go-ochre.vercel.app`

改完后在微信开发者工具 **编译** → 真机预览前关闭依赖「不校验合法域名」（或域名配好后正式扫码）。

## 管理后台（浏览器）

https://sam-go-ochre.vercel.app/admin/products
