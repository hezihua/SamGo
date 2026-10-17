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

function nameMatchesTerms(name, terms) {
  const n = String(name || "");
  if (!n) return false;
  const nLower = n.toLowerCase();
  for (let i = 0; i < terms.length; i++) {
    const t = terms[i];
    if (!t) continue;
    if (n.includes(t)) return true;
    if (nLower.includes(t.toLowerCase())) return true;
  }
  return false;
}

/** 按商品名模糊匹配（子串 + 常见同义词） */
function filterProductsByName(products, query) {
  const q = String(query || "").trim();
  if (!q) return products || [];
  const terms = searchTermsForQuery(q);
  return (products || []).filter((p) => nameMatchesTerms(p.name, terms));
}

module.exports = {
  filterProductsByName,
  searchTermsForQuery,
};
