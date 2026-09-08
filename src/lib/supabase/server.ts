import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getWebEnv } from "@/lib/env";

/**
 * User-scoped server Supabase client (cookie session + anon key).
 * No service-role access — RLS and auth.uid() apply.
 */
export async function createServerSupabaseClient() {
  const env = getWebEnv();
  const cookieStore = await cookies();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component where cookies are read-only.
            // Middleware / Server Actions refresh the session when needed.
          }
        },
      },
    },
  );
}
