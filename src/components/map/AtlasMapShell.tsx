import type { ReactNode } from 'react';
import Link from 'next/link';
import '@/components/map/atlas.css';
import 'maplibre-gl/dist/maplibre-gl.css';

/** Static atlas chrome shown while the heavy map chunk loads. Matches ToladotMap layout. */
export function AtlasMapShell({ stage }: { stage: ReactNode }) {
  return (
    <main className="atlas" dir="rtl">
      <header className="atlas-heading">
        <div>
          <span className="atlas-eyebrow">אנשים · מקומות · זיכרון</span>
          <h1>
            מפת תולדות<span>ההיסטוריה מקבלת מקום</span>
          </h1>
        </div>
        <Link href="/knowledge">לעץ מסירת התורה ↗</Link>
      </header>
      <div className="atlas-toolbar">
        <div className="atlas-search">
          <label htmlFor="atlas-sage">חיפוש במפה</label>
          <input
            id="atlas-sage"
            placeholder="חכם, מקום או קבר…"
            autoComplete="off"
            disabled
            aria-disabled="true"
          />
        </div>
        <button type="button" disabled aria-disabled="true">
          סינון ושכבות ☷
        </button>
        <label className="atlas-modern-toggle">
          <input type="checkbox" disabled aria-disabled="true" />
          הצג מפה עכשווית
        </label>
        <button type="button" disabled aria-disabled="true">
          קברי צדיקים
        </button>
        <button type="button" disabled aria-disabled="true" aria-label="התאמת המפה לכל המקומות המוצגים">
          התאמה למקומות ⛶
        </button>
      </div>
      <div className="atlas-stage">
        {stage}
        <div className="atlas-map-caption">
          <span className="atlas-eyebrow">אטלס חכמי פרקי אבות</span>
          <p>
            כל תקופות הפיילוט
            <small>טוען נתוני מקומות…</small>
          </p>
        </div>
        <div className="atlas-legend">
          <span>
            <i className="large" />
            מרכז ראשי
          </span>
          <span>
            <i />
            חשוב
          </span>
          <span>
            <i className="small" />
            משני / אזכור
          </span>
          <span>
            <i className="dashed" />
            זיהוי שנוי במחלוקת
          </span>
        </div>
      </div>
      <footer className="atlas-footer">
        <p>
          <span>טוען את המפה האינטראקטיבית…</span>
        </p>
      </footer>
    </main>
  );
}
