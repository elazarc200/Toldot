import { createBrowserClient } from "@supabase/ssr";
import { getWebEnv } from "@/lib/env";

/**
 * Browser Supabase client — anon/public key only.
 * Never import service-role credentials here.
 */
export function createBrowserSupabaseClient() {
  const env = getWebEnv();
  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
