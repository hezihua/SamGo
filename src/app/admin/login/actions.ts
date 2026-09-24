"use server";

import { RedirectType, redirect } from "next/navigation";
import {
  setAdminSession,
  verifyAdminPassword,
} from "@/lib/admin-auth";

export async function adminLogin(formData: FormData) {
  const password = String(formData.get("password") ?? "").trim();
  if (!verifyAdminPassword(password)) {
    redirect("/admin/login?error=1");
  }
  await setAdminSession();
  redirect("/admin/products", RedirectType.replace);
}
