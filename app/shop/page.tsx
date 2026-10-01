import React from "react";
import type { Metadata } from "next";
import { getCategories } from "@/lib/db/categories";
import { getProducts } from "@/lib/db/products";
import { ProductCatalogView } from "@/components/product/ProductCatalogView";

export const metadata: Metadata = {
  title: "Shop All Curated Essentials",
  description: "Browse the complete collection of award-winning lifestyle, kitchen, technology, and wellness objects.",
};

export default async function ShopPage() {
  const [categories, { products }] = await Promise.all([
    getCategories(),
    getProducts({ status: "published", limit: 50 }),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
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
