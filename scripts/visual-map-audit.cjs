/**
 * Visual + geometric audit for /map — screenshots and computed layout truth.
 * Usage: node scripts/visual-map-audit.cjs [port] [outDir]
 */
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const PORT = Number(process.argv[2] || 3003);
const OUT = path.resolve(process.argv[3] || 'docs/research/map-visual-audit-current');
const BASE = `http://127.0.0.1:${PORT}/map`;

function ensureDir(d) {
  fs.mkdirSync(d, { recursive: true });
}

/** Is rect inside viewport with positive area? */
function rectVisible(r, vw, vh) {
  if (!r || r.width <= 0 || r.height <= 0) return false;
  return r.right > 0 && r.bottom > 0 && r.left < vw && r.top < vh;
}

/** Topmost element at center of rect; returns tag + class snippet */
function topAt(page, r) {
  const cx = r.x + r.width / 2;
  const cy = r.y + r.height / 2;
  return page.evaluate(
    ({ x, y }) => {
      const el = document.elementFromPoint(x, y);
      if (!el) return null;
      return {
        tag: el.tagName,
        className: String(el.className || '').slice(0, 120),
        id: el.id || null,
      };
    },
    { x: cx, y: cy },
  );
}

async function inspectLabels(page) {
  return page.evaluate(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pins = [...document.querySelectorAll('.atlas-pin')];
    const labels = [...document.querySelectorAll('.atlas-pin-label')];
    const describe = (el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const cx = r.x + r.width / 2;
      const cy = r.y + r.height / 2;
      const top = document.elementFromPoint(
        Math.min(Math.max(cx, 0), vw - 1),
        Math.min(Math.max(cy, 0), vh - 1),
      );
      return {
        text: (el.textContent || '').trim().slice(0, 40),
        rect: { x: r.x, y: r.y, w: r.width, h: r.height },
        style: {
          opacity: cs.opacity,
          visibility: cs.visibility,
          display: cs.display,
          color: cs.color,
          fontSize: cs.fontSize,
          zIndex: cs.zIndex,
          transform: cs.transform,
          pointerEvents: cs.pointerEvents,
        },
        inViewport: r.width > 0 && r.height > 0 && r.right > 0 && r.bottom > 0 && r.left < vw && r.top < vh,
        coveredBy:
          top && top !== el && !el.contains(top)
            ? { tag: top.tagName, class: String(top.className || '').slice(0, 80) }
            : null,
        parentChain: (() => {
          const chain = [];
          let n = el.parentElement;
          for (let i = 0; i < 6 && n; i++) {
            const pcs = getComputedStyle(n);
            chain.push({
              tag: n.tagName,
              class: String(n.className || '').slice(0, 60),
              overflow: pcs.overflow,
              opacity: pcs.opacity,
              visibility: pcs.visibility,
              zIndex: pcs.zIndex,
            });
            n = n.parentElement;
          }
          return chain;
        })(),
      };
    };
    return {
      viewport: { w: vw, h: vh },
      pinCount: pins.length,
      labelCount: labels.length,
      pins: pins.slice(0, 12).map(describe),
      labels: labels.slice(0, 12).map(describe),
      canvas: (() => {
        const c = document.querySelector('.maplibregl-canvas');
        if (!c) return null;
        const r = c.getBoundingClientRect();
        const cs = getComputedStyle(c);
        return { rect: { x: r.x, y: r.y, w: r.width, h: r.height }, zIndex: cs.zIndex, pointerEvents: cs.pointerEvents };
      })(),
      stage: (() => {
        const s = document.querySelector('.atlas-stage');
        if (!s) return null;
        const cs = getComputedStyle(s);
        return { overflow: cs.overflow, position: cs.position, zIndex: cs.zIndex };
      })(),
    };
  });
}

async function inspectHoverCard(page) {
  return page.evaluate(async () => {
    const pin = document.querySelector('.atlas-pin[aria-label*="ירושלים"], .atlas-pin.tier-major');
    if (!pin) return { error: 'no jerusalem pin' };
    pin.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, cancelable: true }));
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const card = document.querySelector('.atlas-hover-card');
    if (!card) {
      return {
        pinFound: true,
        pinLabel: pin.querySelector('.atlas-pin-label')?.textContent,
        hoverState: null,
        card: null,
      };
    }
    const r = card.getBoundingClientRect();
    const cs = getComputedStyle(card);
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cx = r.x + r.width / 2;
    const cy = r.y + r.height / 2;
    const top = document.elementFromPoint(
      Math.min(Math.max(cx, 0), vw - 1),
      Math.min(Math.max(cy, 0), vh - 1),
    );
    return {
      pinFound: true,
      card: {
        text: card.textContent?.slice(0, 120),
        rect: { x: r.x, y: r.y, w: r.width, h: r.height },
        style: {
          opacity: cs.opacity,
          visibility: cs.visibility,
          display: cs.display,
          zIndex: cs.zIndex,
          transform: cs.transform,
          left: cs.left,
          top: cs.top,
          pointerEvents: cs.pointerEvents,
        },
        inViewport: r.width > 0 && r.height > 0 && r.right > 0 && r.bottom > 0 && r.left < vw && r.top < vh,
        coveredBy:
          top && top !== card && !card.contains(top)
            ? { tag: top.tagName, class: String(top.className || '').slice(0, 80) }
            : null,
      },
    };
  });
}

async function main() {
  ensureDir(OUT);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForSelector('.maplibregl-canvas', { timeout: 90000 });
  await page.waitForFunction(() => !document.querySelector('.atlas-loading'), { timeout: 90000 });
  await page.waitForTimeout(800);

  await page.screenshot({ path: path.join(OUT, '01-after-load.png'), fullPage: false });

  const afterLoad = await inspectLabels(page);
  fs.writeFileSync(path.join(OUT, '01-after-load.json'), JSON.stringify(afterLoad, null, 2));

  const pinInteract = await page.evaluate(() => {
    const pin = document.querySelector('.atlas-pin.tier-major');
    if (!pin) return { found: false };
    const r = pin.getBoundingClientRect();
    const cx = r.x + r.width / 2;
    const cy = r.y + r.height / 2;
    const top = document.elementFromPoint(cx, cy);
    return {
      found: true,
      position: getComputedStyle(pin).position,
      rect: { x: r.x, y: r.y, w: r.width, h: r.height },
      inViewport: r.width > 0 && r.height > 0 && r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight,
      hitSelf: top === pin || !!top?.closest?.('.atlas-pin'),
    };
  });

  // Hover Jerusalem via real mouse if possible, else dispatch
  const jerusalem = page.locator('.atlas-pin[aria-label*="ירושלים"]').first();
  let hoverMethod = 'dispatch';
  if (await jerusalem.count()) {
    try {
      await jerusalem.scrollIntoViewIfNeeded();
      const box = await jerusalem.boundingBox();
      if (box && box.width > 0) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        hoverMethod = 'mouse';
        await page.waitForTimeout(400);
      }
    } catch {
      /* fallback below */
    }
  }
  if (hoverMethod === 'dispatch') {
    await page.evaluate(() => {
      const pin = document.querySelector('.atlas-pin[aria-label*="ירושלים"]');
      pin?.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    });
    await page.waitForTimeout(400);
  }

  await page.screenshot({ path: path.join(OUT, '02-hover-jerusalem.png'), fullPage: false });
  const hoverInspect = await inspectHoverCard(page);
  fs.writeFileSync(path.join(OUT, '02-hover-jerusalem.json'), JSON.stringify({ hoverMethod, ...hoverInspect }, null, 2));

  // Click Jerusalem
  await page.evaluate(() => {
    const pin = document.querySelector('.atlas-pin[aria-label*="ירושלים"]');
    pin?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, '03-click-jerusalem.png'), fullPage: false });

  const detail = await page.evaluate(() => {
    const panel = document.querySelector('.atlas-detail');
    if (!panel) return { open: false };
    const r = panel.getBoundingClientRect();
    const cs = getComputedStyle(panel);
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cx = r.x + Math.min(r.width / 2, 100);
    const cy = r.y + Math.min(r.height / 2, 100);
    const top = document.elementFromPoint(cx, cy);
    return {
      open: true,
      h2: panel.querySelector('h2')?.textContent,
      rect: { x: r.x, y: r.y, w: r.width, h: r.height },
      style: { opacity: cs.opacity, visibility: cs.visibility, display: cs.display, zIndex: cs.zIndex },
      inViewport: r.width > 0 && r.height > 0 && r.right > 0 && r.bottom > 0,
      coveredBy:
        top && !panel.contains(top)
          ? { tag: top.tagName, class: String(top.className || '').slice(0, 80) }
          : null,
    };
  });
  fs.writeFileSync(path.join(OUT, '03-click-jerusalem.json'), JSON.stringify(detail, null, 2));

  // Zoom in
  await page.evaluate(() => {
    const canvas = document.querySelector('.maplibregl-canvas');
    canvas?.dispatchEvent(new WheelEvent('wheel', { deltaY: -400, bubbles: true }));
  });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT, '04-zoom-in.png'), fullPage: false });
  const zoomLabels = await inspectLabels(page);
  fs.writeFileSync(path.join(OUT, '04-zoom-in.json'), JSON.stringify(zoomLabels, null, 2));

  const humanVisible = (data) => {
    let n = 0;
    for (const l of data.labels || []) {
      if (
        l.inViewport &&
        l.rect.w > 2 &&
        l.rect.h > 2 &&
        l.style.visibility !== 'hidden' &&
        l.style.display !== 'none' &&
        Number(l.style.opacity) > 0.05
      ) {
        n++;
      }
    }
    return n;
  };

  const hoverCardOk =
    hoverInspect.card &&
    hoverInspect.card.inViewport &&
    hoverInspect.card.rect.w > 10 &&
    hoverInspect.card.rect.h > 10 &&
    hoverInspect.card.style.visibility !== 'hidden' &&
    Number(hoverInspect.card.style.opacity) > 0.05;

  const detailOk =
    detail.open &&
    detail.inViewport &&
    detail.rect.w > 50 &&
    detail.rect.h > 50 &&
    detail.style.visibility !== 'hidden';

  const pinsOk = pinInteract.found && pinInteract.inViewport && pinInteract.hitSelf && pinInteract.position === 'absolute';

  const summary = {
    url: BASE,
    outDir: OUT,
    checks: {
      pinsInViewportAndInteractive: pinsOk,
      labelsInViewport: humanVisible(afterLoad) >= 3,
      hoverCardVisible: hoverCardOk,
      detailPanelVisible: detailOk,
    },
    auditFalsePositiveAnalysis: {
      domLabelCount: afterLoad.labelCount,
      domLabelVisibilityVisible: afterLoad.labels?.filter((l) => l.style.visibility === 'visible').length,
      labelsInViewport: humanVisible(afterLoad),
      oldAuditWouldPassOnVisibilityAlone: afterLoad.labels?.every((l) => l.style.visibility === 'visible'),
      pinInteract,
    },
    afterLoadSample: afterLoad.labels?.slice(0, 3),
    hoverCard: hoverInspect.card,
    detail,
  };
  fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));

  await browser.close();

  const failed = Object.entries(summary.checks).filter(([, ok]) => !ok);
  if (failed.length) {
    console.error('VISUAL REGRESSION:', failed.map(([k]) => k).join(', '));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
