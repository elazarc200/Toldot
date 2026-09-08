/**
 * Apply Phase 0 migration via Postgres using DATABASE_URL or
 * constructed URI from SUPABASE_DB_PASSWORD. Never logs secrets.
 */
const fs = require("node:fs");
const path = require("node:path");
const dotenv = require("dotenv");

dotenv.config({ path: ".env.local", override: true, quiet: true });

function loadEnvMap() {
  const text = fs.readFileSync(".env.local", "utf8");
  const map = {};
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i <= 0) continue;
    map[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return map;
}

async function main() {
  const map = loadEnvMap();
  const url = map.NEXT_PUBLIC_SUPABASE_URL;
  const service = map.SUPABASE_SERVICE_ROLE_KEY;
  const refMatch = (url || "").match(/^https:\/\/([a-z0-9]+)\.supabase\.co/i);
  const projectRef = refMatch ? refMatch[1] : null;

  console.log("TARGET_HOST=" + (url ? new URL(url).hostname : "MISSING"));
  console.log("TARGET_REF=" + (projectRef || "UNKNOWN"));
  console.log("SERVICE_ROLE=" + (service ? "SET" : "MISSING"));
  console.log(
    "ANON_PREFIX=" +
      ((map.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").startsWith("sb_publishable_")
        ? "publishable"
        : (map.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").startsWith("sb_secret_")
          ? "secret_WRONG_SLOT"
          : map.NEXT_PUBLIC_SUPABASE_ANON_KEY
            ? "other"
            : "missing"),
  );

  // Quick Auth admin probe (proves service role works) — no user dump.
  const { createClient } = require("@supabase/supabase-js");
  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
  if (error) {
    console.log("SERVICE_ROLE_AUTH_ADMIN=FAIL");
    console.log("SERVICE_ROLE_AUTH_ADMIN_CODE=" + (error.code || "unknown"));
    process.exitCode = 1;
    return;
  }
  console.log("SERVICE_ROLE_AUTH_ADMIN=OK");
  console.log("AUTH_USER_COUNT_PAGE1=" + (data.users?.length ?? 0));

  // Probe schema via service role (bypasses RLS)
  for (const table of [
    "editorial_capabilities",
    "editorial_roles",
    "role_capabilities",
    "editorial_memberships",
  ]) {
    const { error: tErr } = await admin.from(table).select("*", { count: "exact", head: true });
    console.log(
      `TABLE_${table}=` +
        (tErr
          ? tErr.message.includes("Could not find")
            ? "MISSING"
            : "ERROR"
          : "EXISTS"),
    );
  }
}

main().catch((e) => {
  console.log("FATAL=" + e.message);
  process.exit(1);
});
