import "server-only";
import type { DependencyRef } from "@/domain/ai/types";
import { fingerprintDependencies } from "@/domain/ai/types";
import type { AiEntityType } from "@/domain/ai/types";
import { getTaskDefinition } from "@/lib/ai/registry";
import { NO_RETRIEVAL_PATH_MESSAGE } from "@/lib/ai/retrieval";

export type AssembledAiContext = {
  entityType: AiEntityType;
  entityId: string;
  taskType: string;
  context: Record<string, unknown>;
  dependencySet: DependencyRef[];
  dependencyFingerprint: string;
  retrievalNotes: string[];
};

type SupabaseLike = {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: unknown }>;
        order?: (col: string) => {
          limit: (n: number) => Promise<{ data: Record<string, unknown>[] | null }>;
        };
        limit?: (n: number) => Promise<{ data: Record<string, unknown>[] | null }>;
      };
      in?: (...args: unknown[]) => unknown;
    };
  };
};

/**
 * Selective context assembly at enqueue time (editor session).
 * Worker consumes the blob — does not broadly query canonical tables.
 */
export async function buildPersonAiContext(args: {
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createServerSupabaseClient>>;
  personId: string;
  taskType: string;
}): Promise<AssembledAiContext> {
  const task = getTaskDefinition(args.taskType);
  const deps: DependencyRef[] = [];
  const retrievalNotes: string[] = [];

  const { data: person } = await args.supabase
    .from("people")
    .select(
      "id, primary_display_name, sort_name, biography_md, identity_status, lifecycle_status, updated_at, short_identity_description, disambiguation_label",
    )
    .eq("id", args.personId)
    .maybeSingle();

  if (!person) {
    throw new Error("Person not found for AI context");
  }

  deps.push({
    table: "people",
    id: person.id as string,
    version_token: String(person.updated_at),
  });

  const [{ data: names }, { data: ranges }, { data: gens }, { data: chrono }, { data: constraints }, { data: rels }, { data: claims }] =
    await Promise.all([
      args.supabase
        .from("person_names")
        .select("id, name_text, name_kind")
        .eq("person_id", args.personId),
      args.supabase
        .from("person_time_ranges")
        .select("id, range_kind, start_year, end_year, knowledge_state, updated_at")
        .eq("person_id", args.personId),
      args.supabase
        .from("person_generation_memberships")
        .select("id, generation_id, is_primary, knowledge_state")
        .eq("person_id", args.personId),
      args.supabase
        .from("person_chronology_editorial")
        .select("id, generation_id, band, activity_portion, continues_into_next, knowledge_state, updated_at")
        .eq("person_id", args.personId),
      args.supabase
        .from("person_chronology_constraints")
        .select("id, related_person_id, constraint_kind, knowledge_state")
        .eq("person_id", args.personId),
      args.supabase
        .from("relationships")
        .select("id, family, person_a_id, person_b_id, is_directional, knowledge_state, updated_at")
        .or(`person_a_id.eq.${args.personId},person_b_id.eq.${args.personId}`)
        .limit(40),
      args.supabase
        .from("claims")
        .select("id, statement_text, knowledge_state, dispute_state, updated_at")
        .eq("subject_person_id", args.personId)
        .limit(40),
    ]);

  for (const row of ranges ?? []) {
    deps.push({
      table: "person_time_ranges",
      id: row.id as string,
      version_token: String(row.updated_at ?? row.id),
    });
  }
  for (const row of chrono ?? []) {
    deps.push({
      table: "person_chronology_editorial",
      id: row.id as string,
      version_token: String(row.updated_at ?? row.id),
    });
  }
  for (const row of rels ?? []) {
    deps.push({
      table: "relationships",
      id: row.id as string,
      version_token: String(row.updated_at ?? row.id),
    });
  }
  for (const row of claims ?? []) {
    deps.push({
      table: "claims",
      id: row.id as string,
      version_token: String(row.updated_at ?? row.id),
    });
  }

  if (!task.retrievalAdapterCodes.includes("sefaria")) {
    retrievalNotes.push(
      "Sefaria adapter not enabled for this task.",
    );
  }
  retrievalNotes.push(
    `If a catalogued source lacks an adapter: ${NO_RETRIEVAL_PATH_MESSAGE}`,
  );

  const context: Record<string, unknown> = {
    person,
    names: names ?? [],
    time_ranges: ranges ?? [],
    generation_memberships: gens ?? [],
    chronology_editorial: chrono ?? [],
    chronology_constraints: constraints ?? [],
    relationships: (rels ?? []).slice(0, 30),
    claims: (claims ?? []).slice(0, 30),
    task_type: args.taskType,
    retrieval_notes: retrievalNotes,
  };

  // Task-selective trimming
  if (args.taskType === "chronology.propose") {
    delete context.claims;
  }
  if (args.taskType === "draft.person.biography") {
    // keep claims + relationships
  }

  return {
    entityType: "person",
    entityId: args.personId,
    taskType: args.taskType,
    context,
    dependencySet: deps,
    dependencyFingerprint: fingerprintDependencies(deps),
    retrievalNotes,
  };
}

// silence unused type if needed
void (null as unknown as SupabaseLike);
