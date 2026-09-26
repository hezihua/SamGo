import type { SupabaseClient } from "@supabase/supabase-js";

/** 无选购行时从 participants 移除，表示未参与拼单 */
export async function syncParticipantAfterOrderItemsChange(
  admin: SupabaseClient,
  groupOrderId: string,
  userId: string
): Promise<void> {
  const { count, error: countError } = await admin
    .from("order_items")
    .select("id", { count: "exact", head: true })
    .eq("group_order_id", groupOrderId)
    .eq("user_id", userId);

  if (countError) {
    console.error("[participant-sync] count", countError);
    return;
  }

  if (count && count > 0) {
    return;
  }

  const { error: deleteError } = await admin
    .from("participants")
    .delete()
    .eq("group_order_id", groupOrderId)
    .eq("user_id", userId);

  if (deleteError) {
    console.error("[participant-sync] delete", deleteError);
  }
}
