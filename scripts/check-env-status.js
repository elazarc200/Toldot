const fs = require("node:fs");
const path = require("node:path");

const envPath = path.resolve(process.cwd(), ".env.local");
console.log("CWD=" + process.cwd());
console.log("ENV_PATH_EXISTS=" + fs.existsSync(envPath));

if (!fs.existsSync(envPath)) process.exit(0);

const text = fs.readFileSync(envPath, "utf8");
const lines = text.split(/\r?\n/);

const map = {};
const commented = [];
for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed) continue;
  if (trimmed.startsWith("#")) {
    const body = trimmed.slice(1).trim();
    const i = body.indexOf("=");
    if (i > 0) commented.push(body.slice(0, i).trim());
    continue;
  }
  const i = trimmed.indexOf("=");
  if (i <= 0) continue;
  const key = trimmed.slice(0, i).trim();
  const value = trimmed.slice(i + 1).trim();
  map[key] = value;
}

function status(key) {
  const v = map[key] || "";
  if (!v) {
    if (commented.includes(key)) return "COMMENTED_ONLY";
    return "MISSING";
  }
  if (/YOUR_|example\.supabase|placeholder|^<.*>$/i.test(v)) return "PLACEHOLDER";
  if (key.includes("URL")) {
    try {
      return "SET host=" + new URL(v).hostname;
    } catch {
      return "INVALID_URL";
    }
  }
  return "SET len=" + v.length;
}

const keys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_ACCESS_TOKEN",
  "SUPABASE_DB_PASSWORD",
  "POSTGRES_PASSWORD",
  "BOOTSTRAP_EDITOR_EMAIL",
  "BOOTSTRAP_EDITOR_USER_ID",
  "RLS_TEST_EDITOR_EMAIL",
  "RLS_TEST_EDITOR_PASSWORD",
  "RLS_TEST_NON_EDITOR_EMAIL",
  "RLS_TEST_NON_EDITOR_PASSWORD",
];

for (const key of keys) {
  console.log(key + "=" + status(key));
}

console.log(
  "ACTIVE_KEYS=" +
    Object.keys(map)
      .map((k) => k)
      .sort()
      .join(","),
);
console.log("COMMENTED_KEYS=" + commented.sort().join(","));
