"use client";

import { useCallback, useEffect, useState } from "react";
import { createProduct, deleteProduct, updateProduct } from "./actions";
import { ImageUploadField } from "./image-upload-field";

export type ProductRow = {
  id: string;
  name: string;
  price: number;
  category: string;
  unit: string;
  image_url: string | null;
  description: string | null;
};

type ModalState = { mode: "add" } | { mode: "edit"; product: ProductRow } | null;

type ProductsAdminProps = {
  products: ProductRow[];
};

export function ProductsAdmin({ products }: ProductsAdminProps) {
  const [modal, setModal] = useState<ModalState>(null);

  const closeModal = useCallback(() => setModal(null), []);

  useEffect(() => {
    if (!modal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modal, closeModal]);

  return (
    <section style={styles.section}>
      <div style={styles.toolbar}>
        <span style={styles.count}>共 {products.length} 件商品</span>
        <button
          type="button"
          style={styles.primaryButton}
          onClick={() => setModal({ mode: "add" })}
        >
          新增商品
        </button>
      </div>
      <ul style={styles.list}>
        {products.map((product) => (
          <li key={product.id} style={styles.row}>
            <div style={styles.rowMain}>
              <span style={styles.rowName}>{product.name}</span>
              <span style={styles.rowPrice}>¥{product.price}</span>
              <span style={styles.tag}>{product.category}</span>
            </div>
            <button
              type="button"
              style={styles.secondaryButton}
              onClick={() => setModal({ mode: "edit", product })}
            >
              编辑
            </button>
          </li>
        ))}
      </ul>

      {products.length === 0 ? (
        <p style={styles.empty}>暂无商品，点击「新增商品」添加</p>
      ) : null}

      {modal ? (
        <div
          style={styles.overlay}
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div style={styles.dialog} role="dialog" aria-modal="true">
            {modal.mode === "add" ? (
              <ProductForm
                title="新增商品"
                onCancel={closeModal}
                action={createProduct}
              />
            ) : (
              <ProductForm
                title="编辑商品"
                product={modal.product}
                onCancel={closeModal}
                action={updateProduct}
                onDelete={deleteProduct}
              />
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

type ProductFormProps = {
  title: string;
  product?: ProductRow;
  onCancel: () => void;
  action: (formData: FormData) => Promise<void>;
  onDelete?: (formData: FormData) => Promise<void>;
};
function ProductForm(props: ProductFormProps) {
  const { title, product, onCancel, action, onDelete } = props;
  const handleDelete = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!onDelete || !product) return;
    const msg = "\u786e\u5b9a\u5220\u9664\u300c" + product.name + "\u300d\uff1f\u6b64\u64cd\u4f5c\u4e0d\u53ef\u6062\u590d\u3002";
    if (!window.confirm(msg)) e.preventDefault();
  };

  return (
    <>
      <h2 style={styles.dialogTitle}>{title}</h2>
      <form action={action} style={styles.form}>
        {product ? <input type="hidden" name="id" value={product.id} /> : null}
        <label style={styles.label}>
          名称
          <input
            name="name"
            required
            defaultValue={product?.name ?? ""}
            style={styles.input}
          />
        </label>
        <label style={styles.label}>
          价格（元）
          <input
            name="price"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={product?.price ?? ""}
            style={styles.input}
          />
        </label>
        <label style={styles.label}>
          分类
          <input
            name="category"
            defaultValue={product?.category ?? "\u5176\u4ed6"}
            style={styles.input}
          />
        </label>
        <label style={styles.label}>
          单位
          <input
            name="unit"
            defaultValue={product?.unit ?? "\u4ef6"}
            style={styles.input}
          />
        </label>
        <ImageUploadField defaultUrl={product?.image_url} />
        <label style={styles.label}>
          描述
          <textarea
            name="description"
            rows={3}
            defaultValue={product?.description ?? ""}
            style={styles.textarea}
          />
        </label>
        <div style={styles.formActions}>
          {onDelete && product ? (
            <button
              type="submit"
              formAction={onDelete}
              style={styles.dangerButton}
              onClick={handleDelete}
            >
              删除
            </button>
          ) : null}
          <div style={styles.formActionsRight}>
            <button type="button" style={styles.secondaryButton} onClick={onCancel}>
              取消
            </button>
            <button type="submit" style={styles.primaryButton}>保存</button>
          </div>
        </div>
      </form>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: { fontFamily: "system-ui" },
  toolbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  count: { fontSize: 14, color: "#64748b" },
  list: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    padding: "12px 14px",
    borderRadius: 10,
    border: "1px solid #e2e8f0",
    background: "#fff",
  },
  rowMain: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "8px 12px",
    minWidth: 0,
    flex: 1,
  },
  rowName: { fontWeight: 600, fontSize: 15 },
  rowPrice: { fontSize: 15, color: "#0060a9", fontWeight: 600 },
  tag: {
    fontSize: 12,
    padding: "2px 8px",
    borderRadius: 999,
    background: "#e0f2fe",
    color: "#0369a1",
  },
  empty: { color: "#64748b", fontSize: 14, textAlign: "center", marginTop: 24 },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    zIndex: 50,
  },
  dialog: {
    width: "100%",
    maxWidth: 440,
    maxHeight: "90vh",
    overflow: "auto",
    background: "#fff",
    borderRadius: 12,
    padding: "20px 20px 16px",
    boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
  },
  dialogTitle: { fontSize: 18, margin: "0 0 16px", fontWeight: 600 },
  form: { display: "flex", flexDirection: "column", gap: 12 },
  label: { display: "flex", flexDirection: "column", gap: 6, fontSize: 14 },
  input: {
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    fontSize: 14,
  },
  textarea: {
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    fontSize: 14,
    resize: "vertical",
    fontFamily: "inherit",
  },
  formActions: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    gap: 8,
  },
  formActionsRight: { display: "flex", gap: 8, marginLeft: "auto" },
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
  secondaryButton: {
    padding: "8px 14px",
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    background: "#fff",
    color: "#334155",
    cursor: "pointer",
    fontSize: 14,
  },
  dangerButton: {
    padding: "8px 14px",
    borderRadius: 8,
    border: "1px solid #fecaca",
    background: "#fff",
    color: "#dc2626",
    cursor: "pointer",
    fontSize: 14,
  },
};

