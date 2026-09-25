import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "samgo_admin";

/** 本地默认管理密码；生产请在环境变量 ADMIN_PASSWORD 覆盖 */
const DEFAULT_ADMIN_PASSWORD = "samgo187186";

function adminPassword(): string {
  const fromEnv = process.env.ADMIN_PASSWORD?.trim();
  if (fromEnv) return fromEnv.replace(/^["']|["']$/g, "");
  return DEFAULT_ADMIN_PASSWORD;
}

function adminToken(): string {
  return createHmac("sha256", adminPassword())
    .update("samgo-admin-v1")
    .digest("hex");
}

export function verifyAdminPassword(password: string): boolean {
  const expected = adminPassword();
  const a = Buffer.from(password.trim());
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function isAdminSession(): Promise<boolean> {
  const token = adminToken();
  if (!token) return false;
  const cookieStore = await cookies();
  const value = cookieStore.get(COOKIE_NAME)?.value;
  return value === token;
}

export async function setAdminSession(): Promise<void> {
  const token = adminToken();
  if (!token) return;
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
