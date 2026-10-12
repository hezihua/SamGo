import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin-auth";
import { isPosterVisionConfigured } from "@/lib/sams-poster-vision";

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  return NextResponse.json({ configured: isPosterVisionConfigured() });
}
