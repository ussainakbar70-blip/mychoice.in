import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getCategoryBySlug, getCategories } from "@/lib/db/categories";
import { getProducts } from "@/lib/db/products";
import { ProductCatalogView } from "@/components/product/ProductCatalogView";
import { SITE_CONFIG } from "@/lib/config/site";
import { buildBreadcrumbSchema, buildItemListSchema } from "@/lib/seo";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return { title: "Category Not Found" };

  const baseUrl = SITE_CONFIG.siteUrl;
  const canonicalUrl = `${baseUrl}/category/${category.slug}`;
  const title = category.seoTitle || `${category.name} | ${SITE_CONFIG.brandName}`;
  const description = category.seoDescription || category.description;
  const imageUrl = category.imageUrl || `${baseUrl}/favicon.svg`;

  return {
    title,
    description,
    keywords: [
      category.name,
      `curated ${category.name.toLowerCase()}`,
      "buy online",
      "fast express shipping",
      "lifestyle essentials",
      SITE_CONFIG.brandName,
    ],
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: SITE_CONFIG.brandName,
      locale: "en_US",
      type: "website",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: category.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
      creator: "@mychoice_in",
      site: "@mychoice_in",
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

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Categories", url: "/shop" },
    { name: category.name, url: `/category/${category.slug}` },
  ]);

  const itemListSchema = buildItemListSchema(
    categoryProducts,
    category.name,
    `/category/${category.slug}`
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-12">
      {/* Schema.org Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />

      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-neutral-500">
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
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/60 to-transparent" />
        </div>
        <div className="relative z-10 max-w-xl space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            {category.name}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
            {category.description}
          </p>
        </div>
      </div>

      {/* Products Catalog View */}
      <ProductCatalogView
        initialProducts={categoryProducts}
        categories={categories}
        currentCategory={category}
      />
    </div>
  );
}
