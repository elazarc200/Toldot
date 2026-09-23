const { chromium } = require('playwright');

async function audit(port) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const url = `http://127.0.0.1:${port}/map`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  const shellEarly = await page.evaluate(() => ({
    heading: !!document.querySelector('.atlas-heading h1'),
    toolbar: !!document.querySelector('.atlas-toolbar'),
    legend: !!document.querySelector('.atlas-legend'),
  }));
  await page.waitForSelector('.maplibregl-canvas', { timeout: 60000 });
  await page.waitForFunction(() => !document.querySelector('.atlas-loading'), { timeout: 60000 });

  const base = await page.evaluate(() => {
    const labels = [...document.querySelectorAll('.atlas-pin-label')];
    return {
      pins: document.querySelectorAll('.atlas-pin').length,
      labelsTotal: labels.length,
      labelsVisible: labels.filter((l) => getComputedStyle(l).visibility === 'visible').length,
      toolbar: !!document.querySelector('.atlas-toolbar'),
      heading: !!document.querySelector('.atlas-heading'),
      legend: !!document.querySelector('.atlas-legend'),
      caption: !!document.querySelector('.atlas-map-caption'),
      footer: !!document.querySelector('.atlas-footer'),
      search: !!document.querySelector('#atlas-sage'),
      filterBtn: !!document.querySelector('#atlas-filters, [aria-controls="atlas-filters"]'),
      burialsBtn: [...document.querySelectorAll('button')].some((b) => /קברי/.test(b.textContent || '')),
      modernToggle: !!document.querySelector('.atlas-modern-toggle'),
      fitBtn: [...document.querySelectorAll('button')].some((b) => /התאמה למקומות/.test(b.textContent || '')),
      hasAtlasCss: getComputedStyle(document.querySelector('.atlas') || document.body).paddingTop !== '',
      pinDotBg: getComputedStyle(document.querySelector('.atlas-pin-dot') || document.body).backgroundColor,
    };
  });

  const hover = await page.evaluate(async () => {
    const pin = document.querySelector('.atlas-pin.tier-major');
    if (!pin) return { hoverCard: false, hoverName: null, pinFound: false };
    pin.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, cancelable: true }));
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return {
      pinFound: true,
      hoverCard: !!document.querySelector('.atlas-hover-card'),
      hoverName: document.querySelector('.atlas-hover-card strong')?.textContent || null,
    };
  });

  const click = await page.evaluate(async () => {
    const pin = document.querySelector('.atlas-pin.tier-major');
    if (!pin) return { detailOpen: false, placeName: null, pinFound: false, citationsLoading: false };
    pin.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await new Promise((r) => setTimeout(r, 400));
    return {
      pinFound: true,
      detailOpen: !!document.querySelector('.atlas-detail'),
      placeName: document.querySelector('.atlas-detail h2')?.textContent || null,
      citationsLoading: !!document.querySelector('.atlas-detail .atlas-muted')?.textContent?.includes('טוען מקורות'),
    };
  });
  await page.locator('button[aria-controls="atlas-filters"]').click();
  await page.locator('#atlas-filters select').first().selectOption('zug3');
  await page.locator('#atlas-filters input[type=checkbox]').nth(3).check();
  await page.waitForTimeout(600);
  const borders = await page.evaluate(() => ({
    regimes: !!document.querySelector('.atlas-regimes'),
    regimesText: document.querySelector('.atlas-regimes')?.textContent?.slice(0, 120) || null,
  }));

  await browser.close();
  return { url, shellEarly, base, hover, click, borders };
}

const port = Number(process.argv[2] || 3002);
audit(port)
  .then((r) => console.log(JSON.stringify(r, null, 2)))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
