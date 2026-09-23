// Puts every geography claim back on the source list the editors originally recorded (HEAD), so the
// verification pass can be re-run from a clean starting point after its matching rules change.
// Only the source lists and the citation records they need are touched: place summaries, institutions
// and every other edit made since the last commit stay as they are.
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');

const root = path.join(__dirname, '../..');
const pilotPath = path.join(root, 'src/components/knowledge/pilot.json');
const pilot = JSON.parse(fs.readFileSync(pilotPath, 'utf8'));
const head = JSON.parse(execFileSync('git', ['show', 'HEAD:src/components/knowledge/pilot.json'], {cwd: root, maxBuffer: 1e9}).toString('utf8'));

// Exact duplicate records removed earlier in this session; their references point at the survivor.
const merged = new Map([
  ['dd6bf90f-1f66-518c-be25-2baa57732a23', '5f16f034-12f1-5241-85ba-80e309aa94a1'],
  ['ae74eca0-8bb0-53ad-a441-c898abba6018', '4f1bf4d9-a5ff-5c4f-a5fa-6c6cd1c768bd'],
]);
const byId = new Map(pilot.citations.map((c) => [c.id, c]));
const headById = new Map(head.citations.map((c) => [c.id, c]));

const restore = (ids) => [...new Set((ids || []).map((id) => merged.get(id) || id))];
const rows = (source) => [...source.personPlaces, ...source.events, ...source.institutions];
const headRow = new Map(rows(head.geography).map((r) => [r.id, r]));
let touched = 0;
let recovered = 0;

for (const row of rows(pilot.geography)) {
  const before = headRow.get(row.id);
  if (!before) continue;
  const ids = restore(before.sourceIds);
  if (JSON.stringify(ids) !== JSON.stringify(row.sourceIds)) touched++;
  row.sourceIds = ids;
}
const headPlace = new Map(head.geography.places.map((p) => [p.id, p]));
for (const place of pilot.geography.places) {
  const before = headPlace.get(place.id);
  if (!before) continue;
  for (const key of ['sourceIds', 'overviewSourceIds']) {
    if (!Array.isArray(before[key])) continue;
    const ids = restore(before[key]);
    if (JSON.stringify(ids) !== JSON.stringify(place[key])) touched++;
    place[key] = ids;
  }
}

// Any record the restored lists need but the current file dropped comes back from HEAD unchanged.
for (const row of [...rows(pilot.geography), ...pilot.geography.places]) {
  for (const key of ['sourceIds', 'overviewSourceIds']) {
    for (const id of row[key] || []) {
      if (byId.has(id)) continue;
      const record = headById.get(id);
      if (!record) continue;
      pilot.citations.push(record);
      byId.set(id, record);
      recovered++;
    }
  }
}

fs.writeFileSync(pilotPath, JSON.stringify(pilot));
console.log(`geography source lists reset: ${touched}; citation records recovered: ${recovered}; citations: ${pilot.citations.length}`);
