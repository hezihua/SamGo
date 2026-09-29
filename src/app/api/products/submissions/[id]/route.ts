import { NextResponse } from "next/server";
import { parseProductPayload } from "@/lib/product-fields";
import { createAdminClient } from "@/lib/supabase/admin";
import { userFromBearer } from "@/lib/request-user";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await userFromBearer(request);
    if (!user) {
      return NextResponse.json({ error: "\u8bf7\u5148\u767b\u5f55" }, { status: 401 });
    }

    const { id } = await context.params;
    if (!id?.trim()) {
      return NextResponse.json({ error: "\u5546\u54c1\u4e0d\u5b58\u5728" }, { status: 400 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const fields = parseProductPayload(body);
    if (!fields) {
      return NextResponse.json(
        { error: "\u8bf7\u586b\u5199\u6709\u6548\u7684\u5546\u54c1\u540d\u79f0\u4e0e\u4ef7\u683c" },
        { status: 400 }
      );
    }

    if (!fields.image_url) {
      return NextResponse.json({ error: "\u8bf7\u4e0a\u4f20\u5546\u54c1\u56fe\u7247" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: existing, error: fetchError } = await admin
      .from("products")
      .select("id, created_by, review_status")
      .eq("id", id)
      .maybeSingle();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "\u5546\u54c1\u4e0d\u5b58\u5728" }, { status: 404 });
    }

    if (existing.created_by !== user.id) {
      return NextResponse.json(
        { error: "\u53ea\u80fd\u4fee\u6539\u81ea\u5df1\u63d0\u4ea4\u7684\u5546\u54c1" },
        { status: 403 }
      );
    }

    if (existing.review_status !== "rejected") {
      return NextResponse.json(
        { error: "\u4ec5\u5ba1\u6838\u672a\u901a\u8fc7\u7684\u5546\u54c1\u53ef\u91cd\u65b0\u63d0\u4ea4" },
        { status: 400 }
      );
    }

    const { data, error } = await admin
      .from("products")
      .update({
        ...fields,
        review_status: "pending",
        review_note: null,
      })
      .eq("id", id)
      .select("id, name, review_status, created_at")
      .single();

    if (error || !data) {
      console.error("[products resubmit]", error);
      return NextResponse.json(
        { error: "\u63d0\u4ea4\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      product: data,
      message: "\u5df2\u91cd\u65b0\u63d0\u4ea4\u5ba1\u6838",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "\u63d0\u4ea4\u5931\u8d25";
    console.error("[products resubmit]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
