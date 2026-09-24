"use client";

import { useRef, useState } from "react";

type ImageUploadFieldProps = {
  defaultUrl?: string | null;
};

export function ImageUploadField({ defaultUrl }: ImageUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState(defaultUrl ?? "");
  const [previewUrl, setPreviewUrl] = useState(defaultUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);

    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

    try {
      const body = new FormData();
      body.append("file", file);

      const res = await fetch("/api/admin/upload-image", {
        method: "POST",
        body,
        credentials: "include",
      });

      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "\u4e0a\u4f20\u5931\u8d25");
      }
      if (!data.url) {
        throw new Error("\u4e0a\u4f20\u5931\u8d25");
      }

      setImageUrl(data.url);
      setPreviewUrl(data.url);
    } catch (err) {
      const message = err instanceof Error ? err.message : "\u4e0a\u4f20\u5931\u8d25";
      setError(message);
      setImageUrl(defaultUrl ?? "");
      setPreviewUrl(defaultUrl ?? "");
    } finally {
      URL.revokeObjectURL(localPreview);
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  return (
    <div style={styles.wrap}>
      <span style={styles.labelText}>{"\u5546\u54c1\u56fe\u7247"}</span>
      <input type="hidden" name="image_url" value={imageUrl} />
      <div style={styles.row}>
        <button
          type="button"
          style={styles.pickButton}
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? "\u4e0a\u4f20\u4e2d\u2026" : "\u9009\u62e9\u56fe\u7247"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          style={styles.hiddenFile}
          onChange={handleFileChange}
        />
        {imageUrl ? (
          <span style={styles.hint}>{"\u5df2\u8bbe\u7f6e\u56fe\u7247\u5730\u5740"}</span>
        ) : (
          <span style={styles.hintMuted}>
            {"\u53ef\u9009\uff0cJPG / PNG / WebP / GIF\uff0c\u6700\u5927 5MB"}
          </span>
        )}
      </div>
      {error ? (
        <p style={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      {previewUrl ? (
        <img
          src={previewUrl}
          alt={"\u5546\u54c1\u56fe\u7247\u9884\u89c8"}
          style={styles.preview}
        />
      ) : null}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { display: "flex", flexDirection: "column", gap: 6, fontSize: 14 },
  labelText: { fontSize: 14 },
  row: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  hiddenFile: { display: "none" },
  pickButton: {
    padding: "8px 14px",
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    background: "#fff",
    color: "#334155",
    cursor: "pointer",
    fontSize: 14,
  },
  hint: { fontSize: 12, color: "#0369a1" },
  hintMuted: { fontSize: 12, color: "#64748b" },
  error: { margin: 0, fontSize: 13, color: "#dc2626" },
  preview: {
    marginTop: 4,
    maxWidth: "100%",
    maxHeight: 160,
    objectFit: "contain",
    borderRadius: 8,
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
  },
};
