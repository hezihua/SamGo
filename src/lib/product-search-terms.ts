/** 搜索同义词组：查询词命中组内任一词时，扩展为整组再匹配 name / search_aliases */
export const PRODUCT_SYNONYM_GROUPS: readonly (readonly string[])[] = [
  ["香蕉", "蕉", "banana"],
  ["草莓", "莓"],
  ["蓝莓", "莓"],
  ["车厘子", "樱桃"],
  ["西红柿", "番茄"],
  ["土豆", "马铃薯"],
  ["龙虾", "虾", "小龙虾"],
  ["卷", "瑞士卷"],
];

export const PRODUCT_CATEGORIES = [
  "生鲜",
  "零食",
  "乳品",
  "粮油",
  "冷冻",
  "酒水",
  "日用",
  "其他",
] as const;

export function searchTermsForQuery(rawQuery: string): string[] {
  const q = String(rawQuery || "").trim();
  if (!q) return [];
  const terms = new Set<string>([q]);
  const qLower = q.toLowerCase();
  if (qLower !== q) terms.add(qLower);

  for (const group of PRODUCT_SYNONYM_GROUPS) {
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
      if (
        q.length >= 2 &&
        gLower.length >= 2 &&
        (qLower.includes(gLower) || gLower.includes(qLower))
      ) {
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

/** PostgREST ilike 通配符转义 */
export function escapeIlikePattern(value: string): string {
  return value.replace(/[%_\\,().]/g, (c) => `\\${c}`);
}
