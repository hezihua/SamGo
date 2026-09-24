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
  const admin = createAdminClient();
  const { data: products, error: fetchError } = await admin
    .from("products")
    .select("id, name, price, category, unit, image_url, description")
    .order("name", { ascending: true });

  const rows = (products ?? []) as ProductRow[];

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
};
