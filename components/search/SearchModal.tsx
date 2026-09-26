"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Search, X, ArrowRight } from "lucide-react";
import { DEMO_PRODUCTS } from "@/lib/db/seed-data";
import { useCart } from "@/lib/cart/context";
import { formatMoney } from "@/lib/currency";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { currency } = useCart();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
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

  if (!isOpen) return null;

  const trimmed = query.trim().toLowerCase();
  const searchResults = trimmed
    ? DEMO_PRODUCTS.filter(
        (p) =>
          p.name.toLowerCase().includes(trimmed) ||
          p.shortDescription.toLowerCase().includes(trimmed) ||
          p.categoryId.toLowerCase().includes(trimmed) ||
          p.brandName.toLowerCase().includes(trimmed)
      ).slice(0, 6)
    : [];

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
        className="fixed inset-0 bg-neutral-950/70 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative min-h-screen flex items-start justify-center p-4 sm:pt-20">
        <div className="relative w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden animate-slide-down">
          {/* Input Box */}
          <div className="relative flex items-center px-5 border-b border-neutral-200 dark:border-neutral-800">
            <Search className="w-5 h-5 text-neutral-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search products, materials, collections..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full py-4 pl-3 pr-10 text-base text-neutral-900 dark:text-white placeholder:text-neutral-400 bg-transparent focus:outline-none"
            />
            {query ? (
              <button
                onClick={() => setQuery("")}
                className="p-1 rounded-md text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <span className="text-[10px] uppercase font-semibold text-neutral-400 px-1.5 py-0.5 border border-neutral-200 dark:border-neutral-700 rounded">
                ESC
              </span>
            )}
          </div>

          {/* Results Area */}
          <div className="max-h-[60vh] overflow-y-auto p-5">
            {trimmed === "" ? (
              <div>
                <p className="text-xs uppercase tracking-wider font-semibold text-neutral-400 mb-3">
                  Trending Searches
                </p>
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
            ) : searchResults.length > 0 ? (
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-wider font-semibold text-neutral-400 mb-2">
                  Products ({searchResults.length})
                </p>
                {searchResults.map((product) => (
                  <Link
                    key={product.id}
                    href={`/product/${product.slug}`}
                    onClick={onClose}
                    className="flex items-center gap-4 p-2.5 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors group"
                  >
                    <div className="w-14 h-14 rounded-lg bg-neutral-100 dark:bg-neutral-800 overflow-hidden shrink-0 border border-neutral-200 dark:border-neutral-700">
                      <img
                        src={product.images[0]?.publicUrl}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-neutral-900 dark:text-white truncate group-hover:text-brand-gold transition-colors">
                        {product.name}
                      </h4>
                      <p className="text-xs text-neutral-500 truncate">
                        {product.shortDescription}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-semibold text-neutral-900 dark:text-white">
                        {formatMoney(product.basePrice, currency)}
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:translate-x-0.5 group-hover:text-neutral-900 dark:group-hover:text-white transition-all shrink-0" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">
                  No products matched &ldquo;<strong>{query}</strong>&rdquo;
                </p>
                <p className="text-xs text-neutral-500">
                  Try checking spelling or exploring all 8 store categories.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
