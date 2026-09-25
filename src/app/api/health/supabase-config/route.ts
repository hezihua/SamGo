import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  return NextResponse.json({
    hasPublicUrl: Boolean(url?.trim()),
    hasAnonKey: Boolean(anonKey?.trim()),
    hasServiceRoleKey: Boolean(serviceRoleKey?.trim()),
  });
}
