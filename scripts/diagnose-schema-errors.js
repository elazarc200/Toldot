const fs = require("node:fs");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");
dotenv.config({ path: ".env.local", override: true, quiet: true });

function envMap() {
  const map = {};
  for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i > 0) map[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return map;
}

async function main() {
  const map = envMap();
  const admin = createClient(map.NEXT_PUBLIC_SUPABASE_URL, map.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  for (const table of [
    "editorial_capabilities",
    "editorial_roles",
    "role_capabilities",
    "editorial_memberships",
  ]) {
    const head = await admin.from(table).select("*", { count: "exact", head: true });
    const rows = await admin.from(table).select("*").limit(3);
    console.log(
      JSON.stringify({
        table,
        headError: head.error
          ? { code: head.error.code, message: head.error.message }
          : null,
        headCount: head.count,
        selectError: rows.error
          ? { code: rows.error.code, message: rows.error.message }
          : null,
        rowCount: rows.data?.length ?? null,
      }),
    );
  }

  const rpc = await admin.rpc("has_capability", { capability: "edit" });
  console.log(
    JSON.stringify({
      rpc: "has_capability",
      error: rpc.error
        ? { code: rpc.error.code, message: rpc.error.message }
        : null,
      data: rpc.data,
    }),
  );
}

main().catch((e) => {
  console.log("FATAL=" + e.message);
  process.exit(1);
});
