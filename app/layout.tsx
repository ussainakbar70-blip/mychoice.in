import type { Metadata, Viewport } from "next";
import "./globals.css";
import { CartProvider } from "@/lib/cart/context";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { GoogleTranslateScript } from "@/components/layout/GoogleTranslateScript";
import { SITE_CONFIG } from "@/lib/config/site";
import { buildOrganizationSchema, buildWebSiteSchema } from "@/lib/seo";

export const viewport: Viewport = {
  themeColor: "#0b0f17",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: {
    default: `${SITE_CONFIG.brandName} | Curated Essentials for Modern Living`,
    template: `%s | ${SITE_CONFIG.brandName}`,
  },
  description: SITE_CONFIG.description,
  keywords: [
    "curated essentials",
    "minimalist lifestyle",
    "sustainable design",
    "modern home decor",
    "ergonomic accessories",
    "luxury everyday carry",
    "global express logistics",
    "MYCHOICE store",
  ],
  authors: [{ name: SITE_CONFIG.brandName, url: SITE_CONFIG.siteUrl }],
  creator: SITE_CONFIG.brandName,
  publisher: SITE_CONFIG.brandName,
  metadataBase: new URL(SITE_CONFIG.siteUrl),
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: `${SITE_CONFIG.brandName} | Curated Essentials for Modern Living`,
    description: SITE_CONFIG.description,
    url: SITE_CONFIG.siteUrl,
    siteName: SITE_CONFIG.brandName,
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&h=630&q=85",
        width: 1200,
        height: 630,
        alt: `${SITE_CONFIG.brandName} Curated Lifestyle Essentials`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_CONFIG.brandName} | Curated Essentials for Modern Living`,
    description: SITE_CONFIG.description,
    creator: "@mychoice_in",
    site: "@mychoice_in",
    images: ["https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&h=630&q=85"],
  },
  robots: {
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
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const orgSchema = buildOrganizationSchema();
  const websiteSchema = buildWebSiteSchema();

  return (
    <html lang="en" className="scroll-smooth">
      <head>
        {/* Core Web Vitals Preconnects */}
        <link rel="preconnect" href="https://images.unsplash.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        {/* Global Organization & WebSite Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
      </head>
      <body className="min-h-screen flex flex-col bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 antialiased selection:bg-brand-gold selection:text-neutral-950">
        <CartProvider>
          <AnnouncementBar />
          <Header />
          <main className="flex-1">{children}</main>
          <CartDrawer />
          <Footer />
          <GoogleTranslateScript />
        </CartProvider>
      </body>
    </html>
  );
}
