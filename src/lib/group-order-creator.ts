import type { SupabaseClient } from "@supabase/supabase-js";
import { assertOrderEditable } from "@/lib/order-guard";

export async function assertGroupOrderCreator(
  admin: SupabaseClient,
  groupOrderId: string,
  userId: string
): Promise<void> {
  const { data: order, error } = await admin
    .from("group_orders")
    .select("id, creator_id")
    .eq("id", groupOrderId)
    .single();

  if (error || !order) {
    throw new Error("\u62fc\u5355\u4e0d\u5b58\u5728");
  }

  if (order.creator_id !== userId) {
    throw new Error("\u4ec5\u53d1\u8d77\u4eba\u53ef\u7ba1\u7406\u672c\u5355\u5546\u54c1");
  }

  await assertOrderEditable(admin, groupOrderId);
}
