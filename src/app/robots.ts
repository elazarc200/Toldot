import type { MetadataRoute } from "next";
import { shouldDisallowSearchIndexing } from "@/lib/toladot-env";

export default function robots(): MetadataRoute.Robots {
  if (shouldDisallowSearchIndexing()) {
    return {
      rules: [
        {
          userAgent: "*",
          disallow: "/",
        },
      ],
      // Intentionally omit sitemap on non-production — pilot is not an index source.
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/", "/login"],
      },
    ],
    sitemap: "/sitemap.xml",
  };
}
