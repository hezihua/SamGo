import { NextResponse } from "next/server";
import { assertOrderEditable } from "@/lib/order-guard";
import { userCanDecreaseOrderItems } from "@/lib/order-permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { userFromBearer } from "@/lib/request-user";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await userFromBearer(request);
    if (!user) {
      return NextResponse.json({ error: "\u8bf7\u5148\u767b\u5f55" }, { status: 401 });
    }

    const { id: itemId } = await context.params;
    const body = (await request.json()) as { quantity?: number };
    const quantity =
      typeof body.quantity === "number" ? Math.floor(body.quantity) : 0;

    if (quantity < 1) {
      return NextResponse.json({ error: "\u6570\u91cf\u81f3\u5c11\u4e3a 1" }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: item, error: itemError } = await admin
      .from("order_items")
      .select("id, user_id, group_order_id, quantity")
      .eq("id", itemId)
      .single();

    if (itemError || !item) {
      return NextResponse.json({ error: "\u9009\u8d2d\u4e0d\u5b58\u5728" }, { status: 404 });
    }

    if (item.user_id !== user.id) {
      return NextResponse.json({ error: "\u53ea\u80fd\u4fee\u6539\u81ea\u5df1\u7684\u9009\u8d2d" }, { status: 403 });
    }

    try {
      await assertOrderEditable(admin, item.group_order_id);
    } catch (e) {
      const message = e instanceof Error ? e.message : "\u62fc\u5355\u4e0d\u53ef\u7f16\u8f91";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    if (quantity < item.quantity) {
      const canDecrease = await userCanDecreaseOrderItems(
        admin,
        user.id,
        item.group_order_id
      );
      if (!canDecrease) {
        return NextResponse.json(
          { error: "\u53c2\u4e0e\u62fc\u5355\u53ea\u53ef\u52a0\u8d2d\uff0c\u5982\u9700\u51cf\u5c11\u8bf7\u8054\u7cfb\u53d1\u8d77\u4eba" },
          { status: 403 }
        );
      }
    }

    const { data: updated, error: updateError } = await admin
      .from("order_items")
      .update({ quantity })
      .eq("id", itemId)
      .select()
      .single();

    if (updateError || !updated) {
      console.error("[order-items patch]", updateError);
      return NextResponse.json({ error: "\u66f4\u65b0\u5931\u8d25" }, { status: 500 });
    }

    return NextResponse.json({ item: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "\u66f4\u65b0\u5931\u8d25";
    console.error("[order-items patch]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const user = await userFromBearer(_request);
    if (!user) {
      return NextResponse.json({ error: "\u8bf7\u5148\u767b\u5f55" }, { status: 401 });
    }

    const { id: itemId } = await context.params;

    const admin = createAdminClient();

    const { data: item, error: itemError } = await admin
      .from("order_items")
      .select("id, user_id, group_order_id")
      .eq("id", itemId)
      .single();

    if (itemError || !item) {
      return NextResponse.json({ error: "\u9009\u8d2d\u4e0d\u5b58\u5728" }, { status: 404 });
    }

    if (item.user_id !== user.id) {
      return NextResponse.json({ error: "\u53ea\u80fd\u5220\u9664\u81ea\u5df1\u7684\u9009\u8d2d" }, { status: 403 });
    }

    try {
      await assertOrderEditable(admin, item.group_order_id);
    } catch (e) {
      const message = e instanceof Error ? e.message : "\u62fc\u5355\u4e0d\u53ef\u7f16\u8f91";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const canDecrease = await userCanDecreaseOrderItems(
      admin,
      user.id,
      item.group_order_id
    );
    if (!canDecrease) {
      return NextResponse.json(
        { error: "\u53c2\u4e0e\u62fc\u5355\u53ea\u53ef\u52a0\u8d2d\uff0c\u5982\u9700\u51cf\u5c11\u8bf7\u8054\u7cfb\u53d1\u8d77\u4eba" },
        { status: 403 }
      );
    }

    const { error: deleteError } = await admin
      .from("order_items")
      .delete()
      .eq("id", itemId);

    if (deleteError) {
      console.error("[order-items delete]", deleteError);
      return NextResponse.json({ error: "\u5220\u9664\u5931\u8d25" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "\u5220\u9664\u5931\u8d25";
    console.error("[order-items delete]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
