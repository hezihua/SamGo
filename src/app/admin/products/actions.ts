"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clearAdminSession, isAdminSession } from "@/lib/admin-auth";
import {
  isPosterSubmissionPlaceholder,
  parseProductFormData,
} from "@/lib/product-fields";
import { findSimilarProducts } from "@/lib/product-duplicate-hint";
import { suggestSearchAliases } from "@/lib/search-aliases";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ParsedProductFields } from "@/lib/product-fields";

function withDefaultSearchAliases(fields: ParsedProductFields): ParsedProductFields {
  if (fields.search_aliases) return fields;
  return {
    ...fields,
    search_aliases: suggestSearchAliases(fields.name),
  };
}

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
  const parsed = parseProductFormData(formData);
  if (!parsed) {
    redirect("/admin/products?error=invalid");
  }
  const fields = withDefaultSearchAliases(parsed);

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
  const parsed = parseProductFormData(formData);
  if (!id || !parsed) {
    redirect("/admin/products?error=invalid");
  }
  const fields = withDefaultSearchAliases(parsed);

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
  const force = String(formData.get("force_approve") ?? "") === "1";

  const { data: row, error: fetchError } = await admin
    .from("products")
    .select("name, price")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !row) {
    redirect("/admin/products?error=invalid");
  }

  if (isPosterSubmissionPlaceholder(row)) {
    redirect("/admin/products?error=need-recognize");
  }

  if (!force) {
    const hints = await findSimilarProducts(
      admin,
      {
        name: String(row.name ?? ""),
        price: Number(row.price),
        excludeId: id,
      },
      { limit: 1 },
    );
    if (hints.length > 0) {
      const match = encodeURIComponent(hints[0].name);
      redirect(`/admin/products?error=duplicate&match=${match}`);
    }
  }

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

export async function deleteProductsBatch(formData: FormData) {
  await requireAdmin();
  const raw = String(formData.get("ids") ?? "").trim();
  const ids = [
    ...new Set(
      raw
        .split(/[,，\s]+/)
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ];
  if (ids.length === 0) {
    redirect("/admin/products?error=invalid");
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("products")
    .delete()
    .in("id", ids)
    .eq("review_status", "approved");

  if (error) {
    redirect("/admin/products?error=delete");
  }

  revalidatePath("/admin/products");
  redirect("/admin/products");
}
