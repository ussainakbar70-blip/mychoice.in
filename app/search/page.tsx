"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Search, X, Sparkles, Filter, SlidersHorizontal, ArrowRight } from "lucide-react";
import { getProducts, PaginatedProducts } from "@/lib/db/products";
import { getCategories } from "@/lib/db/categories";
import { SeedProduct, SeedCategory } from "@/lib/db/seed-data";
import { ProductCard } from "@/components/product/ProductCard";
import { Button } from "@/components/ui/Button";

const POPULAR_SUGGESTIONS = [
  "Diffuser",
  "Kettle",
  "Wireless Charger",
  "Yoga Mat",
  "Laptop Stand",
  "Pet Lounger",
  "Bamboo",
  "Ceramic",
];

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [products, setProducts] = useState<SeedProduct[]>([]);
  const [categories, setCategories] = useState<SeedCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Sync state if URL query changes
  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  // Load categories
  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  // Execute search
  useEffect(() => {
    async function executeSearch() {
      setLoading(true);
      try {
        const result = await getProducts({
          search: query.trim() || undefined,
          categoryId: selectedCategory || undefined,
          status: "published",
          limit: 30,
        });
        setProducts(result.products);
        setTotalCount(result.total);
      } catch (err) {
        console.error("Search execution error:", err);
        setProducts([]);
        setTotalCount(0);
      } finally {
        setLoading(false);
      }
    }

    executeSearch();
  }, [query, selectedCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    } else {
      router.push("/search");
    }
  };

  const handleChipClick = (suggestion: string) => {
    setQuery(suggestion);
    router.push(`/search?q=${encodeURIComponent(suggestion)}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Header & Search Bar */}
      <div className="max-w-3xl mx-auto space-y-6 text-center">
        <div>
          <span className="text-xs uppercase tracking-widest font-bold text-neutral-400">
            Catalog Search
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white mt-1">
            Search Curated Essentials
          </h1>
        </div>

        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="w-5 h-5 absolute left-4 top-3.5 text-neutral-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by product name, SKU, material, or category..."
            className="w-full pl-12 pr-12 py-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-gold shadow-sm"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                router.push("/search");
              }}
              className="absolute right-4 top-3.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </form>

        {/* Suggestion Chips */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          <span className="text-xs text-neutral-400 font-medium flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-brand-gold" />
            Popular:
          </span>
          {POPULAR_SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => handleChipClick(s)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                query.toLowerCase() === s.toLowerCase()
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 font-semibold"
                  : "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Category Pills Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedCategory("")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-colors ${
            selectedCategory === ""
              ? "bg-brand-gold text-neutral-950 font-bold"
              : "bg-neutral-100 dark:bg-neutral-850 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200"
          }`}
        >
          All Categories
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedCategory(c.id === selectedCategory ? "" : c.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-colors ${
              selectedCategory === c.id
                ? "bg-brand-gold text-neutral-950 font-bold"
                : "bg-neutral-100 dark:bg-neutral-850 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200"
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Search Results Summary */}
      <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3 text-xs text-neutral-500">
        <span>
          {query ? (
            <>
              Showing <strong>{products.length}</strong> {products.length === 1 ? "match" : "matches"} for &ldquo;<strong className="text-neutral-900 dark:text-white">{query}</strong>&rdquo;
            </>
          ) : (
            <>Showing all <strong>{products.length}</strong> catalog essentials</>
          )}
        </span>
        <Link href="/shop" className="text-brand-gold hover:underline font-medium">
          View full catalog &rarr;
        </Link>
      </div>

      {/* Grid of Results */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="aspect-square bg-neutral-100 dark:bg-neutral-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : products.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        /* Clean No Results State */
        <div className="max-w-md mx-auto py-16 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto text-neutral-400">
            <Search className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
              No results found
            </h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              We couldn&apos;t find any essentials matching &ldquo;{query}&rdquo;.
              Try checking your spelling or explore one of our 8 curated store categories.
            </p>
          </div>
          <div className="pt-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/shop">Browse All Collections</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-xs text-neutral-400">Loading catalog search...</div>}>
      <SearchContent />
    </Suspense>
  );
}
