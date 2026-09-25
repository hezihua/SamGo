import { NextResponse } from "next/server";
import { isLeaderOpenId } from "@/lib/leader";
import { createAdminClient } from "@/lib/supabase/admin";
import { refreshSupabaseSession } from "@/lib/wechat-auth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { refresh_token?: string };
    const refresh_token = body.refresh_token?.trim();

    if (!refresh_token) {
      return NextResponse.json({ error: "缺少 refresh_token" }, { status: 400 });
    }

    const session = await refreshSupabaseSession(refresh_token);
    const userId = session.user.id;

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("nickname, wechat_openid")
      .eq("id", userId)
      .maybeSingle();

    const openid = profile?.wechat_openid ?? "";

    return NextResponse.json({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at,
      expires_in: session.expires_in,
      token_type: session.token_type,
      user: {
        id: userId,
        nickname: profile?.nickname ?? "微信用户",
        wechat_openid: openid,
      },
      is_leader: openid ? isLeaderOpenId(openid) : false,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "刷新登录失败，请重新登录";
    console.error("[wechat/refresh]", message);
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
