"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createProduct,
  deleteProduct,
  deleteProductsBatch,
  rejectProduct,
  updateProduct,
} from "./actions";
import { ApproveProductForm } from "./approve-product-form";
import { BatchRecognizePending } from "./batch-recognize-pending";
import { ImageUploadField } from "./image-upload-field";
import { isPosterSubmissionPlaceholder } from "@/lib/product-fields";
import { RecognizePosterButton } from "./pending-poster-actions";
import { PosterImportPanel } from "./poster-import-panel";

export type ProductRow = {
  id: string;
  name: string;
  price: number;
  category: string;
  unit: string;
  image_url: string | null;
  description: string | null;
  search_aliases?: string | null;
  poster_url?: string | null;
  review_status: "approved" | "pending" | "rejected";
  review_note?: string | null;
  created_at?: string;
  profiles?: { nickname: string | null } | null;
};

export type ProductDraft = Pick<
  ProductRow,
  | "name"
  | "price"
  | "category"
  | "unit"
  | "image_url"
  | "description"
  | "search_aliases"
>;

type ModalState =
  | { mode: "add"; draft?: ProductDraft }
  | { mode: "edit"; product: ProductRow }
  | null;
type AdminTab = "pending" | "approved";

type ProductsAdminProps = {
  products: ProductRow[];
};

export function ProductsAdmin({ products }: ProductsAdminProps) {
  const [modal, setModal] = useState<ModalState>(null);
  const pending = products.filter((p) => p.review_status === "pending");
  const approved = products.filter((p) => p.review_status === "approved");
  const rejected = products.filter((p) => p.review_status === "rejected");
  const [tab, setTab] = useState<AdminTab>("approved");
  const [savedFlash, setSavedFlash] = useState<string | null>(null);
  const [selectedApproved, setSelectedApproved] = useState<Record<string, true>>(
    {},
  );

  const closeModal = useCallback(() => setModal(null), []);

  const selectedApprovedIds = Object.keys(selectedApproved);
  const selectedApprovedCount = selectedApprovedIds.length;
  const allApprovedSelected =
    approved.length > 0 && selectedApprovedCount === approved.length;

  function toggleApprovedSelect(id: string) {
    setSelectedApproved((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = true;
      return next;
    });
  }

  function toggleSelectAllApproved() {
    if (allApprovedSelected) {
      setSelectedApproved({});
      return;
    }
    const next: Record<string, true> = {};
    for (const p of approved) {
      next[p.id] = true;
    }
    setSelectedApproved(next);
  }

  function confirmBatchDelete(e: React.FormEvent<HTMLFormElement>) {
    if (selectedApprovedCount === 0) {
      e.preventDefault();
      return;
    }
    const msg = `确定删除已选 ${selectedApprovedCount} 个已上架商品？此操作不可恢复。`;
    if (!window.confirm(msg)) {
      e.preventDefault();
    }
  }

  useEffect(() => {
    if (!modal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modal, closeModal]);

  const pendingTabCount = pending.length + rejected.length;

  return (
    <section style={styles.section}>
      <div style={styles.toolbar}>
        <div style={styles.tabBar} role="tablist" aria-label="商品分类">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "pending"}
            style={{
              ...styles.tab,
              ...(tab === "pending" ? styles.tabActive : null),
            }}
            onClick={() => {
              setTab("pending");
              setSelectedApproved({});
            }}
          >
            待审核
            {pendingTabCount > 0 ? (
              <span style={styles.tabBadge}>{pendingTabCount}</span>
            ) : null}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "approved"}
            style={{
              ...styles.tab,
              ...(tab === "approved" ? styles.tabActive : null),
            }}
            onClick={() => setTab("approved")}
          >
            已上架
            {approved.length > 0 ? (
              <span style={styles.tabCount}>{approved.length}</span>
            ) : null}
          </button>
        </div>
        <div style={styles.toolbarActions}>
          <PosterImportPanel
            onSaved={(name) => {
              setSavedFlash(`已入库：${name}`);
              setTab("approved");
            }}
          />
          <button
            type="button"
            style={styles.primaryButton}
            onClick={() => setModal({ mode: "add" })}
          >
            新增商品
          </button>
        </div>
      </div>

      {savedFlash ? (
        <p style={styles.savedFlash} role="status">
          {savedFlash}
        </p>
      ) : null}

      {tab === "pending" ? (
        <>
          <p style={styles.tabHint}>
            小程序用户上传山姆分享海报后在此审核：先点「识图填字段」，确认无误再通过；通过后进入「已上架」。
          </p>
          {pending.length === 0 && rejected.length === 0 ? (
            <p style={styles.empty}>暂无待审核商品</p>
          ) : null}
          {pending.length > 0 ? (
            <>
              <div style={styles.pendingToolbar}>
                <h3 style={styles.sectionTitleInline}>待审核（{pending.length}）</h3>
                <BatchRecognizePending
                  productIds={pending
                    .filter((p) => isPosterSubmissionPlaceholder(p))
                    .map((p) => p.id)}
                  buttonStyle={styles.secondaryButton}
                  statusStyle={styles.batchStatus}
                />
              </div>
              <ul style={styles.list}>
                {pending.map((product) => {
                  const posterPending = isPosterSubmissionPlaceholder(product);
                  const posterPreview =
                    product.poster_url?.trim() ||
                    product.image_url?.trim() ||
                    "";
                  return (
                  <li key={product.id} style={styles.rowPending}>
                    <div style={styles.pendingTop}>
                      {posterPreview ? (
                        <a
                          href={posterPreview}
                          target="_blank"
                          rel="noreferrer"
                          style={styles.posterLink}
                          title="查看分享海报"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={posterPreview}
                            alt=""
                            style={styles.posterThumb}
                          />
                        </a>
                      ) : null}
                      <div style={styles.rowMain}>
                        <span style={styles.rowName}>
                          {posterPending ? "山姆分享海报（待识图）" : product.name}
                        </span>
                        {!posterPending ? (
                          <>
                            <span style={styles.rowPrice}>¥{product.price}</span>
                            <span style={styles.tag}>{product.category}</span>
                          </>
                        ) : (
                          <span style={styles.tagMuted}>上传海报 · 待识图</span>
                        )}
                        <span style={styles.submitter}>
                          提交人：{product.profiles?.nickname?.trim() || "微信用户"}
                        </span>
                        {product.poster_url && product.image_url && product.poster_url !== product.image_url ? (
                          <a
                            href={product.poster_url}
                            target="_blank"
                            rel="noreferrer"
                            style={styles.posterUrlLink}
                          >
                            原分享海报
                          </a>
                        ) : null}
                      </div>
                    </div>
                    <div style={styles.reviewActions}>
                      {posterPending ? (
                        <RecognizePosterButton
                          productId={product.id}
                          buttonStyle={styles.primaryButton}
                          errorStyle={styles.recognizeError}
                        />
                      ) : (
                        <ApproveProductForm
                          productId={product.id}
                          buttonStyle={styles.primaryButton}
                        />
                      )}
                      <form action={rejectProduct} style={styles.rejectForm}>
                        <input type="hidden" name="id" value={product.id} />
                        <input
                          type="text"
                          name="review_note"
                          placeholder="驳回原因（可选）"
                          style={styles.rejectNoteInput}
                          maxLength={500}
                        />
                        <button type="submit" style={styles.dangerButton}>
                          驳回
                        </button>
                      </form>
                      <button
                        type="button"
                        style={styles.secondaryButton}
                        onClick={() => setModal({ mode: "edit", product })}
                      >
                        编辑
                      </button>
                    </div>
                  </li>
                  );
                })}
              </ul>
            </>
          ) : null}
          {rejected.length > 0 ? (
            <>
              <h3 style={styles.sectionTitleMuted}>已驳回（{rejected.length}）</h3>
              <ul style={styles.list}>
                {rejected.map((product) => (
                  <li key={product.id} style={styles.rowMuted}>
                    <div style={styles.rowMain}>
                      <span style={styles.rowName}>{product.name}</span>
                      {product.review_note ? (
                        <span style={styles.submitter}>原因：{product.review_note}</span>
                      ) : null}
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
            </>
          ) : null}
        </>
      ) : (
        <>
          {approved.length === 0 ? (
            <p style={styles.empty}>暂无已上架商品，点击「新增商品」添加</p>
          ) : (
            <>
              <div style={styles.batchBar}>
                <label style={styles.batchSelectAll}>
                  <input
                    type="checkbox"
                    checked={allApprovedSelected}
                    onChange={toggleSelectAllApproved}
                    aria-label="全选已上架商品"
                  />
                  <span>全选</span>
                </label>
                <span style={styles.batchMeta}>
                  {selectedApprovedCount > 0
                    ? `已选 ${selectedApprovedCount} 项`
                    : "勾选后可批量操作"}
                </span>
                <form
                  action={deleteProductsBatch}
                  style={styles.batchDeleteForm}
                  onSubmit={confirmBatchDelete}
                >
                  <input
                    type="hidden"
                    name="ids"
                    value={selectedApprovedIds.join(",")}
                  />
                  <button
                    type="submit"
                    style={{
                      ...styles.dangerButton,
                      ...(selectedApprovedCount === 0
                        ? styles.batchButtonDisabled
                        : null),
                    }}
                    disabled={selectedApprovedCount === 0}
                  >
                    批量删除
                  </button>
                </form>
              </div>
              <ul style={styles.list}>
                {approved.map((product) => (
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
                    <label style={styles.rowCheck} title="加入批量操作">
                      <input
                        type="checkbox"
                        checked={Boolean(selectedApproved[product.id])}
                        onChange={() => toggleApprovedSelect(product.id)}
                        aria-label={`选择 ${product.name}`}
                      />
                    </label>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}

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
                key={modal.draft?.name ?? "add"}
                title={modal.draft ? "新增商品（海报识别）" : "新增商品"}
                draft={modal.draft}
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
  draft?: ProductDraft;
  onCancel: () => void;
  action: (formData: FormData) => Promise<void>;
  onDelete?: (formData: FormData) => Promise<void>;
};
function ProductForm(props: ProductFormProps) {
  const { title, product, draft, onCancel, action, onDelete } = props;
  const values = product ?? draft;
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
            defaultValue={values?.name ?? ""}
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
            defaultValue={values?.price ?? ""}
            style={styles.input}
          />
        </label>
        <label style={styles.label}>
          分类
          <input
            name="category"
            defaultValue={values?.category ?? "\u5176\u4ed6"}
            style={styles.input}
          />
        </label>
        <label style={styles.label}>
          单位
          <input
            name="unit"
            defaultValue={values?.unit ?? "\u4ef6"}
            style={styles.input}
          />
        </label>
        <ImageUploadField defaultUrl={values?.image_url} />
        <label style={styles.label}>
          描述
          <textarea
            name="description"
            rows={3}
            defaultValue={values?.description ?? ""}
            style={styles.textarea}
          />
        </label>
        <label style={styles.label}>
          搜索别名
          <input
            name="search_aliases"
            placeholder="逗号分隔，如：香蕉,蕉（留空则按名称自动推断）"
            defaultValue={values?.search_aliases ?? ""}
            style={styles.input}
          />
        </label>
        {product?.poster_url ? (
          <p style={styles.posterUrlReadonly}>
            分享海报：
            <a href={product.poster_url} target="_blank" rel="noreferrer">
              打开原图
            </a>
          </p>
        ) : null}
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
    marginBottom: 12,
    gap: 12,
    flexWrap: "wrap",
  },
  toolbarActions: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  savedFlash: {
    margin: "0 0 12px",
    padding: "10px 12px",
    borderRadius: 8,
    background: "#ecfdf5",
    color: "#047857",
    fontSize: 14,
  },
  tabBar: {
    display: "flex",
    gap: 4,
    padding: 4,
    background: "#f1f5f9",
    borderRadius: 10,
  },
  tab: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 16px",
    borderRadius: 8,
    border: "none",
    background: "transparent",
    color: "#64748b",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  tabActive: {
    background: "#fff",
    color: "#0060a9",
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
  },
  tabBadge: {
    minWidth: 20,
    padding: "2px 7px",
    borderRadius: 999,
    background: "#f59e0b",
    color: "#fff",
    fontSize: 12,
    fontWeight: 700,
    lineHeight: 1.3,
    textAlign: "center",
  },
  tabCount: {
    fontSize: 12,
    fontWeight: 600,
    color: "#94a3b8",
  },
  tabHint: {
    margin: "0 0 12px",
    fontSize: 13,
    color: "#64748b",
    lineHeight: 1.5,
  },
  list: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 600,
    margin: "20px 0 10px",
    color: "#0f172a",
  },
  sectionTitleMuted: {
    fontSize: 14,
    fontWeight: 600,
    margin: "24px 0 8px",
    color: "#94a3b8",
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
  batchBar: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "12px 16px",
    marginBottom: 12,
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
  },
  batchSelectAll: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontSize: 14,
    color: "#334155",
    cursor: "pointer",
    userSelect: "none",
  },
  batchMeta: {
    flex: 1,
    minWidth: 120,
    fontSize: 13,
    color: "#64748b",
  },
  batchDeleteForm: {
    margin: 0,
  },
  batchButtonDisabled: {
    opacity: 0.45,
    cursor: "not-allowed",
  },
  rowCheck: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    width: 36,
    height: 36,
    cursor: "pointer",
  },
  rowPending: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    padding: "12px 14px",
    borderRadius: 10,
    border: "1px solid #fde68a",
    background: "#fffbeb",
  },
  pendingTop: {
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
  },
  posterLink: {
    flexShrink: 0,
    lineHeight: 0,
  },
  posterThumb: {
    width: 72,
    height: 128,
    objectFit: "cover",
    borderRadius: 8,
    border: "1px solid #e2e8f0",
    background: "#fff",
  },
  tagMuted: {
    fontSize: 12,
    padding: "2px 8px",
    borderRadius: 999,
    background: "#fef3c7",
    color: "#92400e",
  },
  recognizeError: {
    fontSize: 12,
    color: "#b91c1c",
    maxWidth: 220,
  },
  pendingToolbar: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  sectionTitleInline: {
    margin: 0,
    fontSize: 16,
    fontWeight: 600,
  },
  batchStatus: {
    fontSize: 12,
    color: "#64748b",
    maxWidth: 360,
    whiteSpace: "pre-line",
  },
  posterUrlLink: {
    width: "100%",
    fontSize: 12,
    color: "#0369a1",
  },
  posterUrlReadonly: {
    margin: "0 0 12px",
    fontSize: 13,
    color: "#64748b",
  },
  rowMuted: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    opacity: 0.85,
  },
  reviewActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  rejectForm: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
    maxWidth: 320,
  },
  rejectNoteInput: {
    flex: "1 1 180px",
    minWidth: 140,
    padding: "8px 10px",
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    fontSize: 13,
  },
  submitter: {
    width: "100%",
    fontSize: 12,
    color: "#64748b",
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

