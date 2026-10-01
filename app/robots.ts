import { MetadataRoute } from "next";
import { SITE_CONFIG } from "@/lib/config/site";

export default function robots(): MetadataRoute.Robots {
  const isIndexingEnabled = process.env.SITE_INDEXING_ENABLED === "true";

  if (!isIndexingEnabled) {
    return {
      rules: {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/*",
          "/account",
          "/account/*",
          "/checkout",
          "/checkout/*",
          "/api",
          "/api/*",
          "/order/*",
        ],
      },
      sitemap: `${SITE_CONFIG.siteUrl}/sitemap.xml`,
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/admin/*",
        "/account",
        "/account/*",
        "/checkout",
        "/checkout/*",
        "/api",
        "/api/*",
        "/order/*",
      ],
    },
    sitemap: `${SITE_CONFIG.siteUrl}/sitemap.xml`,
  };
}
