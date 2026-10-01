import type { Metadata } from "next";
import { SITE_CONFIG } from "@/lib/config/site";
import { buildBreadcrumbSchema } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Track Your Order & Real-Time Logistics Telemetry",
  description: "Track your international or domestic package door-to-door with real-time carrier checkpoints and live delivery estimates.",
  alternates: {
    canonical: `${SITE_CONFIG.siteUrl}/track-order`,
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
