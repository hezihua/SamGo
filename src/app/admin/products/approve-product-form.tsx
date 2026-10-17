"use client";

import { useRef, useState, type CSSProperties } from "react";
import { approveProduct } from "./actions";

type DuplicateHint = {
  name: string;
  price: number;
  reason: string;
};

type ApproveProductFormProps = {
  productId: string;
  buttonStyle: CSSProperties;
};

export function ApproveProductForm({
  productId,
  buttonStyle,
}: ApproveProductFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const forceRef = useRef<HTMLInputElement>(null);
  const [checking, setChecking] = useState(false);

  async function onApproveClick() {
    if (checking) return;
    setChecking(true);
    try {
      const res = await fetch(
        `/api/admin/products/duplicate-check?excludeId=${encodeURIComponent(productId)}`,
        { credentials: "include" },
      );
      const data = (await res.json()) as { hints?: DuplicateHint[]; error?: string };
      if (!res.ok) {
        window.alert(data.error || "检查重复失败");
        return;
      }
      const hints = data.hints ?? [];
      if (hints.length > 0) {
        const msg = [
          "库中可能有相似商品，仍要通过？",
          ...hints.map((h) => `· ${h.name} ¥${h.price}（${h.reason}）`),
        ].join("\n");
        if (!window.confirm(msg)) return;
        if (forceRef.current) forceRef.current.value = "1";
      } else if (forceRef.current) {
        forceRef.current.value = "";
      }
      formRef.current?.requestSubmit();
    } finally {
      setChecking(false);
    }
  }

  return (
    <form ref={formRef} action={approveProduct}>
      <input type="hidden" name="id" value={productId} />
      <input type="hidden" name="force_approve" ref={forceRef} defaultValue="" />
      <button
        type="button"
        style={buttonStyle}
        disabled={checking}
        onClick={() => void onApproveClick()}
      >
        {checking ? "检查中…" : "通过"}
      </button>
    </form>
  );
}
