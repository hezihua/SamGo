import type { SupabaseClient } from "@supabase/supabase-js";
import { isOrderLocked } from "@/lib/group-order";

export async function assertOrderEditable(
  supabase: SupabaseClient,
  groupOrderId: string
) {
  const { data: order, error } = await supabase
    .from("group_orders")
    .select("status, deadline")
    .eq("id", groupOrderId)
    .single();

  if (error || !order) {
    throw new Error("拼单不存在");
  }

  if (isOrderLocked(order)) {
    throw new Error("拼单已截止，无法修改");
  }
}
