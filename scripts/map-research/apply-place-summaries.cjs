// Merges the editorial place summaries into pilot.json. Every place gets a `summary` field so the
// UI can rely on it, and the methodological `overview` text is left untouched.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '../..');
const pilotPath = path.join(root, 'src/components/knowledge/pilot.json');
const pilot = JSON.parse(fs.readFileSync(pilotPath, 'utf8'));
const {summaries} = JSON.parse(fs.readFileSync(path.join(root, 'docs/research/place-summaries.json'), 'utf8'));

const missing = [];
let written = 0;
for (const place of pilot.geography.places) {
  const summary = summaries[place.slug];
  if (summary) written++;
  else missing.push(`${place.name} (${place.slug})`);
  place.summary = summary || '';
}
const unknown = Object.keys(summaries).filter((slug) => !pilot.geography.places.some((p) => p.slug === slug));

fs.writeFileSync(pilotPath, JSON.stringify(pilot));
console.log(`summaries written: ${written}/${pilot.geography.places.length}`);
if (missing.length) console.log('without summary: ' + missing.join(', '));
if (unknown.length) console.log('unknown slugs in summaries file: ' + unknown.join(', '));
