import { MetadataRoute } from "next";
import { SITE_CONFIG } from "@/lib/config/site";

export default function robots(): MetadataRoute.Robots {
  const isIndexingEnabled = process.env.SITE_INDEXING_ENABLED === "true";

  if (!isIndexingEnabled) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/api/", "/order/success"],
    },
    sitemap: `${SITE_CONFIG.siteUrl}/sitemap.xml`,
  };
}
