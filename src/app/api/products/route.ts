import { NextResponse } from "next/server";
import { listApprovedProductsForCatalog } from "@/lib/product-catalog";
import { createAdminClient } from "@/lib/supabase/admin";
import { userFromBearer } from "@/lib/request-user";

export async function GET(request: Request) {
  try {
    const user = await userFromBearer(request);
    if (!user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const url = new URL(request.url);
    const q = url.searchParams.get("q") ?? undefined;
    const category = url.searchParams.get("category") ?? undefined;
    const limitRaw = url.searchParams.get("limit");
    const offsetRaw = url.searchParams.get("offset");
    const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
    const offset = offsetRaw ? Number.parseInt(offsetRaw, 10) : undefined;

    const admin = createAdminClient();
    const result = await listApprovedProductsForCatalog(admin, {
      q,
      category,
      limit: Number.isFinite(limit) ? limit : undefined,
      offset: Number.isFinite(offset) ? offset : undefined,
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "加载失败";
    console.error("[products catalog]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
