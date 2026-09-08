const dotenv = require("dotenv");
dotenv.config({ path: ".env.local", override: true, quiet: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function probe(table) {
  const res = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, {
    headers: {
      apikey: anon,
      Authorization: `Bearer ${anon}`,
    },
  });
  const text = await res.text();
  return {
    table,
    status: res.status,
    // Avoid dumping row payloads; length + truncated error code only.
    bodyLen: text.length,
    hint: text.includes("Could not find the table")
      ? "TABLE_MISSING"
      : text.includes("permission") || res.status === 401 || res.status === 403
        ? "DENIED_OR_AUTH"
        : res.ok
          ? "OK"
          : "OTHER",
  };
}

(async () => {
  const tables = [
    "editorial_capabilities",
    "editorial_roles",
    "role_capabilities",
    "editorial_memberships",
  ];
  for (const t of tables) {
    console.log(JSON.stringify(await probe(t)));
  }
  const rpc = await fetch(`${url}/rest/v1/rpc/has_capability`, {
    method: "POST",
    headers: {
      apikey: anon,
      Authorization: `Bearer ${anon}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ capability: "edit" }),
  });
  const rpcText = await rpc.text();
  console.log(
    JSON.stringify({
      rpc: "has_capability",
      status: rpc.status,
      bodyLen: rpcText.length,
      hint: rpcText.includes("Could not find the function")
        ? "FUNCTION_MISSING"
        : rpc.ok
          ? "OK"
          : "OTHER_OR_DENIED",
    }),
  );
})().catch((e) => {
  console.error("PROBE_ERROR=" + e.message);
  process.exit(1);
});
