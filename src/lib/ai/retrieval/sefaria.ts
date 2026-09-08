import type {
  ResearchRetrievalAdapter,
  RetrievalHit,
  RetrievalQuery,
} from "@/lib/ai/retrieval/types";

/**
 * Sefaria structured retrieval adapter.
 * Sefaria refs/URLs are resolution metadata only — never Toladot canonical identity.
 * Does not mirror the corpus; short excerpts only.
 */
export class SefariaRetrievalAdapter implements ResearchRetrievalAdapter {
  readonly meta = {
    code: "sefaria",
    retrievalMethod: "sefaria_api",
    citationResolutionCapability: "location_confirm" as const,
    trustClass: "structured_corpus" as const,
    isDiscoveryOnly: false,
    evidenceEligible: true,
    mayRetainFullText: false,
    maxExcerptChars: 800,
    timeoutMs: 15_000,
  };

  constructor(private readonly baseUrl = "https://www.sefaria.org/api") {}

  async retrieve(query: RetrievalQuery): Promise<RetrievalHit[]> {
    const ref = query.query.trim();
    if (!ref) return [];

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.meta.timeoutMs);

    try {
      const url = `${this.baseUrl}/texts/${encodeURIComponent(ref)}?context=0`;
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });

      const lenHeader = res.headers.get("content-length");
      if (lenHeader && Number(lenHeader) > 256 * 1024) {
        return [
          {
            adapterCode: this.meta.code,
            providerRef: ref,
            providerUrl: `https://www.sefaria.org/${encodeURIComponent(ref)}`,
            suggestedCanonicalCitationHe: hebraizeSefariaRef(ref),
            excerpt: null,
            untrusted: true,
            isDiscoveryOnly: false,
            evidenceEligible: true,
            warnings: ["Sefaria response too large"],
          },
        ];
      }

      if (!res.ok) {
        return [
          {
            adapterCode: this.meta.code,
            providerRef: ref,
            providerUrl: `https://www.sefaria.org/${encodeURIComponent(ref)}`,
            suggestedCanonicalCitationHe: hebraizeSefariaRef(ref),
            excerpt: null,
            untrusted: true,
            isDiscoveryOnly: false,
            evidenceEligible: true,
            warnings: [`Sefaria lookup failed: HTTP ${res.status}`],
          },
        ];
      }

      const body = (await res.json()) as {
        he?: string[] | string;
        text?: string[] | string;
        ref?: string;
      };

      const heText = flattenText(body.he);
      const excerpt = heText
        ? heText.slice(0, query.maxExcerptChars ?? this.meta.maxExcerptChars)
        : null;

      const providerRef = body.ref || ref;

      return [
        {
          adapterCode: this.meta.code,
          providerRef,
          providerUrl: `https://www.sefaria.org/${encodeURIComponent(providerRef)}`,
          suggestedCanonicalCitationHe: hebraizeSefariaRef(providerRef),
          excerpt,
          untrusted: true,
          isDiscoveryOnly: false,
          evidenceEligible: true,
          warnings: [
            "Sefaria provider_ref/url are resolution metadata only; canonical citation is Toladot-owned.",
            "Do not copy Sefaria editorial/translation wording into Story retellings.",
          ],
        },
      ];
    } catch (err) {
      return [
        {
          adapterCode: this.meta.code,
          providerRef: ref,
          providerUrl: null,
          suggestedCanonicalCitationHe: hebraizeSefariaRef(ref),
          excerpt: null,
          untrusted: true,
          isDiscoveryOnly: false,
          evidenceEligible: true,
          warnings: [
            err instanceof Error ? err.message : "Sefaria retrieval error",
          ],
        },
      ];
    } finally {
      clearTimeout(timer);
    }
  }
}

function flattenText(value: string[] | string | undefined): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.join(" ");
}

/** Best-effort Hebrew display suggestion — not a Sefaria dependency. */
export function hebraizeSefariaRef(ref: string): string {
  const trimmed = ref.trim();
  // Shabbat 31a → תלמוד בבלי, שבת לא ע״א (illustrative mapping for common form)
  const m = trimmed.match(/^([A-Za-z' ]+)\s+(\d+)([ab])?$/i);
  if (m && m[1] && m[2]) {
    const tractate = m[1].trim();
    const daf = toHebrewGematria(Number(m[2]));
    const side = m[3]?.toLowerCase() === "b" ? "ע״ב" : m[3] ? "ע״א" : "";
    const tractateHe = TRACTATE_HE[tractate.toLowerCase()] || tractate;
    return `תלמוד בבלי, ${tractateHe} ${daf}${side ? ` ${side}` : ""}`.trim();
  }
  return trimmed;
}

const TRACTATE_HE: Record<string, string> = {
  shabbat: "שבת",
  berakhot: "ברכות",
  eruvin: "עירובין",
  pesachim: "פסחים",
  yoma: "יומא",
  sukkah: "סוכה",
  "rosh hashanah": "ראש השנה",
  taasit: "תענית",
  taanit: "תענית",
  megillah: "מגילה",
  moed: "מועד",
  "moed katan": "מועד קטן",
  chagigah: "חגיגה",
  yevamot: "יבמות",
  ketubot: "כתובות",
  nedarim: "נדרים",
  nazir: "נזיר",
  sotah: "סוטה",
  gittin: "גיטין",
  kiddushin: "קידושין",
  "bava kamma": "בבא קמא",
  "bava metzia": "בבא מציעא",
  "bava batra": "בבא בתרא",
  sanhedrin: "סנהדרין",
  makkot: "מכות",
  shevuot: "שבועות",
  avodah: "עבודה זרה",
  "avodah zarah": "עבודה זרה",
  horayot: "הוריות",
  zevachim: "זבחים",
  menachot: "מנחות",
  chullin: "חולין",
  bekhorot: "בכורות",
  arakhin: "ערכין",
  temurah: "תמורה",
  keritot: "כריתות",
  meilah: "מעילה",
  tamid: "תמיד",
  middot: "מדות",
  "kinim": "קינים",
  niddah: "נדה",
};

function toHebrewGematria(n: number): string {
  const ones = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"];
  const tens = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"];
  const hundreds = ["", "ק", "ר", "ש", "ת"];
  if (n <= 0 || n > 400) return String(n);
  if (n === 15) return "טו";
  if (n === 16) return "טז";
  const h = Math.floor(n / 100);
  const t = Math.floor((n % 100) / 10);
  const o = n % 10;
  return `${hundreds[h]}${tens[t]}${ones[o]}`;
}
