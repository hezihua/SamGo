import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { assertOrderEditable } from "@/lib/order-guard";
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

    const body = (await request.json()) as {
      group_order_id?: string;
      product_id?: string;
      quantity?: number;
    };

    const group_order_id = body.group_order_id?.trim();
    const product_id = body.product_id?.trim();
    const quantity =
      typeof body.quantity === "number" ? Math.floor(body.quantity) : 0;

    if (!group_order_id || !product_id) {
      return NextResponse.json(
        { error: "\u8bf7\u6307\u5b9a\u62fc\u5355\u548c\u5546\u54c1" },
        { status: 400 }
      );
    }

    if (quantity < 1) {
      return NextResponse.json({ error: "\u6570\u91cf\u81f3\u5c11\u4e3a 1" }, { status: 400 });
    }

    const admin = createAdminClient();

    try {
      await assertOrderEditable(admin, group_order_id);
    } catch (e) {
      const message = e instanceof Error ? e.message : "\u62fc\u5355\u4e0d\u53ef\u7f16\u8f91";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const { data: product, error: productError } = await admin
      .from("products")
      .select("id, name, price")
      .eq("id", product_id)
      .single();

    if (productError || !product) {
      return NextResponse.json({ error: "\u5546\u54c1\u4e0d\u5b58\u5728" }, { status: 404 });
    }

    const { data: allowed, error: allowedError } = await admin
      .from("group_order_products")
      .select("product_id")
      .eq("group_order_id", group_order_id)
      .eq("product_id", product_id)
      .maybeSingle();

    if (allowedError) {
      console.error("[order-items] group_order_products", allowedError);
      return NextResponse.json({ error: "\u6821\u9a8c\u5546\u54c1\u5931\u8d25" }, { status: 500 });
    }

    if (!allowed) {
      const { count, error: countError } = await admin
        .from("group_order_products")
        .select("product_id", { count: "exact", head: true })
        .eq("group_order_id", group_order_id);

      if (countError) {
        console.error("[order-items] group_order_products count", countError);
        return NextResponse.json({ error: "\u6821\u9a8c\u5546\u54c1\u5931\u8d25" }, { status: 500 });
      }

      if (count && count > 0) {
        return NextResponse.json(
          { error: "\u8be5\u5546\u54c1\u672a\u7eb3\u5165\u672c\u6b21\u62fc\u5355" },
          { status: 400 }
        );
      }
    }

    const { error: participantError } = await admin.from("participants").upsert(
      {
        group_order_id,
        user_id: user.id,
      },
      { onConflict: "group_order_id,user_id" }
    );

    if (participantError) {
      console.error("[order-items] participant", participantError);
      return NextResponse.json({ error: "\u52a0\u5165\u62fc\u5355\u5931\u8d25" }, { status: 500 });
    }

    const { data: item, error: itemError } = await admin
      .from("order_items")
      .insert({
        group_order_id,
        user_id: user.id,
        product_name: product.name,
        product_price: product.price,
        quantity,
      })
      .select()
      .single();

    if (itemError || !item) {
      console.error("[order-items]", itemError);
      return NextResponse.json(
        { error: itemError?.message || "\u6dfb\u52a0\u5546\u54c1\u5931\u8d25" },
        { status: 500 }
      );
    }

    return NextResponse.json({ item });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "\u6dfb\u52a0\u5546\u54c1\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5";
    console.error("[order-items]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
