/**
 * Builds docs/research/sage-place-research.json from prior agent extracts.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "../..");
const RESEARCH_DIR = path.join(ROOT, "docs/research");
const OUT = path.join(RESEARCH_DIR, "sage-place-research.json");

const TYPE_MAP = {
  lived: "lived",
  studied: "studied",
  taught: "taught",
  served: "served",
  visited: "visited",
  event: "event",
  documented_presence: "documented_presence",
  other: "other",
  leadership: "served",
  teaching: "taught",
  residence: "lived",
  deliberation: "documented_presence",
  journey: "visited",
  visit: "visited",
  priesthood: "served",
  origin_epithet: "other",
  healing: "event",
};

const SKIP_PAIRS = new Set([
  "shimon-yohai|pekiin",
  "meir|tiberias",
  "elazar-kappar|lod",
  "bar-kappara|parod",
]);

const PLACE_SLUG_MAP = {
  modiin: "modiim",
};

const NEW_PLACES = [
  {
    slug: "antipatris",
    nameHe: "אנטיפטריס",
    todayHe: "תל אפק / ראש העין",
    overviewHe: "תחנה בדרך בין ירושלים לקיסרין; נזכרת במסורות על שמעון הצדיק ואלכסנדר מוקדון.",
    identification: "identified",
    identificationNoteHe: "מזוהה עם תל אפק (אנטיפטריס) סמוך לראש העין.",
    locations: [
      { id: "antipatris", lng: 34.9305, lat: 32.1048, label: "אנטיפטריס", disputed: false },
    ],
  },
  {
    slug: "alexandria",
    nameHe: "אלכסנדריה",
    todayHe: "אלכסנדריה, מצרים",
    overviewHe: "מרכז יהודי גדול במצרים; נזכרת בבריחות ובמסעות של חכמים.",
    identification: "identified",
    identificationNoteHe: "העיר ההלניסטית־רומית במצרים; נקודה עירונית כללית.",
    locations: [
      { id: "alexandria", lng: 29.9187, lat: 31.2001, label: "אלכסנדריה", disputed: false },
    ],
  },
  {
    slug: "arbel",
    nameHe: "ארבל",
    todayHe: "הר ארבל / כפר ארבל",
    overviewHe: "יישוב בגליל התחתון הקשור למסורות על ניטאי הארבלי.",
    identification: "identified",
    identificationNoteHe: "מזוהה עם אזור ארבל ממערב לכנרת.",
    locations: [
      { id: "arbel", lng: 35.501, lat: 32.824, label: "ארבל", disputed: false },
    ],
  },
  {
    slug: "ashkelon",
    nameHe: "אשקלון",
    todayHe: "אשקלון",
    overviewHe: "עיר חוף פלשתית־רומית המופיעה בהקשרים תנאיים ואמוראיים.",
    identification: "identified",
    identificationNoteHe: "נקודה באזור אשקלון העתיקה.",
    locations: [
      { id: "ashkelon", lng: 34.5715, lat: 31.6693, label: "אשקלון", disputed: false },
    ],
  },
  {
    slug: "arav",
    nameHe: "ערב",
    todayHe: "עראבה שבגליל",
    overviewHe: "יישוב בגליל המזוהה עם חנינא בן דוסא ועם פעילות רבן יוחנן בן זכאי.",
    identification: "identified",
    identificationNoteHe: "זיהוי מקובל עם עראבה בגליל התחתון; אינו ודאי לחלוטין.",
    locations: [
      { id: "arav", lng: 35.3386, lat: 32.8508, label: "ערב / עראבה", disputed: false },
    ],
  },
  {
    slug: "modiim",
    nameHe: "מודיעים",
    todayHe: "אזור מודיעין",
    overviewHe: "מקום מוצא המיוחס לאלעזר המודעי על פי כינויו.",
    identification: "identified",
    identificationNoteHe: "זיהוי כללי באזור מודיעין העתיקה; מיקום מדויק אינו ודאי.",
    locations: [
      { id: "modiim", lng: 35.013, lat: 31.89, label: "מודיעים", disputed: false },
    ],
  },
  {
    slug: "beitar",
    nameHe: "ביתר",
    todayHe: "בתיר / ח׳רבת אל־יהוד",
    overviewHe: "מעוז המרד בבר כוכבא; קשורה לאלעזר המודעי במסורות המצור.",
    identification: "identified",
    identificationNoteHe: "מזוהה עם חורבת ביתר ממערב לירושלים.",
    locations: [
      { id: "beitar", lng: 35.1435, lat: 31.7292, label: "ביתר", disputed: false },
    ],
  },
  {
    slug: "gamzu",
    nameHe: "גמזו",
    todayHe: "גמזו",
    overviewHe: "יישוב המיוחס לנחום איש גמזו על פי כינויו.",
    identification: "identified",
    identificationNoteHe: "זיהוי מקובל עם גמזו שבשפלת יהודה.",
    locations: [
      { id: "gamzu", lng: 34.942, lat: 31.928, label: "גמזו", disputed: false },
    ],
  },
  {
    slug: "kfar-hanania",
    nameHe: "כפר חנניה",
    todayHe: "כפר חנניה",
    overviewHe: "יישוב בגבול הגליל, מיוחס ליוסי בן קיסמא / חנניה על פי כינוי מקומי.",
    identification: "identified",
    identificationNoteHe: "מזוהה עם כפר חנניה שבין הגליל העליון לתחתון.",
    locations: [
      { id: "kfar-hanania", lng: 35.423, lat: 32.917, label: "כפר חנניה", disputed: false },
    ],
  },
  {
    slug: "usha",
    nameHe: "אושא",
    todayHe: "חורבת אושא ליד קריית אתא",
    overviewHe: "מושב סנהדרין ומקום הסמכה בדור שאחרי מרד בר כוכבא.",
    identification: "identified",
    identificationNoteHe: "מזוהה עם חורבת אושא בגליל המערבי.",
    locations: [
      { id: "usha", lng: 35.147, lat: 32.799, label: "אושא", disputed: false },
    ],
  },
  {
    slug: "kfar-aziz",
    nameHe: "כפר עזיז",
    todayHe: "זיהוי לא ודאי בדרום יהודה",
    overviewHe: "מקום מגורים והוראה המיוחס לרבי ישמעאל בכפר עזיז.",
    identification: "identified",
    identificationNoteHe: "הזיהוי המדויק שנוי במחלוקת; הנקודה משוערת בדרום יהודה.",
    locations: [
      { id: "kfar-aziz", lng: 35.05, lat: 31.45, label: "כפר עזיז (משוער)", disputed: true },
    ],
  },
  {
    slug: "sura",
    nameHe: "סורא",
    todayHe: "אזור סורא בבבל (עיראק)",
    overviewHe: "מרכז ישיבה בבבל המיוחס לרב.",
    identification: "identified",
    identificationNoteHe: "נקודה אזורית משוערת לישיבת סורא; המיקום הארכאולוגי אינו מדויק במפה זו.",
    locations: [
      { id: "sura", lng: 44.65, lat: 31.88, label: "סורא", disputed: false },
    ],
  },
  {
    slug: "nehardea",
    nameHe: "נהרדעא",
    todayHe: "אזור נהרדעא בבבל (עיראק)",
    overviewHe: "מרכז תורה בבבל המיוחס לשמואל ולפעילות רבנים בבליים.",
    identification: "identified",
    identificationNoteHe: "נקודה אזורית משוערת לנהרדעא.",
    locations: [
      { id: "nehardea", lng: 44.35, lat: 33.35, label: "נהרדעא", disputed: false },
    ],
  },
  {
    slug: "caesarea",
    nameHe: "קיסרין",
    todayHe: "קיסריה",
    overviewHe: "עיר נמל רומית־ביזנטית ומושב חכמים בארץ ישראל.",
    identification: "identified",
    identificationNoteHe: "מזוהה עם קיסריה שלחוף הים התיכון.",
    locations: [
      { id: "caesarea", lng: 34.892, lat: 32.503, label: "קיסרין", disputed: false },
    ],
  },
  {
    slug: "akhbara",
    nameHe: "עכברא",
    todayHe: "עכברה ליד צפת",
    overviewHe: "יישוב בגליל העליון המיוחס לינאי / לחכמים מקומיים.",
    identification: "identified",
    identificationNoteHe: "מזוהה עם עכברה מדרום לצפת.",
    locations: [
      { id: "akhbara", lng: 35.495, lat: 32.94, label: "עכברא", disputed: false },
    ],
  },
  {
    slug: "sidon",
    nameHe: "צידן",
    todayHe: "צידון, לבנון",
    overviewHe: "עיר חוף בפיניקיה המופיעה במסעות ובמעשים של חכמים.",
    identification: "identified",
    identificationNoteHe: "מזוהה עם צידון.",
    locations: [
      { id: "sidon", lng: 35.372, lat: 33.563, label: "צידן", disputed: false },
    ],
  },
  {
    slug: "babylon",
    nameHe: "בבל",
    todayHe: "אזור מסופוטמיה / עיראק",
    overviewHe: "מרחב גלות בבל כמוצא או זירת פעילות כללית של חכמים.",
    identification: "identified",
    identificationNoteHe: "נקודה אזורית מייצגת בלבד (בבל הקדומה), לא עיר ספציפית.",
    locations: [
      { id: "babylon", lng: 44.4209, lat: 32.5422, label: "בבל (אזור)", disputed: false },
    ],
  },
  {
    slug: "horbat-dabura",
    nameHe: "חורבת דבורה",
    todayHe: "דבוריה / חורבת דבורה ברמת הגולן",
    overviewHe: "אתר ובו כתובת משקוף המייחסת בית מדרש לרבי אליעזר הקפר.",
    identification: "identified",
    identificationNoteHe: "עדות ארכאולוגית (כתובת); הזיהוי מקובל אך נידון במחקר.",
    locations: [
      { id: "horbat-dabura", lng: 35.717, lat: 33.017, label: "חורבת דבורה", disputed: false },
    ],
  },
  {
    slug: "socho",
    nameHe: "סוכו",
    todayHe: "זיהוי לא מוכרע",
    overviewHe: "מקום המיוחס לאנטיגנוס איש סוכו במסורת הזוגות.",
    identification: "unresolved",
    identificationNoteHe: "קיימים מועמדים ביהודה; אין הכרעה מפה אחת בפיילוט.",
    locations: [],
  },
  {
    slug: "tzeredah",
    nameHe: "צרדה",
    todayHe: "זיהוי לא מוכרע",
    overviewHe: "מקום המיוחס ליוסי בן יועזר איש צרדה.",
    identification: "unresolved",
    identificationNoteHe: "זיהוי מדויק אינו מוכרע; נשמר כמקום ללא נקודה.",
    locations: [],
  },
  {
    slug: "bartota",
    nameHe: "ברתותא",
    todayHe: "זיהוי לא מוכרע",
    overviewHe: "מקום המיוחס לאלעזר איש ברתותא על פי כינויו.",
    identification: "unresolved",
    identificationNoteHe: "אין זיהוי ודאי; נשמר ללא נקודה במפה.",
    locations: [],
  },
  {
    slug: "kfar-ha-bavli",
    nameHe: "כפר הבבלי",
    todayHe: "זיהוי לא מוכרע",
    overviewHe: "יישוב המיוחס ליוסי בן יהודה איש כפר הבבלי.",
    identification: "unresolved",
    identificationNoteHe: "מיקום גאוגרפי אינו מוכרע בפיילוט.",
    locations: [],
  },
  {
    slug: "asia",
    nameHe: "אסיא",
    todayHe: "זיהוי לא מוכרע",
    overviewHe: "מקום פטירתו של רבי מאיר לפי מסורת חז״ל; זיהויו הגאוגרפי שנוי במחלוקת.",
    identification: "unresolved",
    identificationNoteHe: "אסיא יכולה להצביע על אסיה הקטנה או מקום אחר; אין נקודה במפה.",
    locations: [],
  },
  {
    slug: "tekoa",
    nameHe: "תקוע",
    todayHe: "זיהוי שנוי במחלוקת",
    overviewHe: "מקום הוראה המיוחס לרשב״י במסורות; יש מועמדים ביהודה ובגליל.",
    identification: "unresolved",
    identificationNoteHe: "תקוע יהודה מול מועמדים בגליל; נשמר ללא נקודה מועדפת.",
    locations: [],
  },
  {
    slug: "emmaus",
    nameHe: "אמאוס",
    todayHe: "מועמדים: אמאוס־ניקופוליס ואחרים",
    overviewHe: "מקום המים היפים / דיומסת במסורות על אלעזר בן ערך ונהוניא איש אמהום.",
    identification: "identified",
    identificationNoteHe: "זיהוי שנוי במחלוקת; מוצגים מועמדים חלופיים כנקודות שנויות במחלוקת.",
    locations: [
      {
        id: "emmaus-nicopolis",
        lng: 34.987,
        lat: 31.839,
        label: "אמאוס־ניקופוליס (עמוואס)",
        disputed: true,
      },
      {
        id: "emmaus-qubeibeh",
        lng: 35.118,
        lat: 31.84,
        label: "אמאוס אל־קביבה (מועמד)",
        disputed: true,
      },
    ],
  },
];

function normalizeKind(kind) {
  if (kind === "secondary" || kind === "inscription") return "secondary";
  return "primary_rabbinic";
}

function normalizeType(t) {
  const mapped = TYPE_MAP[t];
  if (!mapped) throw new Error(`Unknown relationshipType: ${t}`);
  return mapped;
}

function normalizePlaceSlug(slug) {
  return PLACE_SLUG_MAP[slug] || slug;
}

function loadRawSages() {
  const files = fs
    .readdirSync(RESEARCH_DIR)
    .filter((f) => f.startsWith("_raw_") && f.endsWith(".json"));
  if (files.length !== 4) {
    throw new Error(`Expected 4 raw research files, found ${files.length}`);
  }
  const all = [];
  for (const f of files) {
    all.push(...JSON.parse(fs.readFileSync(path.join(RESEARCH_DIR, f), "utf8")));
  }
  return all;
}

function shouldSkipRel(personSlug, place) {
  const placeSlug = normalizePlaceSlug(place.placeSlug);
  if (SKIP_PAIRS.has(`${personSlug}|${placeSlug}`) || SKIP_PAIRS.has(`${personSlug}|${place.placeSlug}`)) {
    return true;
  }
  const sources = place.sources || [];
  if (!sources.length) return true;
  const allSecondary = sources.every(
    (s) => normalizeKind(s.kind) === "secondary"
  );
  if (allSecondary && place.importance === "central" && placeSlug !== "horbat-dabura") {
    return true;
  }
  return false;
}

function toRelationship(personSlug, place) {
  const placeSlug = normalizePlaceSlug(place.placeSlug);
  const sources = (place.sources || []).map((s) => ({
    labelHe: s.labelHe || s.ref || "מקור",
    url: s.url || "",
    ref: s.ref || "",
    kind: normalizeKind(s.kind),
    text: s.text || s.excerptNote || "",
  }));
  let uncertainty = place.uncertainty;
  if (uncertainty === false || uncertainty === undefined) uncertainty = null;
  else if (typeof uncertainty !== "string") uncertainty = String(uncertainty);

  return {
    personSlug,
    placeSlug,
    relationshipType: normalizeType(place.relationshipType),
    activityHe: place.activityHe || "",
    importance: place.importance || "minor",
    noteHe: place.noteHe || "",
    periodIds: Array.isArray(place.periodIds) ? place.periodIds : [],
    start: place.start ?? null,
    end: place.end ?? null,
    timeNoteHe: place.timeNoteHe || "",
    importanceNoteHe: place.importanceNoteHe || "",
    state: place.state || "known",
    sources,
    uncertainty,
  };
}

function main() {
  const sages = loadRawSages();
  const pilot = JSON.parse(
    fs.readFileSync(path.join(ROOT, "src/components/knowledge/pilot.json"), "utf8")
  );
  const pilotSlugs = pilot.people.map((p) => p.slug);
  const bySlug = Object.fromEntries(sages.map((s) => [s.slug, s]));

  for (const slug of pilotSlugs) {
    if (!bySlug[slug]) throw new Error(`Missing research for ${slug}`);
  }

  const relationships = [];
  const audit = [];
  const usedNewPlaceSlugs = new Set();

  for (const slug of pilotSlugs) {
    const s = bySlug[slug];
    const added = [];
    for (const place of s.placesFound || []) {
      if (shouldSkipRel(slug, place)) continue;
      const rel = toRelationship(slug, place);
      relationships.push(rel);
      added.push(rel);
      usedNewPlaceSlugs.add(rel.placeSlug);
    }

    const placeNames = [
      ...new Set(
        added.map((r) => {
          const fromPlace = (s.placesFound || []).find(
            (p) => normalizePlaceSlug(p.placeSlug) === r.placeSlug
          );
          return fromPlace?.placeNameHe || r.placeSlug;
        })
      ),
    ];

    audit.push({
      slug,
      name: s.name,
      reviewed: true,
      placesFound: placeNames,
      relationshipsAdded: added.length,
      primarySourcesChecked: s.primarySourcesChecked || [],
      unresolved: s.unresolved || [],
      noDocumentedPlace: added.length === 0 ? true : !!s.noDocumentedPlace && added.length === 0,
    });
  }

  // Fix noDocumentedPlace: true only when no relationships added
  for (const a of audit) {
    a.noDocumentedPlace = a.relationshipsAdded === 0;
  }

  const existingSlugs = new Set(pilot.geography.places.map((p) => p.slug));
  const newPlaces = NEW_PLACES.filter(
    (p) => usedNewPlaceSlugs.has(p.slug) && !existingSlugs.has(p.slug)
  ).map((p) => ({ ...p, sourceIds: [] }));

  // Ensure every used non-existing place has a definition
  for (const slug of usedNewPlaceSlugs) {
    if (existingSlugs.has(slug)) continue;
    if (!newPlaces.some((p) => p.slug === slug) && !NEW_PLACES.some((p) => p.slug === slug)) {
      throw new Error(`Missing newPlaces definition for ${slug}`);
    }
  }

  const out = {
    generatedAt: "2026-09-16",
    method:
      "Primary rabbinic sources preferred; Sefaria links; secondary for discovery only; no invented links",
    newPlaces,
    relationships,
    audit,
  };

  fs.mkdirSync(RESEARCH_DIR, { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2), "utf8");
  console.log(
    JSON.stringify(
      {
        sages: audit.length,
        newPlaces: newPlaces.length,
        relationships: relationships.length,
        withPlaces: audit.filter((a) => a.relationshipsAdded > 0).length,
        noDocumentedPlace: audit.filter((a) => a.noDocumentedPlace).length,
      },
      null,
      2
    )
  );
}

main();
