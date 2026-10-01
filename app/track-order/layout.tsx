import type { Metadata } from "next";
import { SITE_CONFIG } from "@/lib/config/site";
import { buildBreadcrumbSchema } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Track Your Order & Real-Time Logistics Telemetry",
  description: "Track your international or domestic package door-to-door with real-time carrier checkpoints and live delivery estimates.",
  alternates: {
    canonical: `${SITE_CONFIG.siteUrl}/track-order`,
    languages: {
      en: `${SITE_CONFIG.siteUrl}/track-order`,
      ja: `${SITE_CONFIG.siteUrl}/track-order?lang=ja`,
      de: `${SITE_CONFIG.siteUrl}/track-order?lang=de`,
      es: `${SITE_CONFIG.siteUrl}/track-order?lang=es`,
      fr: `${SITE_CONFIG.siteUrl}/track-order?lang=fr`,
      "zh-CN": `${SITE_CONFIG.siteUrl}/track-order?lang=zh-CN`,
      ar: `${SITE_CONFIG.siteUrl}/track-order?lang=ar`,
      pt: `${SITE_CONFIG.siteUrl}/track-order?lang=pt`,
      it: `${SITE_CONFIG.siteUrl}/track-order?lang=it`,
      ko: `${SITE_CONFIG.siteUrl}/track-order?lang=ko`,
      hi: `${SITE_CONFIG.siteUrl}/track-order?lang=hi`,
      ru: `${SITE_CONFIG.siteUrl}/track-order?lang=ru`,
      nl: `${SITE_CONFIG.siteUrl}/track-order?lang=nl`,
      tr: `${SITE_CONFIG.siteUrl}/track-order?lang=tr`,
      pl: `${SITE_CONFIG.siteUrl}/track-order?lang=pl`,
      id: `${SITE_CONFIG.siteUrl}/track-order?lang=id`,
      vi: `${SITE_CONFIG.siteUrl}/track-order?lang=vi`,
      th: `${SITE_CONFIG.siteUrl}/track-order?lang=th`,
      sv: `${SITE_CONFIG.siteUrl}/track-order?lang=sv`,
      el: `${SITE_CONFIG.siteUrl}/track-order?lang=el`,
      "x-default": `${SITE_CONFIG.siteUrl}/track-order`,
    },
  },
  openGraph: {
    title: `Track Your Order | ${SITE_CONFIG.brandName}`,
    description: "Real-time door-to-door courier tracking for your orders.",
    url: `${SITE_CONFIG.siteUrl}/track-order`,
    siteName: SITE_CONFIG.brandName,
    locale: "en_US",
    type: "website",
  },
};

export default function TrackOrderLayout({ children }: { children: React.ReactNode }) {
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Track Your Order", url: "/track-order" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {children}
    </>
  );
}
