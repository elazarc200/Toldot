/**
 * Deep Phase 0 schema / security verification against hosted Supabase.
 * Never prints secrets or raw row payloads with sensitive data.
 */
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

const EXPECTED_CAPS = [
  "approve",
  "edit",
  "manage_corpus",
  "manage_editorial_membership",
  "merge_entities",
  "publish",
  "review",
  "rollback",
].sort();

async function main() {
  const map = envMap();
  const url = map.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = map.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = map.SUPABASE_SERVICE_ROLE_KEY;
  const host = new URL(url).hostname;
  const ref = host.split(".")[0];
  console.log("TARGET_HOST=" + host);
  console.log("TARGET_REF=" + ref);

  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const anon = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Capabilities seed
  const { data: caps, error: capsErr } = await admin
    .from("editorial_capabilities")
    .select("code");
  console.log("CAPABILITIES_READ=" + (capsErr ? "FAIL" : "OK"));
  if (!capsErr) {
    const codes = (caps || []).map((r) => r.code).sort();
    console.log("CAPABILITIES_COUNT=" + codes.length);
    console.log(
      "CAPABILITIES_MATCH=" +
        (JSON.stringify(codes) === JSON.stringify(EXPECTED_CAPS)),
    );
  }

  // full_editor role + capability count
  const { data: role, error: roleErr } = await admin
    .from("editorial_roles")
    .select("id, code")
    .eq("code", "full_editor")
    .maybeSingle();
  console.log("FULL_EDITOR_ROLE=" + (roleErr || !role ? "MISSING" : "OK"));

  if (role) {
    const { data: rc, error: rcErr } = await admin
      .from("role_capabilities")
      .select("capability_code")
      .eq("role_id", role.id);
    console.log("ROLE_CAPABILITIES_READ=" + (rcErr ? "FAIL" : "OK"));
    if (!rcErr) {
      const codes = (rc || []).map((r) => r.capability_code).sort();
      console.log("FULL_EDITOR_CAP_COUNT=" + codes.length);
      console.log(
        "FULL_EDITOR_CAPS_MATCH=" +
          (JSON.stringify(codes) === JSON.stringify(EXPECTED_CAPS)),
      );
    }
  }

  // has_capability via SQL using service role rpc as anon identity → false/denied
  const { data: anonCap, error: anonCapErr } = await anon.rpc("has_capability", {
    capability: "edit",
  });
  console.log(
    "ANON_HAS_CAPABILITY=" +
      (anonCapErr
        ? "DENIED_OR_ERROR"
        : anonCap === false
          ? "FALSE_OK"
          : "UNEXPECTED_" + String(anonCap)),
  );

  // Anon table access must fail / empty
  for (const table of [
    "editorial_capabilities",
    "editorial_roles",
    "role_capabilities",
    "editorial_memberships",
  ]) {
    const { data, error } = await anon.from(table).select("*");
    const denied =
      Boolean(error) || data === null || (Array.isArray(data) && data.length === 0);
    // With revoked grants, expect error. Empty without error is weaker but note it.
    console.log(
      `ANON_${table}=` +
        (error ? "ERROR_DENIED" : data?.length ? "LEAK" : "EMPTY"),
    );
  }

  // Anon insert membership must fail
  const { error: insertErr } = await anon.from("editorial_memberships").insert({
    user_id: "00000000-0000-0000-0000-000000000001",
    role_id: "00000000-0000-0000-0000-000000000002",
  });
  console.log("ANON_INSERT_MEMBERSHIP=" + (insertErr ? "DENIED_OK" : "ALLOWED_BAD"));

  // Inspect function via pg catalog using a raw query if available through rpc
  // Fallback: service role calling has_capability without JWT user → false
  const { data: svcCap, error: svcCapErr } = await admin.rpc("has_capability", {
    capability: "edit",
  });
  console.log(
    "SERVICE_HAS_CAPABILITY_NO_USER=" +
      (svcCapErr ? "ERROR" : svcCap === false ? "FALSE_OK" : String(svcCap)),
  );

  // Count auth users
  const { data: usersPage, error: usersErr } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  console.log("AUTH_LIST=" + (usersErr ? "FAIL" : "OK"));
  console.log("AUTH_USERS_TOTAL=" + (usersPage?.users?.length ?? 0));

  // Check migration history table if present
  const { data: mig, error: migErr } = await admin
    .from("schema_migrations")
    .select("*")
    .limit(5);
  // schema_migrations may be in supabase_migrations schema — PostgREST may not expose it
  console.log(
    "SCHEMA_MIGRATIONS_REST=" +
      (migErr ? "UNAVAILABLE_OR_MISSING" : "ROWS_" + (mig?.length ?? 0)),
  );
}

main().catch((e) => {
  console.log("FATAL=" + e.message);
  process.exit(1);
});
