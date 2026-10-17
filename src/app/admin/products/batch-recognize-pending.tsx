"use client";

import { useRouter } from "next/navigation";
import { useState, type CSSProperties } from "react";

const BATCH_GAP_MS = 1500;

type BatchRecognizePendingProps = {
  productIds: string[];
  buttonStyle: CSSProperties;
  statusStyle: CSSProperties;
};

export function BatchRecognizePending({
  productIds,
  buttonStyle,
  statusStyle,
}: BatchRecognizePendingProps) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function sleep(ms: number) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function onBatchRecognize() {
    if (running || productIds.length === 0) return;
    const msg = `将按顺序识图 ${productIds.length} 条待审海报（间隔 ${BATCH_GAP_MS / 1000}s，降低限流风险），继续？`;
    if (!window.confirm(msg)) return;

    setRunning(true);
    setStatus(`0 / ${productIds.length}`);
    const errors: string[] = [];
    let ok = 0;

    for (let i = 0; i < productIds.length; i++) {
      const id = productIds[i];
      setStatus(`${i + 1} / ${productIds.length} 识图中…`);
      try {
        const res = await fetch(
          `/api/admin/submissions/${id}/recognize-poster`,
          { method: "POST", credentials: "include" },
        );
        const data = (await res.json()) as {
          error?: string;
          duplicate_hints?: { name: string }[];
        };
        if (!res.ok) {
          errors.push(data.error || `第 ${i + 1} 条失败`);
        } else {
          ok += 1;
          if (data.duplicate_hints?.length) {
            errors.push(
              `第 ${i + 1} 条：可能有重复「${data.duplicate_hints[0]?.name ?? ""}」`,
            );
          }
        }
      } catch {
        errors.push(`第 ${i + 1} 条网络失败`);
      }
      if (i < productIds.length - 1) {
        await sleep(BATCH_GAP_MS);
      }
    }

    setRunning(false);
    if (errors.length > 0) {
      setStatus(`完成：成功 ${ok}，注意 ${errors.length} 条\n${errors.slice(0, 3).join("；")}`);
    } else {
      setStatus(`已全部识图完成（${ok} 条）`);
    }
    router.refresh();
  }

  if (productIds.length === 0) return null;

  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: 6 }}>
      <button
        type="button"
        style={buttonStyle}
        disabled={running}
        onClick={() => void onBatchRecognize()}
      >
        {running ? "批量识图中…" : `批量识图（${productIds.length}）`}
      </button>
      {status ? (
        <span style={statusStyle}>{status}</span>
      ) : null}
    </span>
  );
}
