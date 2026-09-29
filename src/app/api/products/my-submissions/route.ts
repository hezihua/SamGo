import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { userFromBearer } from "@/lib/request-user";

export async function GET(request: Request) {
  try {
    const user = await userFromBearer(request);
    if (!user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("products")
      .select(
        "id, name, price, category, review_status, created_at, image_url"
      )
      .eq("created_by", user.id)
      .neq("review_status", "approved")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("[products my-submissions]", error);
      return NextResponse.json({ error: "加载失败" }, { status: 500 });
    }

    return NextResponse.json({ submissions: data ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "加载失败";
    console.error("[products my-submissions]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
