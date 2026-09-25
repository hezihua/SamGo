import type { SupabaseClient } from "@supabase/supabase-js";

const ACTIVE_STATUSES = ["open", "closing"] as const;

export async function closeAllExpiredOrders(
  supabase: SupabaseClient,
): Promise<number> {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("group_orders")
    .update({ status: "closed" })
    .in("status", [...ACTIVE_STATUSES])
    .lt("deadline", now)
    .select("id");

  if (error) {
    throw new Error(error.message);
  }

  return data?.length ?? 0;
}

export async function closeOrderIfExpired(
  supabase: SupabaseClient,
  orderId: string,
): Promise<{ status: string; wasClosed: boolean }> {
  const { data: order, error } = await supabase
    .from("group_orders")
    .select("id, status, deadline")
    .eq("id", orderId)
    .single();

  if (error || !order) {
    throw new Error("\u62fc\u5355\u4e0d\u5b58\u5728");
  }

  const active = ACTIVE_STATUSES.includes(
    order.status as (typeof ACTIVE_STATUSES)[number],
  );
  const expired = Date.parse(order.deadline) <= Date.now();

  if (active && expired) {
    const { error: updateError } = await supabase
      .from("group_orders")
      .update({ status: "closed" })
      .eq("id", orderId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return { status: "closed", wasClosed: true };
  }

  return { status: order.status, wasClosed: false };
}
