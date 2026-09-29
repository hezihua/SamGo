import { NextResponse } from "next/server";
import { isOssConfigured, uploadProductImage } from "@/lib/aliyun-oss";
import { userFromBearer } from "@/lib/request-user";

export async function POST(request: Request) {
  const user = await userFromBearer(request);
  if (!user) {
    return NextResponse.json({ error: "\u8bf7\u5148\u767b\u5f55" }, { status: 401 });
  }

  if (!isOssConfigured()) {
    return NextResponse.json(
      { error: "\u56fe\u7247\u4e0a\u4f20\u672a\u914d\u7f6e" },
      { status: 503 }
    );
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
    console.error("[products upload-image]", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
