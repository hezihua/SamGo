import type { SupabaseClient } from "@supabase/supabase-js";
import {
  escapeIlikePattern,
  PRODUCT_CATEGORIES,
  searchTermsForQuery,
} from "@/lib/product-search-terms";

export type CatalogProduct = {
  id: string;
  name: string;
  price: number;
  category: string;
  unit: string;
  image_url: string | null;
  search_aliases: string | null;
};

export type ListApprovedProductsOptions = {
  q?: string;
  category?: string;
  limit?: number;
  offset?: number;
};

export type ListApprovedProductsResult = {
  products: CatalogProduct[];
  total: number;
  categories: string[];
  limit: number;
  offset: number;
};

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

function buildOrIlikeFilter(terms: string[]): string | null {
  if (terms.length === 0) return null;
  const parts: string[] = [];
  for (const term of terms) {
    const pattern = `%${escapeIlikePattern(term)}%`;
    parts.push(`name.ilike.${pattern}`);
    parts.push(`search_aliases.ilike.${pattern}`);
  }
  return parts.join(",");
}

export async function listApprovedProductsForCatalog(
  admin: SupabaseClient,
  options: ListApprovedProductsOptions,
): Promise<ListApprovedProductsResult> {
  const limit = Math.min(
    Math.max(options.limit ?? DEFAULT_LIMIT, 1),
    MAX_LIMIT,
  );
  const offset = Math.max(options.offset ?? 0, 0);
  const category = (options.category ?? "").trim();
  const q = (options.q ?? "").trim();
  const terms = q ? searchTermsForQuery(q) : [];

  let query = admin
    .from("products")
    .select(
      "id, name, price, category, unit, image_url, search_aliases",
      { count: "exact" },
    )
    .eq("review_status", "approved");

  if (category && category !== "全部") {
    query = query.eq("category", category);
  }

  const orFilter = buildOrIlikeFilter(terms);
  if (orFilter) {
    query = query.or(orFilter);
  }

  query = query.order("name", { ascending: true }).range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const categories = await fetchCategoryOptions(admin);

  return {
    products: (data ?? []) as CatalogProduct[],
    total: count ?? 0,
    categories,
    limit,
    offset,
  };
}

async function fetchCategoryOptions(admin: SupabaseClient): Promise<string[]> {
  const { data, error } = await admin
    .from("products")
    .select("category")
    .eq("review_status", "approved");

  if (error) {
    return [...PRODUCT_CATEGORIES];
  }

  const present = new Set(
    (data ?? [])
      .map((r) => (typeof r.category === "string" ? r.category.trim() : ""))
      .filter(Boolean),
  );

  const ordered: string[] = PRODUCT_CATEGORIES.filter((c) => present.has(c));
  for (const c of present) {
    if (!ordered.includes(c)) ordered.push(c);
  }
  return ordered;
}
