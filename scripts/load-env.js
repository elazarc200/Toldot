/**
 * Load .env.local into process.env without printing values.
 * Used by shell wrappers before supabase CLI commands.
 */
const fs = require("node:fs");
const path = require("node:path");

const envPath = path.resolve(process.cwd(), ".env.local");
if (!fs.existsSync(envPath)) {
  console.error("MISSING_ENV_LOCAL");
  process.exit(1);
}

for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
  if (!line || line.trim().startsWith("#")) continue;
  const i = line.indexOf("=");
  if (i <= 0) continue;
  const key = line.slice(0, i).trim();
  const value = line.slice(i + 1).trim();
  process.env[key] = value;
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
let host = "UNKNOWN";
let ref = "UNKNOWN";
try {
  host = new URL(url).hostname;
  ref = host.split(".")[0] || "UNKNOWN";
} catch {
  /* ignore */
}

console.log("TARGET_HOST=" + host);
console.log("TARGET_REF=" + ref);
console.log("ACCESS_TOKEN=" + (process.env.SUPABASE_ACCESS_TOKEN ? "SET" : "MISSING"));
console.log("SERVICE_ROLE=" + (process.env.SUPABASE_SERVICE_ROLE_KEY ? "SET" : "MISSING"));
console.log("ANON=" + (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "SET" : "MISSING"));
