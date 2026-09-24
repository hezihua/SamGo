import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { isLeaderOpenId } from "@/lib/leader";
import { createAdminClient } from "@/lib/supabase/admin";

async function userFromRequest(request: Request): Promise<User | null> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return null;
  }
  const token = header.slice("Bearer ".length).trim();
  if (!token) {
    return null;
  }
  const admin = createAdminClient();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) {
    return null;
  }
  return data.user;
}

export async function POST(request: Request) {
  try {
    const user = await userFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "\u8bf7\u5148\u767b\u5f55" }, { status: 401 });
    }

    const admin = createAdminClient();

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("wechat_openid")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.wechat_openid) {
      return NextResponse.json({ error: "\u672a\u7ed1\u5b9a\u5fae\u4fe1\u8d26\u53f7" }, { status: 403 });
    }

    if (!isLeaderOpenId(profile.wechat_openid)) {
      return NextResponse.json({ error: "\u4ec5\u56e2\u957f\u53ef\u53d1\u8d77\u62fc\u5355" }, { status: 403 });
    }

    const body = (await request.json()) as {
      title?: string;
      delivery_address?: string;
      deadline?: string;
      min_participants?: number;
    };

    const title = body.title?.trim();
    const delivery_address = body.delivery_address?.trim();
    const deadline = body.deadline?.trim();

    if (!title || !delivery_address || !deadline) {
      return NextResponse.json(
        { error: "\u8bf7\u586b\u5199\u6807\u9898\u3001\u53d6\u8d27\u5730\u5740\u548c\u622a\u6b62\u65f6\u95f4" },
        { status: 400 }
      );
    }

    const min_participants =
      typeof body.min_participants === "number" && body.min_participants >= 2
        ? body.min_participants
        : 2;

    const { data: order, error: orderError } = await admin
      .from("group_orders")
      .insert({
        title,
        delivery_address,
        deadline,
        min_participants,
        creator_id: user.id,
        status: "open",
      })
      .select()
      .single();

    if (orderError || !order) {
      console.error("[group-orders]", orderError);
      return NextResponse.json(
        { error: orderError?.message || "\u521b\u5efa\u62fc\u5355\u5931\u8d25" },
        { status: 500 }
      );
    }

    const { error: participantError } = await admin.from("participants").upsert(
      {
        group_order_id: order.id,
        user_id: user.id,
      },
      { onConflict: "group_order_id,user_id" }
    );

    if (participantError) {
      console.error("[group-orders] participant", participantError);
      return NextResponse.json(
        { error: "\u521b\u5efa\u62fc\u5355\u6210\u529f\u4f46\u52a0\u5165\u53c2\u4e0e\u8005\u5931\u8d25" },
        { status: 500 }
      );
    }

    return NextResponse.json({ order });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "\u521b\u5efa\u62fc\u5355\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5";
    console.error("[group-orders]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
