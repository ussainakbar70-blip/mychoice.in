import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getCategoryBySlug, getCategories } from "@/lib/db/categories";
import { getProducts } from "@/lib/db/products";
import { ProductCatalogView } from "@/components/product/ProductCatalogView";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return { title: "Category Not Found" };

  return {
    title: category.seoTitle || `${category.name} | MYCHOICE.in`,
    description: category.seoDescription || category.description,
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);

  if (!category) {
    notFound();
  }

  const [categories, { products: categoryProducts }] = await Promise.all([
    getCategories(),
    getProducts({ categoryId: category.id, status: "published", limit: 50 }),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-12">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-neutral-500">
        <Link href="/" className="hover:text-neutral-900 dark:hover:text-white transition-colors">
          Home
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link href="/shop" className="hover:text-neutral-900 dark:hover:text-white transition-colors">
          Categories
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="font-semibold text-neutral-900 dark:text-white">{category.name}</span>
      </nav>

      {/* Category Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-neutral-950 text-white p-8 sm:p-14 min-h-[260px] flex items-center shadow-xl">
        <div className="absolute inset-0 z-0">
          <img
            src={category.imageUrl}
            alt={category.name}
            className="w-full h-full object-cover opacity-35"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-950/70 to-transparent" />
        </div>

        <div className="relative z-10 max-w-xl space-y-4">
          <span className="text-xs uppercase tracking-widest font-bold text-brand-gold">
            Curated Collection
          </span>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">
            {category.name}
          </h1>
          <p className="text-sm sm:text-base text-neutral-300 leading-relaxed">
            {category.description}
          </p>
        </div>
      </div>

      {/* Filterable Products */}
      <ProductCatalogView
        initialProducts={categoryProducts}
        categories={categories}
        currentCategory={category}
      />
    </div>
  );
}
