import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { userFromBearer } from "@/lib/request-user";

export async function GET(request: Request) {
  try {
    const user = await userFromBearer(request);
    if (!user) {
      return NextResponse.json({ error: "\u8bf7\u5148\u767b\u5f55" }, { status: 401 });
    }

    const url = new URL(request.url);
    const scope = url.searchParams.get("scope") === "history" ? "history" : "active";

    const admin = createAdminClient();

    if (scope === "active") {
      const { data, error } = await admin
        .from("group_orders")
        .select("id,title,status,deadline,delivery_address,created_at,creator_id")
        .in("status", ["open", "closing"])
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[group-orders mine active]", error);
        return NextResponse.json({ error: "\u52a0\u8f7d\u5931\u8d25" }, { status: 500 });
      }

      return NextResponse.json({ orders: data ?? [] });
    }

    const { data: participantRows, error: partError } = await admin
      .from("participants")
      .select("group_order_id")
      .eq("user_id", user.id);

    if (partError) {
      console.error("[group-orders mine participants]", partError);
      return NextResponse.json({ error: "\u52a0\u8f7d\u5931\u8d25" }, { status: 500 });
    }

    const idSet = new Set<string>();
    for (const row of participantRows ?? []) {
      idSet.add(row.group_order_id);
    }

    const { data: createdRows, error: createdError } = await admin
      .from("group_orders")
      .select("id")
      .eq("creator_id", user.id)
      .in("status", ["closed", "completed"]);

    if (createdError) {
      console.error("[group-orders mine created]", createdError);
      return NextResponse.json({ error: "\u52a0\u8f7d\u5931\u8d25" }, { status: 500 });
    }

    for (const row of createdRows ?? []) {
      idSet.add(row.id);
    }

    const { data: itemRows, error: itemError } = await admin
      .from("order_items")
      .select("group_order_id")
      .eq("user_id", user.id);

    if (itemError) {
      console.error("[group-orders mine items]", itemError);
      return NextResponse.json({ error: "\u52a0\u8f7d\u5931\u8d25" }, { status: 500 });
    }

    for (const row of itemRows ?? []) {
      idSet.add(row.group_order_id);
    }

    const ids = Array.from(idSet);
    if (ids.length === 0) {
      return NextResponse.json({ orders: [] });
    }

    const { data: orders, error: ordersError } = await admin
      .from("group_orders")
      .select("id,title,status,deadline,delivery_address,created_at,creator_id")
      .in("id", ids)
      .in("status", ["closed", "completed"])
      .order("deadline", { ascending: false });

    if (ordersError) {
      console.error("[group-orders mine history]", ordersError);
      return NextResponse.json({ error: "\u52a0\u8f7d\u5931\u8d25" }, { status: 500 });
    }

    return NextResponse.json({ orders: orders ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "\u52a0\u8f7d\u5931\u8d25";
    console.error("[group-orders mine]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
