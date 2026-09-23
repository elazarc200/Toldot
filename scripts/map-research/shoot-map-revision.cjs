// Captures screenshots of the revised map for review.
const {chromium} = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:3100';
const out = process.env.SHOTS || 'C:/Users/Elazar/Desktop/פרוייקטים/Toldot/tools/shots';
const fs = require('fs');
fs.mkdirSync(out, {recursive: true});

(async () => {
  const browser = await chromium.launch({channel: 'msedge', headless: true});
  const page = await browser.newPage({viewport: {width: 1500, height: 950}, deviceScaleFactor: 1.5});
  await page.goto(`${BASE}/map`, {waitUntil: 'networkidle', timeout: 120000});
  await page.waitForSelector('.atlas-pin', {timeout: 60000});
  await page.waitForTimeout(2500);
  await page.screenshot({path: `${out}/01-map-default.png`});

  const jerusalem = page.locator('.atlas-pin', {has: page.locator('.atlas-pin-label', {hasText: 'ירושלים'})}).first();
  await jerusalem.hover();
  await page.waitForSelector('.atlas-hover-card');
  await page.waitForTimeout(400);
  await page.screenshot({path: `${out}/02-hover-card.png`});

  await page.fill('#atlas-sage', 'רבי יוחנן בן ברוקא');
  await page.locator('.atlas-search-results button', {hasText: 'רבי יוחנן בן ברוקא'}).first().click();
  await page.waitForTimeout(1600);
  await page.screenshot({path: `${out}/03-sage-focus.png`});

  await page.locator('.atlas-focus button', {hasText: 'חזרה למפה'}).click();
  await page.waitForTimeout(600);
  await page.fill('#atlas-sage', 'רבי עקיבא');
  await page.locator('.atlas-search-results button', {hasText: 'רבי עקיבא'}).first().click();
  await page.waitForTimeout(1600);
  await page.screenshot({path: `${out}/05-akiva-focus.png`});
  await page.locator('.atlas-focus button', {hasText: 'חזרה למפה'}).click();
  await page.waitForTimeout(600);

  await page.fill('#atlas-sage', 'ברור חיל');
  await page.locator('.atlas-search-results button', {hasText: 'ברור חיל'}).first().click();
  await page.waitForSelector('.atlas-detail');
  await page.waitForTimeout(700);
  await page.screenshot({path: `${out}/06-brur-hayil.png`});
  await page.locator('.atlas-detail button[aria-label^="סגירת"]').first().click();
  await page.waitForTimeout(400);
  await page.fill('#atlas-sage', 'בית שערים');
  await page.locator('.atlas-search-results button', {hasText: 'בית שערים'}).first().click();
  await page.waitForSelector('.atlas-detail');
  await page.waitForTimeout(700);
  const mention = page.locator('.atlas-mentions details').filter({hasText: 'תוספתא תרומות'}).first();
  await mention.locator('summary').click();
  await page.waitForTimeout(500);
  await mention.scrollIntoViewIfNeeded();
  await page.screenshot({path: `${out}/04-place-card.png`});
  console.log('screenshots written to ' + out);
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
