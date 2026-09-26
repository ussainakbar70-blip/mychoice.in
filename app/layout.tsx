import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/lib/cart/context";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { SITE_CONFIG } from "@/lib/config/site";

export const metadata: Metadata = {
  title: {
    default: `${SITE_CONFIG.brandName} | Curated Essentials for Modern Living`,
    template: `%s | ${SITE_CONFIG.brandName}`,
  },
  description: SITE_CONFIG.description,
  metadataBase: new URL(SITE_CONFIG.siteUrl),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: SITE_CONFIG.brandName,
    description: SITE_CONFIG.tagline,
    url: SITE_CONFIG.siteUrl,
    siteName: SITE_CONFIG.brandName,
    locale: "en_US",
    type: "website",
  },
  robots: {
    index: process.env.SITE_INDEXING_ENABLED === "true",
    follow: process.env.SITE_INDEXING_ENABLED === "true",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="min-h-screen flex flex-col bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 antialiased selection:bg-brand-gold selection:text-neutral-950">
        <CartProvider>
          <AnnouncementBar />
          <Header />
          <main className="flex-1">{children}</main>
          <CartDrawer />
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
