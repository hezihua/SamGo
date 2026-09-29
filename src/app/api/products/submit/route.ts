import { NextResponse } from "next/server";
import { parseProductPayload } from "@/lib/product-fields";
import { createAdminClient } from "@/lib/supabase/admin";
import { userFromBearer } from "@/lib/request-user";

export async function POST(request: Request) {
  try {
    const user = await userFromBearer(request);
    if (!user) {
      return NextResponse.json({ error: "\u8bf7\u5148\u767b\u5f55" }, { status: 401 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const fields = parseProductPayload(body);
    if (!fields) {
      return NextResponse.json(
        { error: "\u8bf7\u586b\u5199\u6709\u6548\u7684\u5546\u54c1\u540d\u79f0\u4e0e\u4ef7\u683c" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("products")
      .insert({
        ...fields,
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
      message:
        "\u5df2\u63d0\u4ea4\uff0c\u7ba1\u7406\u5458\u5ba1\u6838\u901a\u8fc7\u540e\u5c06\u51fa\u73b0\u5728\u5546\u54c1\u5e93",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "\u63d0\u4ea4\u5931\u8d25";
    console.error("[products submit]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
