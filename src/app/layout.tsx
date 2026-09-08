import type { Metadata } from "next";
import "@/styles/globals.css";
import { shouldDisallowSearchIndexing } from "@/lib/toladot-env";

const disallowIndex = shouldDisallowSearchIndexing();

export const metadata: Metadata = {
  title: "תולדות",
  description: "פלטפורמת ידע והקשר היסטורי בעברית",
  robots: disallowIndex
    ? { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } }
    : { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
