import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin-auth";
import { findSimilarProducts } from "@/lib/product-duplicate-hint";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const url = new URL(request.url);
  const excludeId = url.searchParams.get("excludeId")?.trim() ?? "";
  const nameParam = url.searchParams.get("name")?.trim();
  const priceParam = url.searchParams.get("price");

  const admin = createAdminClient();

  let name = nameParam ?? "";
  let price = priceParam ? Number.parseFloat(priceParam) : NaN;

  if (excludeId && (!name || !Number.isFinite(price))) {
    const { data: row, error } = await admin
      .from("products")
      .select("name, price")
      .eq("id", excludeId)
      .maybeSingle();
    if (error || !row) {
      return NextResponse.json({ error: "商品不存在" }, { status: 404 });
    }
    name = String(row.name ?? "");
    price = Number(row.price);
  }

  if (!name.trim()) {
    return NextResponse.json({ hints: [] });
  }

  const hints = await findSimilarProducts(
    admin,
    {
      name,
      price: Number.isFinite(price) ? price : 0,
      excludeId: excludeId || undefined,
    },
    { limit: 5 },
  );

  return NextResponse.json({ hints });
}
