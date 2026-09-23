const fs = require('fs');
const path = require('path');

const pilotPath = path.join(__dirname, '..', 'src', 'components', 'knowledge', 'pilot.json');
const pilot = JSON.parse(fs.readFileSync(pilotPath, 'utf8'));

const replacements = new Map([
  ['dd6bf90f-1f66-518c-be25-2baa57732a23', '5f16f034-12f1-5241-85ba-80e309aa94a1'],
  ['ae74eca0-8bb0-53ad-a441-c898abba6018', '4f1bf4d9-a5ff-5c4f-a5fa-6c6cd1c768bd'],
]);

function remap(value) {
  if (typeof value === 'string') return replacements.get(value) || value;
  if (Array.isArray(value)) return [...new Set(value.map(remap))];
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) value[key] = remap(child);
  }
  return value;
}

remap(pilot);
const seenCitationIds = new Set();
pilot.citations = pilot.citations.filter((citation) => {
  if (seenCitationIds.has(citation.id)) return false;
  seenCitationIds.add(citation.id);
  return true;
});
fs.writeFileSync(pilotPath, JSON.stringify(pilot));
console.log(`Removed ${replacements.size} exact duplicate citations and remapped references.`);
