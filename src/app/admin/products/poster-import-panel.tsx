"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type PosterImportPanelProps = {
  onSaved: (productName: string) => void;
};

const CONFIG_HINT =
  "识图服务未配置：在 Vercel（Production）或本地 .env.local 设置 OPENROUTER_API_KEY / OPENAI_API_KEY（OpenRouter 的 sk-or-v1- 密钥会自动识别），或 DASHSCOPE_API_KEY；改完后重新部署或重启 dev。";

export function PosterImportPanel({ onSaved }: PosterImportPanelProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const previewObjectUrl = useRef<string | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [visionReady, setVisionReady] = useState<boolean | null>(null);
  const [uploadPosterAsImage, setUploadPosterAsImage] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/admin/vision-status", { credentials: "include" });
        const data = (await res.json()) as { configured?: boolean };
        if (!cancelled) {
          if (res.status === 401) {
            setVisionReady(null);
            return;
          }
          if (!res.ok) {
            setVisionReady(null);
            return;
          }
          setVisionReady(data.configured === true);
        }
      } catch {
        if (!cancelled) setVisionReady(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  function setPreviewFromFile(file: File) {
    if (previewObjectUrl.current) {
      URL.revokeObjectURL(previewObjectUrl.current);
    }
    const local = URL.createObjectURL(file);
    previewObjectUrl.current = local;
    setPreviewUrl(local);
    setSelectedFile(file);
  }

  function reset() {
    setError(null);
    setPreviewUrl(null);
    setSelectedFile(null);
    setVisionReady(null);
    setUploadPosterAsImage(false);
    if (previewObjectUrl.current) {
      URL.revokeObjectURL(previewObjectUrl.current);
      previewObjectUrl.current = null;
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    setPreviewFromFile(file);
  }

  async function recognize() {
    if (!selectedFile) {
      setError("请先选择山姆分享海报图片");
      return;
    }
    if (visionReady === false) {
      setError(CONFIG_HINT);
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const body = new FormData();
      body.append("file", selectedFile);
      body.append("upload_image", uploadPosterAsImage ? "true" : "false");

      const res = await fetch("/api/admin/extract-poster", {
        method: "POST",
        body,
        credentials: "include",
      });
      const data = (await res.json()) as {
        product?: { name?: string };
        saved?: boolean;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error ?? "识别失败");
      }
      if (!data.saved || !data.product?.name) {
        throw new Error("入库失败");
      }

      onSaved(data.product.name);
      setOpen(false);
      reset();
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "识别失败";
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        style={styles.secondaryButton}
        onClick={() => {
          reset();
          setOpen(true);
        }}
      >
        从山姆海报识别
      </button>

      {open ? (
        <div
          style={styles.overlay}
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) {
              setOpen(false);
              reset();
            }
          }}
        >
          <div style={styles.dialog} role="dialog" aria-modal="true">
            <h2 style={styles.title}>山姆海报识图</h2>
            <p style={styles.hint}>
              上传山姆 App 分享海报；识别后会裁切主图、写入商品库（已上架），无需再点保存。
            </p>

            {visionReady === false ? (
              <p style={styles.warn} role="status">
                {CONFIG_HINT}
              </p>
            ) : null}

            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              style={styles.hidden}
              onChange={handleFileChange}
            />
            <div style={styles.pickRow}>
              <button
                type="button"
                style={styles.pickButton}
                disabled={busy}
                onClick={() => fileRef.current?.click()}
              >
                {selectedFile ? "重新选择" : "选择海报图片"}
              </button>
              {selectedFile ? (
                <span style={styles.fileName} title={selectedFile.name}>
                  已选：{selectedFile.name}
                </span>
              ) : (
                <span style={styles.fileHint}>JPG / PNG / WebP / GIF，最大 5MB</span>
              )}
            </div>

            <label style={styles.checkRow}>
              <input
                type="checkbox"
                checked={uploadPosterAsImage}
                disabled={busy}
                onChange={(e) => setUploadPosterAsImage(e.target.checked)}
              />
              <span>不裁切，改用整张海报作为商品图（含二维码，一般不建议）</span>
            </label>

            {previewUrl ? (
              <img src={previewUrl} alt="海报预览" style={styles.preview} />
            ) : null}

            {error ? (
              <p style={styles.error} role="alert">
                {error}
              </p>
            ) : null}

            <div style={styles.actions}>
              <button
                type="button"
                style={styles.secondaryButton}
                disabled={busy}
                onClick={() => {
                  setOpen(false);
                  reset();
                }}
              >
                取消
              </button>
              <button
                type="button"
                style={{
                  ...styles.primaryButton,
                  ...(!selectedFile || busy || visionReady === false
                    ? styles.primaryButtonDisabled
                    : null),
                }}
                disabled={!selectedFile || busy || visionReady === false}
                onClick={() => void recognize()}
              >
                {busy ? "识别并入库中…" : "识别并入库"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  secondaryButton: {
    padding: "8px 14px",
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    background: "#fff",
    color: "#334155",
    cursor: "pointer",
    fontSize: 14,
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    zIndex: 60,
  },
  dialog: {
    width: "100%",
    maxWidth: 480,
    maxHeight: "92vh",
    overflow: "auto",
    background: "#fff",
    borderRadius: 12,
    padding: "20px 20px 16px",
    boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
  },
  title: { fontSize: 18, margin: "0 0 8px", fontWeight: 600 },
  hint: { margin: "0 0 16px", fontSize: 13, color: "#64748b", lineHeight: 1.5 },
  warn: {
    margin: "0 0 12px",
    padding: "10px 12px",
    borderRadius: 8,
    background: "#fffbeb",
    border: "1px solid #fde68a",
    color: "#92400e",
    fontSize: 13,
    lineHeight: 1.5,
  },
  hidden: { display: "none" },
  pickRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  pickButton: {
    padding: "8px 14px",
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    background: "#fff",
    cursor: "pointer",
    fontSize: 14,
  },
  fileName: {
    fontSize: 13,
    color: "#0369a1",
    maxWidth: "100%",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  fileHint: { fontSize: 12, color: "#64748b" },
  checkRow: {
    display: "flex",
    gap: 8,
    alignItems: "flex-start",
    fontSize: 13,
    color: "#475569",
    marginBottom: 12,
    lineHeight: 1.4,
  },
  preview: {
    maxWidth: "100%",
    maxHeight: 200,
    objectFit: "contain",
    borderRadius: 8,
    border: "1px solid #e2e8f0",
    marginBottom: 12,
  },
  error: { color: "#dc2626", fontSize: 14, margin: "0 0 12px", lineHeight: 1.5 },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "flex-end",
    marginTop: 8,
  },
  primaryButton: {
    padding: "8px 16px",
    borderRadius: 8,
    border: "none",
    background: "#0060a9",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: 14,
  },
  primaryButtonDisabled: {
    opacity: 0.45,
    cursor: "not-allowed",
  },
};
