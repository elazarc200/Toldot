const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto('http://127.0.0.1:3100/map', {
    waitUntil: 'networkidle',
    timeout: 90000,
  });

  const search = page.locator('#atlas-sage');
  await search.fill('טבריה');
  await page.locator('.atlas-search-results button', { hasText: 'טבריה' }).first().click();
  await page.waitForSelector('.atlas-detail');

  const activity = page.locator('.atlas-detail .atlas-activity', {
    hasText: 'רבי שמעון בן יוחאי',
  }).first();
  await activity.locator(':scope > summary').click();
  const source = activity.locator('.atlas-sources-item').filter({
    hasText: /בראשית רבה עט|שביעית ט/,
  }).first();
  await source.locator('summary').click();

  const result = await source.evaluate((element) => {
    const excerpt = element.querySelector('.citation-excerpt')?.textContent || '';
    const context = element.querySelector('.citation-context')?.textContent || '';
    return {
      excerptLength: excerpt.length,
      hasContext: context.length > 20,
      contextBeforeExcerpt:
        !!element.querySelector('.citation-context + .citation-excerpt'),
      sourceLinks: element.querySelectorAll('a[target="_blank"]').length,
    };
  });
  console.log(JSON.stringify(result, null, 2));
  await browser.close();

  if (
    result.excerptLength > 222 ||
    !result.hasContext ||
    !result.contextBeforeExcerpt ||
    result.sourceLinks !== 1
  ) {
    process.exit(1);
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
