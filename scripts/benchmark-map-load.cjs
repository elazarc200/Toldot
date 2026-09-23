/**
 * Dev + prod map load benchmark.
 * Usage: node scripts/benchmark-map-load.cjs [port]
 */
const http = require('http');
const { chromium } = require('playwright');

const PORT = Number(process.argv[2] || 3000);
const BASE = `http://127.0.0.1:${PORT}`;

function get(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => resolve({ status: res.statusCode, body, headers: res.headers }));
      })
      .on('error', reject);
  });
}

async function measureChunks(port) {
  const html = await get(`http://127.0.0.1:${port}/map`);
  const scripts = [...html.body.matchAll(/src="(\/_next\/static[^"]+)"/g)].map((m) => m[1]);
  let total = 0;
  const chunks = [];
  for (const s of scripts) {
    const f = await get(`http://127.0.0.1:${port}${s}`);
    total += f.body.length;
    chunks.push({ kb: +(f.body.length / 1024).toFixed(1), path: s });
  }
  chunks.sort((a, b) => b.kb - a.kb);
  const mapPage = chunks.find((c) => c.path.includes('/map/'));
  const mapDynamic = chunks.filter(
    (c) => /ToladotMap|maplibre|map\/page|MapPageClient/i.test(c.path),
  );
  return {
    htmlBytes: html.body.length,
    scriptTags: scripts.length,
    totalTransferKb: +(total / 1024).toFixed(1),
    mapPageChunkKb: mapPage?.kb ?? null,
    mapRelatedChunks: mapDynamic,
    largest: chunks.slice(0, 8),
  };
}

async function measureClient(port) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const requests = [];
  const page = await context.newPage();
  page.on('request', (r) => requests.push({ url: r.url(), type: r.resourceType() }));

  const t0 = Date.now();
  await page.goto(`${BASE}/map`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  const domMs = Date.now() - t0;

  async function waitMs(sel, key, timeout = 60000) {
    try {
      await page.waitForSelector(sel, { timeout });
      return Date.now() - t0;
    } catch {
      return null;
    }
  }

  const mapCanvasMs = await waitMs('.maplibregl-canvas', 'mapCanvas');
  let loadingGoneMs = null;
  try {
    await page.waitForFunction(() => !document.querySelector('.atlas-loading'), { timeout: 60000 });
    loadingGoneMs = Date.now() - t0;
  } catch {
    /* still loading */
  }
  const firstPinMs = await waitMs('.atlas-pin', 'firstPin');

  const profile = await page.evaluate(() => {
    const resources = performance.getEntriesByType('resource');
    const scripts = resources.filter((r) => r.initiatorType === 'script');
    const scriptBytes = scripts.reduce((s, r) => s + (r.transferSize || 0), 0);
    return {
      scriptRequests: scripts.length,
      scriptTransferBytes: scriptBytes,
      navigation: performance.getEntriesByType('navigation')[0],
    };
  });

  const initialRequests = requests.filter((r) => {
    const t = r.url;
    return (
      t.includes('_next/static') ||
      t.includes('/maps/') ||
      t.includes('/data/') ||
      t.includes('demotiles') ||
      t.includes('supabase')
    );
  });

  await context.close();
  await browser.close();

  return {
    domContentLoadedMs: domMs,
    mapCanvasMs,
    loadingGoneMs,
    firstPinMs,
    totalMs: Date.now() - t0,
    scriptRequests: profile.scriptRequests,
    scriptTransferKb: +(profile.scriptTransferBytes / 1024).toFixed(1),
    citationsRequestedOnLoad: requests.some((r) => r.url.includes('pilot-citations')),
    supabaseRequests: requests.filter((r) => /supabase/i.test(r.url)).length,
    initialNetworkCount: initialRequests.length,
    unpkgRequests: requests.filter((r) => r.url.includes('unpkg.com')).length,
  };
}

(async () => {
  const chunks = await measureChunks(PORT);
  const client = await measureClient(PORT);
  console.log(JSON.stringify({ port: PORT, chunks, client }, null, 2));
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
