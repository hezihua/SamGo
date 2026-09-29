"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clearAdminSession, isAdminSession } from "@/lib/admin-auth";
import { parseProductFormData } from "@/lib/product-fields";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireAdmin() {
  if (!(await isAdminSession())) {
    redirect("/admin/login");
  }
}

export async function adminLogout() {
  await clearAdminSession();
  redirect("/admin/login");
}

export async function createProduct(formData: FormData) {
  await requireAdmin();
  const fields = parseProductFormData(formData);
  if (!fields) {
    redirect("/admin/products?error=invalid");
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("products")
    .insert({ ...fields, review_status: "approved" });
  if (error) {
    redirect("/admin/products?error=save");
  }

  revalidatePath("/admin/products");
  redirect("/admin/products");
}

export async function updateProduct(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const fields = parseProductFormData(formData);
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

export async function approveProduct(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    redirect("/admin/products?error=invalid");
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("products")
    .update({ review_status: "approved", review_note: null })
    .eq("id", id)
    .eq("review_status", "pending");

  if (error) {
    redirect("/admin/products?error=save");
  }

  revalidatePath("/admin/products");
  redirect("/admin/products");
}

export async function rejectProduct(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    redirect("/admin/products?error=invalid");
  }

  const rawNote = String(formData.get("review_note") ?? "").trim();
  const review_note = rawNote ? rawNote.slice(0, 500) : null;

  const admin = createAdminClient();
  const { error } = await admin
    .from("products")
    .update({ review_status: "rejected", review_note })
    .eq("id", id)
    .eq("review_status", "pending");

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
