// Read-only tracer: follow the three reported mis-attributions through pilot.json.
const p = require('../src/components/knowledge/pilot.json');

const cit = (id) => p.citations.find((c) => c.id === id);
const sage = (id) => p.people.find((s) => s.id === id);
const place = (id) => p.geography.places.find((x) => x.id === id);
const bySlug = (slug) => p.people.find((s) => s.slug === slug);
const placeBySlug = (slug) => p.geography.places.find((x) => x.slug === slug);

function snippet(text) {
  return String(text || '').replace(/\s+/g, ' ').slice(0, 140);
}

function dumpRow(row, extra) {
  const person = sage(row.personId);
  const loc = place(row.placeId);
  console.log(`\n=== ${person?.name} (${person?.slug}) · ${loc?.name} (${loc?.slug}) ===`);
  console.log(`activity=${row.activity} | type=${row.relationshipType} | importance=${row.importance}`);
  if (extra) console.log(extra);
  for (const id of row.sourceIds || []) {
    const c = cit(id);
    console.log(`  [${id}] ${c?.label}`);
    console.log(`    url=${c?.url}`);
    console.log(`    support=${c?.support || ''} kind=${c?.textKind || ''} verifiedAt=${c?.verifiedAt || ''}`);
    console.log(`    text=${snippet(c?.text)}`);
  }
}

const jerusalem = placeBySlug('jerusalem');
const antigonos = bySlug('antigonos');
const shimonShetach = bySlug('shimon-shetach');
const yehudaTabbai = bySlug('yehuda-tabbai');
const shimonTzadik = bySlug('shimon-tzadik');

console.log('--- IDs ---');
console.log({
  jerusalem: jerusalem?.id,
  antigonos: antigonos?.id,
  shimonShetach: shimonShetach?.id,
  yehudaTabbai: yehudaTabbai?.id,
  shimonTzadik: shimonTzadik?.id,
});

console.log('\n######## 1. Jerusalem sage-place rows whose excerpt looks like Avot 1:3 / Antigonus ########');
const avot13 = /אנטיגנוס|קיבל משמעון|קבל משמעון/;
for (const row of p.geography.personPlaces.filter((r) => r.placeId === jerusalem.id)) {
  const hits = (row.sourceIds || []).filter((id) => avot13.test(`${cit(id)?.text || ''} ${cit(id)?.label || ''}`));
  if (hits.length) dumpRow(row, `matched citation ids: ${hits.join(', ')}`);
}

console.log('\n######## 1b. All Jerusalem rows (compact) ########');
for (const row of p.geography.personPlaces.filter((r) => r.placeId === jerusalem.id)) {
  const person = sage(row.personId);
  const labels = (row.sourceIds || []).map((id) => `${cit(id)?.label} :: ${snippet(cit(id)?.text)}`);
  console.log(`- ${person?.name}:`);
  labels.forEach((l) => console.log(`    ${l}`));
}

console.log('\n######## 2. Antigonus rows + any row quoting Antigonus that is not Antigonus ########');
for (const row of p.geography.personPlaces.filter((r) => r.personId === antigonos.id)) dumpRow(row);
for (const row of p.geography.personPlaces) {
  if (row.personId === antigonos.id) continue;
  const hits = (row.sourceIds || []).filter((id) => /אנטיגנוס/.test(`${cit(id)?.text || ''} ${cit(id)?.label || ''}`));
  if (hits.length) dumpRow(row, 'HAS ANTIGONUS TEXT');
}

console.log('\n######## 3. Yehuda ben Tabbai rows ########');
for (const row of p.geography.personPlaces.filter((r) => r.personId === yehudaTabbai.id)) dumpRow(row);

console.log('\n######## 3b. Any geography row quoting "הנוי והכח" ########');
const beauty = /הנוי והכח|שמעון בן יהודה משום/;
for (const row of p.geography.personPlaces) {
  const hits = (row.sourceIds || []).filter((id) => beauty.test(`${cit(id)?.text || ''} ${cit(id)?.label || ''}`));
  if (hits.length) dumpRow(row, 'HAS BEAUTY/POWER MISHNAH');
}

console.log('\n######## 4. Jerusalem overviewSourceIds / sourceIds ########');
for (const key of ['sourceIds', 'overviewSourceIds']) {
  console.log(`\nplace.${key}:`);
  for (const id of jerusalem[key] || []) {
    const c = cit(id);
    console.log(`  ${c?.label} | ${c?.url} | ${snippet(c?.text)}`);
  }
}

console.log('\n######## 5. Knowledge-graph edges involving these sages ########');
for (const e of p.edges || []) {
  if (![antigonos.id, shimonShetach.id, yehudaTabbai.id, shimonTzadik.id].includes(e.a) &&
      ![antigonos.id, shimonShetach.id, yehudaTabbai.id, shimonTzadik.id].includes(e.b)) continue;
  const a = sage(e.a)?.name;
  const b = sage(e.b)?.name;
  console.log(`edge ${a} --${e.family}/${e.state}--> ${b} :: ${e.note}`);
  for (const id of e.citations || []) {
    const c = cit(id);
    console.log(`    ${c?.label} | ${snippet(c?.text)}`);
  }
}

console.log('\n######## 6. Person-level citations for these sages ########');
for (const person of [antigonos, shimonShetach, yehudaTabbai, shimonTzadik]) {
  const ids = new Set([
    ...(person.summary?.citations || []),
    ...(person.teachings || []).map((t) => t.citation),
    ...(person.facts || []).flatMap((f) => f.citations || []),
  ]);
  console.log(`\n${person.name} person-level citations:`);
  for (const id of ids) {
    const c = cit(id);
    console.log(`  ${c?.label} | ${snippet(c?.text)}`);
  }
}
