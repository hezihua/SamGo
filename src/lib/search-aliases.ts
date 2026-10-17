import { PRODUCT_SYNONYM_GROUPS } from "@/lib/product-search-terms";

function readStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** 根据商品名推断常用搜索别名（识图入库 / 后台保存时写入） */
export function suggestSearchAliases(name: string): string | null {
  const n = readStr(name);
  if (!n) return null;

  const extras = new Set<string>();
  for (const group of PRODUCT_SYNONYM_GROUPS) {
    const matched = group.some((g) => g.length >= 1 && n.includes(g));
    if (!matched) continue;
    for (const g of group) {
      if (g.length < 2) continue;
      if (!n.includes(g)) extras.add(g);
    }
  }

  const list = Array.from(extras);
  return list.length > 0 ? list.join(",") : null;
}

export function normalizeSearchAliasesInput(raw: unknown): string | null {
  const s = readStr(raw);
  if (!s) return null;
  const parts = s
    .split(/[,，;；\s]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;
  return [...new Set(parts)].join(",");
}
