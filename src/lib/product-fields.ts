export type ProductReviewStatus = "approved" | "pending" | "rejected";

export type ParsedProductFields = {
  name: string;
  price: number;
  category: string;
  unit: string;
  image_url: string | null;
  description: string | null;
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

  if (!name || !Number.isFinite(price) || price < 0) {
    return null;
  }

  return { name, price, category, unit, image_url, description };
}

export function parseProductFormData(formData: FormData): ParsedProductFields | null {
  return parseProductPayload({
    name: formData.get("name"),
    price: formData.get("price"),
    category: formData.get("category"),
    unit: formData.get("unit"),
    image_url: formData.get("image_url"),
    description: formData.get("description"),
  });
}
