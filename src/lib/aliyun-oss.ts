import OSS from "ali-oss";
import { randomUUID } from "crypto";

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) {
    throw new Error(`缺少环境变量 ${name}`);
  }
  return v;
}

export function createOssClient() {
  return new OSS({
    region: requireEnv("ALIYUN_OSS_REGION"),
    accessKeyId: requireEnv("ALIYUN_OSS_ACCESS_KEY_ID"),
    accessKeySecret: requireEnv("ALIYUN_OSS_ACCESS_KEY_SECRET"),
    bucket: requireEnv("ALIYUN_OSS_BUCKET"),
  });
}

function publicObjectUrl(objectKey: string): string {
  const custom = process.env.ALIYUN_OSS_PUBLIC_BASE_URL?.trim();
  if (custom) {
    return `${custom.replace(/\/$/, "")}/${objectKey}`;
  }
  const bucket = requireEnv("ALIYUN_OSS_BUCKET");
  const region = requireEnv("ALIYUN_OSS_REGION");
  return `https://${bucket}.${region}.aliyuncs.com/${objectKey}`;
}

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export async function uploadProductImage(
  buffer: Buffer,
  contentType: string,
  originalName: string,
): Promise<string> {
  if (!ALLOWED_TYPES.has(contentType)) {
    throw new Error("仅支持 JPG / PNG / WebP / GIF");
  }
  if (buffer.length > 5 * 1024 * 1024) {
    throw new Error("图片不能超过 5MB");
  }

  const ext =
    originalName.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ||
    "jpg";
  const objectKey = `products/${randomUUID()}.${ext}`;

  const client = createOssClient();
  await client.put(objectKey, buffer, {
    headers: { "Content-Type": contentType },
  });

  return publicObjectUrl(objectKey);
}

export function isOssConfigured(): boolean {
  return Boolean(
    process.env.ALIYUN_OSS_REGION?.trim() &&
      process.env.ALIYUN_OSS_BUCKET?.trim() &&
      process.env.ALIYUN_OSS_ACCESS_KEY_ID?.trim() &&
      process.env.ALIYUN_OSS_ACCESS_KEY_SECRET?.trim(),
  );
}
