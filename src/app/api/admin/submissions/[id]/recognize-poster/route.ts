import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin-auth";
import { findSimilarProducts } from "@/lib/product-duplicate-hint";
import { isOssConfigured, uploadProductImage } from "@/lib/aliyun-oss";
import { cropPosterProductImage } from "@/lib/poster-product-crop";
import { isPosterSubmissionPlaceholder } from "@/lib/product-fields";
import {
  extractPosterFromImage,
  isPosterVisionConfigured,
} from "@/lib/sams-poster-vision";
import { suggestSearchAliases } from "@/lib/search-aliases";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ id: string }> };

async function fetchPosterBuffer(
  url: string,
): Promise<{ buffer: Buffer; contentType: string }> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error("无法下载用户提交的海报");
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length > 5 * 1024 * 1024) {
    throw new Error("海报超过 5MB，无法识图");
  }
  const contentType =
    res.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg";
  return { buffer, contentType };
}

export async function POST(_request: Request, context: RouteContext) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  if (!isPosterVisionConfigured()) {
    return NextResponse.json(
      {
        error:
          "识图服务未配置：请设置 OPENROUTER_API_KEY 等（见 .env.example），部署后重试。",
      },
      { status: 503 },
    );
  }

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "商品不存在" }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const { data: existing, error: fetchError } = await admin
      .from("products")
      .select("id, name, review_status, image_url, poster_url, price")
      .eq("id", id)
      .maybeSingle();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "商品不存在" }, { status: 404 });
    }

    if (existing.review_status !== "pending") {
      return NextResponse.json(
        { error: "仅待审核商品可识图" },
        { status: 400 },
      );
    }

    const posterFetchUrl =
      existing.poster_url?.trim() || existing.image_url?.trim() || "";
    if (!posterFetchUrl) {
      return NextResponse.json({ error: "缺少海报图片地址" }, { status: 400 });
    }

    const poster_url =
      existing.poster_url?.trim() ||
      (existing.image_url?.includes("product-submissions")
        ? existing.image_url.trim()
        : null);

    const { buffer, contentType } = await fetchPosterBuffer(posterFetchUrl);
    const { product, crop } = await extractPosterFromImage(buffer, contentType);

    let image_url = product.image_url;
    if (isOssConfigured()) {
      const cropped = await cropPosterProductImage(buffer, crop);
      if (cropped) {
        image_url = await uploadProductImage(
          cropped,
          "image/jpeg",
          "poster-product.jpg",
        );
      }
    }

    const duplicate_hints = await findSimilarProducts(
      admin,
      { name: product.name, price: product.price, excludeId: id },
      { limit: 3 },
    );

    const { data: saved, error: updateError } = await admin
      .from("products")
      .update({
        name: product.name,
        price: product.price,
        category: product.category,
        unit: product.unit,
        description: product.description,
        image_url,
        poster_url: poster_url || posterFetchUrl,
        search_aliases:
          product.search_aliases ?? suggestSearchAliases(product.name),
      })
      .eq("id", id)
      .select(
        "id, name, price, category, unit, image_url, poster_url, description, review_status",
      )
      .single();

    if (updateError || !saved) {
      console.error("[recognize-poster]", updateError?.message);
      return NextResponse.json({ error: "更新商品失败" }, { status: 500 });
    }

    revalidatePath("/admin/products");

    return NextResponse.json({
      product: saved,
      wasPlaceholder: isPosterSubmissionPlaceholder(existing),
      duplicate_hints,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "识图失败";
    console.error("[recognize-poster]", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
