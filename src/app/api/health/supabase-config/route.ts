import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const serviceRoleKeyDynamic =
    process.env["SUPABASE_SERVICE_ROLE_KEY"];

  return NextResponse.json({
    hasPublicUrl: Boolean(url?.trim()),
    hasServiceRoleKey: Boolean(serviceRoleKey?.trim()),
    hasServiceRoleKeyDynamic: Boolean(serviceRoleKeyDynamic?.trim()),
    nodeEnv: process.env.NODE_ENV,
  });
}
