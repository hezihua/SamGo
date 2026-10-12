import sharp from "sharp";

const VISION_MAX_SIDE = 1600;

/** 缩小海报再送 Vision，降低 OpenRouter 上游失败/限流概率 */
export async function preparePosterVisionImage(
  buffer: Buffer,
): Promise<{ buffer: Buffer; mime: string }> {
  const img = sharp(buffer).rotate();
  const meta = await img.metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  const maxSide = Math.max(w, h);

  let pipeline = img;
  if (maxSide > VISION_MAX_SIDE) {
    pipeline = pipeline.resize({
      width: w >= h ? VISION_MAX_SIDE : undefined,
      height: h > w ? VISION_MAX_SIDE : undefined,
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  const out = await pipeline.jpeg({ quality: 86, mozjpeg: true }).toBuffer();
  return { buffer: out, mime: "image/jpeg" };
}

/** 相对整张海报的裁切框，取值 0~1 */
export type NormalizedCrop = {
  x: number;
  y: number;
  w: number;
  h: number;
};

/** 典型山姆分享海报「商品主图板块」 fallback（顶栏下 → ￥价格上） */
export function fallbackSamsHeroCrop(): NormalizedCrop {
  return { x: 0.05, y: 0.11, w: 0.9, h: 0.36 };
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function parseNormalizedCrop(value: unknown): NormalizedCrop | null {
  if (!value || typeof value !== "object") return null;
  const o = value as Record<string, unknown>;
  const read = (k: string) => {
    const v = o[k];
    const n = typeof v === "number" ? v : typeof v === "string" ? Number.parseFloat(v) : NaN;
    return Number.isFinite(n) ? n : null;
  };
  const x = read("x");
  const y = read("y");
  const w = read("w") ?? read("width");
  const h = read("h") ?? read("height");
  if (x === null || y === null || w === null || h === null) return null;

  const cx = clamp01(x);
  const cy = clamp01(y);
  const cw = clamp01(w);
  const ch = clamp01(h);
  if (cw < 0.12 || ch < 0.12) return null;
  if (cx + cw > 1.001 || cy + ch > 1.001) return null;

  return refineSamsProductCrop({ x: cx, y: cy, w: cw, h: ch });
}

/**
 * 将模型框对齐到山姆海报「商品主图板块」（用户红框区域）。
 */
export function refineSamsProductCrop(crop: NormalizedCrop): NormalizedCrop {
  const heroTop = 0.1;
  const heroBottom = 0.47;
  const heroX = 0.05;
  const heroW = 0.9;

  let y = Math.max(crop.y, heroTop);
  let bottom = Math.min(crop.y + crop.h, heroBottom);
  let h = Math.max(0.15, bottom - y);

  if (h < 0.2) {
    y = heroTop;
    h = heroBottom - heroTop;
  }

  let x = crop.x;
  let w = crop.w;
  if (w < 0.78) {
    x = heroX;
    w = heroW;
  } else {
    x = clamp01(Math.max(heroX, x));
    w = Math.min(heroW, w);
    if (x + w > 0.99) {
      x = Math.max(heroX, 0.99 - w);
    }
  }

  return { x, y, w, h };
}

export async function cropPosterProductImage(
  buffer: Buffer,
  crop: NormalizedCrop,
): Promise<Buffer | null> {
  const meta = await sharp(buffer).metadata();
  const imgW = meta.width;
  const imgH = meta.height;
  if (!imgW || !imgH) return null;

  let left = Math.floor(crop.x * imgW);
  let top = Math.floor(crop.y * imgH);
  let width = Math.floor(crop.w * imgW);
  let height = Math.floor(crop.h * imgH);

  left = Math.max(0, Math.min(left, imgW - 1));
  top = Math.max(0, Math.min(top, imgH - 1));
  width = Math.max(32, Math.min(width, imgW - left));
  height = Math.max(32, Math.min(height, imgH - top));

  return sharp(buffer)
    .extract({ left, top, width, height })
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();
}
