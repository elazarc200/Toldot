import { createClient } from "@supabase/supabase-js";
import { getWebEnv } from "@/lib/env";

/**
 * Anon public client for encyclopedia reads.
 * Never import service role. Never query editorial draft tables from public loaders.
 */
export function createPublicSupabaseClient() {
  const env = getWebEnv();
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Tables public loaders are allowed to touch. */
export const PUBLIC_READ_TABLES = [
  "published_aggregate_snapshots",
  "published_search_documents",
  "published_entity_slugs",
  "published_slug_redirects",
  "published_visualization_manifest",
  "published_visualization_builds",
  "published_seder_placement_bands",
  "published_seder_placement_nodes",
  "published_seder_placement_edges",
  "published_seder_alpha_index",
  "published_seder_render_layout",
  "published_map_places",
  "published_map_place_candidates",
  "published_map_person_places",
] as const;

export type PublicReadTable = (typeof PUBLIC_READ_TABLES)[number];
