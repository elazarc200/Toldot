import type { Metadata } from "next";
import Link from "next/link";
import {
  loadMapCandidates,
  loadMapPersonPlaces,
  loadMapPlaces,
} from "@/application/visualization-loaders";
import { MapExplorerClient } from "@/components/map/MapExplorerClient";

export const metadata: Metadata = {
  title: "מפה",
  robots: { index: true, follow: true },
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Props = {
  searchParams: Promise<{
    place?: string;
    person?: string;
    period?: string;
  }>;
};

export default async function MapPage({ searchParams }: Props) {
  const { place, person, period } = await searchParams;
  const focusPlaceId = place && UUID_RE.test(place) ? place : null;
  const focusPersonId = person && UUID_RE.test(person) ? person : null;
  const focusPeriodId = period && UUID_RE.test(period) ? period : null;

  const [places, candidates, personPlaces] = await Promise.all([
    loadMapPlaces(),
    loadMapCandidates(),
    loadMapPersonPlaces(),
  ]);

  return (
    <main className="shell-wide map-page">
      <header className="seder-page-header">
        <h1 className="brand" style={{ fontSize: "2rem" }}>
          מפה
        </h1>
        <p className="lede">
          חקירה גאוגרפית של מקומות מפורסמים ופעילות אנשים. מקומות ללא נקודה
          מופיעים ברשימה בלבד — ללא סיכות מדומות.
        </p>
        <p className="nav">
          <Link href="/seder-hadorot">סדר הדורות</Link>
          <Link href="/search">חיפוש</Link>
        </p>
        {(place && !focusPlaceId) || (person && !focusPersonId) ? (
          <p className="alert alert-error" role="alert">
            מזהה קישור עמוק לא תקין. יש להשתמש ב-UUID קנוני.
          </p>
        ) : null}
      </header>

      {!places.length ? (
        <div className="panel" role="status">
          <p>טרם פורסמו מקומות לתצוגת מפה.</p>
        </div>
      ) : (
        <MapExplorerClient
          places={places}
          candidates={candidates}
          personPlaces={personPlaces}
          focusPlaceId={focusPlaceId}
          focusPersonId={focusPersonId}
          focusPeriodId={focusPeriodId}
        />
      )}
    </main>
  );
}
