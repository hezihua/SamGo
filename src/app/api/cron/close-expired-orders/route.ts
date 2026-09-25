import { NextResponse } from "next/server";
import { closeAllExpiredOrders } from "@/lib/close-expired-orders";
import { createAdminClient } from "@/lib/supabase/admin";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return false;
  }
  const header = request.headers.get("authorization");
  if (header === `Bearer ${secret}`) {
    return true;
  }
  return request.headers.get("x-cron-secret") === secret;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const closed = await closeAllExpiredOrders(admin);
    return NextResponse.json({ ok: true, closed });
  } catch (err) {
    const message = err instanceof Error ? err.message : "close failed";
    console.error("[cron close-expired-orders]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
