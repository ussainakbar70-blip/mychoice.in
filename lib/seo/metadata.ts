import type { Metadata } from "next";
import { SITE_CONFIG } from "@/lib/config/site";

export interface ConstructMetadataProps {
  title?: string;
  description?: string;
  image?: string;
  canonicalUrl?: string;
  noIndex?: boolean;
  type?: "website" | "article";
  keywords?: string[];
}

export const DEFAULT_KEYWORDS = [
  "curated lifestyle essentials",
  "minimalist home design",
  "modern lifestyle products",
  "ergonomic everyday carry",
  "sustainable home goods",
  "luxury essentials online",
  "global express dropshipping",
  "high quality home decor",
  "contemporary living objects",
  "MYCHOICE store",
];

export function constructMetadata({
  title,
  description = SITE_CONFIG.description,
  image = "/favicon.svg",
  canonicalUrl,
  noIndex = false,
  type = "website",
  keywords = DEFAULT_KEYWORDS,
}: ConstructMetadataProps = {}): Metadata {
  const baseUrl = SITE_CONFIG.siteUrl;
  const fullTitle = title
    ? `${title} | ${SITE_CONFIG.brandName}`
    : `${SITE_CONFIG.brandName} | Curated Essentials for Modern Living`;

  const absoluteImageUrl = image.startsWith("http")
    ? image
    : `${baseUrl}${image.startsWith("/") ? "" : "/"}${image}`;

  const canonical = canonicalUrl
    ? canonicalUrl.startsWith("http")
      ? canonicalUrl
      : `${baseUrl}${canonicalUrl.startsWith("/") ? "" : "/"}${canonicalUrl}`
    : baseUrl;

  return {
    title: fullTitle,
    description,
    keywords,
    authors: [{ name: SITE_CONFIG.brandName, url: baseUrl }],
    creator: SITE_CONFIG.brandName,
    publisher: SITE_CONFIG.brandName,
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical,
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
          },
        },
    openGraph: {
      title: fullTitle,
      description,
      url: canonical,
      siteName: SITE_CONFIG.brandName,
      images: [
        {
          url: absoluteImageUrl,
          width: 1200,
          height: 630,
          alt: title || SITE_CONFIG.brandName,
        },
      ],
      locale: "en_US",
      type,
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [absoluteImageUrl],
      creator: "@mychoice_in",
      site: "@mychoice_in",
    },
  };
}
