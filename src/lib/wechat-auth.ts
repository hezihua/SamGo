import { createHash, createHmac } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

const WECHAT_CODE2SESSION =
  "https://api.weixin.qq.com/sns/jscode2session";

export interface WechatSession {
  openid: string;
  session_key?: string;
  unionid?: string;
}

export function wechatEmail(openid: string) {
  const digest = createHash("sha256").update(openid).digest("hex").slice(0, 24);
  return `wx_${digest}@users.samgo.app`;
}

export function wechatPassword(openid: string) {
  const secret =
    process.env.WECHAT_AUTH_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error("缺少 WECHAT_AUTH_SECRET");
  }
  return createHmac("sha256", secret)
    .update(`samgo:wechat:${openid}`)
    .digest("base64url")
    .slice(0, 32);
}

export async function exchangeWechatCode(code: string): Promise<WechatSession> {
  const appId = process.env.WECHAT_MINI_APP_ID;
  const appSecret = process.env.WECHAT_MINI_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error("缺少微信小程序 AppID / AppSecret 配置");
  }

  const url = new URL(WECHAT_CODE2SESSION);
  url.searchParams.set("appid", appId);
  url.searchParams.set("secret", appSecret);
  url.searchParams.set("js_code", code);
  url.searchParams.set("grant_type", "authorization_code");

  const res = await fetch(url);
  const data = (await res.json()) as {
    openid?: string;
    session_key?: string;
    unionid?: string;
    errcode?: number;
    errmsg?: string;
  };

  if (data.errcode || !data.openid) {
    throw new Error(data.errmsg || "微信登录失败，请重试");
  }

  return {
    openid: data.openid,
    session_key: data.session_key,
    unionid: data.unionid,
  };
}

function createAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("缺少 Supabase 公开配置");
  }
  return createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function signInWithWechatOpenId(
  openid: string,
  nickname?: string
) {
  const admin = createAdminClient();
  const auth = createAuthClient();
  const email = wechatEmail(openid);
  const password = wechatPassword(openid);
  const displayName = nickname?.trim() || "微信用户";

  let { data: sessionData, error: signInError } =
    await auth.auth.signInWithPassword({ email, password });

  if (signInError) {
    const { data: created, error: createError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          nickname: displayName,
          wechat_openid: openid,
        },
      });

    if (createError) {
      if (
        createError.message.includes("already been registered") ||
        createError.message.includes("already exists")
      ) {
        const retry = await auth.auth.signInWithPassword({ email, password });
        sessionData = retry.data;
        signInError = retry.error;
      } else if (
        /database error (creating|saving) new user/i.test(createError.message)
      ) {
        throw new Error(
          "Supabase 用户触发器异常：请在 SQL Editor 执行 supabase/migrations/004_drop_profile_trigger.sql",
        );
      } else {
        throw new Error(createError.message);
      }
    } else if (created.user) {
      await admin.from("profiles").upsert(
        {
          id: created.user.id,
          wechat_openid: openid,
          nickname: displayName,
        },
        { onConflict: "id" },
      );

      const signedIn = await auth.auth.signInWithPassword({ email, password });
      sessionData = signedIn.data;
      signInError = signedIn.error;
    }
  }

  if (signInError || !sessionData.session) {
    throw new Error(signInError?.message || "登录失败");
  }

  const userId = sessionData.user!.id;

  await admin.from("profiles").upsert(
    {
      id: userId,
      wechat_openid: openid,
      nickname: displayName,
    },
    { onConflict: "id" },
  );

  const { data: profile } = await admin
    .from("profiles")
    .select("nickname")
    .eq("id", userId)
    .single();

  return {
    session: sessionData.session,
    user: {
      id: userId,
      nickname: profile?.nickname ?? displayName,
      wechat_openid: openid,
    },
  };
}
