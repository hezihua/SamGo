"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertOrderEditable } from "@/lib/order-guard";
import { createClient } from "@/lib/supabase/server";

export async function createGroupOrder(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const delivery_address = formData.get("delivery_address") as string;
  const deadline = formData.get("deadline") as string;
  const min_participants = parseInt(formData.get("min_participants") as string) || 2;
  const notes = formData.get("notes") as string;

  const { data, error } = await supabase
    .from("group_orders")
    .insert({
      title,
      description: description || null,
      creator_id: user.id,
      delivery_address,
      deadline,
      min_participants,
      notes: notes || null,
      status: "open",
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await supabase.from("participants").insert({
    group_order_id: data.id,
    user_id: user.id,
  });

  revalidatePath("/");
  redirect(`/orders/${data.id}`);
}

export async function joinGroupOrder(orderId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await assertOrderEditable(supabase, orderId);

  const { error } = await supabase.from("participants").insert({
    group_order_id: orderId,
    user_id: user.id,
  });

  if (error && error.code !== "23505") {
    throw new Error(error.message);
  }

  revalidatePath(`/orders/${orderId}`);
}

export async function addOrderItem(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const group_order_id = formData.get("group_order_id") as string;

  await assertOrderEditable(supabase, group_order_id);

  const product_name = formData.get("product_name") as string;
  const product_price = parseFloat(formData.get("product_price") as string);
  const quantity = parseInt(formData.get("quantity") as string) || 1;
  const notes = formData.get("notes") as string;

  const { error } = await supabase.from("order_items").insert({
    group_order_id,
    user_id: user.id,
    product_name,
    product_price,
    quantity,
    notes: notes || null,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/orders/${group_order_id}`);
}

export async function removeOrderItem(itemId: string, orderId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await assertOrderEditable(supabase, orderId);

  const { error } = await supabase
    .from("order_items")
    .delete()
    .eq("id", itemId)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/orders/${orderId}`);
}

export async function updateOrderStatus(
  orderId: string,
  status: "open" | "closing" | "closed" | "completed"
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("group_orders")
    .update({ status })
    .eq("id", orderId)
    .eq("creator_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/");
}
