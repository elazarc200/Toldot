/**
 * One-time / rotation bootstrap for the AI worker credential.
 * Uses service role ONLY in this isolated script (same pattern as bootstrap-editor).
 * Never import from src/. Never used by the Next.js app or ai-worker runtime.
 *
 * Required env:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   AI_WORKER_SECRET          (min 24 chars; never logged)
 *   AI_WORKER_EMAIL           (dedicated Auth user email)
 * Optional:
 *   AI_WORKER_PASSWORD        (create user if missing)
 *   AI_WORKER_USER_ID         (if user already exists)
 */
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { config as loadDotenv } from "dotenv";

loadDotenv({ path: ".env.local" });
loadDotenv({ path: ".env" });

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const secret = process.env.AI_WORKER_SECRET;
  const email = process.env.AI_WORKER_EMAIL;
  const password = process.env.AI_WORKER_PASSWORD;
  let userId = process.env.AI_WORKER_USER_ID;

  if (!url || !serviceKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required");
  }
  if (!secret || secret.length < 24) {
    throw new Error("AI_WORKER_SECRET required (min 24 characters); no defaults allowed");
  }
  if (secret === "toladot-dev-ai-worker-secret") {
    throw new Error("Refusing known insecure default AI_WORKER_SECRET");
  }
  if (!email && !userId) {
    throw new Error("Provide AI_WORKER_EMAIL and/or AI_WORKER_USER_ID");
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (!userId && email) {
    const { data: listed, error: listErr } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (listErr) throw listErr;
    const existing = listed.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase(),
    );
    if (existing) {
      userId = existing.id;
    } else {
      if (!password || password.length < 12) {
        throw new Error("AI_WORKER_PASSWORD required to create worker Auth user (min 12)");
      }
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (createErr) throw createErr;
      userId = created.user.id;
    }
  }

  if (!userId) {
    throw new Error("Could not resolve worker_user_id");
  }

  const secretHash = createHash("sha256").update(secret, "utf8").digest("hex");

  const { error } = await admin.from("ai_worker_config").upsert({
    id: 1,
    worker_user_id: userId,
    secret_hash: secretHash,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;

  // Never print the secret. Fingerprint only.
  const fingerprint = createHash("sha256").update(secret, "utf8").digest("hex").slice(0, 12);
  console.log(
    JSON.stringify({
      ok: true,
      worker_user_id: userId,
      secret_fingerprint: fingerprint,
      message: "AI worker credentials configured. Rotate by re-running with a new AI_WORKER_SECRET.",
    }),
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
