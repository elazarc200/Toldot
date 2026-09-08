import { z } from "zod";
import {
  type CitationDto,
  type PublicEvidenceItemDto,
  type PublicPersonPageDto,
  type PublicPlacePageDto,
  type PublicPeriodPageDto,
  type PublicRelationshipDto,
  type PublicSearchHitDto,
  type PublicStoryCardDto,
  type PublicTeachingDto,
  uncertaintyLabel,
} from "@/domain/public";
import { isSafeHref } from "@/lib/safe-markdown";

const SIGNIFICANCE_ORDER = ["primary", "major", "supporting", "mentioned"] as const;

function safeUrl(url: unknown): string | null {
  if (typeof url !== "string" || !url.trim()) return null;
  return isSafeHref(url) ? url.trim() : null;
}

function citationFrom(citation: unknown, work: unknown): CitationDto | null {
  const c = citation as Record<string, unknown> | null;
  const w = work as Record<string, unknown> | null;
  if (!c) return null;
  const display = String(c.citation_display ?? "").trim();
  if (!display) return null;
  return {
    display,
    work_title: w?.canonical_title ? String(w.canonical_title) : null,
    external_url: safeUrl(c.external_url),
  };
}

function mapEvidence(claims: unknown): PublicEvidenceItemDto[] {
  if (!Array.isArray(claims)) return [];
  const out: PublicEvidenceItemDto[] = [];
  for (const row of claims) {
    const r = row as { claim?: Record<string, unknown>; evidence?: unknown[] };
    const claim = r.claim;
    if (!claim) continue;
    const evidence = Array.isArray(r.evidence) ? r.evidence : [];
    if (evidence.length === 0) {
      out.push({
        statement: String(claim.statement_text ?? ""),
        stance: null,
        knowledge_state: uncertaintyLabel(String(claim.knowledge_state ?? "unknown")),
        dispute: String(claim.dispute_state ?? "none") !== "none",
        citation: null,
        editorial_note: claim.editorial_note ? String(claim.editorial_note) : null,
      });
      continue;
    }
    for (const ev of evidence) {
      const e = ev as {
        link?: Record<string, unknown>;
        citation?: unknown;
        work?: unknown;
      };
      out.push({
        statement: String(claim.statement_text ?? ""),
        stance: e.link?.stance ? String(e.link.stance) : null,
        knowledge_state: uncertaintyLabel(String(claim.knowledge_state ?? "unknown")),
        dispute: String(claim.dispute_state ?? "none") !== "none",
        citation: citationFrom(e.citation, e.work),
        editorial_note: e.link?.editorial_note
          ? String(e.link.editorial_note)
          : claim.editorial_note
            ? String(claim.editorial_note)
            : null,
      });
    }
  }
  return out;
}

function relationshipRole(
  family: string,
  subjectId: string,
  personAId: string,
): { role: string; counterpartIsB: boolean } {
  if (family === "teacher_student") {
    return subjectId === personAId
      ? { role: "רב (מורה)", counterpartIsB: true }
      : { role: "תלמיד", counterpartIsB: false };
  }
  if (family === "parent_child") {
    return subjectId === personAId
      ? { role: "הורה", counterpartIsB: true }
      : { role: "בן/בת", counterpartIsB: false };
  }
  if (family === "spouse") return { role: "בן/בת זוג", counterpartIsB: subjectId === personAId };
  if (family === "sibling") return { role: "אח/אחות", counterpartIsB: subjectId === personAId };
  if (family === "bar_plugta") return { role: "בר פלוגתא", counterpartIsB: subjectId === personAId };
  return { role: family, counterpartIsB: true };
}

export function mapPersonPayload(
  snapshotId: string,
  payload: unknown,
): PublicPersonPageDto {
  const parsed = z
    .object({
      schema_version: z.number().optional(),
      aggregate_type: z.string().optional(),
      person: z.record(z.string(), z.unknown()),
      canonical_person_id: z.string().uuid().optional(),
    })
    .passthrough()
    .parse(payload);

  const person = parsed.person;
  const personId = String(parsed.canonical_person_id ?? person.id);
  const raw = payload as Record<string, unknown>;

  const names = Array.isArray(raw.names)
    ? (raw.names as Record<string, unknown>[]).map((n) => ({
        text: String(n.name_text ?? ""),
        kind: String(n.name_kind ?? ""),
      }))
    : [];

  const time_ranges = Array.isArray(raw.time_ranges)
    ? (raw.time_ranges as Record<string, unknown>[]).map((tr) => ({
        range_kind: String(tr.range_kind ?? ""),
        start_year: tr.start_year == null ? null : Number(tr.start_year),
        end_year: tr.end_year == null ? null : Number(tr.end_year),
        knowledge_state: uncertaintyLabel(String(tr.knowledge_state ?? "unknown")),
        textual_label: tr.textual_label ? String(tr.textual_label) : null,
      }))
    : [];

  const generations = Array.isArray(raw.generation_memberships)
    ? (raw.generation_memberships as Record<string, unknown>[]).map((g) => {
        const gen = g.generation as Record<string, unknown> | undefined;
        return {
          name_he: String(gen?.name_he ?? ""),
          is_primary: Boolean(g.is_primary),
          knowledge_state: uncertaintyLabel(String(g.knowledge_state ?? "unknown")),
        };
      })
    : [];

  const places = Array.isArray(raw.places)
    ? (raw.places as Record<string, unknown>[]).map((p) => {
        const place = p.place as Record<string, unknown>;
        return {
          id: String(place.id),
          name: String(place.primary_historical_name ?? ""),
          knowledge_state: uncertaintyLabel(String(p.knowledge_state ?? "unknown")),
          slug_hint: null as string | null,
        };
      })
    : [];

  const relationships: PublicRelationshipDto[] = Array.isArray(raw.relationships)
    ? (raw.relationships as Record<string, unknown>[]).map((r) => {
        const family = String(r.family ?? "");
        const aId = String(r.person_a_id ?? "");
        const { role, counterpartIsB } = relationshipRole(family, personId, aId);
        const counterpart = (counterpartIsB ? r.person_b : r.person_a) as
          | Record<string, unknown>
          | undefined;
        return {
          id: String(r.id ?? ""),
          family,
          role_label_he: role,
          counterpart_name: String(counterpart?.primary_display_name ?? ""),
          counterpart_disambiguation: counterpart?.disambiguation_label
            ? String(counterpart.disambiguation_label)
            : null,
          counterpart_id: counterpart?.id ? String(counterpart.id) : null,
          knowledge_state: uncertaintyLabel(String(r.knowledge_state ?? "unknown")),
          disputed: String(r.dispute_state ?? "none") !== "none",
          directional: Boolean(r.is_directional),
        };
      })
    : [];

  const storiesRaw = Array.isArray(raw.stories) ? (raw.stories as Record<string, unknown>[]) : [];
  const stories: PublicStoryCardDto[] = storiesRaw
    .map((s) => {
      const story = s.story as Record<string, unknown>;
      const sig = String(s.significance ?? "mentioned") as PublicStoryCardDto["significance"];
      return {
        id: String(story.id ?? ""),
        title: String(story.title ?? ""),
        retelling: String(story.retelling ?? ""),
        significance: SIGNIFICANCE_ORDER.includes(sig) ? sig : "mentioned",
        editorial_explanation: story.editorial_explanation
          ? String(story.editorial_explanation)
          : null,
      };
    })
    .sort(
      (a, b) =>
        SIGNIFICANCE_ORDER.indexOf(a.significance) -
        SIGNIFICANCE_ORDER.indexOf(b.significance),
    );

  const teachings: PublicTeachingDto[] = Array.isArray(raw.selected_teachings)
    ? (raw.selected_teachings as Record<string, unknown>[])
        .map((t) => {
          const teaching = (t.teaching ?? t) as Record<string, unknown>;
          const cit = citationFrom(t.citation, t.work);
          if (!cit) return null;
          return {
            id: String(teaching.id ?? ""),
            title: teaching.title ? String(teaching.title) : null,
            text: String(teaching.teaching_text ?? teaching.body_text ?? teaching.text ?? ""),
            citation: cit,
          };
        })
        .filter((t): t is PublicTeachingDto => Boolean(t && t.text))
    : [];

  const contemporaries = Array.isArray(raw.contemporaries)
    ? (raw.contemporaries as Record<string, unknown>[]).map((c) => ({
        id: String(c.id),
        name: String(c.primary_display_name ?? ""),
        disambiguation: c.disambiguation_label ? String(c.disambiguation_label) : null,
      }))
    : [];

  const periods = Array.isArray(raw.periods)
    ? (raw.periods as Record<string, unknown>[]).map((p) => {
        const period = p.period as Record<string, unknown>;
        return { id: String(period.id), name_he: String(period.name_he ?? "") };
      })
    : [];

  const events = Array.isArray(raw.events)
    ? (raw.events as Record<string, unknown>[]).map((e) => {
        const event = (e.event ?? e) as Record<string, unknown>;
        return { id: String(event.id), name_he: String(event.name_he ?? "") };
      })
    : [];

  const chronology_editorial = Array.isArray(raw.chronology_editorial)
    ? (raw.chronology_editorial as Record<string, unknown>[]).map((c) => ({
        band: String(c.band ?? "unresolved"),
        note: c.free_text_note ? String(c.free_text_note) : null,
        knowledge_state: uncertaintyLabel(String(c.knowledge_state ?? "unknown")),
      }))
    : [];

  return {
    snapshot_id: snapshotId,
    schema_version: parsed.schema_version ?? 1,
    canonical_person_id: personId,
    primary_display_name: String(person.primary_display_name ?? ""),
    title_honorific: person.title_honorific ? String(person.title_honorific) : null,
    sort_name: String(person.sort_name ?? ""),
    disambiguation_label: person.disambiguation_label
      ? String(person.disambiguation_label)
      : null,
    short_identity_description: person.short_identity_description
      ? String(person.short_identity_description)
      : null,
    biography_md: person.biography_md ? String(person.biography_md) : null,
    names,
    time_ranges,
    generations,
    places,
    relationships,
    stories,
    teachings,
    evidence: mapEvidence(raw.claims),
    contemporaries,
    periods,
    events,
    chronology_editorial,
  };
}

export function mapPlacePayload(
  snapshotId: string,
  payload: unknown,
): PublicPlacePageDto {
  const parsed = z
    .object({
      schema_version: z.number().optional(),
      place: z.record(z.string(), z.unknown()),
    })
    .passthrough()
    .parse(payload);
  const place = parsed.place;
  const raw = payload as Record<string, unknown>;

  return {
    snapshot_id: snapshotId,
    schema_version: parsed.schema_version ?? 1,
    place_id: String(place.id),
    primary_historical_name: String(place.primary_historical_name ?? ""),
    sort_name: String(place.sort_name ?? ""),
    notes: place.notes ? String(place.notes) : null,
    regions: Array.isArray(raw.regions)
      ? (raw.regions as Record<string, unknown>[]).map((r) => {
          const region = r.region as Record<string, unknown>;
          return {
            name_he: String(region.name_he ?? ""),
            is_primary: Boolean(r.is_primary),
          };
        })
      : [],
    identifications: Array.isArray(raw.identifications)
      ? (raw.identifications as Record<string, unknown>[]).map((i) => ({
          modern_name: i.modern_name ? String(i.modern_name) : null,
          latitude: i.latitude == null ? null : Number(i.latitude),
          longitude: i.longitude == null ? null : Number(i.longitude),
          certainty: uncertaintyLabel(String(i.location_certainty ?? "unknown")),
          is_preferred: Boolean(i.is_preferred),
          note: i.editorial_note ? String(i.editorial_note) : null,
        }))
      : [],
    people: Array.isArray(raw.people)
      ? (raw.people as Record<string, unknown>[]).map((p) => {
          const person = p.person as Record<string, unknown>;
          return {
            id: String(person.id),
            name: String(person.primary_display_name ?? ""),
            disambiguation: person.disambiguation_label
              ? String(person.disambiguation_label)
              : null,
          };
        })
      : [],
    evidence: mapEvidence(raw.claims),
  };
}

export function mapPeriodPayload(
  snapshotId: string,
  payload: unknown,
): PublicPeriodPageDto {
  const parsed = z
    .object({
      schema_version: z.number().optional(),
      period: z.record(z.string(), z.unknown()),
    })
    .passthrough()
    .parse(payload);
  const period = parsed.period;
  const raw = payload as Record<string, unknown>;

  return {
    snapshot_id: snapshotId,
    schema_version: parsed.schema_version ?? 1,
    period_id: String(period.id),
    code: String(period.code ?? ""),
    name_he: String(period.name_he ?? ""),
    overview: period.overview ? String(period.overview) : null,
    start_year: period.start_year == null ? null : Number(period.start_year),
    end_year: period.end_year == null ? null : Number(period.end_year),
    knowledge_state: uncertaintyLabel(String(period.knowledge_state ?? "unknown")),
    textual_label: period.textual_label ? String(period.textual_label) : null,
    episodes: Array.isArray(raw.episodes)
      ? (raw.episodes as Record<string, unknown>[]).map((e) => ({
          id: String(e.id),
          name_he: String(e.name_he ?? ""),
          overview: e.overview ? String(e.overview) : null,
        }))
      : [],
    events: Array.isArray(raw.events)
      ? (raw.events as Record<string, unknown>[]).map((e) => ({
          id: String(e.id),
          name_he: String(e.name_he ?? ""),
          overview: e.overview ? String(e.overview) : null,
        }))
      : [],
    people: Array.isArray(raw.people)
      ? (raw.people as Record<string, unknown>[]).map((p) => {
          const person = p.person as Record<string, unknown>;
          return {
            id: String(person.id),
            name: String(person.primary_display_name ?? ""),
            disambiguation: person.disambiguation_label
              ? String(person.disambiguation_label)
              : null,
          };
        })
      : [],
    evidence: mapEvidence(raw.claims),
  };
}

export function mapSearchHit(row: Record<string, unknown>): PublicSearchHitDto {
  return {
    aggregate_type: String(row.aggregate_type),
    aggregate_id: String(row.aggregate_id),
    primary_name: String(row.primary_name ?? ""),
    disambiguation: row.disambiguation ? String(row.disambiguation) : null,
    href_path: String(row.href_path ?? "/"),
    anchor: row.anchor ? String(row.anchor) : null,
  };
}
