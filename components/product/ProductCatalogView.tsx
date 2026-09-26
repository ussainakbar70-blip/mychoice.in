"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { SlidersHorizontal, ChevronDown, X } from "lucide-react";
import { SeedProduct, SeedCategory } from "@/lib/db/seed-data";
import { ProductCard } from "@/components/product/ProductCard";
import { useCart } from "@/lib/cart/context";
import { formatMoney } from "@/lib/currency";

interface ProductCatalogViewProps {
  initialProducts: SeedProduct[];
  categories: SeedCategory[];
  currentCategory?: SeedCategory;
  initialSort?: string;
}

export function ProductCatalogView({
  initialProducts,
  categories,
  currentCategory,
  initialSort = "featured",
}: ProductCatalogViewProps) {
  const [selectedSort, setSelectedSort] = useState(initialSort);
  const [selectedCategory, setSelectedCategory] = useState<string>(currentCategory?.slug || "all");
  const [maxPrice, setMaxPrice] = useState<number>(150);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const { currency } = useCart();

  // Filter & Sort Logic
  const filteredProducts = useMemo(() => {
    return initialProducts
      .filter((p) => {
        if (selectedCategory !== "all") {
          const cat = categories.find((c) => c.slug === selectedCategory);
          if (cat && p.categoryId !== cat.id) return false;
        }
        if (p.basePrice > maxPrice) return false;
        if (inStockOnly && p.variants.every((v) => v.inventoryQuantity <= 0)) return false;
        return true;
      })
      .sort((a, b) => {
        if (selectedSort === "price-low") return a.basePrice - b.basePrice;
        if (selectedSort === "price-high") return b.basePrice - a.basePrice;
        if (selectedSort === "rating") return b.productRating - a.productRating;
        if (selectedSort === "newest") return b.newArrival ? 1 : -1;
        if (selectedSort === "bestseller") return b.bestseller ? 1 : -1;
        return 0; // default featured
      });
  }, [initialProducts, selectedCategory, selectedSort, maxPrice, inStockOnly, categories]);

  return (
    <div className="space-y-8">
      {/* Top Filter & Sort Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsFilterDrawerOpen(!isFilterDrawerOpen)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filters</span>
          </button>

          <span className="text-xs text-neutral-500">
            Showing <strong className="text-neutral-900 dark:text-white font-semibold">{filteredProducts.length}</strong> essentials
          </span>
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500 hidden sm:inline">Sort by:</span>
          <div className="relative">
            <select
              value={selectedSort}
              onChange={(e) => setSelectedSort(e.target.value)}
              className="appearance-none bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white text-xs font-medium rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:ring-1 focus:ring-neutral-400 cursor-pointer"
            >
              <option value="featured">Featured Curations</option>
              <option value="bestseller">Best Sellers</option>
              <option value="newest">Newest Arrivals</option>
              <option value="rating">Highest Rated</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="flex gap-8">
        {/* Desktop Sidebar Filters */}
        <aside className="hidden lg:block w-64 shrink-0 space-y-8">
          {/* Category Filter */}
          <div>
            <h4 className="text-xs uppercase font-bold tracking-widest text-neutral-400 mb-3">
              Collections
            </h4>
            <div className="space-y-1.5">
              <button
                onClick={() => setSelectedCategory("all")}
                className={`w-full text-left text-xs px-2.5 py-1.5 rounded-md transition-colors ${
                  selectedCategory === "all"
                    ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 font-semibold"
                    : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                }`}
              >
                All Collections
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.slug)}
                  className={`w-full text-left text-xs px-2.5 py-1.5 rounded-md transition-colors ${
                    selectedCategory === cat.slug
                      ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 font-semibold"
                      : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Price Range Slider */}
          <div className="border-t border-neutral-200 dark:border-neutral-800 pt-6">
            <div className="flex justify-between items-center text-xs mb-3">
              <span className="uppercase font-bold tracking-widest text-neutral-400">
                Max Price
              </span>
              <span className="font-semibold text-neutral-900 dark:text-white">
                {formatMoney(maxPrice, currency)}
              </span>
            </div>
            <input
              type="range"
              min="20"
              max="150"
              step="5"
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full accent-neutral-900 dark:accent-brand-gold cursor-pointer"
            />
          </div>

          {/* Stock Availability */}
          <div className="border-t border-neutral-200 dark:border-neutral-800 pt-6">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="w-4 h-4 rounded text-neutral-900 dark:text-brand-gold border-neutral-300 focus:ring-0 cursor-pointer"
              />
              <span className="text-xs text-neutral-700 dark:text-neutral-300 font-medium">
                In Stock Items Only
              </span>
            </label>
          </div>
        </aside>

        {/* Mobile Filter Drawer */}
        {isFilterDrawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-neutral-950/60 backdrop-blur-sm"
              onClick={() => setIsFilterDrawerOpen(false)}
            />
            <div className="relative ml-auto w-full max-w-xs bg-white dark:bg-neutral-900 h-full p-6 shadow-2xl overflow-y-auto space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-neutral-200 dark:border-neutral-800">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Filters</h3>
                <button
                  onClick={() => setIsFilterDrawerOpen(false)}
                  className="p-1 rounded text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase text-neutral-400 mb-2">Category</h4>
                <div className="space-y-1">
                  <button
                    onClick={() => {
                      setSelectedCategory("all");
                      setIsFilterDrawerOpen(false);
                    }}
                    className={`w-full text-left text-xs px-2.5 py-2 rounded-md ${
                      selectedCategory === "all" ? "bg-neutral-900 text-white font-semibold" : "text-neutral-700"
                    }`}
                  >
                    All Collections
                  </button>
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setSelectedCategory(c.slug);
                        setIsFilterDrawerOpen(false);
                      }}
                      className={`w-full text-left text-xs px-2.5 py-2 rounded-md ${
                        selectedCategory === c.slug ? "bg-neutral-900 text-white font-semibold" : "text-neutral-700"
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <span className="text-xs font-bold uppercase text-neutral-400 block mb-2">
                  Max Price: {formatMoney(maxPrice, currency)}
                </span>
                <input
                  type="range"
                  min="20"
                  max="150"
                  step="5"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-full accent-neutral-900 dark:accent-brand-gold"
                />
              </div>

              <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(e) => setInStockOnly(e.target.checked)}
                    className="w-4 h-4 rounded text-neutral-900"
                  />
                  <span className="text-xs text-neutral-700 dark:text-neutral-300">
                    In Stock Items Only
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Product Grid Area */}
        <div className="flex-1">
          {filteredProducts.length === 0 ? (
            <div className="py-20 text-center rounded-2xl bg-neutral-50 dark:bg-neutral-900/50 border border-dashed border-neutral-300 dark:border-neutral-800">
              <p className="text-base font-medium text-neutral-800 dark:text-neutral-200 mb-1">
                No essentials match your criteria
              </p>
              <p className="text-xs text-neutral-500 mb-6">
                Try expanding your price range or clearing selected category filters.
              </p>
              <button
                onClick={() => {
                  setSelectedCategory("all");
                  setMaxPrice(150);
                  setInStockOnly(false);
                }}
                className="text-xs font-semibold text-brand-gold underline underline-offset-4"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
