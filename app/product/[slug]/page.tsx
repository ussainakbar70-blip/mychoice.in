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
import { buildProductSchema, buildBreadcrumbSchema } from "@/lib/seo";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product Not Found" };

  const baseUrl = SITE_CONFIG.siteUrl;
  const canonicalUrl = `${baseUrl}/product/${product.slug}`;
  const title = product.seoTitle || `${product.name} | ${SITE_CONFIG.brandName}`;
  const description = product.seoDescription || product.description || product.shortDescription;
  const imageUrl = product.images[0]?.publicUrl || `${baseUrl}/favicon.svg`;

  return {
    title,
    description,
    keywords: [
      product.name,
      product.brandName || SITE_CONFIG.brandName,
      "curated essentials",
      "buy online",
      "fast express shipping",
      "lifestyle products",
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
          width: 1000,
          height: 1000,
          alt: product.name,
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

  // Pro SEO Schemas: Product Rich Snippets + Breadcrumb Hierarchy
  const productSchema = buildProductSchema(product);
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: "Home", url: "/" },
    ...(category ? [{ name: category.name, url: `/category/${category.slug}` }] : []),
    { name: product.name, url: `/product/${product.slug}` },
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-16">
      {/* Schema.org Structured Data for Google Rich Snippets */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-neutral-500">
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
