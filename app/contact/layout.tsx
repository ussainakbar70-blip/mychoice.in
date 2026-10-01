import type { Metadata } from "next";
import { SITE_CONFIG } from "@/lib/config/site";
import { buildBreadcrumbSchema } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Contact Client Concierge & Support",
  description: "Contact our dedicated client concierge team for inquiries regarding orders, tracking, or curations. Official email: mychoiceteam.com@gmail.com.",
  alternates: {
    canonical: `${SITE_CONFIG.siteUrl}/contact`,
  },
  openGraph: {
    title: `Contact Client Concierge | ${SITE_CONFIG.brandName}`,
    description: "Contact our client concierge team for inquiries regarding existing orders or tracking.",
    url: `${SITE_CONFIG.siteUrl}/contact`,
    siteName: SITE_CONFIG.brandName,
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `Contact Concierge | ${SITE_CONFIG.brandName}`,
    description: "Official client support and inquiries.",
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Contact Concierge", url: "/contact" },
  ]);

  const contactSchema = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: "Contact MYCHOICE Concierge",
    url: `${SITE_CONFIG.siteUrl}/contact`,
    mainEntity: {
      "@type": "Organization",
      name: SITE_CONFIG.brandName,
      email: SITE_CONFIG.contact.email,
      telephone: SITE_CONFIG.contact.phone,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactSchema) }}
      />
      {children}
    </>
  );
}
