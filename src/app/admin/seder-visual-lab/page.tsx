"use client";

import { useState } from "react";
import Link from "next/link";
import { loadSederVisualFixture } from "@/fixtures/seder-visual-fixture";
import { SederExplorerClient } from "@/components/seder/SederExplorerClient";
import {
  SEDER_VISUAL_VARIANTS,
  getSederVisualTokens,
  type SederVisualVariant,
} from "@/lib/seder-visual-tokens";

const fixture = loadSederVisualFixture();

export default function SederVisualLabPage() {
  const [variant, setVariant] = useState<SederVisualVariant>(1);
  const tokens = getSederVisualTokens(variant);

  return (
    <main className="shell-wide">
      <header className="seder-page-header">
        <h1 className="brand" style={{ fontSize: "2rem" }}>
          מעבדת חזות סדר הדורות
        </h1>
        <p className="lede">
          נתוני דמה בלבד (ללא DB). השוו וריאנטי קווים/סמנים לפני נעילה
          בפרודקשן. ברירת המחדל הציבורית היא וריאנט 1.
        </p>
        <p className="nav">
          <Link href="/admin">לוח עריכה</Link>
          <Link href="/seder-hadorot">תצוגה ציבורית</Link>
        </p>
      </header>

      <fieldset className="seder-lab-variants panel">
        <legend>וריאנט חזותי</legend>
        <div className="seder-lab-variant-row">
          {SEDER_VISUAL_VARIANTS.map((v) => {
            const t = getSederVisualTokens(v);
            return (
              <label key={v} className="seder-filter-row">
                <input
                  type="radio"
                  name="visual-variant"
                  checked={variant === v}
                  onChange={() => setVariant(v)}
                />
                {t.label_he}
              </label>
            );
          })}
        </div>
        <p className="muted">{tokens.description_he}</p>
      </fieldset>

      <SederExplorerClient
        bands={fixture.bands}
        nodes={fixture.nodes}
        edges={fixture.edges}
        renderLayout={fixture.renderLayout}
        visualVariant={variant}
        showVariantBadge
      />
    </main>
  );
}
