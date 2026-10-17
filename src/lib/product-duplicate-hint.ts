import type { SupabaseClient } from "@supabase/supabase-js";

export type DuplicateProductHint = {
  id: string;
  name: string;
  price: number;
  review_status: string;
  reason: string;
};

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "");
}

function namesSimilar(a: string, b: string): boolean {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const shorter = na.length <= nb.length ? na : nb;
  const longer = na.length <= nb.length ? nb : na;
  if (shorter.length >= 3 && longer.includes(shorter)) return true;
  return false;
}

function pricesClose(a: number, b: number): boolean {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  const diff = Math.abs(a - b);
  if (diff <= 0.02) return true;
  const base = Math.max(a, b, 0.01);
  return diff / base <= 0.08;
}

function reasonForMatch(
  candidateName: string,
  candidatePrice: number,
  row: { name: string; price: number },
): string {
  const exact = normalizeName(candidateName) === normalizeName(row.name);
  if (exact && pricesClose(candidatePrice, Number(row.price))) {
    return "名称相同且价格接近";
  }
  if (exact) return "名称相同";
  if (namesSimilar(candidateName, row.name) && pricesClose(candidatePrice, Number(row.price))) {
    return "名称相似且价格接近";
  }
  if (namesSimilar(candidateName, row.name)) return "名称相似";
  return "可能相关";
}

export async function findSimilarProducts(
  admin: SupabaseClient,
  candidate: {
    name: string;
    price: number;
    excludeId?: string;
  },
  options?: { limit?: number },
): Promise<DuplicateProductHint[]> {
  const name = candidate.name.trim();
  if (!name) return [];

  const limit = options?.limit ?? 5;
  let query = admin
    .from("products")
    .select("id, name, price, review_status")
    .in("review_status", ["approved", "pending"]);

  if (candidate.excludeId) {
    query = query.neq("id", candidate.excludeId);
  }

  const { data, error } = await query.limit(200);
  if (error || !data) return [];

  const price = candidate.price;
  const hints: DuplicateProductHint[] = [];

  for (const row of data) {
    const rowName = String(row.name ?? "");
    const rowPrice = Number(row.price);
    const exact = normalizeName(name) === normalizeName(rowName);
    const similar = namesSimilar(name, rowName);
    const close = pricesClose(price, rowPrice);

    if (!exact && !(similar && close)) continue;

    hints.push({
      id: String(row.id),
      name: rowName,
      price: rowPrice,
      review_status: String(row.review_status ?? ""),
      reason: reasonForMatch(name, price, { name: rowName, price: rowPrice }),
    });
  }

  hints.sort((a, b) => {
    const score = (h: DuplicateProductHint) =>
      (h.reason.includes("相同") ? 2 : 0) + (h.reason.includes("价格") ? 1 : 0);
    return score(b) - score(a);
  });

  return hints.slice(0, limit);
}

export function formatDuplicateHintsMessage(hints: DuplicateProductHint[]): string {
  if (hints.length === 0) return "";
  const lines = hints.map(
    (h) => `· ${h.name}（¥${h.price}，${h.reason}）`,
  );
  return `库中可能有重复商品：\n${lines.join("\n")}`;
}
