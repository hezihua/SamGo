import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { userFromBearer } from "@/lib/request-user";

const ORDER_SELECT =
  "id,title,status,deadline,delivery_address,created_at,creator_id";

async function gatherMyOrderIds(
  admin: SupabaseClient,
  userId: string
): Promise<string[]> {
  const idSet = new Set<string>();

  const { data: participantRows, error: partError } = await admin
    .from("participants")
    .select("group_order_id")
    .eq("user_id", userId);

  if (partError) {
    throw partError;
  }

  for (const row of participantRows ?? []) {
    idSet.add(row.group_order_id);
  }

  const { data: createdRows, error: createdError } = await admin
    .from("group_orders")
    .select("id")
    .eq("creator_id", userId);

  if (createdError) {
    throw createdError;
  }

  for (const row of createdRows ?? []) {
    idSet.add(row.id);
  }

  const { data: itemRows, error: itemError } = await admin
    .from("order_items")
    .select("group_order_id")
    .eq("user_id", userId);

  if (itemError) {
    throw itemError;
  }

  for (const row of itemRows ?? []) {
    idSet.add(row.group_order_id);
  }

  return Array.from(idSet);
}

export async function GET(request: Request) {
  try {
    const user = await userFromBearer(request);
    if (!user) {
      return NextResponse.json({ error: "\u8bf7\u5148\u767b\u5f55" }, { status: 401 });
    }

    const url = new URL(request.url);
    const scope = url.searchParams.get("scope") === "history" ? "history" : "active";

    const admin = createAdminClient();
    const ids = await gatherMyOrderIds(admin, user.id);

    if (ids.length === 0) {
      return NextResponse.json({ orders: [] });
    }

    const statuses =
      scope === "history"
        ? (["closed", "completed"] as const)
        : (["open", "closing"] as const);

    const { data: orders, error: ordersError } = await admin
      .from("group_orders")
      .select(ORDER_SELECT)
      .in("id", ids)
      .in("status", [...statuses])
      .order(scope === "history" ? "deadline" : "created_at", {
        ascending: false,
      });

    if (ordersError) {
      console.error(`[group-orders mine ${scope}]`, ordersError);
      return NextResponse.json({ error: "\u52a0\u8f7d\u5931\u8d25" }, { status: 500 });
    }

    return NextResponse.json({ orders: orders ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "\u52a0\u8f7d\u5931\u8d25";
    console.error("[group-orders mine]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
