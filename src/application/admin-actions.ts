"use server";

import { revalidatePath } from "next/cache";
import { requireCapability } from "@/lib/authz/authorize";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  buildThemeRow,
  createClaimInputSchema,
  createPersonInputSchema,
  createPlaceInputSchema,
  createRegionInputSchema,
  createRelationshipInputSchema,
  createThemeInputSchema,
  relationshipIsDirectional,
} from "@/application/knowledge-schemas";
import { assertTimeRangeBounds, suggestSortName } from "@/domain/knowledge";
import { logger } from "@/lib/logger";

function revalidateAdmin() {
  revalidatePath("/admin");
}

export async function createPersonAction(formData: FormData) {
  await requireCapability("edit");
  const parsed = createPersonInputSchema.parse({
    primary_display_name: formData.get("primary_display_name"),
    sort_name:
      String(formData.get("sort_name") || "").trim() ||
      suggestSortName(
        String(formData.get("primary_display_name") || ""),
        String(formData.get("title_honorific") || "") || null,
      ),
    title_honorific: formData.get("title_honorific") || null,
    short_identity_description: formData.get("short_identity_description") || null,
    disambiguation_label: formData.get("disambiguation_label") || null,
  });

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("people")
    .insert({
      ...parsed,
      lifecycle_status: "draft",
    })
    .select("id")
    .single();

  if (error) {
    logger.error("createPerson failed", { action: "createPerson", outcome: "failure" });
    throw new Error(error.message);
  }

  await supabase.from("person_names").insert({
    person_id: data.id,
    name_text: parsed.primary_display_name,
    name_kind: "primary",
    normalized_name: parsed.primary_display_name.trim().toLocaleLowerCase("he"),
  });

  revalidateAdmin();
  return data.id as string;
}

export async function createPlaceAction(formData: FormData) {
  await requireCapability("edit");
  const parsed = createPlaceInputSchema.parse({
    primary_historical_name: formData.get("primary_historical_name"),
    sort_name:
      String(formData.get("sort_name") || "").trim() ||
      String(formData.get("primary_historical_name") || ""),
    notes: formData.get("notes") || null,
  });
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("places")
    .insert({ ...parsed, lifecycle_status: "draft" })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidateAdmin();
  return data.id as string;
}

export async function createRegionAction(formData: FormData) {
  await requireCapability("edit");
  const parsed = createRegionInputSchema.parse({
    code: formData.get("code"),
    name_he: formData.get("name_he"),
    region_kind: formData.get("region_kind") || "historical_area",
    parent_region_id: formData.get("parent_region_id") || null,
    notes: formData.get("notes") || null,
  });
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("regions").insert({
    ...parsed,
    parent_region_id: parsed.parent_region_id || null,
    lifecycle_status: "draft",
  });
  if (error) throw new Error(error.message);
  revalidateAdmin();
}

export async function createThemeAction(formData: FormData) {
  await requireCapability("edit");
  const parsed = createThemeInputSchema.parse({
    name_he: formData.get("name_he"),
    description: formData.get("description") || null,
  });
  const props = buildThemeRow(parsed.name_he);
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("themes").insert({
    ...props,
    description: parsed.description,
  });
  if (error) throw new Error(error.message);
  revalidateAdmin();
}

export async function createRelationshipAction(formData: FormData) {
  await requireCapability("edit");
  const parsed = createRelationshipInputSchema.parse({
    family: formData.get("family"),
    person_a_id: formData.get("person_a_id"),
    person_b_id: formData.get("person_b_id"),
    knowledge_state: formData.get("knowledge_state") || "unknown",
    editorial_note: formData.get("editorial_note") || null,
  });
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("relationships").insert({
    family: parsed.family,
    person_a_id: parsed.person_a_id,
    person_b_id: parsed.person_b_id,
    is_directional: relationshipIsDirectional(parsed.family),
    knowledge_state: parsed.knowledge_state,
    editorial_note: parsed.editorial_note,
    lifecycle_status: "draft",
  });
  if (error) throw new Error(error.message);
  revalidateAdmin();
}

export async function createClaimAction(formData: FormData) {
  await requireCapability("edit");
  const subjectKeys = [
    "subject_person_id",
    "subject_place_id",
    "subject_relationship_id",
    "subject_generation_membership_id",
    "subject_time_range_id",
    "subject_chronology_editorial_id",
    "subject_chronology_constraint_id",
    "subject_person_place_id",
    "subject_period_id",
    "subject_episode_id",
    "subject_event_id",
  ] as const;

  const raw: Record<string, unknown> = {
    statement_text: formData.get("statement_text"),
    knowledge_state: formData.get("knowledge_state") || "unknown",
  };
  for (const key of subjectKeys) {
    const v = String(formData.get(key) || "").trim();
    raw[key] = v || null;
  }
  const parsed = createClaimInputSchema.parse(raw);
  const subjectCount = subjectKeys.filter((k) => parsed[k]).length;
  if (subjectCount !== 1) {
    throw new Error("יש לבחור נושא Claim אחד בלבד");
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("claims").insert({
    ...parsed,
    lifecycle_status: "draft",
  });
  if (error) throw new Error(error.message);
  revalidateAdmin();
}

export async function publishPersonAction(personId: string) {
  await requireCapability("publish");
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("publish_person", {
    p_person_id: personId,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/person", "layout");
  revalidatePath("/search");
  revalidatePath("/sitemap.xml");
  revalidateAdmin();
  return data as string;
}

export async function publishPlaceAction(placeId: string) {
  await requireCapability("publish");
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("publish_place", {
    p_place_id: placeId,
  });
  if (error) throw new Error(error.message);
  // Optimization only — correctness does not depend on this.
  revalidatePath("/place", "layout");
  revalidatePath("/search");
  revalidatePath("/sitemap.xml");
  revalidateAdmin();
  return data as string;
}

export async function publishPeriodAction(periodId: string) {
  await requireCapability("publish");
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("publish_period", {
    p_period_id: periodId,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/period", "layout");
  revalidatePath("/periods");
  revalidatePath("/search");
  revalidatePath("/sitemap.xml");
  revalidateAdmin();
  return data as string;
}

export async function rollbackPersonAction(snapshotId: string) {
  await requireCapability("rollback");
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("rollback_person_snapshot", {
    p_snapshot_id: snapshotId,
  });
  if (error) throw new Error(error.message);
  revalidateAdmin();
  return data as string;
}

export async function approvePersonAction(personId: string) {
  await requireCapability("approve");
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("transition_person_lifecycle", {
    p_person_id: personId,
    p_next: "approved",
  });
  if (error) throw new Error(error.message);
  revalidateAdmin();
}

export async function createPersonNameAction(formData: FormData) {
  await requireCapability("edit");
  const personId = String(formData.get("person_id"));
  const nameText = String(formData.get("name_text") || "").trim();
  const nameKind = String(formData.get("name_kind") || "alias");
  if (!personId || !nameText) throw new Error("חסרים שדות שם");
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("person_names").insert({
    person_id: personId,
    name_text: nameText,
    name_kind: nameKind,
    normalized_name: nameText.toLocaleLowerCase("he"),
  });
  if (error) throw new Error(error.message);
  revalidateAdmin();
}

export async function createPersonTimeRangeAction(formData: FormData) {
  await requireCapability("edit");
  const personId = String(formData.get("person_id"));
  const rangeKind = String(formData.get("range_kind") || "life");
  const startRaw = String(formData.get("start_year") || "").trim();
  const endRaw = String(formData.get("end_year") || "").trim();
  const startYear = startRaw ? Number(startRaw) : null;
  const endYear = endRaw ? Number(endRaw) : null;
  assertTimeRangeBounds(startYear, endYear);
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("person_time_ranges").insert({
    person_id: personId,
    range_kind: rangeKind,
    start_year: startYear,
    end_year: endYear,
    time_precision: String(formData.get("time_precision") || "unknown"),
    knowledge_state: String(formData.get("knowledge_state") || "unknown"),
    textual_label: String(formData.get("textual_label") || "") || null,
  });
  if (error) throw new Error(error.message);
  revalidateAdmin();
}

export async function createPersonGenerationMembershipAction(formData: FormData) {
  await requireCapability("edit");
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("person_generation_memberships").insert({
    person_id: String(formData.get("person_id")),
    generation_id: String(formData.get("generation_id")),
    is_primary: formData.get("is_primary") === "on",
    knowledge_state: String(formData.get("knowledge_state") || "unknown"),
    editorial_note: String(formData.get("editorial_note") || "") || null,
  });
  if (error) throw new Error(error.message);
  revalidateAdmin();
}

export async function createPersonChronologyEditorialAction(formData: FormData) {
  await requireCapability("edit");
  const supabase = await createServerSupabaseClient();
  const generationId = String(formData.get("generation_id") || "").trim();
  const { error } = await supabase.from("person_chronology_editorial").insert({
    person_id: String(formData.get("person_id")),
    generation_id: generationId || null,
    band: String(formData.get("band") || "unresolved"),
    activity_portion: String(formData.get("activity_portion") || "") || null,
    continues_into_next: formData.get("continues_into_next") === "on",
    spans_multiple: formData.get("spans_multiple") === "on",
    free_text_note: String(formData.get("free_text_note") || "") || null,
    knowledge_state: String(formData.get("knowledge_state") || "unknown"),
  });
  if (error) throw new Error(error.message);
  revalidateAdmin();
}

export async function createPersonPlaceAction(formData: FormData) {
  await requireCapability("edit");
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("person_places").insert({
    person_id: String(formData.get("person_id")),
    place_id: String(formData.get("place_id")),
    association_note: String(formData.get("association_note") || "") || null,
    knowledge_state: String(formData.get("knowledge_state") || "unknown"),
  });
  if (error) throw new Error(error.message);
  revalidateAdmin();
}

export async function createPoliticalRuleAction(formData: FormData) {
  await requireCapability("edit");
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("political_rules").insert({
    code: String(formData.get("code")),
    name_he: String(formData.get("name_he")),
    textual_label: String(formData.get("textual_label") || "") || null,
    knowledge_state: String(formData.get("knowledge_state") || "unknown"),
    lifecycle_status: "draft",
  });
  if (error) throw new Error(error.message);
  revalidateAdmin();
}

export async function createHistoricalPeriodAction(formData: FormData) {
  await requireCapability("edit");
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("historical_periods").insert({
    code: String(formData.get("code")),
    name_he: String(formData.get("name_he")),
    overview: String(formData.get("overview") || "") || null,
    knowledge_state: String(formData.get("knowledge_state") || "unknown"),
    lifecycle_status: "draft",
  });
  if (error) throw new Error(error.message);
  revalidateAdmin();
}

export async function createHistoricalEpisodeAction(formData: FormData) {
  await requireCapability("edit");
  const periodId = String(formData.get("period_id") || "").trim();
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("historical_episodes").insert({
    name_he: String(formData.get("name_he")),
    period_id: periodId || null,
    overview: String(formData.get("overview") || "") || null,
    knowledge_state: String(formData.get("knowledge_state") || "unknown"),
    lifecycle_status: "draft",
  });
  if (error) throw new Error(error.message);
  revalidateAdmin();
}

export async function createHistoricalEventAction(formData: FormData) {
  await requireCapability("edit");
  const periodId = String(formData.get("period_id") || "").trim();
  const episodeId = String(formData.get("episode_id") || "").trim();
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("historical_events").insert({
    name_he: String(formData.get("name_he")),
    period_id: periodId || null,
    episode_id: episodeId || null,
    overview: String(formData.get("overview") || "") || null,
    knowledge_state: String(formData.get("knowledge_state") || "unknown"),
    lifecycle_status: "draft",
  });
  if (error) throw new Error(error.message);
  revalidateAdmin();
}

export async function createChronologyConstraintAction(formData: FormData) {
  await requireCapability("edit");
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("person_chronology_constraints").insert({
    person_id: String(formData.get("person_id")),
    related_person_id: String(formData.get("related_person_id")),
    constraint_kind: String(formData.get("constraint_kind") || "before"),
    knowledge_state: String(formData.get("knowledge_state") || "unknown"),
    editorial_note: String(formData.get("editorial_note") || "") || null,
  });
  if (error) throw new Error(error.message);
  revalidateAdmin();
}

export async function updatePersonProminenceAction(formData: FormData) {
  await requireCapability("edit");
  const personId = String(formData.get("person_id"));
  const scoreRaw = String(formData.get("prominence_score") || "").trim();
  const override = formData.get("prominence_override") === "on";
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("people")
    .update({
      prominence_override: override,
      prominence_score: scoreRaw === "" ? null : Number(scoreRaw),
      updated_at: new Date().toISOString(),
    })
    .eq("id", personId);
  if (error) throw new Error(error.message);
  revalidateAdmin();
}

export async function createPlaceIdentificationAction(formData: FormData) {
  await requireCapability("edit");
  const latRaw = String(formData.get("latitude") || "").trim();
  const lngRaw = String(formData.get("longitude") || "").trim();
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("place_identifications").insert({
    place_id: String(formData.get("place_id")),
    modern_name: String(formData.get("modern_name") || "") || null,
    latitude: latRaw === "" ? null : Number(latRaw),
    longitude: lngRaw === "" ? null : Number(lngRaw),
    location_certainty: String(formData.get("location_certainty") || "unknown"),
    is_preferred: formData.get("is_preferred") === "on",
    editorial_note: String(formData.get("editorial_note") || "") || null,
  });
  if (error) throw new Error(error.message);
  revalidateAdmin();
}

export async function createPlaceRegionAction(formData: FormData) {
  await requireCapability("edit");
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("place_regions").insert({
    place_id: String(formData.get("place_id")),
    region_id: String(formData.get("region_id")),
    is_primary: formData.get("is_primary") === "on",
  });
  if (error) throw new Error(error.message);
  revalidateAdmin();
}

export async function structuralRebuildVisualizationAction() {
  await requireCapability("manage_corpus");
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("structural_rebuild_and_activate", {
    p_notes: "admin structural rebuild",
  });
  if (error) throw new Error(error.message);
  revalidatePath("/seder-hadorot");
  revalidatePath("/map");
  revalidateAdmin();
  return data as string;
}
