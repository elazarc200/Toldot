const p = require('../src/components/knowledge/pilot.json');
const citations = p.citations;

function normalize(value) {
  return String(value || '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/https?:\/\/(www\.)?/, '')
    .replace(/[?#].*$/, '')
    .replace(/[^a-z0-9\u0590-\u05ff]/g, '');
}

function sourceKey(citation) {
  try {
    const parsed = new URL(citation.url);
    if (parsed.hostname.endsWith('sefaria.org')) {
      return `sefaria:${decodeURIComponent(parsed.pathname)
        .replace(/^\/+/, '')
        .replace(/[_:]/g, '.')
        .replace(/\.+/g, '.')
        .toLowerCase()}`;
    }
    return `${parsed.hostname}${parsed.pathname}${parsed.search}`.toLowerCase();
  } catch {
    return citation.id;
  }
}

console.log('count', citations.length);
const groups = new Map();
for (const citation of citations) {
  for (const key of [normalize(citation.url), normalize(citation.label)].filter(Boolean)) {
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(citation);
  }
}

const seen = new Set();
for (const group of groups.values()) {
  const ids = [...new Set(group.map((citation) => citation.id))];
  if (ids.length < 2) continue;
  const signature = ids.sort().join('|');
  if (seen.has(signature)) continue;
  seen.add(signature);
  console.log(
    'DUP',
    group
      .map((citation) => `${citation.id}\t${citation.label}\t${citation.url}`)
      .join('\n    '),
  );
}

console.log('\nLONG');
citations
  .filter((citation) => String(citation.text || '').length > 350)
  .sort((a, b) => b.text.length - a.text.length)
  .forEach((citation) =>
    console.log(`${citation.text.length}\t${citation.id}\t${citation.label}`),
  );

const exact = new Map();
for (const citation of citations) {
  const key = `${sourceKey(citation)}|${normalize(citation.text)}`;
  if (!exact.has(key)) exact.set(key, []);
  exact.get(key).push(citation);
}
console.log(
  '\nEXACT_DUPLICATE_RECORDS',
  [...exact.values()]
    .filter((group) => group.length > 1)
    .reduce((count, group) => count + group.length - 1, 0),
);
for (const group of [...exact.values()].filter((items) => items.length > 1)) {
  console.log(
    'EXACT',
    group.map((citation) => `${citation.id}\t${citation.label}`).join('\n    '),
  );
}
