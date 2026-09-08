import type { MetadataRoute } from "next";
import { listPublishedSlugsForSitemap } from "@/application/public-loaders";
import { shouldDisallowSearchIndexing } from "@/lib/toladot-env";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Pilot/local: do not promote a production-style sitemap for indexing.
  if (shouldDisallowSearchIndexing()) {
    return [];
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const slugs = await listPublishedSlugsForSitemap();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/search`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/periods`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/map`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/seder-hadorot`, changeFrequency: "monthly", priority: 0.4 },
  ];

  const dynamic = slugs.map((s) => ({
    url: `${base}/${s.aggregate_type === "person" ? "person" : s.aggregate_type === "place" ? "place" : "period"}/${s.slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...dynamic];
}
