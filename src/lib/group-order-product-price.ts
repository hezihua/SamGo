import type { SupabaseClient } from "@supabase/supabase-js";

export async function getOrderUnitPrice(
  admin: SupabaseClient,
  groupOrderId: string,
  productId: string
): Promise<{ name: string; unit_price: number } | null> {
  const { data, error } = await admin
    .from("group_order_products")
    .select("unit_price, products(name)")
    .eq("group_order_id", groupOrderId)
    .eq("product_id", productId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const name =
    data.products && typeof data.products === "object" && "name" in data.products
      ? String((data.products as { name: string }).name)
      : "";
  const unit_price = Number(data.unit_price);
  if (!name || !Number.isFinite(unit_price) || unit_price < 0) {
    return null;
  }

  return { name, unit_price };
}

export async function syncOrderItemsPriceForProduct(
  admin: SupabaseClient,
  groupOrderId: string,
  productName: string,
  unitPrice: number
): Promise<void> {
  const { error } = await admin
    .from("order_items")
    .update({ product_price: unitPrice })
    .eq("group_order_id", groupOrderId)
    .eq("product_name", productName);

  if (error) {
    console.error("[syncOrderItemsPriceForProduct]", error);
    throw error;
  }
}
