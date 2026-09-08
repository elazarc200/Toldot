/**
 * Run supabase CLI with env from .env.local.
 * Usage: node scripts/supabase-with-env.js <supabase-args...>
 * Never prints secret values.
 */
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const envPath = path.resolve(process.cwd(), ".env.local");
if (!fs.existsSync(envPath)) {
  console.error("MISSING_ENV_LOCAL");
  process.exit(1);
}

const env = { ...process.env };
for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
  if (!line || line.trim().startsWith("#")) continue;
  const i = line.indexOf("=");
  if (i <= 0) continue;
  env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
}

const url = env.NEXT_PUBLIC_SUPABASE_URL || "";
let host = "UNKNOWN";
let ref = "UNKNOWN";
try {
  host = new URL(url).hostname;
  ref = host.split(".")[0] || "UNKNOWN";
} catch {
  /* ignore */
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.log("TARGET_HOST=" + host);
  console.log("TARGET_REF=" + ref);
  console.log("ACCESS_TOKEN=" + (env.SUPABASE_ACCESS_TOKEN ? "SET" : "MISSING"));
  process.exit(0);
}

console.log("TARGET_HOST=" + host);
console.log("TARGET_REF=" + ref);
console.log("RUNNING=supabase " + args.join(" "));

const result = spawnSync("npx", ["supabase", ...args], {
  env,
  encoding: "utf8",
  shell: true,
  cwd: process.cwd(),
});

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
process.exit(result.status ?? 1);
