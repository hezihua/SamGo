import { NextResponse } from "next/server";
import { closeAllExpiredOrders } from "@/lib/close-expired-orders";
import { createAdminClient } from "@/lib/supabase/admin";
import { userFromBearer } from "@/lib/request-user";

export async function POST(request: Request) {
  try {
    const user = await userFromBearer(request);
    if (!user) {
      return NextResponse.json({ error: "\u8bf7\u5148\u767b\u5f55" }, { status: 401 });
    }

    const admin = createAdminClient();
    const closed = await closeAllExpiredOrders(admin);
    return NextResponse.json({ ok: true, closed });
  } catch (err) {
    const message = err instanceof Error ? err.message : "\u622a\u6b62\u5931\u8d25";
    console.error("[group-orders close-expired]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
