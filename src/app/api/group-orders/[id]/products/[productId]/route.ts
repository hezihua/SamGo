import { NextResponse } from "next/server";
import { assertOrderEditable } from "@/lib/order-guard";
import { syncOrderItemsPriceForProduct } from "@/lib/group-order-product-price";
import { createAdminClient } from "@/lib/supabase/admin";
import { userFromBearer } from "@/lib/request-user";

type RouteContext = {
  params: Promise<{ id: string; productId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await userFromBearer(request);
    if (!user) {
      return NextResponse.json({ error: "\u8bf7\u5148\u767b\u5f55" }, { status: 401 });
    }

    const { id: groupOrderId, productId } = await context.params;
    const body = (await request.json()) as { unit_price?: unknown };
    const unit_price =
      typeof body.unit_price === "number"
        ? body.unit_price
        : typeof body.unit_price === "string"
          ? Number.parseFloat(body.unit_price)
          : NaN;

    if (!Number.isFinite(unit_price) || unit_price < 0) {
      return NextResponse.json({ error: "\u8bf7\u586b\u5199\u6709\u6548\u4ef7\u683c" }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: order, error: orderError } = await admin
      .from("group_orders")
      .select("id, creator_id, status")
      .eq("id", groupOrderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "\u62fc\u5355\u4e0d\u5b58\u5728" }, { status: 404 });
    }

    if (order.creator_id !== user.id) {
      return NextResponse.json(
        { error: "\u4ec5\u53d1\u8d77\u4eba\u53ef\u4fee\u6539\u672c\u5355\u4ef7\u683c" },
        { status: 403 }
      );
    }

    try {
      await assertOrderEditable(admin, groupOrderId);
    } catch (e) {
      const message = e instanceof Error ? e.message : "\u62fc\u5355\u4e0d\u53ef\u7f16\u8f91";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const { data: link, error: linkError } = await admin
      .from("group_order_products")
      .select("product_id, products(name)")
      .eq("group_order_id", groupOrderId)
      .eq("product_id", productId)
      .maybeSingle();

    if (linkError || !link) {
      return NextResponse.json({ error: "\u672c\u5355\u672a\u5305\u542b\u8be5\u5546\u54c1" }, { status: 404 });
    }

    const productName =
      link.products && typeof link.products === "object" && "name" in link.products
        ? String((link.products as { name: string }).name)
        : "";

    const rounded = Math.round(unit_price * 100) / 100;

    const { error: updateError } = await admin
      .from("group_order_products")
      .update({ unit_price: rounded })
      .eq("group_order_id", groupOrderId)
      .eq("product_id", productId);

    if (updateError) {
      console.error("[group-order product price]", updateError);
      return NextResponse.json({ error: "\u66f4\u65b0\u5931\u8d25" }, { status: 500 });
    }

    if (productName) {
      await syncOrderItemsPriceForProduct(
        admin,
        groupOrderId,
        productName,
        rounded
      );
    }

    return NextResponse.json({ product_id: productId, unit_price: rounded });
  } catch (err) {
    const message = err instanceof Error ? err.message : "\u66f4\u65b0\u5931\u8d25";
    console.error("[group-order product price]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
