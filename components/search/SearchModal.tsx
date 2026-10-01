"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Search, X, ArrowRight, Loader2 } from "lucide-react";
import { SeedProduct } from "@/lib/db/seed-data";
import { getProducts } from "@/lib/db/products";
import { useCart } from "@/lib/cart/context";
import { formatMoney } from "@/lib/currency";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SeedProduct[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { currency } = useCart();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Debounced live search
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const { products } = await getProducts({
          search: trimmed,
          status: "published",
          limit: 6,
        });
        setResults(products);
      } catch (err) {
        console.error("Search query error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const popularSearches = [
    "Ultrasonic Diffuser",
    "Gooseneck Kettle",
    "Magnetic Wireless Charger",
    "Percussion Massage",
    "Rose Quartz Roller",
    "Ceramic Tumbler",
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-neutral-950/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="min-h-full flex items-start justify-center p-4 pt-16 sm:pt-24">
        <div className="relative w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden animate-slide-down">
          {/* Search Input Bar */}
          <div className="flex items-center px-4 py-3.5 border-b border-neutral-200 dark:border-neutral-800">
            {isSearching ? (
              <Loader2 className="w-5 h-5 text-neutral-400 animate-spin shrink-0 mr-3" />
            ) : (
              <Search className="w-5 h-5 text-neutral-400 shrink-0 mr-3" />
            )}
            <input
              ref={inputRef}
              type="text"
              placeholder="Search across all 8 collections, brands, and SKUs..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent text-sm sm:text-base text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="p-1 rounded-full text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 mr-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="text-xs font-semibold px-2 py-1 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
            >
              ESC
            </button>
          </div>

          {/* Results Area */}
          <div className="p-4 sm:p-6 max-h-[60vh] overflow-y-auto">
            {query.trim() === "" ? (
              <div className="space-y-4">
                <span className="text-xs uppercase tracking-wider font-bold text-neutral-400">
                  Popular Curations
                </span>
                <div className="flex flex-wrap gap-2">
                  {popularSearches.map((term) => (
                    <button
                      key={term}
                      onClick={() => setQuery(term)}
                      className="px-3 py-1.5 rounded-full text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-3">
                <span className="text-xs uppercase tracking-wider font-bold text-neutral-400">
                  Matches Found ({results.length})
                </span>
                <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {results.map((product) => (
                    <Link
                      key={product.id}
                      href={`/product/${product.slug}`}
                      onClick={onClose}
                      className="flex items-center gap-3 py-3 px-2 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors group"
                    >
                      <div className="w-12 h-12 rounded-lg bg-neutral-100 dark:bg-neutral-800 overflow-hidden shrink-0 border border-neutral-200 dark:border-neutral-700">
                        <img
                          src={product.images[0]?.publicUrl}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs uppercase tracking-wider font-semibold text-neutral-400 block text-[10px]">
                          {product.brandName}
                        </span>
                        <h4 className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-white truncate group-hover:text-brand-gold transition-colors">
                          {product.name}
                        </h4>
                        <p className="text-[11px] text-neutral-500 truncate">
                          {product.shortDescription}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white block">
                          {formatMoney(product.basePrice, currency)}
                        </span>
                        <span className="text-[10px] text-brand-gold font-medium flex items-center gap-0.5 justify-end">
                          <span>View</span>
                          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ) : !isSearching ? (
              <div className="py-12 text-center text-neutral-500 space-y-2">
                <p className="text-sm font-medium">No results found for &ldquo;{query}&rdquo;</p>
                <p className="text-xs text-neutral-400">
                  Try checking spelling or exploring all 8 store categories.
                </p>
              </div>
            ) : null}
          </div>

          {/* Footer note */}
          <div className="px-6 py-3 bg-neutral-50 dark:bg-neutral-850 border-t border-neutral-200 dark:border-neutral-800 text-[11px] text-neutral-400 flex items-center justify-between">
            <span>Server-Authoritative Product Search</span>
            <Link
              href="/shop"
              onClick={onClose}
              className="text-brand-gold hover:underline font-medium"
            >
              Browse Full Catalog &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
