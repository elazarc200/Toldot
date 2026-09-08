import Link from "next/link";
import type { PublicEvidenceItemDto, UncertaintyDto } from "@/domain/public";

export function UncertaintyBadge({ value }: { value: UncertaintyDto }) {
  return (
    <span
      className={`uncertainty uncertainty-${value.state}`}
      title={value.label_he}
    >
      <span className="uncertainty-dot" aria-hidden="true" />
      <span className="sr-only">מצב ודאות: </span>
      {value.label_he}
    </span>
  );
}

export function EvidenceDisclosure({ items }: { items: PublicEvidenceItemDto[] }) {
  if (!items.length) {
    return <p className="muted">אין מקורות מפורסמים בסעיף זה עדיין.</p>;
  }
  return (
    <div className="evidence-list">
      {items.map((item, idx) => (
        <details key={`${item.statement}-${idx}`} className="evidence-item">
          <summary>
            <span>{item.statement.slice(0, 120) || "מקור"}</span>
            {item.dispute ? (
              <span className="badge-dispute"> מחלוקת</span>
            ) : null}
            <UncertaintyBadge value={item.knowledge_state} />
          </summary>
          <div className="evidence-body">
            {item.stance ? <p>עמדה: {item.stance}</p> : null}
            {item.citation ? (
              <p>
                ציטוט: {item.citation.work_title ? `${item.citation.work_title} — ` : ""}
                {item.citation.display}
                {item.citation.external_url ? (
                  <>
                    {" "}
                    <a
                      href={item.citation.external_url}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      קישור חיצוני
                    </a>
                  </>
                ) : null}
              </p>
            ) : (
              <p className="muted">ללא ציטוט מצורף</p>
            )}
            {item.editorial_note ? <p>{item.editorial_note}</p> : null}
          </div>
        </details>
      ))}
    </div>
  );
}

export function PublicHeader() {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link className="site-logo" href="/">
          תולדות
        </Link>
        <nav className="site-nav" aria-label="ניווט ראשי">
          <Link href="/search">חיפוש</Link>
          <Link href="/periods">תקופות</Link>
          <Link href="/map">מפה</Link>
          <Link href="/seder-hadorot">סדר הדורות</Link>
        </nav>
      </div>
    </header>
  );
}

export function PortraitFallback({ name }: { name: string }) {
  const initial = name.trim().slice(0, 1) || "ת";
  return (
    <div className="portrait-fallback" role="img" aria-label={`איור מייצג עבור ${name}`}>
      <span aria-hidden="true">{initial}</span>
      <small>ללא דיוקן מאושר</small>
    </div>
  );
}
