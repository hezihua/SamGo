import type { SupabaseClient } from "@supabase/supabase-js";
import { isLeaderOpenId } from "@/lib/leader";

/** 发起人、团长可减购/删除；参与拼单的用户只能加 */
export async function userCanDecreaseOrderItems(
  supabase: SupabaseClient,
  userId: string,
  groupOrderId: string
): Promise<boolean> {
  const { data: order, error } = await supabase
    .from("group_orders")
    .select("creator_id")
    .eq("id", groupOrderId)
    .single();

  if (error || !order) {
    return false;
  }

  if (order.creator_id === userId) {
    return true;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("wechat_openid")
    .eq("id", userId)
    .maybeSingle();

  return profile?.wechat_openid
    ? isLeaderOpenId(profile.wechat_openid)
    : false;
}
