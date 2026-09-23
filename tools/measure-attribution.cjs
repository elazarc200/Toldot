// Read-only: measure how many geography sourceIds were retargeted off their original ref.
const report = require('./citation-verification.json');
const {execFileSync} = require('child_process');
const head = JSON.parse(execFileSync('git', ['show', 'HEAD:src/components/knowledge/pilot.json'], {maxBuffer: 1e9}).toString('utf8'));
const cur = require('../src/components/knowledge/pilot.json');

function bookish(ref) {
  return String(ref || '')
    .replace(/_/g, ' ')
    .replace(/[.:]\d+[ab]?(:\d+)*$/i, '')
    .replace(/\s+\d+[ab]?$/i, '')
    .trim()
    .toLowerCase();
}
function leaf(ref) {
  return String(ref || '').replace(/_/g, ' ').toLowerCase();
}

const jumpedBook = [];
const jumpedLeaf = [];
const same = [];
for (const t of report.retargeted || []) {
  if (bookish(t.from) !== bookish(t.to)) jumpedBook.push(t);
  else if (leaf(t.from) !== leaf(t.to)) jumpedLeaf.push(t);
  else same.push(t);
}

console.log('verification report totals', report.totals);
console.log('retargeted', (report.retargeted || []).length);
console.log('  same leaf (excerpt only)', same.length);
console.log('  same work, different leaf', jumpedLeaf.length);
console.log('  different work/chapter-parent', jumpedBook.length);

const avotJumps = jumpedLeaf.filter((t) => /avot/i.test(t.from) || /avot/i.test(t.to));
console.log('\nAvot retargets to a different mishnah:');
for (const t of avotJumps) console.log(`  ${t.claim}: ${t.from} -> ${t.to} [${t.support}]`);

const shared = new Map();
for (const row of cur.geography.personPlaces) {
  for (const id of row.sourceIds || []) {
    if (!shared.has(id)) shared.set(id, []);
    const person = cur.people.find((p) => p.id === row.personId);
    const place = cur.geography.places.find((p) => p.id === row.placeId);
    shared.get(id).push(`${person?.name} · ${place?.name}`);
  }
}
const reused = [...shared].filter(([, rows]) => new Set(rows).size > 1);
console.log('\npersonPlace citation IDs reused across distinct sage-place claims:', reused.length);
const antigonusId = '383d5def-48f7-51d6-897b-b8d93e7b76de';
console.log('Avot 1:3 citation attached to:', (shared.get(antigonusId) || []).join(' | '));
const avot68 = '015badb3-e62e-527d-860d-82b9ed541661';
console.log('Avot 6:8 citation attached to:', (shared.get(avot68) || []).join(' | '));

const headRow = new Map(head.geography.personPlaces.map((r) => [r.id, r]));
let rowsChanged = 0;
let idsAdded = 0;
let idsRemoved = 0;
for (const row of cur.geography.personPlaces) {
  const before = headRow.get(row.id);
  if (!before) continue;
  const a = new Set(before.sourceIds || []);
  const b = new Set(row.sourceIds || []);
  const added = [...b].filter((id) => !a.has(id));
  const removed = [...a].filter((id) => !b.has(id));
  if (added.length || removed.length) {
    rowsChanged++;
    idsAdded += added.length;
    idsRemoved += removed.length;
  }
}
console.log('\nHEAD vs current personPlaces sourceId churn:');
console.log(`  rows whose sourceIds changed: ${rowsChanged}/${cur.geography.personPlaces.length}`);
console.log(`  ids added: ${idsAdded}, ids removed/replaced: ${idsRemoved}`);

const supportCounts = {};
for (const t of [...(report.retargeted || []), ...(report.unchanged || [])]) {
  supportCounts[t.support] = (supportCounts[t.support] || 0) + 1;
}
console.log('\nsupport labels on verified geography claims', supportCounts);
console.log('unverified', (report.unverified || []).length, 'skipped (non-sefaria)', (report.skipped || []).length);
