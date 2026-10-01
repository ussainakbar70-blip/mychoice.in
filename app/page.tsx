import React from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, Shield, Compass, Leaf, ArrowUpRight } from "lucide-react";
import { getCategories } from "@/lib/db/categories";
import { getProducts } from "@/lib/db/products";
import { ProductCard } from "@/components/product/ProductCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SITE_CONFIG } from "@/lib/config/site";

export default async function HomePage() {
  const [categories, { products: allProducts }] = await Promise.all([
    getCategories(),
    getProducts({ status: "published", limit: 50 }),
  ]);

  const featuredProducts = allProducts.filter((p) => p.featured).slice(0, 4);
  const bestSellers = allProducts.filter((p) => p.bestseller).slice(0, 4);
  const newArrivals = allProducts.filter((p) => p.newArrival).slice(0, 4);

  return (
    <div className="space-y-24 sm:space-y-32 pb-24">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden bg-neutral-950 text-white min-h-[85vh] flex items-center">
        {/* Background Editorial Image with Luxury Dark Overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=2000&q=85"
            alt="MYCHOICE Curated Interior & Lifestyle"
            className="w-full h-full object-cover object-center opacity-35 scale-105 animate-pulse-subtle"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-950/40 to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32 w-full">
          <div className="max-w-2xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs text-brand-gold font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Autumn/Winter 2026 Editorial Drop</span>
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.08]">
              Curated essentials for the way you live.
            </h1>

            <p className="text-base sm:text-lg text-neutral-300 leading-relaxed font-normal max-w-xl">
              Engineered objects of daily intention. Discover award-winning ergonomics,
              sustainable craft, and timeless minimalism built to outlive fleeting trends.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <Button
                variant="gold"
                size="lg"
                rightIcon={<ArrowRight className="w-4 h-4" />}
                className="w-full sm:w-auto"
              >
                <Link href="/shop">Shop The Collection</Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto bg-white/5 border-white/20 text-white hover:bg-white/10"
              >
                <Link href="/shop?sort=bestseller">Explore Best Sellers</Link>
              </Button>
            </div>

            {/* Micro Trust Indicators */}
            <div className="pt-8 flex items-center gap-6 text-xs text-neutral-400 border-t border-white/10">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Worldwide Tracked Shipping</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-gold" />
                <span>Zero Compromise Materials</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. THE 8 STORE CATEGORIES */}
      <section id="categories" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <span className="text-xs uppercase tracking-widest font-bold text-neutral-500 block mb-1">
              Curated Catalog
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
              Explore By Collection
            </h2>
          </div>
          <Link
            href="/shop"
            className="text-sm font-semibold text-neutral-900 dark:text-white hover:text-brand-gold inline-flex items-center gap-1 group"
          >
            <span>View All Categories</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/category/${category.slug}`}
              className="group relative rounded-2xl overflow-hidden aspect-[4/5] bg-neutral-900 flex flex-col justify-end p-5 shadow-sm hover:shadow-card-hover transition-all duration-300"
            >
              <img
                src={category.imageUrl}
                alt={category.name}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out opacity-80 group-hover:opacity-70"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent" />

              <div className="relative z-10 space-y-1">
                <h3 className="text-base font-bold text-white tracking-tight flex items-center justify-between">
                  <span>{category.name}</span>
                  <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </h3>
                <p className="text-xs text-neutral-300 line-clamp-1 font-normal">
                  {category.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. TRENDING CURATIONS (FEATURED PRODUCTS) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <Badge variant="gold" className="mb-2">Trending Now</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
              Curated Essentials of the Week
            </h2>
          </div>
          <Link
            href="/shop"
            className="text-sm font-semibold text-neutral-900 dark:text-white hover:text-brand-gold inline-flex items-center gap-1 group"
          >
            <span>See Full Store</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* 4. EDITORIAL FEATURE (THE DOLLARIFIED STATEMENT) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-neutral-900 text-white overflow-hidden border border-neutral-800 shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 items-center">
            <div className="p-8 sm:p-12 lg:p-16 space-y-6">
              <span className="text-xs uppercase tracking-widest font-bold text-brand-gold block">
                The MYCHOICE Standard
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.15]">
                Designed for enduring quiet luxury.
              </h2>
              <p className="text-sm sm:text-base text-neutral-300 leading-relaxed">
                We believe true value isn&apos;t marked by loud logos or manufactured urgency.
                It is found in balanced materials, tactile precision, whisper-quiet mechanisms,
                and direct-from-craftsman efficiency.
              </p>
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3 text-sm text-neutral-200">
                  <div className="w-5 h-5 rounded-full bg-brand-gold/20 text-brand-gold flex items-center justify-center text-xs font-bold">✓</div>
                  <span>High-density food-grade & aerospace metallurgy</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-neutral-200">
                  <div className="w-5 h-5 rounded-full bg-brand-gold/20 text-brand-gold flex items-center justify-center text-xs font-bold">✓</div>
                  <span>Certified non-toxic, eco-conscious materials</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-neutral-200">
                  <div className="w-5 h-5 rounded-full bg-brand-gold/20 text-brand-gold flex items-center justify-center text-xs font-bold">✓</div>
                  <span>Direct supplier relationships with zero intermediate markups</span>
                </div>
              </div>
              <div className="pt-4">
                <Button variant="gold" size="md">
                  <Link href="/about">Read Our Manifesto</Link>
                </Button>
              </div>
            </div>

            <div className="relative aspect-square lg:aspect-auto lg:h-full min-h-[400px]">
              <img
                src="https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80"
                alt="Minimalist Design Philosophy"
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 5. BEST SELLERS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <span className="text-xs uppercase tracking-widest font-bold text-neutral-500 block mb-1">
              Customer Favorites
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
              Most Loved Worldwide
            </h2>
          </div>
          <Link
            href="/shop?sort=bestseller"
            className="text-sm font-semibold text-neutral-900 dark:text-white hover:text-brand-gold inline-flex items-center gap-1 group"
          >
            <span>Explore All Best Sellers</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {bestSellers.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* 6. WHY CHOOSE US / BRAND INTEGRITY */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-t border-b border-neutral-200 dark:border-neutral-800 py-16">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs uppercase tracking-widest font-bold text-neutral-500 block mb-2">
              Our Commitments
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
              Crafted without compromise.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 mx-auto flex items-center justify-center text-neutral-900 dark:text-white">
                <Compass className="w-6 h-6 text-brand-gold" />
              </div>
              <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
                Curated With Intention
              </h3>
              <p className="text-xs text-neutral-500 leading-relaxed max-w-xs mx-auto">
                We reject cluttered catalogs. Only designs meeting our stringent tactile,
                aesthetic, and durability guidelines are released.
              </p>
            </div>

            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 mx-auto flex items-center justify-center text-neutral-900 dark:text-white">
                <Shield className="w-6 h-6 text-brand-gold" />
              </div>
              <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
                Transparent Supply Chain
              </h3>
              <p className="text-xs text-neutral-500 leading-relaxed max-w-xs mx-auto">
                Direct integration with verified international fulfillment centers ensures
                fast courier routing and live milestone telemetry.
              </p>
            </div>

            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 mx-auto flex items-center justify-center text-neutral-900 dark:text-white">
                <Leaf className="w-6 h-6 text-brand-gold" />
              </div>
              <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
                Sustainable Packaging
              </h3>
              <p className="text-xs text-neutral-500 leading-relaxed max-w-xs mx-auto">
                Shipped in recyclable corrugated materials with minimal plastic filler,
                respecting the earth at every step.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. NEW ARRIVALS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <Badge variant="default" className="mb-2">Fresh In Stock</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
              Latest Additions
            </h2>
          </div>
          <Link
            href="/shop?sort=newest"
            className="text-sm font-semibold text-neutral-900 dark:text-white hover:text-brand-gold inline-flex items-center gap-1 group"
          >
            <span>Explore All New Arrivals</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {newArrivals.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </div>
  );
}
