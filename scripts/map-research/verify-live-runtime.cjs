const http = require("http");
const fs = require("fs");
const path = require("path");

const design = "C:/Users/Elazar/Documents/Codex/2026-09-08/knv/outputs/Toldot-design";
const pilot = JSON.parse(
  fs.readFileSync(path.join(design, "src/components/knowledge/pilot.json"), "utf8"),
);
const mapSrc = fs.readFileSync(
  path.join(design, "src/components/map/ToladotMap.tsx"),
  "utf8",
);

function get(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve({ status: res.statusCode, data, headers: res.headers }));
      })
      .on("error", reject);
  });
}

(async () => {
  const g = pilot.geography;
  const by = Object.fromEntries(pilot.people.map((p) => [p.slug, p]));
  const links = (slug) =>
    g.personPlaces
      .filter((r) => r.personId === by[slug].id)
      .map((r) => g.places.find((p) => p.id === r.placeId).slug);

  console.log("FILE_DATA", {
    places: g.places.length,
    personPlaces: g.personPlaces.length,
    tarfon: links("tarfon"),
    hillel: links("hillel"),
    gamliel: links("gamliel-avot1"),
    hasClearPlace: mapSrc.includes("clearPlace"),
    hasIgnore: mapSrc.includes("ignoreMapClick"),
  });

  const page = await get("http://127.0.0.1:3100/map");
  console.log("PAGE", page.status, "bytes", page.data.length);

  // Hit a sage-focus deep link to force module evaluation
  const tarfonId = by.tarfon.id;
  const page2 = await get(`http://127.0.0.1:3100/map?person=${tarfonId}`);
  console.log("PAGE_PERSON", page2.status, "bytes", page2.data.length);

  // Look in .next for compiled pilot / clearPlace
  const nextDir = path.join(design, ".next");
  let hits = { kiddushin: 0, clearPlace: 0, peopleWithPlaces75: 0 };
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (ent.name === "cache" || ent.name === "node_modules") continue;
        walk(p);
      } else if (/\.(js|json|rsc)$/.test(ent.name)) {
        const t = fs.readFileSync(p, "utf8");
        if (t.includes("Kiddushin.40b") || t.includes("Kiddushin_40b")) hits.kiddushin++;
        if (t.includes("ignoreMapClick") || t.includes("clearPlace")) hits.clearPlace++;
        if (t.includes('"peopleWithPlaces":75') || t.includes("peopleWithPlaces:75"))
          hits.peopleWithPlaces75++;
      }
    }
  }
  walk(nextDir);
  console.log("NEXT_CACHE_HITS", hits);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
