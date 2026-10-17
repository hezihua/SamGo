/**
 * 结构化运维日志，便于在 Vercel → Logs / Log Drain 里按前缀告警。
 * 建议告警规则（Contains）：
 *   - [samgo:ops:vision_429]
 *   - [samgo:ops:oss_fail]
 */
export type OpsEventCategory =
  | "vision_429"
  | "vision_fail"
  | "oss_fail"
  | "oss_not_configured";

const OPS_PREFIX = "samgo:ops";

export function logOpsEvent(
  category: OpsEventCategory,
  message: string,
  detail?: Record<string, unknown>,
): void {
  const payload = {
    category,
    message,
    at: new Date().toISOString(),
    ...(detail ?? {}),
  };
  const line = `[${OPS_PREFIX}:${category}] ${JSON.stringify(payload)}`;
  if (category === "vision_429" || category === "oss_fail") {
    console.error(line);
    return;
  }
  console.warn(line);
}

export function logVisionApiFailure(
  status: number,
  formattedMessage: string,
  detail?: Record<string, unknown>,
): void {
  const is429 =
    status === 429 ||
    /rate-limit|rate limit|429|Provider returned error/i.test(formattedMessage);
  logOpsEvent(is429 ? "vision_429" : "vision_fail", formattedMessage, {
    httpStatus: status,
    ...detail,
  });
}

export function logOssUploadFailure(
  message: string,
  detail?: Record<string, unknown>,
): void {
  logOpsEvent("oss_fail", message, detail);
}

/** Vercel 日志告警用的固定搜索串（复制到 Dashboard → Alerts） */
export const VERCEL_LOG_ALERT_QUERIES = [
  "[samgo:ops:vision_429]",
  "[samgo:ops:oss_fail]",
] as const;
