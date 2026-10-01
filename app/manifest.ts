import { MetadataRoute } from "next";
import { SITE_CONFIG } from "@/lib/config/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_CONFIG.brandName} - Curated Lifestyle Essentials`,
    short_name: SITE_CONFIG.brandName,
    description: SITE_CONFIG.description,
    start_url: "/",
    display: "standalone",
    background_color: "#0b0f17",
    theme_color: "#0b0f17",
    icons: [
      {
        src: "/favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
