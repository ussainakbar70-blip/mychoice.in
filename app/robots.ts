import { MetadataRoute } from "next";
import { SITE_CONFIG } from "@/lib/config/site";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = SITE_CONFIG.siteUrl;

  return {
    rules: [
      {
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
      {
        userAgent: "Googlebot",
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
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
