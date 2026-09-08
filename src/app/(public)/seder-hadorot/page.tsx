import type { Metadata } from "next";
import Link from "next/link";
import {
  loadSederAlphaIndex,
  loadSederPlacementBundle,
} from "@/application/visualization-loaders";
import { SederAlphaIndexClient } from "@/components/seder/SederAlphaIndexClient";
import { SederExplorerClient } from "@/components/seder/SederExplorerClient";
import { shouldDisallowSearchIndexing } from "@/lib/toladot-env";

const disallowIndex = shouldDisallowSearchIndexing();

export const metadata: Metadata = {
  title: "סדר הדורות",
  robots: disallowIndex
    ? { index: false, follow: false }
    : { index: true, follow: true },
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Props = {
  searchParams: Promise<{
    person?: string;
    intent?: string;
    mode?: string;
  }>;
};

export default async function SederHadorotPage({ searchParams }: Props) {
  const { person, intent, mode } = await searchParams;
  const isAlpha = mode === "alpha";

  if (isAlpha) {
    const rows = await loadSederAlphaIndex();
    return (
      <main className="shell-wide">
        <header className="seder-page-header">
          <h1 className="brand" style={{ fontSize: "2rem" }}>
            סדר הדורות — אינדקס אלפביתי
          </h1>
          <p className="lede">
            רשימה אלפביתית של אנשים מפורסמים. ניתן לקפוץ מתא לכרונולוגיה.
          </p>
          <p className="nav">
            <Link className="button" href="/seder-hadorot">
              לתצוגה הכרונולוגית
            </Link>
          </p>
        </header>
        <SederAlphaIndexClient rows={rows} />
      </main>
    );
  }

  const uuidOk = !!person && UUID_RE.test(person);
  const focusPersonId =
    uuidOk && (intent === "focus" || !intent) ? person! : null;

  const bundle = await loadSederPlacementBundle();

  return (
    <main className="shell-wide seder-page">
      <header className="seder-page-header">
        <h1 className="brand" style={{ fontSize: "2rem" }}>
          סדר הדורות
        </h1>
        <p className="lede">
          חקירה כרונולוגית של דורות וקשרים. גרירה להזזה, גלגלת לזום. ברשימה
          הסמנטית ניתן לנווט ללא תלות בגרף.
        </p>
        <p className="nav">
          <Link href="/seder-hadorot?mode=alpha">אינדקס אלפביתי</Link>
          <Link href="/map">מפה</Link>
        </p>
        {person && !uuidOk ? (
          <p className="alert alert-error" role="alert">
            מזהה אדם לא תקין. יש להשתמש ב-UUID קנוני.
          </p>
        ) : null}
        {focusPersonId ? (
          <p className="muted" data-focus-person={focusPersonId}>
            מיקוד לפי מזהה: {focusPersonId}
          </p>
        ) : null}
      </header>

      {!bundle.nodes.length ? (
        <div className="panel" role="status">
          <p>טרם פורסם מנוע הצבה פעיל. חזרו לאחר פרסום תצוגה.</p>
        </div>
      ) : (
        <SederExplorerClient
          bands={bundle.bands}
          nodes={bundle.nodes}
          edges={bundle.edges}
          renderLayout={bundle.renderLayout}
          focusPersonId={focusPersonId}
        />
      )}
    </main>
  );
}
