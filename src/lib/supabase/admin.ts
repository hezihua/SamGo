import { createClient } from "@supabase/supabase-js";

function readEnv(name: string): string {
  const value = process.env[name];
  return typeof value === "string" ? value.trim() : "";
}

export function createAdminClient() {
  const url =
    readEnv("NEXT_PUBLIC_SUPABASE_URL") || readEnv("SUPABASE_URL");
  const serviceRoleKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!url && !serviceRoleKey) {
    throw new Error(
      "Missing Supabase server config (NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)",
    );
  }
  if (!url) {
    throw new Error("Missing Supabase config (NEXT_PUBLIC_SUPABASE_URL)");
  }
  if (!serviceRoleKey) {
    throw new Error("Missing Supabase server config (SUPABASE_SERVICE_ROLE_KEY)");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
