// Earlier verification passes emptied the text of citations that were never quotations to begin with
// (Wikipedia, Daat, municipal pages, an archaeological inscription). Those notes are editorial
// descriptions, so text matching against Sefaria says nothing about them: restore them from the last
// commit and mark them as editorial, while leaving every Sefaria excerpt to the verification script.
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');

const root = path.join(__dirname, '../..');
const pilotPath = path.join(root, 'src/components/knowledge/pilot.json');
const pilot = JSON.parse(fs.readFileSync(pilotPath, 'utf8'));
const head = JSON.parse(execFileSync('git', ['show', 'HEAD:src/components/knowledge/pilot.json'], {cwd: root, maxBuffer: 1e9}).toString('utf8'));
const headById = new Map(head.citations.map((c) => [c.id, c]));

const isSefariaText = (url) => {
  try {
    const parsed = new URL(url);
    if (!/sefaria\.org$/.test(parsed.hostname.replace(/^www\./, ''))) return false;
    return !/^\/(topics|sheets|search|categories|texts)\b/i.test(parsed.pathname);
  } catch {
    return false;
  }
};

const restored = [];
for (const citation of pilot.citations) {
  const before = headById.get(citation.id);
  if (!before || !(before.text || '').trim() || (citation.text || '').trim()) continue;
  if (isSefariaText(citation.url || '')) continue;
  citation.text = before.text;
  citation.textKind = 'editorial';
  restored.push(`${citation.label} — ${citation.text}`);
}

fs.writeFileSync(pilotPath, JSON.stringify(pilot));
console.log(`restored editorial notes: ${restored.length}`);
console.log(restored.join('\n'));
