"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { SlidersHorizontal, ChevronDown, ChevronLeft, ChevronRight, X, Search } from "lucide-react";
import { SeedProduct, SeedCategory } from "@/lib/db/seed-data";
import { ProductCard } from "@/components/product/ProductCard";
import { useCart } from "@/lib/cart/context";
import { formatMoney } from "@/lib/currency";

interface ProductCatalogViewProps {
  initialProducts: SeedProduct[];
  categories: SeedCategory[];
  currentCategory?: SeedCategory;
  initialSort?: string;
  itemsPerPage?: number;
}

export function ProductCatalogView({
  initialProducts,
  categories,
  currentCategory,
  initialSort = "featured",
  itemsPerPage = 9,
}: ProductCatalogViewProps) {
  const [selectedSort, setSelectedSort] = useState(initialSort);
  const [selectedCategory, setSelectedCategory] = useState<string>(currentCategory?.slug || "all");
  const [maxPrice, setMaxPrice] = useState<number>(200);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(itemsPerPage);
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
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matches =
            p.name.toLowerCase().includes(q) ||
            p.shortDescription.toLowerCase().includes(q) ||
            p.brandName.toLowerCase().includes(q) ||
            p.variants.some((v) => v.sku.toLowerCase().includes(q));
          if (!matches) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (selectedSort === "price-low") return a.basePrice - b.basePrice;
        if (selectedSort === "price-high") return b.basePrice - a.basePrice;
        if (selectedSort === "rating") return b.productRating - a.productRating;
        if (selectedSort === "newest") return b.newArrival ? -1 : 1;
        if (selectedSort === "bestseller") return b.bestseller ? -1 : 1;
        return (b.featured ? 1 : 0) - (a.featured ? 1 : 0); // default featured
      });
  }, [initialProducts, selectedCategory, selectedSort, maxPrice, inStockOnly, searchQuery, categories]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const validPage = Math.min(currentPage, totalPages);
  const startIndex = (validPage - 1) * pageSize;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + pageSize);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(Math.max(1, Math.min(newPage, totalPages)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="space-y-8">
      {/* Top Filter, Search & Sort Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsFilterDrawerOpen(!isFilterDrawerOpen)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filters</span>
          </button>

          <span className="text-xs text-neutral-500">
            Showing{" "}
            <strong className="text-neutral-900 dark:text-white font-semibold">
              {filteredProducts.length === 0 ? 0 : startIndex + 1}–{Math.min(startIndex + pageSize, filteredProducts.length)}
            </strong>{" "}
            of <strong className="text-neutral-900 dark:text-white font-semibold">{filteredProducts.length}</strong> items
          </span>
        </div>

        {/* Quick Search in catalog */}
        <div className="flex items-center gap-2 max-w-xs w-full sm:w-64 relative">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Filter catalog..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-300 dark:border-neutral-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-gold placeholder:text-neutral-400"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setCurrentPage(1);
              }}
              className="absolute right-2.5 text-neutral-400 hover:text-neutral-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Sort & Page Size Dropdowns */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-neutral-500 hidden sm:inline">Sort:</span>
            <div className="relative">
              <select
                value={selectedSort}
                onChange={(e) => {
                  setSelectedSort(e.target.value);
                  setCurrentPage(1);
                }}
                className="appearance-none bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white text-xs font-medium rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:ring-1 focus:ring-brand-gold cursor-pointer"
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

          <div className="relative hidden md:block">
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="appearance-none bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white text-xs font-medium rounded-lg pl-2.5 pr-7 py-2 focus:outline-none focus:ring-1 focus:ring-brand-gold cursor-pointer"
            >
              <option value={6}>6 / page</option>
              <option value={9}>9 / page</option>
              <option value={12}>12 / page</option>
              <option value={24}>24 / page</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400 absolute right-2 top-2.5 pointer-events-none" />
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
                onClick={() => {
                  setSelectedCategory("all");
                  setCurrentPage(1);
                }}
                className={`w-full text-left text-xs px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                  selectedCategory === "all"
                    ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 font-semibold"
                    : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                }`}
              >
                <span>All Categories</span>
                <span className="text-[11px] opacity-70">{initialProducts.length}</span>
              </button>

              {categories.map((cat) => {
                const count = initialProducts.filter((p) => p.categoryId === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategory(cat.slug);
                      setCurrentPage(1);
                    }}
                    className={`w-full text-left text-xs px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                      selectedCategory === cat.slug
                        ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 font-semibold"
                        : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    }`}
                  >
                    <span className="truncate">{cat.name}</span>
                    <span className="text-[11px] opacity-70 ml-2">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Price Range Filter */}
          <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs uppercase font-bold tracking-widest text-neutral-400">
                Price Cap
              </h4>
              <span className="text-xs font-semibold text-neutral-900 dark:text-white">
                {formatMoney(maxPrice, currency)}
              </span>
            </div>
            <input
              type="range"
              min="20"
              max="200"
              step="5"
              value={maxPrice}
              onChange={(e) => {
                setMaxPrice(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="w-full accent-neutral-900 dark:accent-brand-gold cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-neutral-400 mt-1">
              <span>{formatMoney(20, currency)}</span>
              <span>{formatMoney(200, currency)}</span>
            </div>
          </div>

          {/* In Stock Toggle */}
          <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => {
                  setInStockOnly(e.target.checked);
                  setCurrentPage(1);
                }}
                className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-brand-gold cursor-pointer"
              />
              <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                In Stock Items Only
              </span>
            </label>
          </div>
        </aside>

        {/* Mobile Filter Drawer Overlay */}
        {isFilterDrawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-neutral-950/60 backdrop-blur-sm transition-opacity"
              onClick={() => setIsFilterDrawerOpen(false)}
            />
            <div className="relative ml-auto w-full max-w-xs bg-white dark:bg-neutral-900 h-full p-6 shadow-2xl flex flex-col justify-between overflow-y-auto z-10">
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-neutral-200 dark:border-neutral-800">
                  <h3 className="text-base font-bold text-neutral-900 dark:text-white">Filters</h3>
                  <button
                    onClick={() => setIsFilterDrawerOpen(false)}
                    className="p-1 rounded-md text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div>
                  <span className="text-xs font-bold uppercase text-neutral-400 block mb-2">
                    Categories
                  </span>
                  <div className="space-y-1">
                    <button
                      onClick={() => {
                        setSelectedCategory("all");
                        setIsFilterDrawerOpen(false);
                        setCurrentPage(1);
                      }}
                      className={`w-full text-left text-xs px-2.5 py-2 rounded-md ${
                        selectedCategory === "all"
                          ? "bg-neutral-900 text-white font-semibold"
                          : "text-neutral-700 dark:text-neutral-300"
                      }`}
                    >
                      All Categories
                    </button>
                    {categories.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setSelectedCategory(c.slug);
                          setIsFilterDrawerOpen(false);
                          setCurrentPage(1);
                        }}
                        className={`w-full text-left text-xs px-2.5 py-2 rounded-md ${
                          selectedCategory === c.slug
                            ? "bg-neutral-900 text-white font-semibold"
                            : "text-neutral-700 dark:text-neutral-300"
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
                    max="200"
                    step="5"
                    value={maxPrice}
                    onChange={(e) => {
                      setMaxPrice(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="w-full accent-neutral-900 dark:accent-brand-gold"
                  />
                </div>

                <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={inStockOnly}
                      onChange={(e) => {
                        setInStockOnly(e.target.checked);
                        setCurrentPage(1);
                      }}
                      className="w-4 h-4 rounded text-neutral-900"
                    />
                    <span className="text-xs text-neutral-700 dark:text-neutral-300">
                      In Stock Items Only
                    </span>
                  </label>
                </div>
              </div>

              <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800">
                <button
                  onClick={() => setIsFilterDrawerOpen(false)}
                  className="w-full py-2.5 bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 text-xs font-semibold rounded-lg shadow-sm"
                >
                  View Results ({filteredProducts.length})
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Product Grid Area & Pagination */}
        <div className="flex-1 space-y-8">
          {paginatedProducts.length === 0 ? (
            <div className="py-20 text-center rounded-2xl bg-neutral-50 dark:bg-neutral-900/50 border border-dashed border-neutral-300 dark:border-neutral-800">
              <p className="text-base font-medium text-neutral-800 dark:text-neutral-200 mb-1">
                No essentials match your criteria
              </p>
              <p className="text-xs text-neutral-500 mb-6">
                Try expanding your price range, clearing the search term, or selecting a different category.
              </p>
              <button
                onClick={() => {
                  setSelectedCategory("all");
                  setMaxPrice(200);
                  setInStockOnly(false);
                  setSearchQuery("");
                  setCurrentPage(1);
                }}
                className="text-xs font-semibold text-brand-gold underline underline-offset-4"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="pt-8 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-4">
                  <button
                    onClick={() => handlePageChange(validPage - 1)}
                    disabled={validPage <= 1}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 text-xs font-medium text-neutral-700 dark:text-neutral-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Previous</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
                          pageNum === validPage
                            ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-sm"
                            : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        }`}
                      >
                        {pageNum}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => handlePageChange(validPage + 1)}
                    disabled={validPage >= totalPages}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 text-xs font-medium text-neutral-700 dark:text-neutral-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
