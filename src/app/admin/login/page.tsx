import { adminLogin } from "./actions";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main style={styles.main}>
      <h1 style={styles.h1}>SamGo 商品库管理</h1>
      <p style={styles.muted}>仅团长使用</p>
      <form action={adminLogin} style={styles.form}>
        <label style={styles.label}>
          管理密码
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            style={styles.input}
          />
        </label>
        {error ? (
          <p style={styles.error}>密码错误</p>
        ) : null}
        <button type="submit" style={styles.button}>
          登录
        </button>
      </form>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: { maxWidth: 420, margin: "48px auto", padding: "0 16px", fontFamily: "system-ui" },
  h1: { fontSize: 22, marginBottom: 8 },
  muted: { color: "#64748b", fontSize: 14 },
  form: { marginTop: 24, display: "flex", flexDirection: "column", gap: 12 },
  label: { display: "flex", flexDirection: "column", gap: 6, fontSize: 14 },
  input: { padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1" },
  button: {
    marginTop: 8,
    padding: "12px",
    borderRadius: 8,
    border: "none",
    background: "#0060a9",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
  },
  error: { color: "#dc2626", fontSize: 14, margin: 0 },
};
