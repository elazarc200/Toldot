/**
 * Client-side /map initialization profiler (Playwright).
 * Usage: node scripts/profile-map-client.cjs [port]
 */
const { chromium } = require("playwright");

const PORT = Number(process.argv[2] || 3000);
const URL = `http://127.0.0.1:${PORT}/map`;

const INJECT = `
(() => {
  window.__mapProfile = { marks: [], network: [], errors: [] };
  const push = (name, detail) => {
    window.__mapProfile.marks.push({ name, t: performance.now(), detail: detail || null });
  };
  push("script-injected");
  const obs = new PerformanceObserver((list) => {
    for (const e of list.getEntries()) {
      if (e.entryType === "navigation") {
        window.__mapProfile.navigation = {
          domContentLoaded: e.domContentLoadedEventEnd,
          load: e.loadEventEnd,
          responseEnd: e.responseEnd,
          transferSize: e.transferSize,
        };
      }
    }
  });
  obs.observe({ type: "navigation", buffered: true });
  const origFetch = window.fetch;
  window.fetch = async (...args) => {
    const url = String(args[0]);
    const t0 = performance.now();
    try {
      const res = await origFetch(...args);
      window.__mapProfile.network.push({
        url: url.slice(0, 180),
        ms: Math.round(performance.now() - t0),
        status: res.status,
        ok: res.ok,
      });
      return res;
    } catch (err) {
      window.__mapProfile.network.push({
        url: url.slice(0, 180),
        ms: Math.round(performance.now() - t0),
        error: String(err),
      });
      throw err;
    }
  };
  window.addEventListener("error", (e) => {
    window.__mapProfile.errors.push(String(e.message || e));
  });
  push("listeners-ready");
})();
`;

async function runOnce(browser, label) {
  const context = await browser.newContext();
  await context.addInitScript(INJECT);

  const page = await context.newPage();
  const reqLog = [];
  page.on("request", (r) => {
    const u = r.url();
    if (!u.includes("_next/static") && !u.includes("favicon")) return;
    reqLog.push({ url: u, type: r.resourceType(), t: Date.now() });
  });
  page.on("requestfailed", (r) => {
    reqLog.push({ url: r.url(), failed: r.failure()?.errorText || "failed", t: Date.now() });
  });

  const t0 = Date.now();
  let navStart = t0;
  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 120000 });
  const domMs = Date.now() - t0;

  // Wait for map canvas or loading/error states
  const milestones = {};
  async function waitFor(sel, key, timeout = 120000) {
    try {
      await page.waitForSelector(sel, { timeout });
      milestones[key] = Date.now() - t0;
      return true;
    } catch {
      milestones[key] = null;
      return false;
    }
  }

  await waitFor(".maplibregl-canvas", "mapCanvas");
  await waitFor(".atlas-pin", "firstPin", 60000).catch(() => {});
  // loading overlay gone = ready state
  try {
    await page.waitForFunction(
      () => !document.querySelector(".atlas-loading"),
      { timeout: 120000 },
    );
    milestones.loadingGone = Date.now() - t0;
  } catch {
    milestones.loadingGone = null;
  }
  const profile = await page.evaluate(() => {
    const p = window.__mapProfile || {};
    const resources = performance.getEntriesByType("resource").map((r) => ({
      name: r.name.split("/").slice(-2).join("/").slice(0, 120),
      initiator: r.initiatorType,
      duration: Math.round(r.duration),
      transferSize: r.transferSize || 0,
      startTime: Math.round(r.startTime),
    }));
    resources.sort((a, b) => b.duration - a.duration);
    const longTasks = performance.getEntriesByType("longtask").map((t) => ({
      duration: Math.round(t.duration),
      start: Math.round(t.startTime),
    }));
    return {
      marks: p.marks,
      navigation: p.navigation,
      network: p.network,
      errors: p.errors,
      topResources: resources.slice(0, 25),
      longTasks: longTasks.slice(0, 20),
      pins: document.querySelectorAll(".atlas-pin").length,
      hasCanvas: !!document.querySelector(".maplibregl-canvas"),
      hasLoading: !!document.querySelector(".atlas-loading"),
    };
  });

  const totalMs = Date.now() - t0;
  const land = profile.topResources?.find((r) => String(r.name).includes("land.geojson"));
  milestones.landGeoJson = land ? land.startTime + land.duration : null;

  // Supabase-related requests
  const supabaseReqs = [
    ...reqLog.filter((r) => /supabase|auth\/v1/i.test(r.url)),
    ...(profile.network || []).filter((r) => /supabase|auth\/v1/i.test(r.url)),
  ];

  await context.close();
  return {
    label,
    url: URL,
    timings: {
      domContentLoadedMs: domMs,
      mapCanvasMs: milestones.mapCanvas,
      loadingGoneMs: milestones.loadingGone,
      firstPinMs: milestones.firstPin,
      landGeoJsonMs: milestones.landGeoJson,
      canvasSizedMs: milestones.canvasSized,
      totalWaitMs: totalMs,
    },
    profile,
    supabaseClientRequests: supabaseReqs,
    staticChunks: reqLog.filter((r) => r.url.includes("_next/static")).length,
  };
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const cold = await runOnce(browser, "cold");
  const warm = await runOnce(browser, "warm");
  await browser.close();
  console.log(JSON.stringify({ cold, warm }, null, 2));
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
