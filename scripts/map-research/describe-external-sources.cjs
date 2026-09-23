// External (non-rabbinic) sources carry no quotable passage, so each one gets a one line description
// of what it documents. The text is marked editorial, never presented as a quotation.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '../..');
const pilotPath = path.join(root, 'src/components/knowledge/pilot.json');
const pilot = JSON.parse(fs.readFileSync(pilotPath, 'utf8'));

const notes = new Map([
  ['https://peqiin.muni.il/page/109', 'עמוד המועצה המקומית פקיעין על מסורת המקום: המערה והמעיין המיוחסים לרבי שמעון בן יוחאי ולבנו. מסורת זיהוי מקומית, ולא מקור מתקופת חז״ל.'],
  ['https://holy.org.il/epicenter/%d7%9e%d7%a2%d7%99%d7%99%d7%9f-%d7%94%d7%a8%d7%a9%d7%91%d7%99-%d7%95%d7%94%d7%9e%d7%a2%d7%a8%d7%94/', 'תיאור מעיין רשב״י והמערה בפקיעין באתר המרכז למקומות הקדושים — תיעוד המסורת והמקום כיום, לא מקור תנאי.'],
]);

let written = 0;
for (const citation of pilot.citations) {
  const note = notes.get(citation.url);
  if (!note || (citation.text || '').trim()) continue;
  citation.text = note;
  citation.textKind = 'editorial';
  written++;
}
fs.writeFileSync(pilotPath, JSON.stringify(pilot));
console.log(`external source descriptions written: ${written}`);
