/**
 * Applies docs/research/sage-place-research.json onto pilot.json geography.
 */
const fs = require("fs");
const path = require("path");
const { uuidFrom } = require("./sefaria-utils.cjs");

const ROOT = path.join(__dirname, "../..");
const PILOT_PATH = path.join(ROOT, "src/components/knowledge/pilot.json");
const RESEARCH_PATH = path.join(ROOT, "docs/research/sage-place-research.json");
const AUDIT_MD = path.join(ROOT, "docs/research/sage-place-audit.md");

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function citationId(url, label) {
  return uuidFrom(`${url || ""}|${label || ""}`);
}

function ensureCitation(pilot, source) {
  const id = citationId(source.url, source.labelHe);
  const existing = pilot.citations.find((c) => c.id === id);
  if (existing) return id;
  pilot.citations.push({
    id,
    label: source.labelHe,
    url: source.url || "",
    text: source.text || "",
    edition: source.ref || "",
    license: source.kind === "primary_rabbinic" ? "Public Domain" : "Research",
  });
  return id;
}

function placeFromResearch(place) {
  return {
    id: uuidFrom(`place:${place.slug}`),
    slug: place.slug,
    name: place.nameHe,
    today: place.todayHe || "",
    overview: place.overviewHe || "",
    identification: place.identification,
    identificationNote: place.identificationNoteHe || "",
    locations: (place.locations || []).map((l) => ({
      id: l.id,
      lng: l.lng,
      lat: l.lat,
      label: l.label,
      disputed: !!l.disputed,
    })),
    sourceIds: Array.isArray(place.sourceIds) ? [...place.sourceIds] : [],
  };
}

function main() {
  const pilot = loadJson(PILOT_PATH);
  const research = loadJson(RESEARCH_PATH);

  const peopleBySlug = Object.fromEntries(pilot.people.map((p) => [p.slug, p]));
  const placesBySlug = Object.fromEntries(
    pilot.geography.places.map((p) => [p.slug, p])
  );

  let placesAdded = 0;
  for (const np of research.newPlaces || []) {
    if (placesBySlug[np.slug]) continue;
    const place = placeFromResearch(np);
    pilot.geography.places.push(place);
    placesBySlug[np.slug] = place;
    placesAdded++;
  }

  let relationshipsAdded = 0;
  let relationshipsMerged = 0;

  for (const rel of research.relationships || []) {
    const person = peopleBySlug[rel.personSlug];
    const place = placesBySlug[rel.placeSlug];
    if (!person) throw new Error(`Unknown personSlug: ${rel.personSlug}`);
    if (!place) throw new Error(`Unknown placeSlug: ${rel.placeSlug}`);

    const sourceIds = [];
    for (const src of rel.sources || []) {
      if (!src.url && !src.labelHe) continue;
      sourceIds.push(ensureCitation(pilot, src));
    }
    if (!sourceIds.length) {
      throw new Error(
        `Relationship ${rel.personSlug}↔${rel.placeSlug} has no usable sources`
      );
    }

    const existing = pilot.geography.personPlaces.find(
      (pp) => pp.personId === person.id && pp.placeId === place.id
    );

    if (existing) {
      const merged = [...new Set([...(existing.sourceIds || []), ...sourceIds])];
      const preferNew =
        (rel.sources || []).length > (existing.sourceIds || []).length;
      existing.sourceIds = merged;
      existing.relationshipType = rel.relationshipType;
      if (preferNew) {
        if (rel.activityHe) existing.activity = rel.activityHe;
        if (rel.noteHe) existing.note = rel.noteHe;
        if (rel.importance) existing.importance = rel.importance;
        if (rel.importanceNoteHe) existing.importanceNote = rel.importanceNoteHe;
        if (rel.timeNoteHe) existing.timeNote = rel.timeNoteHe;
        if (rel.state) existing.state = rel.state;
        if (Array.isArray(rel.periodIds) && rel.periodIds.length) {
          existing.periodIds = rel.periodIds;
        }
        if (rel.start !== undefined) existing.start = rel.start;
        if (rel.end !== undefined) existing.end = rel.end;
      } else if (!existing.relationshipType) {
        existing.relationshipType = rel.relationshipType;
      }
      relationshipsMerged++;
    } else {
      pilot.geography.personPlaces.push({
        id: uuidFrom(`personPlace:${person.id}:${place.id}`),
        personId: person.id,
        placeId: place.id,
        activity: rel.activityHe || "",
        importance: rel.importance || "minor",
        start: rel.start ?? null,
        end: rel.end ?? null,
        periodIds: Array.isArray(rel.periodIds) ? rel.periodIds : [],
        sourceIds,
        note: rel.noteHe || "",
        state: rel.state || "known",
        timeNote: rel.timeNoteHe || "",
        importanceNote: rel.importanceNoteHe || "",
        relationshipType: rel.relationshipType,
      });
      relationshipsAdded++;
    }
  }

  // Ensure every personPlace has relationshipType if missing (legacy rows untouched by research)
  for (const pp of pilot.geography.personPlaces) {
    if (!pp.relationshipType) pp.relationshipType = "other";
  }

  const peopleWithPlaces = new Set(
    pilot.geography.personPlaces.map((pp) => pp.personId)
  ).size;
  pilot.geography.coverage = {
    ...(pilot.geography.coverage || {}),
    totalPeople: pilot.people.length,
    peopleWithPlaces,
    reviewed: research.generatedAt || "2026-09-16",
    note:
      (pilot.geography.coverage && pilot.geography.coverage.note) ||
      "מיפוי מקורות ראשון, לא רשימה ממצה של מקומות הפעילות.",
  };
  pilot.updated = research.generatedAt || pilot.updated;

  fs.writeFileSync(PILOT_PATH, JSON.stringify(pilot), "utf8");

  const lines = [];
  lines.push("# Sage ↔ Place research audit");
  lines.push("");
  lines.push(`Generated: ${research.generatedAt}`);
  lines.push(`Method: ${research.method}`);
  lines.push("");
  lines.push("## Per sage");
  lines.push("");
  for (const a of research.audit || []) {
    lines.push(`### ${a.name} (\`${a.slug}\`)`);
    lines.push(`- reviewed: ${a.reviewed}`);
    lines.push(`- relationshipsAdded: ${a.relationshipsAdded}`);
    lines.push(
      `- placesFound: ${a.placesFound.length ? a.placesFound.join(", ") : "—"}`
    );
    lines.push(
      `- primarySourcesChecked: ${
        a.primarySourcesChecked.length
          ? a.primarySourcesChecked.join("; ")
          : "—"
      }`
    );
    lines.push(
      `- unresolved: ${a.unresolved.length ? a.unresolved.join("; ") : "—"}`
    );
    lines.push(`- noDocumentedPlace: ${a.noDocumentedPlace}`);
    lines.push("");
  }

  lines.push("## Totals");
  lines.push("");
  lines.push(`- audit entries: ${(research.audit || []).length}`);
  lines.push(`- new places in research file: ${(research.newPlaces || []).length}`);
  lines.push(`- relationships in research file: ${(research.relationships || []).length}`);
  lines.push(`- places added to pilot this pass: ${placesAdded}`);
  lines.push(`- personPlaces created: ${relationshipsAdded}`);
  lines.push(`- personPlaces merged: ${relationshipsMerged}`);
  lines.push(`- peopleWithPlaces (coverage): ${peopleWithPlaces}`);
  lines.push(`- total places in pilot: ${pilot.geography.places.length}`);
  lines.push(`- total personPlaces in pilot: ${pilot.geography.personPlaces.length}`);
  lines.push(`- total citations in pilot: ${pilot.citations.length}`);
  lines.push("");

  fs.writeFileSync(AUDIT_MD, lines.join("\n"), "utf8");

  console.log(
    JSON.stringify(
      {
        placesAdded,
        relationshipsAdded,
        relationshipsMerged,
        peopleWithPlaces,
        totalPlaces: pilot.geography.places.length,
        totalPersonPlaces: pilot.geography.personPlaces.length,
        totalCitations: pilot.citations.length,
      },
      null,
      2
    )
  );
}

main();
