const CATALOG_DEFAULT_LIMIT = 50;

function buildCatalogPath({ q, category, limit, offset }) {
  const lim = limit != null ? limit : CATALOG_DEFAULT_LIMIT;
  const off = offset != null ? offset : 0;
  const parts = [`limit=${lim}`, `offset=${off}`];
  const trimmedQ = (q || "").trim();
  if (trimmedQ) {
    parts.push(`q=${encodeURIComponent(trimmedQ)}`);
  }
  const cat = (category || "").trim();
  if (cat && cat !== "全部") {
    parts.push(`category=${encodeURIComponent(cat)}`);
  }
  return `/api/products?${parts.join("&")}`;
}

module.exports = {
  CATALOG_DEFAULT_LIMIT,
  buildCatalogPath,
};
