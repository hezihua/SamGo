#!/usr/bin/env node
/**
 * Apply a local SQL migration file when SUPABASE_DB_URL is set in .env.local.
 * Dashboard path: Project Settings → Database → Connection string (URI).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function loadEnvLocal() {
  const envPath = path.join(root, ".env.local");
  if (!fs.existsSync(envPath)) return {};
  const text = fs.readFileSync(envPath, "utf8");
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error("Usage: node scripts/apply-supabase-migration.mjs <sql-file>");
  process.exit(2);
}

const sqlPath = path.isAbsolute(migrationFile)
  ? migrationFile
  : path.join(root, migrationFile);
if (!fs.existsSync(sqlPath)) {
  console.error("SQL file not found:", sqlPath);
  process.exit(1);
}

const env = loadEnvLocal();
const dbUrl = env.SUPABASE_DB_URL || env.DATABASE_URL || process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error(
    "Missing SUPABASE_DB_URL in .env.local (Supabase → Settings → Database → URI).\n" +
      "Or run the SQL manually in Supabase SQL Editor:\n" +
      sqlPath,
  );
  process.exit(1);
}

const sql = fs.readFileSync(sqlPath, "utf8");
const { default: pg } = await import("pg");
const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  await client.query(sql);
  console.log("OK: applied", path.relative(root, sqlPath));
} catch (err) {
  console.error("Migration failed:", err.message);
  process.exit(1);
} finally {
  await client.end();
}
