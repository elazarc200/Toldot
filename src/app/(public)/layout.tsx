import type { Metadata } from "next";
import { PublicHeader } from "@/components/public-ui";
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
      <a className="sr-only" href="#main">
        דלג לתוכן
      </a>
      <PublicHeader />
      <div id="main">{children}</div>
    </>
  );
}
