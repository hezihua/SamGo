import type { SupabaseClient } from "@supabase/supabase-js";
import { closeOrderIfExpired } from "@/lib/close-expired-orders";

export async function assertOrderEditable(
  supabase: SupabaseClient,
  orderId: string
) {
  const { status } = await closeOrderIfExpired(supabase, orderId);

  if (status !== "open" && status !== "closing") {
    throw new Error("\u62fc\u5355\u5df2\u622a\u6b62\uff0c\u65e0\u6cd5\u7ee7\u7eed\u4fee\u6539");
  }

  return { id: orderId, status };
}
