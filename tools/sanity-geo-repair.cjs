const p = require('../src/components/knowledge/pilot.json');
const audit = require('../docs/research/geography-source-audit.json');

const cit = (id) => p.citations.find((c) => c.id === id);
const sage = (id) => p.people.find((s) => s.id === id);
const place = (id) => p.geography.places.find((x) => x.id === id);

function dump(slugPerson, slugPlace) {
  const person = p.people.find((s) => s.slug === slugPerson);
  const loc = p.geography.places.find((x) => x.slug === slugPlace);
  const row = p.geography.personPlaces.find((r) => r.personId === person.id && r.placeId === loc.id);
  console.log(`\n== ${person.name} · ${loc.name} ==`);
  if (!row) {
    console.log('no personPlace row');
    return;
  }
  console.log('display', (row.sourceIds || []).length, 'reviewed', (row.sourceIdsReviewed || []).length);
  for (const id of row.sourceIds || []) {
    const c = cit(id);
    console.log('  SHOW', c?.label, '|', String(c?.text || '').replace(/\s+/g, ' ').slice(0, 100));
  }
  for (const item of row.sourceIdsReviewed || []) {
    if ((row.sourceIds || []).includes(item.id)) continue;
    const c = cit(item.id);
    console.log('  HIDE', item.classification, '|', c?.label);
  }
}

for (const pair of [
  ['antigonos', 'socho'],
  ['shimon-shetach', 'jerusalem'],
  ['yehuda-tabbai', 'jerusalem'],
  ['gamliel-avot1', 'jerusalem'],
  ['shimon-tzadik', 'jerusalem'],
  ['akiva', 'bnei-brak'],
  ['akiva', 'lod'],
  ['yochanan-zakkai', 'yavne'],
  ['rebbi', 'zippori'],
]) dump(pair[0], pair[1]);

function placeDisplay(slug) {
  const loc = p.geography.places.find((x) => x.slug === slug);
  const rows = p.geography.personPlaces.filter((r) => r.placeId === loc.id);
  console.log(`\n#### PLACE ${loc.name} (${rows.length} sages)`);
  for (const row of rows) {
    const person = sage(row.personId);
    const labels = (row.sourceIds || []).map((id) => cit(id)?.label);
    console.log(`- ${person.name}: ${labels.length ? labels.join(' ; ') : '(no displayable source)'}`);
  }
}
for (const slug of ['jerusalem', 'yavne', 'lod', 'zippori', 'socho']) placeDisplay(slug);

const geoUses = [];
for (const row of p.geography.personPlaces) {
  for (const id of row.sourceIds || []) {
    const c = cit(id);
    if (c && /אנטיגנוס איש סוכו קבל/.test(c.text || '')) {
      geoUses.push(`${sage(row.personId).name} · ${place(row.placeId).name}`);
    }
  }
}
console.log('\nAvot 1:3 displayed on', geoUses);
const avot68 = [];
for (const row of p.geography.personPlaces) {
  for (const id of row.sourceIds || []) {
    const c = cit(id);
    if (c && /הנוי והכח/.test(c.text || '')) avot68.push(`${sage(row.personId).name} · ${place(row.placeId).name}`);
  }
}
console.log('Avot 6:8 displayed on', avot68);

const shared = new Map();
for (const row of p.geography.personPlaces) {
  for (const id of row.sourceIds || []) {
    if (!shared.has(id)) shared.set(id, []);
    shared.get(id).push(`${sage(row.personId).name} · ${place(row.placeId).name}`);
  }
}
const reused = [...shared].filter(([, rows]) => new Set(rows).size > 1);
console.log('shared display citation IDs', reused.length);
for (const [id, rows] of reused) {
  console.log(' ', cit(id)?.label, '->', [...new Set(rows)].join(' | '));
}

const empty = p.geography.personPlaces.filter((r) => !(r.sourceIds || []).length).length;
console.log('\npersonPlaces with no displayable source', empty, '/', p.geography.personPlaces.length);
console.log('audit totals', audit.totals);

const counts = {};
for (const a of audit.associations) counts[a.kind] = (counts[a.kind] || 0) + 1;
console.log('associations by kind', counts);
