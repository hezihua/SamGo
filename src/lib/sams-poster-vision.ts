import { parseProductPayload, type ParsedProductFields } from "@/lib/product-fields";
import {
  fallbackSamsHeroCrop,
  parseNormalizedCrop,
  preparePosterVisionImage,
  type NormalizedCrop,
} from "@/lib/poster-product-crop";

const SAMS_POSTER_SYSTEM = `你是山姆会员店（Sam's Club 中国）微信小程序「分享海报」识别助手。
用户会上传一张竖版促销海报图（含商品图、名称、规格、￥价格，底部常有小程序码）。

请只输出一个 JSON 对象（不要 markdown），字段：
- name: string | null — 商品名称，规格/重量写在名称里（如「都乐超甜蕉 1.4kg」）
- price: number | null — 海报主价，纯数字（如 19.9），不要货币符号
- category: string — 从以下选一个：生鲜、零食、乳品、粮油、冷冻、酒水、日用、其他
- unit: string — 销售单位，如 袋、盒、瓶、件、箱（不要用 kg、g 作单位，重量写在 name）
- description: string | null — 海报卖点（种植、糖度、口感等），用中文分号连接；不要「长按识别购买」「价格及活动具有时效性」等引导语
- product_crop: object — 山姆分享海报里「商品主图板块」矩形（浅蓝/白底那一整块摄影区，等同运营在海报上框选的主图），坐标为相对整张海报宽高的比例 0~1：x, y, w, h。
  - 上缘：顶栏 slogan（「更好的生活尽在山姆」）之下
  - 下缘：红色大号「￥价格」之上（不含 ¥19.9、商品名、卖点、评价条）
  - 左右：含主图浅蓝边距，约整图宽 90%
  - 可含：香蕉/包装摄影、角标「山姆会员…推荐」；不含底部「新包装」小字条（若在价格区上方紧贴价格则裁掉）
  务必排除：价格与标题文案、底部蓝条二维码、「长按识别购买」。

读不清名称或价格时，对应字段用 null。`;

const OPENROUTER_VL_FALLBACKS = [
  "qwen/qwen3-vl-30b-a3b-instruct",
  "qwen/qwen2.5-vl-72b-instruct",
] as const;

type RawVisionJson = {
  name?: unknown;
  price?: unknown;
  category?: unknown;
  unit?: unknown;
  description?: unknown;
  product_crop?: unknown;
};

export type PosterExtractResult = {
  product: ParsedProductFields;
  crop: NormalizedCrop;
};

type VisionConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
  extraHeaders: Record<string, string>;
};

type OpenRouterErrorBody = {
  error?: {
    message?: string;
    code?: number;
    metadata?: { raw?: string };
  };
  choices?: { message?: { content?: string } }[];
};

function isOpenRouterKey(apiKey: string): boolean {
  return apiKey.startsWith("sk-or-");
}

function visionConfig(): VisionConfig | null {
  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();
  const dashScopeKey = process.env.DASHSCOPE_API_KEY?.trim();
  const apiKey =
    openRouterKey ||
    process.env.OPENAI_API_KEY?.trim() ||
    dashScopeKey ||
    process.env.VISION_API_KEY?.trim();
  if (!apiKey) return null;

  const openRouter =
    Boolean(openRouterKey) || isOpenRouterKey(apiKey);

  const baseUrl = (
    process.env.OPENAI_BASE_URL?.trim() ||
    (openRouter
      ? "https://openrouter.ai/api/v1"
      : dashScopeKey
        ? "https://dashscope.aliyuncs.com/compatible-mode/v1"
        : "https://api.openai.com/v1")
  ).replace(/\/$/, "");

  const model =
    process.env.OPENAI_VISION_MODEL?.trim() ||
    (openRouter
      ? "qwen/qwen3-vl-30b-a3b-instruct"
      : dashScopeKey
        ? "qwen-vl-plus"
        : "gpt-4o-mini");

  const extraHeaders: Record<string, string> = {};
  if (openRouter || baseUrl.includes("openrouter.ai")) {
    const referer =
      process.env.OPENROUTER_HTTP_REFERER?.trim() ||
      process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
      "https://samgo.haylee.site";
    extraHeaders["HTTP-Referer"] = referer;
    extraHeaders["X-Title"] = "SamGo Admin Poster OCR";
  }

  return { apiKey, baseUrl, model, extraHeaders };
}

function visionModelCandidates(cfg: VisionConfig): string[] {
  const list = [cfg.model, ...OPENROUTER_VL_FALLBACKS];
  return [...new Set(list.filter(Boolean))];
}

function formatVisionApiError(
  status: number,
  body: OpenRouterErrorBody,
): string {
  const err = body.error;
  const raw = err?.metadata?.raw?.trim();
  const base = raw || err?.message || `识别服务错误 (${status})`;

  if (/not available in your region/i.test(base)) {
    return `${base}。请改用 qwen/qwen3-vl-30b-a3b-instruct 或 DASHSCOPE_API_KEY。`;
  }
  if (/no endpoints found/i.test(base)) {
    return `${base}。请设 OPENAI_VISION_MODEL=qwen/qwen3-vl-30b-a3b-instruct。`;
  }
  if (
    err?.code === 429 ||
    /rate-limit|rate limit|Provider returned error/i.test(base)
  ) {
    return `${base}（OpenRouter 限流或上游繁忙，已自动换模型重试；仍失败请稍后再试或在 OpenRouter 绑定自有 Key）`;
  }
  return base;
}

function isRetryableVisionError(status: number, body: OpenRouterErrorBody): boolean {
  const msg = body.error?.message ?? "";
  if (status === 429) return true;
  if (/Provider returned error|rate-limit|rate limit|timeout|overloaded/i.test(msg)) {
    return true;
  }
  const raw = body.error?.metadata?.raw ?? "";
  return /rate-limit|temporarily|retry shortly/i.test(raw);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callVisionChat(
  cfg: VisionConfig,
  model: string,
  dataUrl: string,
): Promise<{ ok: true; text: string } | { ok: false; status: number; body: OpenRouterErrorBody }> {
  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      "Content-Type": "application/json",
      ...cfg.extraHeaders,
    },
    body: JSON.stringify({
      model,
      ...(model.includes("qwen")
        ? {}
        : { response_format: { type: "json_object" } }),
      temperature: 0.1,
      max_tokens: 1200,
      messages: [
        { role: "system", content: SAMS_POSTER_SYSTEM },
        {
          role: "user",
          content: [
            { type: "text", text: "请识别这张山姆分享海报上的商品信息。" },
            {
              type: "image_url",
              image_url: { url: dataUrl, detail: "auto" },
            },
          ],
        },
      ],
    }),
  });

  const body = (await res.json()) as OpenRouterErrorBody;
  if (!res.ok) {
    return { ok: false, status: res.status, body };
  }

  const text = body.choices?.[0]?.message?.content?.trim();
  if (!text) {
    return {
      ok: false,
      status: 502,
      body: { error: { message: "识别结果为空" } },
    };
  }

  return { ok: true, text };
}

export function isPosterVisionConfigured(): boolean {
  return visionConfig() !== null;
}

export async function extractPosterFromImage(
  buffer: Buffer,
  contentType: string,
): Promise<PosterExtractResult> {
  const cfg = visionConfig();
  if (!cfg) {
    throw new Error("未配置 OPENAI_API_KEY，无法识别海报");
  }

  const prepared = await preparePosterVisionImage(buffer);
  const dataUrl = `data:${prepared.mime};base64,${prepared.buffer.toString("base64")}`;

  const models = cfg.baseUrl.includes("openrouter.ai")
    ? visionModelCandidates(cfg)
    : [cfg.model];

  let lastError = "识别失败";

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const result = await callVisionChat(cfg, model, dataUrl);
      if (result.ok) {
        return parseVisionText(result.text);
      }

      lastError = formatVisionApiError(result.status, result.body);
      if (!isRetryableVisionError(result.status, result.body)) {
        break;
      }
      await sleep(800 * (attempt + 1));
    }
  }

  throw new Error(lastError);
}

function parseVisionText(text: string): PosterExtractResult {
  let raw: RawVisionJson;
  try {
    raw = JSON.parse(text) as RawVisionJson;
  } catch {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fenced?.[1]?.trim() ?? text;
    try {
      raw = JSON.parse(candidate) as RawVisionJson;
    } catch {
      throw new Error("识别返回格式无效");
    }
  }

  let description =
    typeof raw.description === "string" ? raw.description.trim() : "";
  const suffix = "价格来自山姆分享海报，请以实际购买时为准。";
  if (description && !description.includes(suffix)) {
    description = `${description}；${suffix}`;
  } else if (!description) {
    description = suffix;
  }

  const parsed = parseProductPayload({
    name: raw.name,
    price: raw.price,
    category: raw.category,
    unit: raw.unit,
    description,
    image_url: null,
  });

  if (!parsed) {
    throw new Error("未能从海报中识别出有效的商品名称与价格，请改用手动新增");
  }

  const crop =
    parseNormalizedCrop(raw.product_crop) ?? fallbackSamsHeroCrop();

  return { product: parsed, crop };
}
