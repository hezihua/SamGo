import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin-auth";
import { findSimilarProducts } from "@/lib/product-duplicate-hint";
import {
  isOssConfigured,
  uploadProductImage,
  uploadSubmissionPosterImage,
} from "@/lib/aliyun-oss";
import { cropPosterProductImage } from "@/lib/poster-product-crop";
import {
  extractPosterFromImage,
  isPosterVisionConfigured,
} from "@/lib/sams-poster-vision";
import { suggestSearchAliases } from "@/lib/search-aliases";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  if (!isPosterVisionConfigured()) {
    return NextResponse.json(
      {
        error:
          "识图服务未配置：请设置 OPENAI_API_KEY 或 DASHSCOPE_API_KEY（见 .env.example），Vercel 改 Production 环境变量后重新部署。",
      },
      { status: 503 },
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "请选择海报图片" }, { status: 400 });
    }

    const uploadFullPoster =
      String(formData.get("upload_image") ?? "").toLowerCase() === "true";

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "图片不能超过 5MB" }, { status: 400 });
    }

    const contentType = file.type || "application/octet-stream";
    const { product, crop } = await extractPosterFromImage(buffer, contentType);

    let poster_url: string | null = null;
    if (isOssConfigured()) {
      if (uploadFullPoster) {
        product.image_url = await uploadProductImage(
          buffer,
          contentType,
          file.name || "poster.jpg",
        );
        poster_url = product.image_url;
      } else {
        poster_url = await uploadSubmissionPosterImage(
          buffer,
          contentType,
          file.name || "poster.jpg",
        );
        const cropped = await cropPosterProductImage(buffer, crop);
        if (cropped) {
          product.image_url = await uploadProductImage(
            cropped,
            "image/jpeg",
            "poster-product.jpg",
          );
        }
      }
    } else if (!uploadFullPoster && crop) {
      console.warn("[extract-poster] OSS 未配置，跳过商品图裁切上传");
    }

    const admin = createAdminClient();
    const duplicate_hints = await findSimilarProducts(admin, {
      name: product.name,
      price: product.price,
    });

    const { data: saved, error: dbError } = await admin
      .from("products")
      .insert({
        ...product,
        poster_url,
        search_aliases: product.search_aliases ?? suggestSearchAliases(product.name),
        review_status: "approved",
      })
      .select(
        "id, name, price, category, unit, image_url, poster_url, description, search_aliases",
      )
      .single();

    if (dbError) {
      console.error("[extract-poster save]", dbError.message);
      return NextResponse.json({ error: "写入商品库失败" }, { status: 500 });
    }

    revalidatePath("/admin/products");

    return NextResponse.json({ product: saved, saved: true, duplicate_hints });
  } catch (err) {
    const message = err instanceof Error ? err.message : "识别失败";
    console.error("[extract-poster]", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
