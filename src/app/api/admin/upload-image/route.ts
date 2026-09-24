import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin-auth";
import { isOssConfigured, uploadProductImage } from "@/lib/aliyun-oss";

export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "\u672a\u6388\u6743" }, { status: 401 });
  }

  if (!isOssConfigured()) {
    return NextResponse.json({ error: "OSS \u672a\u914d\u7f6e" }, { status: 503 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "\u8bf7\u9009\u62e9\u56fe\u7247" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const contentType = file.type || "application/octet-stream";
    const url = await uploadProductImage(buffer, contentType, file.name);

    return NextResponse.json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "\u4e0a\u4f20\u5931\u8d25";
    console.error("[upload-image]", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
