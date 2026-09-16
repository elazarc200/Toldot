const { chromium } = require("C:/Users/Elazar/Documents/Codex/2026-09-08/knv/outputs/Toldot-design/node_modules/playwright");
const fs = require("fs");
const path = require("path");

const pilot = JSON.parse(
  fs.readFileSync(
    "C:/Users/Elazar/Documents/Codex/2026-09-08/knv/outputs/Toldot-design/src/components/knowledge/pilot.json",
    "utf8",
  ),
);
const by = Object.fromEntries(pilot.people.map((p) => [p.slug, p]));
const places = Object.fromEntries(pilot.geography.places.map((p) => [p.slug, p]));

async function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

(async () => {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage();
  const results = {};

  async function openMap(qs = "") {
    await page.goto(`http://127.0.0.1:3100/map${qs}`, { waitUntil: "networkidle", timeout: 120000 });
    await page.waitForSelector(".atlas-canvas .maplibregl-canvas, .atlas-map-error", { timeout: 60000 });
    await wait(1500);
  }

  // TEST B then A: open Jerusalem, then empty click clears
  await openMap();
  const jerBtn = page.locator(`button.atlas-pin[aria-label*="ירושלים"]`).first();
  await jerBtn.click({ force: true });
  await wait(500);
  const cardOpen = await page.locator(".atlas-detail .atlas-card").count();
  results.B = cardOpen > 0 ? "PASS" : "FAIL card not open after Jerusalem pin";

  // Click empty map canvas away from the left-side place card overlay.
  const canvas = page.locator(".atlas-canvas .maplibregl-canvas").first();
  const box = await canvas.boundingBox();
  if (!box) {
    results.A = "FAIL no canvas";
  } else {
    await page.mouse.click(box.x + box.width * 0.72, box.y + box.height * 0.45);
    await wait(700);
    const still = await page.locator(".atlas-detail .atlas-card").count();
    results.A = still === 0 ? "PASS" : "FAIL card still open after empty click";
  }

  // Re-open Jerusalem for B already passed; ensure reopen works
  await jerBtn.click({ force: true });
  await wait(400);
  results.B2 = (await page.locator(".atlas-detail .atlas-card").count()) > 0 ? "PASS" : "FAIL reopen";

  // TEST C: Tarfon focus shows Lod
  await openMap(`?person=${by.tarfon.id}`);
  await wait(1000);
  const focusC = await page.locator(".atlas-focus strong").textContent();
  const lodPin = await page.locator(`button.atlas-pin[aria-label*="לוד"]`).count();
  const footerC = await page.locator(".atlas-place-index button", { hasText: "לוד" }).count();
  results.C =
    (focusC || "").includes("טרפון") && (lodPin > 0 || footerC > 0)
      ? "PASS"
      : `FAIL focus=${focusC} lodPin=${lodPin} footer=${footerC}`;

  // TEST D: Hillel → Jerusalem
  await openMap(`?person=${by.hillel.id}`);
  await wait(1000);
  const focusD = await page.locator(".atlas-focus strong").textContent();
  const jerPin = await page.locator(`button.atlas-pin[aria-label*="ירושלים"]`).count();
  const footerD = await page.locator(".atlas-place-index button", { hasText: "ירושלים" }).count();
  results.D =
    (focusD || "").includes("הלל") && (jerPin > 0 || footerD > 0)
      ? "PASS"
      : `FAIL focus=${focusD} jerPin=${jerPin} footer=${footerD}`;

  // TEST E: Gamliel → Yavne
  await openMap(`?person=${by["gamliel-avot1"].id}`);
  await wait(1000);
  const focusE = await page.locator(".atlas-focus strong").textContent();
  const yavPin = await page.locator(`button.atlas-pin[aria-label*="יבנה"]`).count();
  const footerE = await page.locator(".atlas-place-index button", { hasText: "יבנה" }).count();
  results.E =
    (focusE || "").includes("גמליאל") && (yavPin > 0 || footerE > 0)
      ? "PASS"
      : `FAIL focus=${focusE} yavPin=${yavPin} footer=${footerE}`;

  // TEST F: Lod card exposes Tarfon + sources
  await openMap(`?place=${places.lod.id}`);
  await wait(1200);
  // if card not auto-open by initialPlace, click pin/list
  if ((await page.locator(".atlas-detail .atlas-card").count()) === 0) {
    const list = page.locator(".atlas-place-index button", { hasText: "לוד" });
    if ((await list.count()) > 0) await list.first().click();
    else await page.locator(`button.atlas-pin[aria-label*="לוד"]`).first().click({ force: true });
    await wait(600);
  }
  const cardText = (await page.locator(".atlas-detail").innerText().catch(() => "")) || "";
  const hasTarfon = cardText.includes("טרפון");
  const hasSource =
    cardText.includes("קידושין") ||
    cardText.includes("Kiddushin") ||
    cardText.includes("מקור") ||
    (await page.locator(".atlas-detail .atlas-sources").count()) > 0;
  results.F =
    hasTarfon && hasSource
      ? "PASS"
      : `FAIL hasTarfon=${hasTarfon} hasSource=${hasSource} snippet=${cardText.slice(0, 200)}`;

  console.log(JSON.stringify(results, null, 2));
  await browser.close();
  const failed = Object.values(results).some((v) => String(v).startsWith("FAIL"));
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
