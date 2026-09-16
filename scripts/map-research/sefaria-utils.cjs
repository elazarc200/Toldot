const crypto = require("crypto");

function uuidFrom(seed) {
  const h = crypto.createHash("sha1").update(String(seed)).digest();
  h[6] = (h[6] & 0x0f) | 0x50;
  h[8] = (h[8] & 0x3f) | 0x80;
  const hex = h.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

async function sefariaText(ref) {
  const url = `https://www.sefaria.org/api/texts/${encodeURIComponent(ref)}?context=0&commentary=0&pad=0`;
  const res = await fetch(url);
  if (!res.ok) return { ok: false, status: res.status, ref };
  const data = await res.json();
  const he = Array.isArray(data.he)
    ? data.he.flat(Infinity).filter(Boolean).join(" ")
    : data.he || "";
  const en = Array.isArray(data.text)
    ? data.text.flat(Infinity).filter(Boolean).join(" ")
    : data.text || "";
  const canon = data.ref || ref;
  return {
    ok: true,
    ref: canon,
    heRef: data.heRef,
    url: `https://www.sefaria.org/${String(canon).replace(/ /g, "_")}?lang=he`,
    he: String(he).slice(0, 500),
    en: String(en).slice(0, 500),
  };
}

module.exports = { uuidFrom, sefariaText };
