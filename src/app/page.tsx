import { redirect } from "next/navigation";
import { isAdminSession } from "@/lib/admin-auth";

/** 本地 Web 仅用于商品库；根路径直达管理页 */
export default async function Home() {
  if (await isAdminSession()) {
    redirect("/admin/products");
  }
  redirect("/admin/login");
}
