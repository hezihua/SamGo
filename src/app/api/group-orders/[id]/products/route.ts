import { NextResponse } from "next/server";
import { assertGroupOrderCreator } from "@/lib/group-order-creator";
import { createAdminClient } from "@/lib/supabase/admin";
import { userFromBearer } from "@/lib/request-user";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await userFromBearer(request);
    if (!user) {
      return NextResponse.json({ error: "\u8bf7\u5148\u767b\u5f55" }, { status: 401 });
    }

    const { id: groupOrderId } = await context.params;
    const body = (await request.json()) as { product_id?: string };
    const product_id = body.product_id?.trim();

    if (!product_id) {
      return NextResponse.json({ error: "\u8bf7\u6307\u5b9a\u5546\u54c1" }, { status: 400 });
    }

    const admin = createAdminClient();

    try {
      await assertGroupOrderCreator(admin, groupOrderId, user.id);
    } catch (e) {
      const message = e instanceof Error ? e.message : "\u62fc\u5355\u4e0d\u53ef\u7f16\u8f91";
      const status = message.includes("\u4ec5\u53d1\u8d77\u4eba") ? 403 : 400;
      return NextResponse.json({ error: message }, { status });
    }

    const { data: product, error: productError } = await admin
      .from("products")
      .select("id, name, price")
      .eq("id", product_id)
      .eq("review_status", "approved")
      .maybeSingle();

    if (productError || !product) {
      return NextResponse.json({ error: "\u5546\u54c1\u4e0d\u5b58\u5728\u6216\u672a\u4e0a\u67b6" }, { status: 404 });
    }

    const { data: existing, error: existingError } = await admin
      .from("group_order_products")
      .select("product_id")
      .eq("group_order_id", groupOrderId)
      .eq("product_id", product_id)
      .maybeSingle();

    if (existingError) {
      console.error("[group-order products add]", existingError);
      return NextResponse.json({ error: "\u6821\u9a8c\u5931\u8d25" }, { status: 500 });
    }

    if (existing) {
      return NextResponse.json({ error: "\u672c\u5355\u5df2\u5305\u542b\u8be5\u5546\u54c1" }, { status: 400 });
    }

    const { data: lastRow, error: sortError } = await admin
      .from("group_order_products")
      .select("sort_order")
      .eq("group_order_id", groupOrderId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sortError) {
      console.error("[group-order products add]", sortError);
      return NextResponse.json({ error: "\u6dfb\u52a0\u5931\u8d25" }, { status: 500 });
    }

    const sort_order = (lastRow?.sort_order ?? -1) + 1;
    const unit_price = Number(product.price);

    const { error: insertError } = await admin.from("group_order_products").insert({
      group_order_id: groupOrderId,
      product_id,
      sort_order,
      unit_price: Number.isFinite(unit_price) ? unit_price : 0,
    });

    if (insertError) {
      console.error("[group-order products add]", insertError);
      return NextResponse.json({ error: "\u6dfb\u52a0\u5931\u8d25" }, { status: 500 });
    }

    return NextResponse.json({
      product_id,
      unit_price,
      name: product.name,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "\u6dfb\u52a0\u5931\u8d25";
    console.error("[group-order products add]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
