/**
 * Attempt to apply Phase 0 migration SQL via known Supabase SQL endpoints.
 * Never logs service role key or full connection secrets.
 */
const fs = require("node:fs");
const dotenv = require("dotenv");
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

async function tryEndpoint(name, url, init) {
  try {
    const res = await fetch(url, init);
    const text = await res.text();
    console.log(
      JSON.stringify({
        name,
        status: res.status,
        bodyLen: text.length,
        bodyStart: text.slice(0, 120).replace(/[A-Za-z0-9_-]{20,}/g, "[REDACTED]"),
      }),
    );
    return { ok: res.ok, status: res.status, text };
  } catch (e) {
    console.log(JSON.stringify({ name, error: e.message }));
    return { ok: false, status: 0, text: e.message };
  }
}

async function main() {
  const map = envMap();
  const base = map.NEXT_PUBLIC_SUPABASE_URL;
  const service = map.SUPABASE_SERVICE_ROLE_KEY;
  const sql = fs.readFileSync(
    "supabase/migrations/20260907130000_phase0_editorial_authz.sql",
    "utf8",
  );

  console.log("SQL_BYTES=" + Buffer.byteLength(sql));
  console.log("TARGET=" + new URL(base).hostname);

  // Legacy pg-meta style endpoints (may or may not be exposed)
  await tryEndpoint("pg_query", `${base}/pg/query`, {
    method: "POST",
    headers: {
      apikey: service,
      Authorization: `Bearer ${service}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: "select 1 as ok;" }),
  });

  await tryEndpoint("pg_meta_query", `${base}/pg-meta/default/query`, {
    method: "POST",
    headers: {
      apikey: service,
      Authorization: `Bearer ${service}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: "select 1 as ok;" }),
  });

  // Management API requires personal access token
  const pat = map.SUPABASE_ACCESS_TOKEN;
  console.log("PAT=" + (pat ? "SET" : "MISSING"));
  if (pat) {
    const ref = new URL(base).hostname.split(".")[0];
    await tryEndpoint(
      "mgmt_query",
      `https://api.supabase.com/v1/projects/${ref}/database/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${pat}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: "select 1 as ok;" }),
      },
    );
  }
}

main();
