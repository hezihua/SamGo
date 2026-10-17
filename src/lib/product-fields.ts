export type ProductReviewStatus = "approved" | "pending" | "rejected";

import { normalizeSearchAliasesInput } from "@/lib/search-aliases";

export type ParsedProductFields = {
  name: string;
  price: number;
  category: string;
  unit: string;
  image_url: string | null;
  description: string | null;
  search_aliases: string | null;
};

function readStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export function parseProductPayload(body: {
  name?: unknown;
  price?: unknown;
  category?: unknown;
  unit?: unknown;
  image_url?: unknown;
  description?: unknown;
  search_aliases?: unknown;
}): ParsedProductFields | null {
  const name = readStr(body.name);
  const priceRaw = body.price;
  const price =
    typeof priceRaw === "number"
      ? priceRaw
      : typeof priceRaw === "string"
        ? Number.parseFloat(priceRaw)
        : NaN;
  const category = readStr(body.category) || "\u5176\u4ed6";
  const unit = readStr(body.unit) || "\u4ef6";
  const imageRaw = readStr(body.image_url);
  const image_url = imageRaw ? imageRaw : null;
  const descRaw = readStr(body.description);
  const description = descRaw ? descRaw : null;
  const search_aliases = normalizeSearchAliasesInput(body.search_aliases);

  if (!name || !Number.isFinite(price) || price < 0) {
    return null;
  }

  return { name, price, category, unit, image_url, description, search_aliases };
}

export function parseProductFormData(formData: FormData): ParsedProductFields | null {
  return parseProductPayload({
    name: formData.get("name"),
    price: formData.get("price"),
    category: formData.get("category"),
    unit: formData.get("unit"),
    image_url: formData.get("image_url"),
    description: formData.get("description"),
    search_aliases: formData.get("search_aliases"),
  });
}

/** 小程序仅上传山姆海报、待管理端识图时的占位名称 */
export const POSTER_SUBMISSION_PLACEHOLDER_NAME = "（待识图）山姆海报";

export function isPosterSubmissionPlaceholder(row: {
  name?: string | null;
}): boolean {
  const n = readStr(row.name);
  return (
    n === POSTER_SUBMISSION_PLACEHOLDER_NAME || n.startsWith("（待识图）")
  );
}

export function parsePosterSubmissionPayload(body: {
  image_url?: unknown;
  poster_url?: unknown;
}): ParsedProductFields | null {
  const image_url = readStr(body.image_url) || readStr(body.poster_url);
  if (!image_url || !/^https:\/\//i.test(image_url)) {
    return null;
  }
  return {
    name: POSTER_SUBMISSION_PLACEHOLDER_NAME,
    price: 0,
    category: "其他",
    unit: "件",
    image_url,
    description: "用户提交山姆分享海报，待管理员识图审核。",
    search_aliases: null,
  };
}

/** 完整表单或仅海报 URL（小程序提报） */
export function resolveProductSubmitPayload(body: {
  name?: unknown;
  price?: unknown;
  category?: unknown;
  unit?: unknown;
  image_url?: unknown;
  poster_url?: unknown;
  description?: unknown;
}): ParsedProductFields | null {
  const hasPosterOnly =
    !readStr(body.name) &&
    (body.price === undefined ||
      body.price === null ||
      readStr(String(body.price ?? "")) === "") &&
    Boolean(readStr(body.image_url) || readStr(body.poster_url));

  if (hasPosterOnly) {
    return parsePosterSubmissionPayload(body);
  }

  const fields = parseProductPayload(body);
  if (!fields?.image_url) {
    return null;
  }
  return fields;
}
