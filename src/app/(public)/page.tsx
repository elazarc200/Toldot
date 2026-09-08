import type { Metadata } from "next";
import Link from "next/link";
import { DesignIcon } from "@/components/design-icons";

export const metadata: Metadata = {
  title: "תולדות — לגלות את הסיפור שמחבר בינינו",
  description: "לגלות אנשים, מקומות ותקופות. לחקור את ההקשרים, להכיר את המקורות ולראות את התמונה הרחבה.",
};
// Geographic reference points; they make no claims about historical relationships.
const places = [
  { name: "צפת", lon: 35.496, lat: 32.965, side: "right" },
  { name: "טבריה", lon: 35.532, lat: 32.795, side: "left" },
  { name: "קיסריה", lon: 34.899, lat: 32.5, side: "right" },
  { name: "ירושלים", lon: 35.235, lat: 31.778, side: "left" },
  { name: "יבנה", lon: 34.738, lat: 31.878, side: "right" },
];
const gateways = [
  { title: "חקור במפה", description: "לגלות את הסיפורים דרך המקומות", href: "/map", icon: "map" as const, number: "01" },
  { title: "גלה את החכמים", description: "להכיר אנשים, דורות וקשרים", href: "/seder-hadorot", icon: "people" as const, number: "02" },
  { title: "נווט לפי ציר זמן", description: "לנוע בין התקופות ולראות מה השתנה", href: "/periods", icon: "time" as const, number: "03" },
];
export default function HomePage() {
  return <main className="td-home">
    <section className="td-hero" aria-labelledby="home-title">
      <div className="td-atlas">
        <div className="td-map-surface">
          {/* Local SVG generated from Natural Earth geographic polygons. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/maps/israel.svg" alt="" width="720" height="860" className="td-geography"/>
          <div className="td-map-grid" aria-hidden="true"/>
          <span className="td-sea-label" aria-hidden="true">הים התיכון</span>
          <span className="td-region td-galilee" aria-hidden="true">ה ג ל י ל</span>
          <span className="td-region td-judea" aria-hidden="true">י ה ו ד ה</span>
          <span className="td-north" aria-hidden="true">צ<span>↑</span></span>
          {places.map(place => <Link key={place.name} href={`/search?q=${encodeURIComponent(place.name)}`} prefetch={false} className={`td-map-place td-label-${place.side}`} style={{ left: `${(place.lon - 33.6) / 2.6 * 100}%`, top: `${(33.7 - place.lat) / 2.9 * 100}%` }} aria-label={`חיפוש ${place.name}`}><i aria-hidden="true"/><span>{place.name}</span></Link>)}
          <div className="td-map-credit">מפת התמצאות · <a href="https://www.naturalearthdata.com/about/terms-of-use/" target="_blank" rel="noreferrer">Natural Earth</a></div>
        </div>
        <Link href="/map" prefetch={false} className="td-map-caption"><DesignIcon kind="map"/><span>לכל מקום יש סיפור</span><DesignIcon kind="arrow"/></Link>
      </div>
      <div className="td-hero-copy">
        <p className="td-eyebrow"><span/> מסע אל העולם שמאחורי השמות</p>
        <h1 id="home-title">האנשים. המקומות.<br/><span>הסיפור שמחבר.</span></h1>
        <p className="td-intro">כל שם הוא התחלה של סיפור.<br/>גלו את החכמים, המקומות והדורות —<br className="td-desktop-break"/> ואת הקשרים שהופכים אותם לעולם שלם.</p>
        <form className="td-home-search" action="/search" method="get" role="search">
          <label htmlFor="home-query" className="sr-only">חיפוש אדם, מקום או תקופה</label>
          <DesignIcon kind="search"/>
          <input id="home-query" name="q" type="search" placeholder="אדם, מקום, תקופה…" required autoComplete="off"/>
          <button type="submit" aria-label="חיפוש">חיפוש<DesignIcon kind="arrow"/></button>
        </form>
        <div className="td-search-examples"><span>אפשר להתחיל כאן</span>{["הלל הזקן", "ירושלים", "תקופת התנאים"].map(q => <Link prefetch={false} href={`/search?q=${encodeURIComponent(q)}`} key={q}>{q}</Link>)}</div>
      </div>
    </section>
    <section className="td-gateways" aria-label="שלוש דרכים להתחיל לחקור">
      {gateways.map(g => <Link className="td-gateway" key={g.href} href={g.href} prefetch={false}>
        <div className="td-gateway-top"><DesignIcon kind={g.icon}/><span>{g.number}</span></div>
        <div className="td-gateway-bottom"><div><h2>{g.title}</h2><p>{g.description}</p></div><DesignIcon kind="arrow"/></div>
      </Link>)}
    </section>
    <section className="td-editorial" aria-labelledby="editorial-title">
      <div className="td-editorial-intro"><p className="td-eyebrow">מבט מקרוב <span/></p><h2 id="editorial-title">מילים שעוברות<br/>מדור לדור.</h2><p>רגע של מחשבה מתוך פרקי אבות.</p></div>
      <div className="td-quotation"><span className="td-quote-mark" aria-hidden="true">״</span><blockquote>אם אין אני לי, מי לי?<br/>וכשאני לעצמי, מה אני?<br/><strong>ואם לא עכשיו, אימתי?</strong></blockquote><div className="td-quote-source"><span>הלל הזקן <span>· משנה, אבות א, יד</span></span><Link prefetch={false} href="/search?q=%D7%94%D7%9C%D7%9C">לגלות את הלל<DesignIcon kind="arrow"/></Link></div></div>
    </section>
    <footer className="td-footer"><Link href="/" className="td-footer-logo">תולדות</Link><p>הסיפור רחב יותר כשמגלים את הקשרים.</p><span>אנשים · מקומות · דורות</span></footer>
  </main>;
}
