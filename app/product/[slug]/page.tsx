import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getProductBySlug, getRelatedProducts } from "@/lib/db/products";
import { getCategoryBySlug, getCategories } from "@/lib/db/categories";
import { ProductDetailView } from "@/components/product/ProductDetailView";
import { ProductCard } from "@/components/product/ProductCard";
import { SITE_CONFIG } from "@/lib/config/site";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product Not Found" };

  return {
    title: product.seoTitle || `${product.name} | ${SITE_CONFIG.brandName}`,
    description: product.seoDescription || product.shortDescription,
    alternates: {
      canonical: `/product/${product.slug}`,
    },
    openGraph: {
      title: product.name,
      description: product.shortDescription,
      images: [{ url: product.images[0]?.publicUrl || "" }],
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const [categories, relatedProducts] = await Promise.all([
    getCategories(),
    getRelatedProducts(product.categoryId, product.id, 4),
  ]);

  const category = categories.find((c) => c.id === product.categoryId);

  // Schema.org Structured Data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.shortDescription,
    image: product.images.map((img) => img.publicUrl),
    brand: {
      "@type": "Brand",
      name: product.brandName,
    },
    offers: {
      "@type": "Offer",
      priceCurrency: product.baseCurrency,
      price: product.basePrice,
      availability: "https://schema.org/InStock",
      seller: {
        "@type": "Organization",
        name: SITE_CONFIG.brandName,
      },
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: product.productRating,
      reviewCount: product.reviewCount,
    },
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-16">
      {/* JSON-LD Script */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-neutral-500">
        <Link href="/" className="hover:text-neutral-900 dark:hover:text-white transition-colors">
          Home
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        {category && (
          <>
            <Link
              href={`/category/${category.slug}`}
              className="hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              {category.name}
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
          </>
        )}
        <span className="font-semibold text-neutral-900 dark:text-white truncate max-w-xs sm:max-w-md">
          {product.name}
        </span>
      </nav>

      {/* Main Product Interactive View */}
      <ProductDetailView product={product} relatedProducts={relatedProducts} />

      {/* Related Products Carousel */}
      {relatedProducts.length > 0 && (
        <section className="border-t border-neutral-200 dark:border-neutral-800 pt-16 space-y-8">
          <div className="flex items-end justify-between">
            <div>
              <span className="text-xs uppercase tracking-widest font-bold text-neutral-500">
                You May Also Like
              </span>
              <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white mt-1">
                Related Essentials
              </h2>
            </div>
            {category && (
              <Link
                href={`/category/${category.slug}`}
                className="text-xs font-semibold text-brand-gold hover:underline"
              >
                View all in {category.name} &rarr;
              </Link>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
