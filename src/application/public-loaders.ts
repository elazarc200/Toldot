import "server-only";

import {
  mapPersonPayload,
  mapPlacePayload,
  mapPeriodPayload,
  mapSearchHit,
} from "@/application/public-mappers";
import type {
  PublicPersonPageDto,
  PublicPlacePageDto,
  PublicPeriodPageDto,
  PublicSearchHitDto,
} from "@/domain/public";
import {
  getCachedActiveResolution,
  getCachedPayload,
  setCachedActiveResolution,
  setCachedPayload,
} from "@/lib/public-cache";
import { createPublicSupabaseClient } from "@/lib/supabase/public";

async function resolveActiveSnapshotId(
  aggregateType: "person" | "place" | "period",
  aggregateId: string,
): Promise<string | null> {
  const key = `${aggregateType}:${aggregateId}`;
  const cached = getCachedActiveResolution(key);
  if (cached) return cached;

  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase
    .from("published_aggregate_snapshots")
    .select("id")
    .eq("aggregate_type", aggregateType)
    .eq("aggregate_id", aggregateId)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) return null;
  setCachedActiveResolution(key, data.id as string);
  return data.id as string;
}

async function loadSnapshotPayload(snapshotId: string): Promise<unknown | null> {
  const cached = getCachedPayload(snapshotId);
  if (cached) return cached;

  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase
    .from("published_aggregate_snapshots")
    .select("id, payload, is_active, aggregate_type, aggregate_id")
    .eq("id", snapshotId)
    .maybeSingle();

  if (error || !data) return null;
  setCachedPayload(snapshotId, data.payload);
  return data.payload;
}

export async function resolveSlug(
  aggregateType: "person" | "place" | "period",
  slug: string,
): Promise<{ aggregateId: string; redirectFrom?: string } | null> {
  const supabase = createPublicSupabaseClient();
  const { data: direct } = await supabase
    .from("published_entity_slugs")
    .select("aggregate_id")
    .eq("aggregate_type", aggregateType)
    .eq("slug", slug)
    .maybeSingle();

  if (direct) {
    return { aggregateId: direct.aggregate_id as string };
  }

  const { data: redirect } = await supabase
    .from("published_slug_redirects")
    .select("aggregate_id")
    .eq("aggregate_type", aggregateType)
    .eq("old_slug", slug)
    .maybeSingle();

  if (!redirect) return null;

  const { data: canonical } = await supabase
    .from("published_entity_slugs")
    .select("slug, aggregate_id")
    .eq("aggregate_type", aggregateType)
    .eq("aggregate_id", redirect.aggregate_id)
    .maybeSingle();

  if (!canonical) return null;
  return {
    aggregateId: canonical.aggregate_id as string,
    redirectFrom: slug,
  };
}

export async function getCanonicalSlug(
  aggregateType: "person" | "place" | "period",
  aggregateId: string,
): Promise<string | null> {
  const supabase = createPublicSupabaseClient();
  const { data } = await supabase
    .from("published_entity_slugs")
    .select("slug")
    .eq("aggregate_type", aggregateType)
    .eq("aggregate_id", aggregateId)
    .maybeSingle();
  return data?.slug ? String(data.slug) : null;
}

export async function loadPublicPersonByAggregateId(
  aggregateId: string,
): Promise<PublicPersonPageDto | null> {
  const snapshotId = await resolveActiveSnapshotId("person", aggregateId);
  if (!snapshotId) return null;
  const payload = await loadSnapshotPayload(snapshotId);
  if (!payload) return null;
  try {
    return mapPersonPayload(snapshotId, payload);
  } catch {
    return null;
  }
}

export async function loadPublicPlaceByAggregateId(
  aggregateId: string,
): Promise<PublicPlacePageDto | null> {
  const snapshotId = await resolveActiveSnapshotId("place", aggregateId);
  if (!snapshotId) return null;
  const payload = await loadSnapshotPayload(snapshotId);
  if (!payload) return null;
  try {
    return mapPlacePayload(snapshotId, payload);
  } catch {
    return null;
  }
}

export async function loadPublicPeriodByAggregateId(
  aggregateId: string,
): Promise<PublicPeriodPageDto | null> {
  const snapshotId = await resolveActiveSnapshotId("period", aggregateId);
  if (!snapshotId) return null;
  const payload = await loadSnapshotPayload(snapshotId);
  if (!payload) return null;
  try {
    return mapPeriodPayload(snapshotId, payload);
  } catch {
    return null;
  }
}

export async function searchPublished(query: string, limit = 30): Promise<PublicSearchHitDto[]> {
  const q = query.trim();
  if (!q) return [];
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase
    .from("published_search_documents")
    .select(
      "aggregate_type, aggregate_id, primary_name, disambiguation, href_path, anchor, search_blob",
    )
    .eq("is_active", true)
    .or(
      `primary_name.ilike.%${q}%,search_blob.ilike.%${q}%,sort_name.ilike.%${q}%`,
    )
    .limit(limit);

  if (error || !data) return [];
  return data.map((row) => mapSearchHit(row as Record<string, unknown>));
}

export async function listPublishedPeriods(): Promise<
  { aggregate_id: string; primary_name: string; href_path: string; disambiguation: string | null }[]
> {
  const supabase = createPublicSupabaseClient();
  const { data } = await supabase
    .from("published_search_documents")
    .select("aggregate_id, primary_name, href_path, disambiguation")
    .eq("aggregate_type", "period")
    .eq("is_active", true)
    .is("parent_period_id", null)
    .order("primary_name");
  return (data ?? []) as {
    aggregate_id: string;
    primary_name: string;
    href_path: string;
    disambiguation: string | null;
  }[];
}

export async function listPublishedSlugsForSitemap(): Promise<
  { aggregate_type: string; slug: string }[]
> {
  const supabase = createPublicSupabaseClient();
  const { data } = await supabase
    .from("published_entity_slugs")
    .select("aggregate_type, slug")
    .in("aggregate_type", ["person", "place", "period"]);
  return (data ?? []) as { aggregate_type: string; slug: string }[];
}

/** Immutable payload fetch by snapshot_id (for cache correctness tests). */
export async function loadImmutablePayloadBySnapshotId(snapshotId: string) {
  return loadSnapshotPayload(snapshotId);
}

export async function resolveActiveSnapshotIdForTests(
  aggregateType: "person" | "place" | "period",
  aggregateId: string,
) {
  return resolveActiveSnapshotId(aggregateType, aggregateId);
}