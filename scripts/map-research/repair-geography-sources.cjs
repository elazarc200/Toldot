/**
 * Restores geography source associations from the pre-verifier baseline.
 *
 * Baseline: last committed personPlaces/events/institutions/place source lists (HEAD),
 * overlaid with docs/research/sage-place-research.json for curated sage-place pairs.
 *
 * Does not walk or rewrite people, edges, or teachings.
 * Does not overwrite citation records that the transmission tree still references.
 * Missing geography citation records are copied from HEAD or created from the research file.
 */
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {uuidFrom} = require('./sefaria-utils.cjs');

const root = path.join(__dirname, '../..');
const pilotPath = path.join(root, 'src/components/knowledge/pilot.json');
const researchPath = path.join(root, 'docs/research/sage-place-research.json');

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function treeCitationIds(pilot) {
  const ids = new Set();
  function walk(node) {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== 'object') return;
    for (const [key, value] of Object.entries(node)) {
      if (/^(citations|citation|source_citation_ids)$/.test(key)) {
        (Array.isArray(value) ? value : [value]).forEach((v) => typeof v === 'string' && ids.add(v));
      }
      walk(value);
    }
  }
  walk({
    people: pilot.people,
    edges: pilot.edges,
    teachings: pilot.teachings,
    stories: pilot.stories,
    themes: pilot.themes,
    relationships: pilot.relationships,
    periods: pilot.periods,
  });
  return ids;
}

function citationId(url, label) {
  return uuidFrom(`${url || ''}|${label || ''}`);
}

function main() {
  const pilot = loadJson(pilotPath);
  const research = loadJson(researchPath);
  const head = JSON.parse(execFileSync('git', ['show', 'HEAD:src/components/knowledge/pilot.json'], {cwd: root, maxBuffer: 1e9}).toString('utf8'));
  const byId = new Map(pilot.citations.map((c) => [c.id, c]));
  const headById = new Map(head.citations.map((c) => [c.id, c]));
  const protectedIds = treeCitationIds(pilot);
  const peopleBySlug = Object.fromEntries(pilot.people.map((p) => [p.slug, p]));
  const placesBySlug = Object.fromEntries(pilot.geography.places.map((p) => [p.slug, p]));

  let recovered = 0;
  function ensureRecord(id, fallback) {
    if (byId.has(id)) return id;
    const record = headById.get(id) || fallback;
    if (!record) return null;
    const copy = JSON.parse(JSON.stringify(record));
    copy.id = id;
    pilot.citations.push(copy);
    byId.set(id, copy);
    recovered++;
    return id;
  }

  function restoreList(ids) {
    return [...new Set((ids || []).map((id) => ensureRecord(id, headById.get(id))).filter(Boolean))];
  }

  const headPP = new Map(head.geography.personPlaces.map((r) => [r.id, r]));
  let restoredRows = 0;
  for (const row of pilot.geography.personPlaces) {
    const before = headPP.get(row.id);
    if (!before) continue;
    const next = restoreList(before.sourceIds);
    if (JSON.stringify(next) !== JSON.stringify(row.sourceIds)) restoredRows++;
    row.sourceIds = next;
    delete row.sourceIdsReviewed;
  }

  const headEv = new Map((head.geography.events || []).map((r) => [r.id, r]));
  for (const row of pilot.geography.events || []) {
    const before = headEv.get(row.id);
    if (before) row.sourceIds = restoreList(before.sourceIds);
  }
  const headIn = new Map((head.geography.institutions || []).map((r) => [r.id, r]));
  for (const row of pilot.geography.institutions || []) {
    const before = headIn.get(row.id);
    if (before) row.sourceIds = restoreList(before.sourceIds);
  }
  const headPlace = new Map(head.geography.places.map((p) => [p.id, p]));
  for (const place of pilot.geography.places) {
    const before = headPlace.get(place.id);
    if (!before) continue;
    place.sourceIds = restoreList(before.sourceIds);
    place.overviewSourceIds = restoreList(before.overviewSourceIds);
  }

  let researchRows = 0;
  for (const rel of research.relationships || []) {
    const person = peopleBySlug[rel.personSlug];
    const place = placesBySlug[rel.placeSlug];
    if (!person || !place) continue;
    const row = pilot.geography.personPlaces.find((pp) => pp.personId === person.id && pp.placeId === place.id);
    if (!row) continue;
    const ids = [];
    for (const src of rel.sources || []) {
      if (!src.url && !src.labelHe) continue;
      const id = citationId(src.url, src.labelHe);
      if (!byId.has(id) && !protectedIds.has(id)) {
        const fromHead = headById.get(id);
        ensureRecord(id, fromHead || {
          id,
          label: src.labelHe,
          url: src.url || '',
          text: src.text || '',
          edition: src.ref || '',
          license: src.kind === 'primary_rabbinic' ? 'Public Domain' : 'Research',
          textKind: src.text ? 'verbatim' : undefined,
        });
      }
      if (byId.has(id) || protectedIds.has(id)) ids.push(id);
    }
    if (ids.length) {
      row.sourceIds = [...new Set(ids)];
      researchRows++;
    }
  }

  // Restore HEAD citation payload for geography-only records the verifier rewrote in place.
  let textsRestored = 0;
  const geoIds = new Set();
  for (const row of [...pilot.geography.personPlaces, ...(pilot.geography.events || []), ...(pilot.geography.institutions || [])]) {
    (row.sourceIds || []).forEach((id) => geoIds.add(id));
  }
  for (const place of pilot.geography.places) {
    (place.sourceIds || []).forEach((id) => geoIds.add(id));
    (place.overviewSourceIds || []).forEach((id) => geoIds.add(id));
  }
  for (const id of geoIds) {
    if (protectedIds.has(id)) continue;
    const now = byId.get(id);
    const was = headById.get(id);
    if (!now || !was) continue;
    if ((was.url && was.url !== now.url) || (was.text || '') !== (now.text || '')) {
      now.url = was.url;
      now.text = was.text;
      now.label = was.label;
      now.textKind = was.textKind;
      delete now.support;
      textsRestored++;
    }
  }

  fs.writeFileSync(pilotPath, JSON.stringify(pilot));
  console.log(JSON.stringify({
    restoredPersonPlaceRowsFromHead: restoredRows,
    researchPersonPlaceRows: researchRows,
    citationRecordsRecovered: recovered,
    geographyOnlyTextsRestored: textsRestored,
    personPlaces: pilot.geography.personPlaces.length,
    citations: pilot.citations.length,
  }, null, 2));
}

main();
