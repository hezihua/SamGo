import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isLeaderOpenId } from "@/lib/leader";
import { userFromBearer } from "@/lib/request-user";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  try {
    const user = await userFromBearer(_request);
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
      .select("id, creator_id, status")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "\u62fc\u5355\u4e0d\u5b58\u5728" }, { status: 404 });
    }

    if (order.status !== "open" && order.status !== "closing") {
      return NextResponse.json({ error: "\u62fc\u5355\u5df2\u622a\u6b62" }, { status: 400 });
    }

    const isCreator = order.creator_id === user.id;
    let isLeader = false;
    if (!isCreator) {
      const { data: profile } = await admin
        .from("profiles")
        .select("wechat_openid")
        .eq("id", user.id)
        .maybeSingle();
      isLeader = profile?.wechat_openid
        ? isLeaderOpenId(profile.wechat_openid)
        : false;
    }

    if (!isCreator && !isLeader) {
      return NextResponse.json({ error: "\u4ec5\u53d1\u8d77\u4eba\u6216\u56e2\u957f\u53ef\u622a\u6b62\u62fc\u5355" }, { status: 403 });
    }

    const { data: updated, error: updateError } = await admin
      .from("group_orders")
      .update({ status: "closed" })
      .eq("id", orderId)
      .select("id, status")
      .single();

    if (updateError || !updated) {
      console.error("[group-orders close]", updateError);
      return NextResponse.json({ error: "\u622a\u6b62\u5931\u8d25" }, { status: 500 });
    }

    return NextResponse.json({ order: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "\u622a\u6b62\u5931\u8d25";
    console.error("[group-orders close]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
