const pilot = require("../../src/components/knowledge/pilot.json");
const research = require("../../docs/research/sage-place-research.json");

const auditSlugs = new Set(research.audit.map((a) => a.slug));
const peopleSlugs = pilot.people.map((p) => p.slug);
const missingAudit = peopleSlugs.filter((s) => !auditSlugs.has(s));
const extraAudit = [...auditSlugs].filter((s) => !peopleSlugs.includes(s));

const citationIds = new Set(pilot.citations.map((c) => c.id));
const emptySourceIds = [];
const unresolvedSourceIds = [];
for (const pp of pilot.geography.personPlaces) {
  if (!pp.sourceIds || !pp.sourceIds.length) {
    emptySourceIds.push(pp.id);
  }
  for (const id of pp.sourceIds || []) {
    if (!citationIds.has(id)) unresolvedSourceIds.push({ pp: pp.id, id });
  }
}

const peopleById = Object.fromEntries(pilot.people.map((p) => [p.id, p]));
const placesById = Object.fromEntries(
  pilot.geography.places.map((p) => [p.id, p])
);
const tarfon = pilot.people.find((p) => p.slug === "tarfon");
const lod = pilot.geography.places.find((p) => p.slug === "lod");
const tarfonLod = pilot.geography.personPlaces.find(
  (pp) => pp.personId === tarfon.id && pp.placeId === lod.id
);

const skipped = [
  ["shimon-yohai", "pekiin"],
  ["meir", "tiberias"],
  ["elazar-kappar", "lod"],
].map(([ps, pls]) => {
  const person = pilot.people.find((p) => p.slug === ps);
  const place = pilot.geography.places.find((p) => p.slug === pls);
  const hit = pilot.geography.personPlaces.find(
    (pp) => pp.personId === person.id && pp.placeId === place.id
  );
  return { pair: `${ps}↔${pls}`, present: !!hit };
});

const relTypes = new Set(
  pilot.geography.personPlaces.map((pp) => pp.relationshipType)
);
const allowed = new Set([
  "lived",
  "studied",
  "taught",
  "served",
  "visited",
  "event",
  "documented_presence",
  "other",
]);
const badTypes = [...relTypes].filter((t) => !allowed.has(t));

const report = {
  auditCount: research.audit.length,
  peopleCount: peopleSlugs.length,
  missingAudit,
  extraAudit,
  emptySourceIds: emptySourceIds.length,
  unresolvedSourceIds: unresolvedSourceIds.length,
  tarfonHasLod: !!tarfonLod,
  tarfonLodActivity: tarfonLod?.activity,
  tarfonLodSources: tarfonLod?.sourceIds?.length,
  skippedPairsStillPresent: skipped.filter((s) => s.present),
  badTypes,
  counts: {
    researchNewPlaces: research.newPlaces.length,
    researchRelationships: research.relationships.length,
    pilotPlaces: pilot.geography.places.length,
    pilotPersonPlaces: pilot.geography.personPlaces.length,
    pilotCitations: pilot.citations.length,
    peopleWithPlaces: pilot.geography.coverage.peopleWithPlaces,
    auditWithPlaces: research.audit.filter((a) => a.relationshipsAdded > 0)
      .length,
    auditNoPlace: research.audit.filter((a) => a.noDocumentedPlace).length,
  },
};

console.log(JSON.stringify(report, null, 2));
if (
  missingAudit.length ||
  emptySourceIds.length ||
  unresolvedSourceIds.length ||
  !tarfonLod ||
  badTypes.length
) {
  process.exitCode = 1;
}
