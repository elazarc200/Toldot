import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getBootstrapEnv } from "./env";

/**
 * Service-role client for isolated scripts only.
 * Must never be imported from the Next.js application under src/.
 */
export function createServiceRoleClient(): SupabaseClient {
  const env = getBootstrapEnv();
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
