/**
 * Safe Auth diagnostics — never prints emails/passwords.
 */
const fs = require("node:fs");
const { createClient } = require("@supabase/supabase-js");

const map = {};
for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  if (!line || line.trim().startsWith("#")) continue;
  const i = line.indexOf("=");
  if (i > 0) map[line.slice(0, i).trim()] = line.slice(i + 1).trim();
}

async function trySignIn(label, email, password) {
  const client = createClient(
    map.NEXT_PUBLIC_SUPABASE_URL,
    map.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  console.log(
    JSON.stringify({
      label,
      ok: !error,
      code: error?.code || null,
      status: error?.status || null,
      hasSession: Boolean(data.session),
      emailConfirmed: data.user?.email_confirmed_at ? true : data.user ? false : null,
    }),
  );
}

(async () => {
  const admin = createClient(
    map.NEXT_PUBLIC_SUPABASE_URL,
    map.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 50 });
  console.log(
    JSON.stringify({
      listOk: !error,
      userCount: data?.users?.length ?? 0,
      confirmedCount: (data?.users || []).filter((u) => u.email_confirmed_at).length,
      bootstrapEmailMatchesEditor:
        map.BOOTSTRAP_EDITOR_EMAIL === map.RLS_TEST_EDITOR_EMAIL,
      bootstrapEmailFound: (data?.users || []).some(
        (u) =>
          u.email?.toLowerCase() === map.BOOTSTRAP_EDITOR_EMAIL?.toLowerCase(),
      ),
      editorEmailFound: (data?.users || []).some(
        (u) =>
          u.email?.toLowerCase() === map.RLS_TEST_EDITOR_EMAIL?.toLowerCase(),
      ),
      nonEditorEmailFound: (data?.users || []).some(
        (u) =>
          u.email?.toLowerCase() ===
          map.RLS_TEST_NON_EDITOR_EMAIL?.toLowerCase(),
      ),
    }),
  );

  await trySignIn(
    "editor",
    map.RLS_TEST_EDITOR_EMAIL,
    map.RLS_TEST_EDITOR_PASSWORD,
  );
  await trySignIn(
    "non_editor",
    map.RLS_TEST_NON_EDITOR_EMAIL,
    map.RLS_TEST_NON_EDITOR_PASSWORD,
  );
})().catch((e) => {
  console.log("FATAL=" + e.message);
  process.exit(1);
});
