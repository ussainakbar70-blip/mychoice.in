import React from "react";
import type { Metadata } from "next";
import { getCategories } from "@/lib/db/categories";
import { getProducts } from "@/lib/db/products";
import { ProductCatalogView } from "@/components/product/ProductCatalogView";
import { SITE_CONFIG } from "@/lib/config/site";
import { buildBreadcrumbSchema, buildItemListSchema } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Shop All Curated Essentials | Master Catalog",
  description: "Browse the complete collection of award-winning lifestyle, kitchen, technology, wellness, and travel essentials engineered for modern daily living.",
  keywords: [
    "curated essentials catalog",
    "minimalist lifestyle products",
    "shop modern design",
    "buy home essentials online",
    "luxury everyday carry",
    "MYCHOICE shop",
  ],
  alternates: {
    canonical: `${SITE_CONFIG.siteUrl}/shop`,
  },
  openGraph: {
    title: `Shop All Curated Essentials | ${SITE_CONFIG.brandName}`,
    description: "Browse the complete collection of award-winning lifestyle, kitchen, technology, and wellness objects.",
    url: `${SITE_CONFIG.siteUrl}/shop`,
    siteName: SITE_CONFIG.brandName,
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&h=630&q=85",
        width: 1200,
        height: 630,
        alt: `${SITE_CONFIG.brandName} Master Catalog`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `Shop All Curated Essentials | ${SITE_CONFIG.brandName}`,
    description: "Browse the complete collection of award-winning lifestyle, kitchen, technology, and wellness objects.",
    images: ["https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&h=630&q=85"],
    creator: "@mychoice_in",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default async function ShopPage() {
  const [categories, { products }] = await Promise.all([
    getCategories(),
    getProducts({ status: "published", limit: 50 }),
  ]);

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Shop All", url: "/shop" },
  ]);

  const itemListSchema = buildItemListSchema(products, "All Curated Essentials", "/shop");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
      {/* Schema.org Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />

      {/* Page Header */}
      <div className="max-w-2xl mb-12 space-y-3">
        <span className="text-xs uppercase tracking-widest font-bold text-neutral-500">
          The Master Catalog
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900 dark:text-white">
          All Curated Essentials
        </h1>
        <p className="text-sm text-neutral-500 leading-relaxed">
          Thoughtfully crafted objects engineered for daily utility, sensory beauty, and lasting reliability.
        </p>
      </div>

      <ProductCatalogView
        initialProducts={products}
        categories={categories}
      />
    </div>
  );
}
