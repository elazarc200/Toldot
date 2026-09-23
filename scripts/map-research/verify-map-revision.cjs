// Live acceptance checks for the 2026-09 map revision: sage search shows his places, hover preview,
// stable label placement across zoom, community/visitor split, and the corrected Beit Shearim quote.
const {chromium} = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:3100';
const result = {};

(async () => {
  const browser = await chromium.launch({channel: 'msedge', headless: true});
  const page = await browser.newPage({viewport: {width: 1500, height: 950}});
  page.on('pageerror', (error) => console.log('PAGEERROR ' + error.message));
  await page.goto(`${BASE}/map`, {waitUntil: 'networkidle', timeout: 120000});
  await page.waitForSelector('.atlas-pin', {timeout: 60000});

  // A. Searching a sage focuses the map on every place documented for him.
  try {
    await page.fill('#atlas-sage', 'רבי יוחנן בן ברוקא');
    await page.locator('.atlas-search-results button', {hasText: 'רבי יוחנן בן ברוקא'}).first().click();
    await page.waitForTimeout(1200);
    const names = await page.$$eval('.atlas-pin-label', (nodes) => nodes.map((n) => n.textContent.trim()));
    const sizes = await page.$$eval('.atlas-pin', (nodes) => nodes.map((n) => ({name: n.querySelector('.atlas-pin-label')?.textContent.trim(), size: n.offsetWidth})));
    // Pekiin carries no resolved coordinates, so it must be offered in the focus panel instead of a pin.
    const pinned = ['יבנה', 'בית שערים'].filter((name) => names.includes(name));
    const unlocated = await page.locator('.atlas-focus-unlocated button', {hasText: 'פקיעין'}).count();
    result.sageSearch = pinned.length === 2 && unlocated > 0 ? 'PASS' : `FAIL pins=${names.join(',')} unlocated=${unlocated}`;
    result.sageSizes = JSON.stringify(sizes.filter((s) => pinned.includes(s.name)));
  } catch (error) {
    result.sageSearch = 'FAIL ' + error.message;
  }

  // B. Sizes follow the documented importance of each link (larger where activity is central).
  try {
    await page.locator('.atlas-focus button', {hasText: 'חזרה למפה'}).click();
    await page.waitForTimeout(600);
    await page.fill('#atlas-sage', 'רבי עקיבא');
    await page.locator('.atlas-search-results button', {hasText: 'רבי עקיבא'}).first().click();
    await page.waitForTimeout(1200);
    const sizes = await page.$$eval('.atlas-pin', (nodes) =>
      nodes.map((n) => ({name: n.querySelector('.atlas-pin-label')?.textContent.trim(), size: n.offsetWidth})));
    const bneiBrak = sizes.find((s) => s.name === 'בני ברק');
    const jerusalem = sizes.find((s) => s.name === 'ירושלים');
    result.akivaHierarchy = bneiBrak && jerusalem
      ? (bneiBrak.size >= jerusalem.size ? `PASS bnei-brak ${bneiBrak.size} >= jerusalem ${jerusalem.size}` : `FAIL bnei-brak ${bneiBrak.size} < jerusalem ${jerusalem.size}`)
      : `FAIL missing pins ${JSON.stringify(sizes.map((s) => s.name))}`;
  } catch (error) {
    result.akivaHierarchy = 'FAIL ' + error.message;
  }

  // C. Label placement must survive a zoom round-trip without jumping sides.
  try {
    await page.locator('.atlas-focus button', {hasText: 'חזרה למפה'}).click();
    await page.waitForTimeout(800);
    const read = () => page.$$eval('.atlas-pin', (nodes) =>
      nodes.map((n) => {
        const label = n.querySelector('.atlas-pin-label');
        return {name: label?.textContent.trim(), side: n.dataset.side, top: label?.style.top, left: label?.style.left};
      }).filter((entry) => entry.name));
    const before = await read();
    await page.mouse.move(700, 500);
    await page.mouse.wheel(0, -400);
    await page.waitForTimeout(900);
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(1200);
    const after = await read();
    const moved = before.filter((entry) => {
      const match = after.find((a) => a.name === entry.name);
      return match && match.side !== entry.side;
    });
    result.labelStability = moved.length === 0 ? `PASS ${before.length} labels kept their side` : `FAIL ${moved.map((m) => m.name).join(',')}`;
  } catch (error) {
    result.labelStability = 'FAIL ' + error.message;
  }

  // D. Hover shows a compact preview before the full entry is opened.
  try {
    await page.locator('.atlas-pin').first().hover();
    await page.waitForSelector('.atlas-hover-card', {timeout: 4000});
    const card = await page.$eval('.atlas-hover-card', (n) => ({title: n.querySelector('strong').textContent, meta: n.querySelector('.atlas-hover-meta').textContent, body: n.querySelector('p').textContent.length}));
    result.hoverCard = card.title && card.body > 30 ? `PASS ${card.title} — ${card.meta}` : `FAIL ${JSON.stringify(card)}`;
  } catch (error) {
    result.hoverCard = 'FAIL ' + error.message;
  }

  // E. Place card splits community members from visitors and lists verified mentions.
  try {
    await page.fill('#atlas-sage', 'בית שערים');
    await page.locator('.atlas-search-results button', {hasText: 'בית שערים'}).first().click();
    await page.waitForSelector('.atlas-detail', {timeout: 8000});
    const folders = await page.$$eval('.atlas-sage-folder > summary', (nodes) => nodes.map((n) => n.textContent.trim()));
    const mentions = await page.locator('.atlas-mentions details').count();
    const summary = await page.$eval('.atlas-overview', (n) => n.textContent.trim());
    result.placeCard = folders.length === 2 && mentions > 0 && summary.length > 80
      ? `PASS folders=${folders.join(' | ')} mentions=${mentions}`
      : `FAIL folders=${JSON.stringify(folders)} mentions=${mentions} summary=${summary.length}`;
  } catch (error) {
    result.placeCard = 'FAIL ' + error.message;
  }

  // F. The Beit Shearim citation quotes the passage that actually names the visit.
  try {
    const mention = page.locator('.atlas-mentions details').filter({hasText: 'תוספתא תרומות'}).first();
    await mention.locator('summary').click();
    await page.waitForTimeout(400);
    const text = await mention.locator('.citation-excerpt').first().innerText();
    result.beitShearimQuote = /בן נורי לבית שערים/.test(text) ? `PASS ${text.slice(0, 80)}…` : `FAIL ${text.slice(0, 120)}`;
    result.quoteLength = text.length <= 400 ? `PASS ${text.length} chars` : `FAIL ${text.length} chars`;
  } catch (error) {
    result.beitShearimQuote = 'FAIL ' + error.message;
  }

  console.log(JSON.stringify(result, null, 2));
  await browser.close();
  process.exit(Object.values(result).some((value) => String(value).startsWith('FAIL')) ? 1 : 0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
