"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clearAdminSession, isAdminSession } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireAdmin() {
  if (!(await isAdminSession())) {
    redirect("/admin/login");
  }
}

function parseProductFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const priceRaw = String(formData.get("price") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim() || "\u5176\u4ed6";
  const unit = String(formData.get("unit") ?? "").trim() || "\u4ef6";
  const image_url = String(formData.get("image_url") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const price = Number.parseFloat(priceRaw);

  if (!name || !Number.isFinite(price) || price < 0) {
    return null;
  }

  return { name, price, category, unit, image_url, description };
}

export async function adminLogout() {
  await clearAdminSession();
  redirect("/admin/login");
}

export async function createProduct(formData: FormData) {
  await requireAdmin();
  const fields = parseProductFields(formData);
  if (!fields) {
    redirect("/admin/products?error=invalid");
  }

  const admin = createAdminClient();
  const { error } = await admin.from("products").insert(fields);
  if (error) {
    redirect("/admin/products?error=save");
  }

  revalidatePath("/admin/products");
  redirect("/admin/products");
}

export async function updateProduct(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const fields = parseProductFields(formData);
  if (!id || !fields) {
    redirect("/admin/products?error=invalid");
  }

  const admin = createAdminClient();
  const { error } = await admin.from("products").update(fields).eq("id", id);
  if (error) {
    redirect("/admin/products?error=save");
  }

  revalidatePath("/admin/products");
  redirect("/admin/products");
}

export async function deleteProduct(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    redirect("/admin/products?error=invalid");
  }

  const admin = createAdminClient();
  const { error } = await admin.from("products").delete().eq("id", id);
  if (error) {
    redirect("/admin/products?error=delete");
  }

  revalidatePath("/admin/products");
  redirect("/admin/products");
}
