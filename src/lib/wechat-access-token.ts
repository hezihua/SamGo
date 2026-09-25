let cache: { token: string; expiresAt: number } | null = null;

export async function getWechatAccessToken(): Promise<string> {
  if (cache && cache.expiresAt > Date.now() + 60_000) {
    return cache.token;
  }

  const appId = process.env.WECHAT_MINI_APP_ID;
  const appSecret = process.env.WECHAT_MINI_APP_SECRET;
  if (!appId || !appSecret) {
    throw new Error("missing WECHAT_MINI_APP_ID or WECHAT_MINI_APP_SECRET");
  }

  const url = new URL("https://api.weixin.qq.com/cgi-bin/token");
  url.searchParams.set("grant_type", "client_credential");
  url.searchParams.set("appid", appId);
  url.searchParams.set("secret", appSecret);

  const res = await fetch(url);
  const data = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    errmsg?: string;
  };

  if (!data.access_token || !data.expires_in) {
    throw new Error(data.errmsg || "wechat access_token failed");
  }

  cache = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return data.access_token;
}
