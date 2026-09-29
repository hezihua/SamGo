import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { userFromBearer } from "@/lib/request-user";

export async function POST(request: Request) {
  try {
    const user = await userFromBearer(request);
    if (!user) {
      return NextResponse.json({ error: "\u8bf7\u5148\u767b\u5f55" }, { status: 401 });
    }

    const admin = createAdminClient();

    const body = (await request.json()) as {
      title?: string;
      delivery_address?: string;
      deadline?: string;
      min_participants?: number;
      product_ids?: string[];
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

    const product_ids = Array.isArray(body.product_ids)
      ? [...new Set(body.product_ids.map((id) => id?.trim()).filter(Boolean))]
      : [];

    if (product_ids.length === 0) {
      return NextResponse.json(
        { error: "\u8bf7\u81f3\u5c11\u9009\u62e9\u4e00\u4e2a\u5546\u54c1" },
        { status: 400 }
      );
    }

    const { data: catalogRows, error: catalogError } = await admin
      .from("products")
      .select("id, price")
      .in("id", product_ids)
      .eq("review_status", "approved");

    if (catalogError) {
      console.error("[group-orders] products", catalogError);
      return NextResponse.json({ error: "\u6821\u9a8c\u5546\u54c1\u5931\u8d25" }, { status: 500 });
    }

    if ((catalogRows ?? []).length !== product_ids.length) {
      return NextResponse.json(
        { error: "\u5305\u542b\u4e0d\u5b58\u5728\u7684\u5546\u54c1\uff0c\u8bf7\u91cd\u65b0\u9009\u62e9" },
        { status: 400 }
      );
    }

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

    const priceById = new Map(
      (catalogRows ?? []).map((row) => [row.id, Number(row.price)])
    );
    const linkRows = product_ids.map((product_id, index) => ({
      group_order_id: order.id,
      product_id,
      sort_order: index,
      unit_price: priceById.get(product_id) ?? 0,
    }));

    const { error: linkError } = await admin.from("group_order_products").insert(linkRows);

    if (linkError) {
      console.error("[group-orders] group_order_products", linkError);
      await admin.from("group_orders").delete().eq("id", order.id);
      const msg = String(linkError.message || "");
      let hint = msg || "\u5173\u8054\u5546\u54c1\u5931\u8d25";
      if (msg.includes("unit_price")) {
        hint = "\u8bf7\u5728 Supabase \u6267\u884c 008_group_order_product_price.sql";
      } else if (msg.includes("group_order_products")) {
        hint = "\u8bf7\u5728 Supabase \u6267\u884c 006_group_order_products.sql";
      }
      return NextResponse.json({ error: hint }, { status: 500 });
    }

    return NextResponse.json({ order });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "\u521b\u5efa\u62fc\u5355\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5";
    console.error("[group-orders]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
