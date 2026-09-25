import { NextResponse } from "next/server";
import { orderIdToScene } from "@/lib/order-id-scene";
import { getWechatAccessToken } from "@/lib/wechat-access-token";
import { createAdminClient } from "@/lib/supabase/admin";
import { userFromBearer } from "@/lib/request-user";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const user = await userFromBearer(request);
    if (!user) {
      return NextResponse.json({ error: "\u8bf7\u5148\u767b\u5f55" }, { status: 401 });
    }

    const { id: orderId } = await context.params;
    if (!orderId?.trim()) {
      return NextResponse.json({ error: "\u62fc\u5355\u4e0d\u5b58\u5728" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: order, error: orderError } = await admin
      .from("group_orders")
      .select("id")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "\u62fc\u5355\u4e0d\u5b58\u5728" }, { status: 404 });
    }

    const accessToken = await getWechatAccessToken();
    const scene = orderIdToScene(orderId);
    const checkPath =
      process.env.WECHAT_WXACODE_CHECK_PATH !== "false";
    const envVersion =
      process.env.WECHAT_WXACODE_ENV_VERSION === "trial" ||
      process.env.WECHAT_WXACODE_ENV_VERSION === "develop"
        ? process.env.WECHAT_WXACODE_ENV_VERSION
        : "release";

    const wxRes = await fetch(
      `https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${encodeURIComponent(accessToken)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scene,
          page: "pages/order/detail",
          check_path: checkPath,
          env_version: envVersion,
          width: 430,
        }),
      },
    );

    const contentType = wxRes.headers.get("content-type") || "";
    if (contentType.indexOf("application/json") >= 0) {
      const errBody = (await wxRes.json()) as { errcode?: number; errmsg?: string };
      console.error("[wxacode]", errBody);
      return NextResponse.json(
        { error: errBody.errmsg || "\u751f\u6210\u5c0f\u7a0b\u5e8f\u7801\u5931\u8d25" },
        { status: 502 },
      );
    }

    const buffer = Buffer.from(await wxRes.arrayBuffer());
    return NextResponse.json({
      image_base64: buffer.toString("base64"),
      scene,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "\u751f\u6210\u5c0f\u7a0b\u5e8f\u7801\u5931\u8d25";
    console.error("[wxacode]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
