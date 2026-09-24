import type { SupabaseClient } from "@supabase/supabase-js";

export async function assertOrderEditable(
  supabase: SupabaseClient,
  orderId: string
) {
  const { data: order, error } = await supabase
    .from("group_orders")
    .select("id, status")
    .eq("id", orderId)
    .single();

  if (error || !order) {
    throw new Error("\u62fc\u5355\u4e0d\u5b58\u5728");
  }

  if (order.status !== "open" && order.status !== "closing") {
    throw new Error("\u62fc\u5355\u5df2\u622a\u6b62\uff0c\u65e0\u6cd5\u6dfb\u52a0\u5546\u54c1");
  }

  return order;
}
