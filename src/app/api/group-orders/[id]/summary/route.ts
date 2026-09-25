import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  aggregateProductsByName,
  buildOrderSummaryText,
  type SummaryItemRow,
} from "@/lib/order-summary";
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
      .select("id, title, delivery_address, deadline, status")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "\u62fc\u5355\u4e0d\u5b58\u5728" }, { status: 404 });
    }

    const { data: items, error: itemsError } = await admin
      .from("order_items")
      .select(
        "user_id, product_name, product_price, quantity, profiles(nickname)",
      )
      .eq("group_order_id", orderId)
      .neq("status", "cancelled")
      .order("created_at", { ascending: true });

    if (itemsError) {
      console.error("[group-orders summary]", itemsError);
      return NextResponse.json({ error: "\u52a0\u8f7d\u9009\u8d2d\u5931\u8d25" }, { status: 500 });
    }

    const rows = (items ?? []) as unknown as SummaryItemRow[];
    const text = buildOrderSummaryText(order, rows);
    const products = aggregateProductsByName(rows);
    const total_amount = products.reduce((sum, p) => sum + p.amount, 0);

    return NextResponse.json({
      text,
      order,
      item_count: rows.length,
      products,
      total_amount,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "\u751f\u6210\u6c47\u603b\u5931\u8d25";
    console.error("[group-orders summary]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
