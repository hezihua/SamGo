"use client";

import { useRouter } from "next/navigation";
import { useState, type CSSProperties } from "react";

type RecognizePosterButtonProps = {
  productId: string;
  buttonStyle: CSSProperties;
  errorStyle: CSSProperties;
};

export function RecognizePosterButton({
  productId,
  buttonStyle,
  errorStyle,
}: RecognizePosterButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onRecognize() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/submissions/${productId}/recognize-poster`,
        { method: "POST" },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || "识图失败");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "识图失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <button
        type="button"
        style={buttonStyle}
        disabled={loading}
        onClick={() => void onRecognize()}
      >
        {loading ? "识图中…" : "识图填字段"}
      </button>
      {error ? <span style={errorStyle}>{error}</span> : null}
    </span>
  );
}
