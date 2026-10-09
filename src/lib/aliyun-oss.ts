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

const EXT_TO_TYPE: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

function sniffImageMime(buffer: Buffer): string | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    buffer.length >= 6 &&
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46
  ) {
    return "image/gif";
  }
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

function normalizeImageContentType(
  buffer: Buffer,
  contentType: string,
  originalName: string,
): string {
  const raw = (contentType || "").split(";")[0].trim().toLowerCase();
  if (ALLOWED_TYPES.has(raw)) {
    return raw;
  }

  const ext =
    originalName.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "";
  if (ext && EXT_TO_TYPE[ext]) {
    return EXT_TO_TYPE[ext];
  }

  const sniffed = sniffImageMime(buffer);
  if (sniffed) {
    return sniffed;
  }

  throw new Error("仅支持 JPG / PNG / WebP / GIF");
}

export async function uploadProductImage(
  buffer: Buffer,
  contentType: string,
  originalName: string,
): Promise<string> {
  const normalized = normalizeImageContentType(buffer, contentType, originalName);
  if (buffer.length > 5 * 1024 * 1024) {
    throw new Error("图片不能超过 5MB");
  }

  const extFromName =
    originalName.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "";
  const extFromMime = normalized.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
  const ext = extFromName || extFromMime;
  const objectKey = `products/${randomUUID()}.${ext}`;

  const client = createOssClient();
  await client.put(objectKey, buffer, {
    headers: { "Content-Type": normalized },
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
