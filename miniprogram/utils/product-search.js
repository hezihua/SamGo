/** 同义词组：搜任一词时，名称命中组内任一词即算匹配（如「香蕉」↔「蕉」） */
const SYNONYM_GROUPS = [
  ["香蕉", "蕉", "banana"],
  ["草莓", "莓"],
  ["蓝莓", "莓"],
  ["车厘子", "樱桃"],
  ["西红柿", "番茄"],
  ["土豆", "马铃薯"],
  ["龙虾", "虾", "小龙虾"],
  ["卷", "瑞士卷"],
];

function searchTermsForQuery(rawQuery) {
  const q = String(rawQuery || "").trim();
  if (!q) return [];
  const terms = new Set([q]);
  const qLower = q.toLowerCase();
  if (qLower !== q) terms.add(qLower);

  for (const group of SYNONYM_GROUPS) {
    let hit = false;
    for (const g of group) {
      const gLower = g.toLowerCase();
      if (q === g || qLower === gLower) {
        hit = true;
        break;
      }
      if (q.length >= 2 && (q.includes(g) || g.includes(q))) {
        hit = true;
        break;
      }
      if (q.length >= 2 && gLower.length >= 2 && (qLower.includes(gLower) || gLower.includes(qLower))) {
        hit = true;
        break;
      }
    }
    if (hit) {
      for (const g of group) {
        terms.add(g);
        terms.add(g.toLowerCase());
      }
    }
  }

  return Array.from(terms).filter(Boolean);
}

function nameMatchesTerms(name, aliases, terms) {
  const hay = [String(name || ""), String(aliases || "")]
    .filter(Boolean)
    .join("\n");
  if (!hay) return false;
  const hayLower = hay.toLowerCase();
  for (let i = 0; i < terms.length; i++) {
    const t = terms[i];
    if (!t) continue;
    if (hay.includes(t)) return true;
    if (hayLower.includes(t.toLowerCase())) return true;
  }
  return false;
}

/** 按商品名 / search_aliases 模糊匹配（子串 + 常见同义词，本地列表用） */
function filterProductsByName(products, query) {
  const q = String(query || "").trim();
  if (!q) return products || [];
  const terms = searchTermsForQuery(q);
  return (products || []).filter((p) =>
    nameMatchesTerms(p.name, p.search_aliases, terms),
  );
}

module.exports = {
  filterProductsByName,
  searchTermsForQuery,
};
