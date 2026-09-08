import type { Metadata } from "next";
import { DesignHeader } from "@/components/design-header";
import "@/styles/design-system.css";
import { shouldDisallowSearchIndexing } from "@/lib/toladot-env";

const disallowIndex = shouldDisallowSearchIndexing();

export const metadata: Metadata = {
  title: {
    default: "תולדות",
    template: "%s · תולדות",
  },
  description:
    "פלטפורמת ידע והקשר היסטורי בעברית — אנשים, מקומות ותקופות מתוך פרסומים מאושרים בלבד.",
  robots: disallowIndex
    ? { index: false, follow: false, nocache: true }
    : { index: true, follow: true },
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a className="td-skip-link" href="#main">
        דלג לתוכן
      </a>
      <DesignHeader />
      <div id="main" tabIndex={-1}>{children}</div>
    </>
  );
}
