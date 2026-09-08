/**
 * One-time (idempotent) first-editor bootstrap.
 *
 * Usage:
 *   1. Create the user in Supabase Auth (Dashboard → Authentication).
 *   2. Set in .env.local (or shell):
 *        NEXT_PUBLIC_SUPABASE_URL=...
 *        SUPABASE_SERVICE_ROLE_KEY=...
 *        BOOTSTRAP_EDITOR_USER_ID=<uuid>   # and/or
 *        BOOTSTRAP_EDITOR_EMAIL=<email>
 *   3. Apply migrations to the non-prod project.
 *   4. npm run bootstrap:editor
 *
 * Service-role stays in this scripts/ path only.
 */

import { getBootstrapEnv } from "./env";
import { createServiceRoleClient } from "./supabase-service";

const FULL_EDITOR_ROLE = "full_editor";

function log(fields: Record<string, unknown>): void {
  console.log(
    JSON.stringify({
      time: new Date().toISOString(),
      action: "bootstrap_editor",
      ...fields,
    }),
  );
}

async function resolveUserId(
  client: ReturnType<typeof createServiceRoleClient>,
  env: ReturnType<typeof getBootstrapEnv>,
): Promise<string> {
  if (env.BOOTSTRAP_EDITOR_USER_ID) {
    const { data, error } = await client.auth.admin.getUserById(
      env.BOOTSTRAP_EDITOR_USER_ID,
    );
    if (error || !data.user) {
      throw new Error("BOOTSTRAP_EDITOR_USER_ID does not match an Auth user");
    }
    return data.user.id;
  }

  const email = env.BOOTSTRAP_EDITOR_EMAIL;
  if (!email) {
    throw new Error("BOOTSTRAP_EDITOR_EMAIL or BOOTSTRAP_EDITOR_USER_ID required");
  }

  // Paginate admin users list to find by email (Auth Admin API).
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new Error(`Failed to list users: ${error.message}`);
    }
    const match = data.users.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase(),
    );
    if (match) {
      return match.id;
    }
    if (data.users.length < perPage) {
      break;
    }
    page += 1;
  }

  throw new Error(`No Auth user found for email ${email}`);
}

async function main(): Promise<void> {
  const env = getBootstrapEnv();
  const client = createServiceRoleClient();
  const userId = await resolveUserId(client, env);

  const { data: role, error: roleError } = await client
    .from("editorial_roles")
    .select("id, code")
    .eq("code", FULL_EDITOR_ROLE)
    .maybeSingle();

  if (roleError || !role) {
    throw new Error(
      `Role ${FULL_EDITOR_ROLE} not found — apply Phase 0 migrations first`,
    );
  }

  const { data: existing, error: existingError } = await client
    .from("editorial_memberships")
    .select("id, is_active")
    .eq("user_id", userId)
    .eq("role_id", role.id)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Failed to read membership: ${existingError.message}`);
  }

  if (existing?.is_active) {
    log({
      outcome: "skipped",
      level: "info",
      msg: "editor already has active full_editor membership",
      userId,
      role: FULL_EDITOR_ROLE,
      membershipId: existing.id,
    });
    return;
  }

  if (existing && !existing.is_active) {
    const { error: updateError } = await client
      .from("editorial_memberships")
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq("id", existing.id);

    if (updateError) {
      throw new Error(`Failed to reactivate membership: ${updateError.message}`);
    }

    log({
      outcome: "success",
      level: "info",
      msg: "reactivated full_editor membership",
      userId,
      role: FULL_EDITOR_ROLE,
      membershipId: existing.id,
    });
    return;
  }

  const { data: inserted, error: insertError } = await client
    .from("editorial_memberships")
    .insert({
      user_id: userId,
      role_id: role.id,
      is_active: true,
    })
    .select("id")
    .single();

  if (insertError) {
    throw new Error(`Failed to insert membership: ${insertError.message}`);
  }

  log({
    outcome: "success",
    level: "info",
    msg: "granted full_editor membership",
    userId,
    role: FULL_EDITOR_ROLE,
    membershipId: inserted.id,
  });
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "unknown error";
  log({
    outcome: "failure",
    level: "error",
    msg: "bootstrap failed",
    errorCode: "BOOTSTRAP_FAILED",
    // Never log secrets; message from our code only.
    detail: message,
  });
  process.exitCode = 1;
});
