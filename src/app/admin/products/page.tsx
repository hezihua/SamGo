import { redirect } from "next/navigation";
import { isAdminSession } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminLogout } from "./actions";
import { ProductsAdmin, type ProductRow } from "./products-client";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (!(await isAdminSession())) {
    redirect("/admin/login");
  }

  const { error } = await searchParams;

  let rows: ProductRow[] = [];
  let fetchError: { message: string } | null = null;
  let migrationHint = false;

  try {
    const admin = createAdminClient();
    const fullSelect =
      "id, name, price, category, unit, image_url, description, review_status, created_at, created_by, profiles(nickname)";
    let result = await admin
      .from("products")
      .select(fullSelect)
      .order("review_status", { ascending: true })
      .order("created_at", { ascending: false });

    if (
      result.error?.message?.includes("review_status") ||
      result.error?.message?.includes("does not exist")
    ) {
      migrationHint = true;
      result = await admin
        .from("products")
        .select("id, name, price, category, unit, image_url, description")
        .order("name", { ascending: true });
    }

    const { data: products, error: dbError } = result;

    if (dbError) {
      fetchError = dbError;
    } else {
      rows = (products ?? []).map((p) => ({
        ...(p as ProductRow),
        review_status:
          (p as ProductRow).review_status ?? ("approved" as const),
      }));
    }
  } catch (err) {
    fetchError = {
      message:
        err instanceof Error
          ? err.message
          : "无法连接 Supabase，请检查 Vercel 环境变量",
    };
  }

  return (
    <main style={styles.main}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.h1}>商品库管理</h1>
          <p style={styles.muted}>修改后，小程序拼单选购将使用最新价格</p>
        </div>
        <form action={adminLogout}>
          <button type="submit" style={styles.secondaryButton}>
            退出登录
          </button>
        </form>
      </header>

      {error === "invalid" ? (
        <p style={styles.error}>请填写有效的商品名称与价格</p>
      ) : null}
      {error === "save" ? (
        <p style={styles.error}>保存失败，请检查 Supabase 配置与数据</p>
      ) : null}
      {error === "delete" ? (
        <p style={styles.error}>删除失败，该商品可能仍被订单引用</p>
      ) : null}
      {fetchError ? (
        <p style={styles.error}>加载商品失败：{fetchError.message}</p>
      ) : null}
      {migrationHint ? (
        <p style={styles.warn}>
          尚未执行数据库迁移 007（缺少 review_status）。请在 Supabase → SQL
          Editor 运行{" "}
          <code style={styles.code}>supabase/migrations/007_product_review.sql</code>
          ，或在 .env.local 配置 SUPABASE_DB_URL 后执行{" "}
          <code style={styles.code}>pnpm db:apply:007</code>。执行前小程序商品审核功能不可用。
        </p>
      ) : null}

      <ProductsAdmin products={rows} />
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    maxWidth: 720,
    margin: "32px auto",
    padding: "0 16px 48px",
    fontFamily: "system-ui",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    marginBottom: 24,
  },
  h1: { fontSize: 22, margin: "0 0 8px" },
  muted: { color: "#64748b", fontSize: 14, margin: 0 },
  secondaryButton: {
    padding: "8px 14px",
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    background: "#fff",
    color: "#334155",
    cursor: "pointer",
    fontSize: 14,
  },
  error: { color: "#dc2626", fontSize: 14, margin: "0 0 16px" },
  warn: {
    color: "#92400e",
    fontSize: 13,
    margin: "0 0 16px",
    padding: "12px 14px",
    background: "#fffbeb",
    borderRadius: 8,
    border: "1px solid #fde68a",
    lineHeight: 1.5,
  },
  code: { fontSize: 12, fontFamily: "ui-monospace, monospace" },
};
