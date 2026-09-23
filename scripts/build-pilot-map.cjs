/**
 * Splits pilot.json into a slim map bundle and a lazy-load citation corpus.
 * Map client code imports pilot-map.json only; citations load on demand.
 */
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const pilotPath = path.join(root, 'src/components/knowledge/pilot.json');
const mapPath = path.join(root, 'src/components/knowledge/pilot-map.json');
const citationsPath = path.join(root, 'public/data/pilot-citations.json');

const pilot = JSON.parse(fs.readFileSync(pilotPath, 'utf8'));

const mapBundle = {
  geography: pilot.geography,
  periods: pilot.periods,
  people: pilot.people.map((person) => ({
    id: person.id,
    slug: person.slug,
    name: person.name,
    chronology: person.chronology ?? null,
  })),
};

const citationsBundle = {
  generatedFrom: 'pilot.json',
  citations: pilot.citations,
};

fs.mkdirSync(path.dirname(citationsPath), { recursive: true });
fs.writeFileSync(mapPath, JSON.stringify(mapBundle));
fs.writeFileSync(citationsPath, JSON.stringify(citationsBundle));

const mapBytes = fs.statSync(mapPath).size;
const citBytes = fs.statSync(citationsPath).size;
console.log(
  JSON.stringify({
    mapKb: +(mapBytes / 1024).toFixed(1),
    citationsKb: +(citBytes / 1024).toFixed(1),
    people: mapBundle.people.length,
    places: mapBundle.geography.places.length,
  }),
);
