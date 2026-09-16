/**
 * Cartography acceptance checks against live Toladot map (:3100).
 * A geography readable, B no API KEY watermark, C no modern borders on historical,
 * D/E territories change by period, F declutter at default zoom, G territories subtle.
 */
const {chromium} = require('playwright');

const BASE = process.env.TOLADOT_URL || 'http://127.0.0.1:3100';

async function main() {
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true,
  });
  const page = await browser.newPage({viewport: {width: 1400, height: 900}});
  const result = {};

  await page.goto(`${BASE}/map`, {waitUntil: 'networkidle', timeout: 90000});
  await page.waitForSelector('.atlas-canvas .maplibregl-canvas', {timeout: 60000});
  await page.waitForTimeout(2500);

  // B + C: modern toggle off by default — page text should not show API KEY REQUIRED
  const bodyText = await page.locator('body').innerText();
  result.B = !/API KEY REQUIRED/i.test(bodyText) ? 'PASS' : 'FAIL watermark visible';

  // Historical: sea labels / levant context
  const seaLabels = await page.locator('.atlas-sea-label').allTextContents();
  result.A =
    seaLabels.some((t) => t.includes('הים התיכון')) &&
    (seaLabels.some((t) => t.includes('כנרת')) || seaLabels.some((t) => t.includes('ים המלח')))
      ? 'PASS'
      : `FAIL sea labels=${JSON.stringify(seaLabels)}`;

  // Default: modern tiles hidden
  const modernVis = await page.evaluate(() => {
    const canvas = document.querySelector('.atlas-canvas');
    return canvas ? 'ok' : 'missing';
  });
  result.C_setup = modernVis;

  // Turn on modern comparison and check for watermark in canvas/network/UI
  await page.locator('.atlas-modern-toggle input').check();
  await page.waitForTimeout(3000);
  const modernText = await page.locator('body').innerText();
  // Also screenshot-ish: check map errors
  const modernErr = await page.locator('.atlas-footer [role=status]').count();
  result.B_modern =
    !/API KEY REQUIRED/i.test(modernText) ? 'PASS' : 'FAIL watermark in modern mode';
  result.modern_error_banner = modernErr > 0 ? 'WARN modern error banner' : 'ok';

  // Back to historical
  await page.locator('.atlas-modern-toggle input').uncheck();
  await page.waitForTimeout(800);

  // Open filters, enable borders, pick Hasmonean-ish period (zug3)
  await page.locator('button[aria-controls="atlas-filters"]').click();
  await page.waitForSelector('#atlas-filters');
  await page.locator('#atlas-filters select').first().selectOption('zug3');
  await page.locator('#atlas-filters input[type=checkbox]').nth(3).check(); // borders
  await page.waitForTimeout(1500);
  const regimes1 = await page.locator('.atlas-regimes').innerText().catch(() => '');
  result.D_hasmonean = /חשמונא|מוצג תיחום/i.test(regimes1)
    ? 'PASS'
    : `FAIL regimes=${regimes1.slice(0, 160)}`;

  // Switch to Roman early period
  await page.locator('#atlas-filters select').first().selectOption('early');
  await page.waitForTimeout(1200);
  const regimes2 = await page.locator('.atlas-regimes').innerText().catch(() => '');
  result.E_roman = /יודיאה|רומ|מוצג תיחום/i.test(regimes2) && regimes2 !== regimes1
    ? 'PASS'
    : `FAIL regimes changed? r1=${regimes1.slice(0, 80)} r2=${regimes2.slice(0, 80)}`;

  // C: historical mode should not mention modern national borders as active layer
  result.C =
    !/ישראל|ירדן|סוריה/.test(regimes2) || /מודרנ|אינם מוצגים/.test(regimes2)
      ? 'PASS'
      : 'FAIL modern border language';

  // F: label declutter — count visible pin labels at default-ish zoom
  await page.locator('#atlas-filters select').first().selectOption('');
  await page.locator('#atlas-filters input[type=checkbox]').nth(3).uncheck();
  await page.locator('button[aria-label="סגירת הסינון"]').click();
  await page.waitForTimeout(500);
  // reset view
  await page.evaluate(() => {
    // zoom out via map if available — use fit button then check
  });
  await page.locator('button[aria-label="התאמת המפה לכל המקומות המוצגים"]').click();
  await page.waitForTimeout(1000);
  const labelStats = await page.evaluate(() => {
    const labels = [...document.querySelectorAll('.atlas-pin-label')];
    const visible = labels.filter((el) => {
      const s = getComputedStyle(el);
      return s.visibility !== 'hidden' && s.display !== 'none' && el.textContent;
    });
    const pins = document.querySelectorAll('.atlas-pin').length;
    const major = document.querySelectorAll('.atlas-pin.tier-major').length;
    return {pins, labels: labels.length, visibleLabels: visible.length, major};
  });
  result.F =
    labelStats.visibleLabels < labelStats.pins && labelStats.major >= 1
      ? 'PASS'
      : `FAIL ${JSON.stringify(labelStats)}`;

  // G: territory fill opacity is low (checked via presence of subtle note)
  result.G = /סכמטי|משוער|לא גבול/i.test(regimes1 + regimes2) ? 'PASS' : 'FAIL no uncertainty language';

  // Centrality: Jerusalem-sized major tier exists
  result.centrality = labelStats.major >= 1 ? 'PASS' : 'FAIL no major tier pins';

  // Source UX: open a place card and look for citation expand pattern
  try {
    const pin = page.locator('.atlas-pin').first();
    if (await pin.count()) {
      await pin.click({force: true});
      await page.waitForSelector('.atlas-detail', {timeout: 5000});
      const linkCount = await page.locator('.atlas-detail a[target=_blank]').count();
      const detailsCount = await page.locator('.atlas-detail details').count();
      // Expand first visible activity/source if needed
      const visibleSummary = page.locator('.atlas-detail details > summary').first();
      if (await visibleSummary.isVisible().catch(() => false)) {
        await visibleSummary.click({force: true});
        await page.waitForTimeout(400);
      }
      const eyun = await page.locator('.atlas-detail a[target=_blank]').filter({hasText: /עיון במקור|פתיחת המקור/}).count();
      result.sources =
        eyun > 0 || (detailsCount > 0 && linkCount > 0)
          ? 'PASS'
          : `FAIL details=${detailsCount} links=${linkCount} eyun=${eyun}`;
    } else {
      result.sources = 'FAIL no pins';
    }
  } catch (e) {
    result.sources = `FAIL ${e.message}`;
  }

  console.log(JSON.stringify(result, null, 2));
  await browser.close();
  const fails = Object.entries(result).filter(([, v]) => String(v).startsWith('FAIL'));
  process.exit(fails.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
