import { NextResponse } from "next/server";
import {
  isPosterSubmissionPlaceholder,
  resolveProductSubmitPayload,
} from "@/lib/product-fields";
import { createAdminClient } from "@/lib/supabase/admin";
import { userFromBearer } from "@/lib/request-user";

export async function POST(request: Request) {
  try {
    const user = await userFromBearer(request);
    if (!user) {
      return NextResponse.json({ error: "\u8bf7\u5148\u767b\u5f55" }, { status: 401 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const fields = resolveProductSubmitPayload(body);
    if (!fields) {
      return NextResponse.json(
        { error: "\u8bf7\u4e0a\u4f20\u5c71\u59c6\u5206\u4eab\u6d77\u62a5\u56fe\u7247" },
        { status: 400 }
      );
    }

    const posterOnly = isPosterSubmissionPlaceholder(fields);
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("products")
      .insert({
        ...fields,
        poster_url: posterOnly ? fields.image_url : null,
        review_status: "pending",
        created_by: user.id,
      })
      .select("id, name, review_status, created_at")
      .single();

    if (error || !data) {
      console.error("[products submit]", error);
      return NextResponse.json(
        { error: "\u63d0\u4ea4\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      product: data,
      message: posterOnly
        ? "\u5df2\u4e0a\u4f20\u6d77\u62a5\uff0c\u7ba1\u7406\u5458\u8bc6\u56fe\u5ba1\u6838\u540e\u5c06\u5165\u5e93"
        : "\u5df2\u63d0\u4ea4\uff0c\u7ba1\u7406\u5458\u5ba1\u6838\u901a\u8fc7\u540e\u5c06\u51fa\u73b0\u5728\u5546\u54c1\u5e93",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "\u63d0\u4ea4\u5931\u8d25";
    console.error("[products submit]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
