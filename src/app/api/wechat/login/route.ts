import { NextResponse } from "next/server";
import { isLeaderOpenId } from "@/lib/leader";
import {
  exchangeWechatCode,
  signInWithWechatOpenId,
} from "@/lib/wechat-auth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      code?: string;
      nickname?: string;
    };

    if (!body.code?.trim()) {
      return NextResponse.json(
        { error: "缺少微信登录 code" },
        { status: 400 }
      );
    }

    const { openid } = await exchangeWechatCode(body.code.trim());
    const { session, user } = await signInWithWechatOpenId(
      openid,
      body.nickname
    );

    return NextResponse.json({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at,
      expires_in: session.expires_in,
      token_type: session.token_type,
      user,
      is_leader: isLeaderOpenId(openid),
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "微信登录失败，请稍后重试";
    console.error("[wechat/login]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
